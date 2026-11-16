import { z } from "zod";
import { getCatalog, getCompanies } from "@/lib/data-service";
import { sanitizeEnterprisePayload } from "@/lib/pii-redactor";
import { readSse } from "@/lib/sse";
import { searchOnline } from "@/lib/web-search";

// RAG over the home RTX 3050 gateway (Ollama granite-embedding + jev + gemma4:e4b) reached through Cloudflare Access.
// Every call falls back to keyword retrieval over local records, so the demo never fails on stage.

export interface RagDoc {
  id: string;
  title: string;
  text: string;
  source: string;
  kind: string;
}

const CitationSchema = z.object({ id: z.string(), title: z.string(), source: z.string(), snippet: z.string(), score: z.number() });
const MetaSchema = z.object({ citations: z.array(CitationSchema) });
const TokenSchema = z.object({ t: z.string() });
const DoneSchema = z.object({ answer: z.string(), citations: z.array(CitationSchema).optional() });

export type Citation = z.infer<typeof CitationSchema>;
export type Engine = "gateway" | "local";
export interface RagAnswer {
  answer: string;
  citations: Citation[];
  engine: Engine;
  latencyMs: number;
}

export interface RagRequest {
  question: string;
  accountId?: string;
  // Text extracted from a file the rep uploaded; redacted here before it leaves the app.
  context?: string;
  contextTitle?: string;
  // Follow-up questions in one chat share a session so "its renewal" resolves on the gateway.
  sessionId?: string;
}

// Shared body for /api/rag/query and /api/rag/stream: strict, bounded, no unknown fields.
export const RagBodySchema = z
  .object({
    question: z.string().trim().min(2).max(1000),
    accountId: z.string().max(120).optional(),
    context: z.string().max(24000).optional(),
    contextTitle: z.string().max(160).optional(),
    sessionId: z.string().regex(/^[\w-]{6,64}$/).optional(),
  })
  .strict();

export interface WebDoc {
  title: string;
  url: string;
  text: string;
}

export type RagEvent =
  | { type: "restart"; reason: string }
  | { type: "meta"; citations: Citation[]; engine: Engine }
  | { type: "token"; t: string }
  | { type: "done"; answer: string; citations: Citation[]; engine: Engine; latencyMs: number };

const gatewayUrl = () => process.env.RAG_GATEWAY_URL?.replace(/\/$/, "");
// The app on the GPU box reaches the gateway over loopback; anywhere else it goes through the Cloudflare Access tunnel.
const isLoopback = (url = "") => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
export const isGatewayConfigured = () => {
  const url = gatewayUrl();
  if (!url || !process.env.RAG_GATEWAY_KEY) return false;
  return isLoopback(url) || Boolean(url.startsWith("https://") && process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET);
};

const gatewayHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.RAG_GATEWAY_KEY}`,
  ...(isLoopback(gatewayUrl()) ? {} : { "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID!, "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET! }),
});

const post = (path: string, body: unknown, timeoutMs: number) =>
  fetch(`${gatewayUrl()}${path}`, { method: "POST", headers: gatewayHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });

export async function gateway<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await post(path, body, timeoutMs);
  if (!res.ok) throw new Error(`RAG gateway ${res.status}`);
  return (await res.json()) as T;
}

let extraDocs: () => RagDoc[] = () => [];
// History and signal modules register their documents here, so this file has no import cycle with them.
export const registerDocs = (fn: () => RagDoc[]) => {
  const prev = extraDocs;
  extraDocs = () => [...prev(), ...fn()];
};

export function localDocuments(): RagDoc[] {
  const products = getCatalog().map((p) => ({ id: p.id, title: p.name, text: `${p.name}. ${p.capabilities} Buyer: ${p.targetBuyer}.`, source: p.source.url, kind: "product" }));
  const accounts = getCompanies().map((c) => ({
    id: c.id,
    title: c.companyName,
    text: [
      `${c.companyName} (${c.relationshipLabel}, ${c.hubLabel}, ${c.industryLabel}${c.isDemoAccount ? ", sample account" : ""}).`,
      `Recommended bundle: ${c.recommendedBundle.bundleName} (${c.recommendedBundle.products.map((id) => getCatalog().find((p) => p.id === id)!.shortName).join(", ")}), indicative SGD ${c.recommendedBundle.estimatedArrSgd.toLocaleString("en-SG")} a year.`,
      `Why now: ${c.whyNow}`,
      `Next step: ${c.nextAction}`,
      ...c.signals.map((s) => s.claim),
    ].join(" "),
    source: c.signals[0]?.source.url ?? "",
    kind: "account",
  }));
  return [...products, ...accounts, ...extraDocs()];
}

const BILL_RE = /SGT-INV-\d{4}-\d{4}/gi;
const BILL_ID_RE = /SGT-INV-\d{4}-\d{4}/i;
const STOP = new Set(["the", "and", "for", "what", "which", "who", "how", "are", "is", "with", "about", "from", "this", "that", "does", "our", "their", "singtech", "status", "tell", "show", "give", "products", "recommended", "account", "accounts"]);
const tokens = (s: string) => (s.toLowerCase().match(/[a-z0-9:-]{3,}/g) ?? []).filter((w) => !STOP.has(w));

// Term overlap with an exact-match boost for bill IDs; good enough as an offline fallback, not as primary retrieval.
export function localRetrieve(question: string, docs: RagDoc[], k = 3): Citation[] {
  const q = new Set(tokens(question));
  const bills = (question.match(BILL_RE) ?? []).map((b) => b.toUpperCase());
  return docs
    .map((d) => {
      const t = tokens(`${d.title} ${d.text}`);
      const overlap = t.filter((w) => q.has(w)).length / Math.sqrt(t.length + 1);
      const bonus =
        (bills.some((b) => d.text.toUpperCase().includes(b) || d.id.toUpperCase() === b) ? 10 : 0) +
        // A company or product named in the question outranks any word overlap.
        (tokens(d.title).length > 0 && tokens(d.title).every((w) => q.has(w)) ? 5 : 0);
      return { d, score: overlap + bonus };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ d, score }) => ({ id: d.id, title: d.title, source: d.source, snippet: d.text.slice(0, 280), score: Math.round(score * 100) / 100 }));
}

const sentenceParts = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|(?=\b(?:Why now|Next step|Recommended bundle|Products):)/i)
    .map((part) => part.trim())
    .filter(Boolean);

// The local fallback cannot invent a generative answer, but it should still be a useful sales answer rather than a dump of
// two whole records. Select the most question-relevant sentence and keep the evidence marker beside that claim.
function bestSentence(doc: RagDoc, question: string): string {
  const terms = new Set(tokens(question));
  const candidates = sentenceParts(doc.text);
  return (
    candidates
      .map((line) => ({
        line,
        score: tokens(line).filter((word) => terms.has(word)).length + (BILL_ID_RE.test(line) && BILL_ID_RE.test(question) ? 8 : 0) + (/^(Why now|Next step):/i.test(line) ? 0.2 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.line.length - b.line.length)[0]?.line.slice(0, 360) ?? doc.text.slice(0, 360)
  );
}

function nextStep(doc: RagDoc): string | undefined {
  const match = doc.text.match(/(?:^|\s)Next step:\s*([^.!?]+[.!?]?)/i);
  return match?.[1].trim().slice(0, 240);
}

function localAnswer(question: string, context?: { title: string; text: string }, notes?: string): Omit<RagAnswer, "latencyMs"> {
  // An uploaded file is a private, self-contained corpus. Do not blend it with account records when the gateway is offline.
  const docs: RagDoc[] = context
    ? [{ id: "upload", title: context.title, text: context.text.slice(0, 6000), source: "", kind: "upload" }]
    : [...(notes ? [{ id: "notes", title: "Notes added by the rep", text: notes, source: "", kind: "note" }] : []), ...localDocuments()];
  const citations = localRetrieve(question, docs, 3);
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const summary = citations
    .slice(0, 2)
    .map((citation, index) => `${bestSentence(byId.get(citation.id) ?? { ...citation, text: citation.snippet, kind: "record" }, question)} [${index + 1}]`)
    .join(" ");
  const action = citations.map((citation, index) => ({ action: nextStep(byId.get(citation.id) ?? { ...citation, text: citation.snippet, kind: "record" }), index })).find((item) => item.action);
  const answer = citations.length
    ? `SUMMARY: ${summary}${action?.action ? `\nACTIONS:\n- ${action.action} [${action.index + 1}]` : ""}`
    : "SUMMARY: No matching record found. Try an account name, product, or bill ID such as SGT-INV-2026-8841.";
  return { answer, citations, engine: "local" };
}

// The records do not answer it: the gateway says so in a fixed way (see its system prompt).
const NO_ANSWER = /records do not cover|do(es)? not (contain|cover|mention|include|provide|specify) (any )?(information|details|data)?|no (information|record|mention)/i;
// Questions about current events go to the news first.
const WANTS_NEWS = /\b(latest|news|today|this week|recent(ly)?|online|on the web|search the web)\b/i;

// Searching current news only when the question asks for it or has no credible local match keeps account questions private
// and avoids adding an unnecessary external HTTP request to the common path.
const shouldPrefetchNews = (question: string, context?: string) => {
  if (context) return false;
  if (WANTS_NEWS.test(question)) return true;
  const top = localRetrieve(question, localDocuments(), 1)[0];
  return !top || top.score < 0.25;
};

// One pipeline for every caller: streams meta, tokens and done to onEvent, and resolves with the full answer.
// When the records cannot answer, news and Wikipedia are searched and the answer is written again from them ("restart" event).
export async function runRag(req: RagRequest, onEvent: (e: RagEvent) => void = () => {}): Promise<RagAnswer> {
  const question = sanitizeEnterprisePayload(req.question).sanitizedText;
  // For explicit freshness requests, news must be in the first model pass. For an unfamiliar question, start the lookup
  // alongside record retrieval so the fallback does not pay a second 5-second network wait after the model says "unknown".
  const wantsFreshness = WANTS_NEWS.test(question) && !req.context;
  const prefetchedNews = shouldPrefetchNews(question, req.context) ? searchOnline(question) : undefined;
  const firstWeb = wantsFreshness && prefetchedNews ? await prefetchedNews : [];
  const first = await runOnce(req, firstWeb, onEvent);
  if (firstWeb.length || req.context || first.engine !== "gateway" || !NO_ANSWER.test(first.answer)) return first;
  const web = prefetchedNews ? await prefetchedNews : await searchOnline(question);
  if (!web.length) return first;
  onEvent({ type: "restart", reason: "The records do not cover this. Searching online: news and Wikipedia." });
  return runOnce(req, web, onEvent);
}

// The question and any uploaded text are redacted before they leave the app; the gateway redacts its output again.
async function runOnce(req: RagRequest, web: WebDoc[], onEvent: (e: RagEvent) => void): Promise<RagAnswer> {
  const started = Date.now();
  const question = sanitizeEnterprisePayload(req.question).sanitizedText;
  const context = req.context ? { title: req.contextTitle ?? "Uploaded document", text: sanitizeEnterprisePayload(req.context).sanitizedText } : undefined;
  // The rep's own timeline entries for this account join retrieval (not with an upload, which answers alone).
  const rawNotes = req.accountId && !context ? await repNotes(req.accountId).catch(() => "") : "";
  const notes = rawNotes ? sanitizeEnterprisePayload(rawNotes).sanitizedText : undefined;
  if (isGatewayConfigured()) {
    let citations: Citation[] = [];
    let answer = "";
    let streaming = false;
    try {
      const res = await post(
        "/v1/query/stream",
        { question, account_id: req.accountId, context: context?.text.slice(0, 24000), context_title: context?.title.slice(0, 160), notes: notes?.slice(0, 12000), session_id: req.sessionId, web },
        30_000,
      );
      if (!res.ok || !res.body) throw new Error(`RAG gateway ${res.status}`);
      for await (const { event, data } of readSse(res.body)) {
        if (event === "meta") {
          citations = MetaSchema.parse(data).citations;
          streaming = true;
          onEvent({ type: "meta", citations, engine: "gateway" });
        } else if (event === "token") {
          const { t } = TokenSchema.parse(data);
          answer += t;
          onEvent({ type: "token", t });
        } else if (event === "done") {
          const d = DoneSchema.parse(data);
          const result: RagAnswer = { answer: d.answer, citations: d.citations ?? citations, engine: "gateway", latencyMs: Date.now() - started };
          onEvent({ type: "done", ...result });
          return result;
        } else if (event === "error") {
          throw new Error("RAG gateway stream error");
        }
      }
      throw new Error("RAG gateway stream ended early");
    } catch {
      // Once tokens have reached the reader, finish with what arrived instead of answering twice.
      if (streaming) {
        const result: RagAnswer = { answer: answer.trim() || "SUMMARY: The answer was interrupted. Ask again.", citations, engine: "gateway", latencyMs: Date.now() - started };
        onEvent({ type: "done", ...result });
        return result;
      }
    }
  }
  const local = { ...localAnswer(question, context, notes), latencyMs: Date.now() - started };
  onEvent({ type: "meta", citations: local.citations, engine: "local" });
  onEvent({ type: "token", t: local.answer });
  onEvent({ type: "done", ...local });
  return local;
}

export const queryRag = (question: string, opts: Omit<RagRequest, "question"> = {}) => runRag({ question, ...opts });

// History (accounts, invoices, meetings, incidents, reps, playbooks) and cached news signals join the corpus.
import { historyDocuments } from "@/lib/history";
import { getCachedSignals, signalDocuments } from "@/lib/signals";
registerDocs(historyDocuments);
registerDocs(() => signalDocuments(getCachedSignals()));
// Official Singtel filings (FY2024, H1 FY2025, Singtel28, Investor Day 2024), one doc per page; extracted from news/*.pdf.
import filings from "@/data/filings.json";
// The press-release footer ("About Singtel ...") repeats on every release and crowded out real answers; it is dropped.
registerDocs(() =>
  (filings as RagDoc[]).map((d) => ({ ...d, text: d.text.replace(/About Singtel Singtel is Asia's leading[\s\S]*$/, "").trim() })).filter((d) => d.text.length > 200),
);
import { BAND_LABEL, REASON_LABEL, healthFor } from "@/lib/health";
import { getAllHistories, type AccountHistory } from "@/lib/history";
import { repNotes } from "@/lib/interactions-store";
import { interactionDocuments } from "@/lib/timeline";
registerDocs(overviewDocuments);
registerDocs(interactionDocuments);

function healthDoc(h: AccountHistory): RagDoc {
  const x = healthFor(h);
  return {
    id: `health:${h.accountId}`,
    title: `${h.accountName}: account health and next best action`,
    kind: "account",
    source: "",
    text: [
      `${h.accountName} (Sample account) health: ${x.score} of 100, ${BAND_LABEL[x.band]}. Renewal in ${x.renewalDays} days (${h.contractEndDate}).`,
      "Reasons:",
      ...x.reasons.map((r) => `- ${r.points > 0 ? "+" : ""}${r.points}: ${r.label} [${r.evidence.join(", ")}]`),
      `Next best action: ${x.action.label}${x.action.contact ? `, with the ${x.action.contact}` : ""}.`,
      ...x.action.talkingPoints.map((t) => `- ${t}`),
    ].join("\n"),
  };
}

// Book-level lists so "which prospects are from India" or "which invoices are disputed" retrieve one complete answer.
function overviewDocuments(): RagDoc[] {
  const INDIA = /India|Bengaluru|Bangalore|Mumbai|Hyderabad|Noida|Chennai|Pune|Delhi|Assam/i;
  const companies = getCompanies();
  const product = (id: string) => getCatalog().find((p) => p.id === id)?.shortName ?? id;
  const line = (c: (typeof companies)[number]) =>
    `${c.companyName} (${c.hubLabel}; ${c.industryLabel}; ${c.relationshipLabel}). Why now: ${c.whyNow} Recommended: ${c.recommendedBundle.bundleName} (${c.recommendedBundle.products.map(product).join(", ")}), indicative SGD ${c.recommendedBundle.estimatedArrSgd.toLocaleString("en-SG")} a year. Next step: ${c.nextAction}`;
  const prospects = companies.filter((c) => c.mode === "hunting");
  const india = prospects.filter((c) => INDIA.test(`${c.hubLabel} ${c.relationshipLabel} ${c.whyNow}`));
  const histories = getAllHistories();
  const open = histories.flatMap((h) => h.invoices.filter((i) => i.status !== "paid").map((i) => `${i.id}: ${h.accountName}, SGD ${i.amountSgd.toLocaleString("en-SG")}, ${i.status}, due ${i.dueOn}${i.note ? `. ${i.note}` : ""}`));
  return [
    {
      id: "overview-prospects",
      title: "Prospects in the SingTech book (real companies, public sources)",
      kind: "account",
      source: "",
      text: `SingTech tracks ${prospects.length} prospects. Prospects linked to India: ${india.map((c) => `${c.companyName} (${c.hubLabel})`).join("; ")}. All prospects: ${prospects.map((c) => c.companyName).join(", ")}.\n${prospects.map(line).join("\n")}`,
    },
    {
      id: "overview-customers",
      title: "Existing customers in the SingTech book (sample accounts)",
      kind: "account",
      source: "",
      text: `Existing customers (sample accounts): ${histories.map((h) => `${h.accountName}, contract ends ${h.contractEndDate}, MEDDPICC ${h.meddpicc.reduce((s, m) => s + m.score, 0)} of 16`).join("; ")}.`,
    },
    {
      id: "overview-health",
      title: "Account health and churn risk across customers (sample accounts)",
      kind: "account",
      source: "",
      text: `Customer health, lowest first (rules-based score out of 100; bands: healthy 70+, watch 40 to 69, at risk under 40):\n${[...histories]
        .map((h) => [h, healthFor(h)] as const)
        .sort((a, b) => a[1].score - b[1].score)
        .map(([h, x]) => `${h.accountName}: ${x.score} of 100, ${BAND_LABEL[x.band]}${x.topReason ? `, main reason ${REASON_LABEL[x.topReason].toLowerCase()}` : ""}. Next best action: ${x.action.label}.`)
        .join("\n")}`,
    },
    ...histories.map((h) => healthDoc(h)),
    {
      id: "overview-invoices",
      title: "Open, overdue and disputed invoices (sample data)",
      kind: "invoice",
      source: "",
      text: `Open invoices across the book: ${open.join("; ")}.`,
    },
  ];
}
