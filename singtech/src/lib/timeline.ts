import { z } from "zod";
import interactionsJson from "@/data/history/interactions.json";
import { getCatalog, getProduct } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import { PLAYBOOKS, type AccountHistory, type RagDoc } from "@/lib/history";
import type { Company, ProductId } from "@/types/singtech";

// Sales Copilot: one dated timeline and one document list per account, merged from the account records, the sample
// interactions (emails, calls, WhatsApp; fictional, like the accounts) and anything the rep adds. Pure, so it runs on both sides.

export const CHANNELS = ["Email", "Phone call", "WhatsApp", "Telegram", "Meeting", "Support case", "Incident", "Invoice", "Contact change", "News", "Notes", "Transcript", "Screenshot", "Document"] as const;
export type Channel = (typeof CHANNELS)[number];
// What a rep can add from the copilot; the rest come from records.
export const REP_CHANNELS = ["Email", "Phone call", "WhatsApp", "Telegram", "Meeting", "Notes", "Transcript", "Screenshot", "Document"] as const satisfies readonly Channel[];

export interface TimelineEvent {
  id: string;
  accountId: string;
  date: string;
  channel: Channel;
  sourceType: string;
  title: string;
  summary: string;
  participants?: string;
  content: string;
  tags: string[];
  origin: "record" | "sample" | "rep" | "news";
  url?: string;
}

export interface CopilotDocument {
  id: string;
  title: string;
  type: string;
  date?: string;
  source: string;
  url?: string;
  content: string;
}

const InteractionSchema = z
  .object({
    id: z.string().regex(/^IX-[A-Z]{2}-\d{2}$/),
    accountId: z.string().regex(/^acct-[a-z0-9-]+$/),
    date: z.iso.date(),
    channel: z.enum(["Email", "Phone call", "WhatsApp", "Meeting"]),
    title: z.string().min(1),
    participants: z.string().min(1),
    summary: z.string().min(1),
    content: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
  })
  .strict();

const sampleInteractions = z.array(InteractionSchema).parse(interactionsJson);

/** Rep-added entries, as stored by /api/copilot/interactions. */
export const RepInteractionSchema = z
  .object({
    accountId: z.string().regex(/^(acct|lead)-[a-z0-9-]+$/),
    channel: z.enum(REP_CHANNELS),
    title: z.string().trim().min(1).max(180),
    date: z.iso.date(),
    participants: z.string().trim().max(180).optional(),
    summary: z.string().trim().max(1000).optional(),
    content: z.string().trim().min(1).max(50_000),
  })
  .strict();
export type RepInteractionInput = z.infer<typeof RepInteractionSchema>;
export interface RepInteraction extends RepInteractionInput {
  id: string;
  createdAt: string;
}

const SOURCE_TYPE: Partial<Record<Channel, string>> = { Email: "Email thread", "Phone call": "Call notes", WhatsApp: "Message thread", Telegram: "Message thread", Meeting: "Meeting notes", Notes: "Rep notes", Transcript: "Call transcript", Screenshot: "Screenshot (read on the GPU)", Document: "Imported document" };
const firstSentence = (text: string) => (text.match(/^[^.!?\n]+[.!?]?/)?.[0] ?? text).slice(0, 240);

export function repEvent(r: RepInteraction): TimelineEvent {
  return { id: r.id, accountId: r.accountId, date: r.date, channel: r.channel, sourceType: SOURCE_TYPE[r.channel] ?? "Rep notes", title: r.title, summary: r.summary || firstSentence(r.content), participants: r.participants, content: r.content, tags: ["Added by you"], origin: "rep" };
}

function recordEvents(h: AccountHistory): TimelineEvent[] {
  const base = { accountId: h.accountId, origin: "record" as const };
  return [
    ...h.meetings.map((m) => ({
      ...base,
      id: m.id,
      date: m.date,
      channel: "Meeting" as const,
      sourceType: "Meeting minutes",
      title: m.title,
      summary: m.decisions[0],
      participants: m.attendees.join("; "),
      content: ["Decisions:", ...m.decisions.map((d) => `- ${d}`), "Actions:", ...(m.actions.length ? m.actions.map((a) => `- ${a.owner}: ${a.action} (due ${a.due})`) : ["- None"])].join("\n"),
      tags: ["Meeting"],
    })),
    ...h.invoices.map((i) => ({
      ...base,
      id: i.id,
      date: i.issuedOn,
      channel: "Invoice" as const,
      sourceType: `${i.billingSystem} invoice`,
      title: `Invoice ${i.id}: ${i.status}`,
      summary: `${formatSgd(i.amountSgd)}, due ${i.dueOn}.${i.note ? ` ${i.note}` : ""}`,
      content: [`Status: ${i.status}. Amount ${formatSgd(i.amountSgd)}. Issued ${i.issuedOn}, due ${i.dueOn}.`, ...i.lines.map((l) => `- ${getProduct(l.productId as ProductId)?.shortName ?? l.productId}: ${l.description}, ${formatSgd(l.amountSgd)}`), i.note ? `Note: ${i.note}` : ""].filter(Boolean).join("\n"),
      tags: i.status === "paid" ? ["Billing"] : ["Billing", i.status === "disputed" ? "Disputed" : "Overdue"],
    })),
    ...h.slaIncidents.map((s) => ({
      ...base,
      id: s.id,
      date: s.date,
      channel: "Incident" as const,
      sourceType: "SLA incident report",
      title: `${s.severity} incident ${s.id}`,
      summary: s.summary,
      content: `${s.summary} Resolved in ${s.resolutionHours} hours. Service credit ${formatSgd(s.creditSgd)}.`,
      tags: ["Service", s.severity],
    })),
    ...h.cases.map((c) => ({
      ...base,
      id: c.id,
      date: c.openedOn,
      channel: "Support case" as const,
      sourceType: `${c.category[0].toUpperCase()}${c.category.slice(1)} case, ${c.severity}`,
      title: `Case ${c.id}`,
      summary: c.subject,
      content: [c.subject, `Status: ${c.status}.`, c.csat ? `Satisfaction ${c.csat} of 5.` : "", c.competitor ? `Mentions ${c.competitor}.` : ""].filter(Boolean).join(" "),
      tags: ["Service", ...(c.competitor ? ["Competition"] : [])],
    })),
    ...h.contacts
      .filter((c) => c.leftOn)
      .map((c) => ({
        ...base,
        id: `${c.id}-left`,
        date: c.leftOn!,
        channel: "Contact change" as const,
        sourceType: "Contact record",
        title: `${c.title} left the company`,
        summary: `${c.title} (${c.role.replace("_", " ")}) left on ${c.leftOn}. Map the new owner of the budget and the technical decision.`,
        content: `${c.title}, ${c.role.replace("_", " ")}, left the company on ${c.leftOn}. Last contact ${c.lastContactOn ?? "not recorded"}.`,
        tags: ["Relationship"],
      })),
  ];
}

const sampleEvents = (accountId: string): TimelineEvent[] =>
  sampleInteractions.filter((i) => i.accountId === accountId).map((i) => ({ ...i, sourceType: SOURCE_TYPE[i.channel] ?? i.channel, origin: "sample" as const }));

// Prospects have no history with Singtel; their timeline is the public signals, each with the article it came from.
const newsEvents = (c: Company): TimelineEvent[] =>
  c.signals
    .filter((s) => s.source.kind !== "simulated-telemetry")
    .map((s, n) => ({ id: `${c.id}-sig-${n}`, accountId: c.id, date: s.source.publishedAt ?? "", channel: "News" as const, sourceType: s.source.publisher, title: s.source.title, summary: s.claim, content: s.claim, tags: ["Public source"], origin: "news" as const, url: s.source.url }));

/** Newest first; undated news sorts last. */
export function accountTimeline({ history, company, rep = [] }: { history?: AccountHistory; company?: Company; rep?: RepInteraction[] }): TimelineEvent[] {
  const id = history?.accountId ?? company?.id ?? "";
  const events = [...(history ? [...recordEvents(history), ...sampleEvents(id)] : []), ...(company && !history ? newsEvents(company) : []), ...rep.filter((r) => r.accountId === id).map(repEvent)];
  return events.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Source documents behind the timeline, plus the Singtel product pages and playbooks a rep would reach for. */
export function accountDocuments({ history, company, rep = [] }: { history?: AccountHistory; company?: Company; rep?: RepInteraction[] }, products: readonly ProductId[]): CopilotDocument[] {
  const events = accountTimeline({ history, company, rep }).filter((e) => e.channel !== "Contact change" && e.channel !== "Support case");
  const docs = events.map((e) => ({ id: e.id, title: e.title, type: e.sourceType, date: e.date || undefined, source: e.origin === "rep" ? "Added by you" : e.origin === "news" ? e.sourceType : "Sample data", url: e.url, content: e.content }));
  const productDocs = getCatalog()
    .filter((p) => products.includes(p.id))
    .map((p) => ({ id: p.id, title: p.name, type: "Product page", source: p.source.publisher, url: p.source.url, content: p.capabilities }));
  const playbooks = PLAYBOOKS.map((p) => ({ id: p.id, title: p.title, type: "Sales playbook", source: "SingTech playbooks", content: p.body.slice(0, 600) }));
  return [...docs, ...productDocs, ...playbooks];
}

/** Sample interactions as retrieval documents, so the AI can cite an email or call note. */
export const interactionDocuments = (): RagDoc[] =>
  sampleInteractions.map((i) => ({
    id: `interaction:${i.id}`,
    title: `${i.title} (${i.channel}, ${i.date})`,
    kind: "meeting",
    source: `src/data/history/interactions.json#${i.id}`,
    text: `${i.channel} on ${i.date} with ${i.participants}. Account ${i.accountId} (Sample account). ${i.summary}\n${i.content}`,
  }));

/** Rep-added entries for one account, newest first, as plain text for retrieval (redacted by the caller). */
export function repNotesText(rep: RepInteraction[], accountId: string, maxChars = 12_000): string {
  let out = "";
  for (const r of rep.filter((x) => x.accountId === accountId).sort((a, b) => b.date.localeCompare(a.date))) {
    const entry = `${r.title} (${r.channel}, ${r.date}${r.participants ? `, ${r.participants}` : ""}): ${r.content}\n\n`;
    if (out.length + entry.length > maxChars) break;
    out += entry;
  }
  return out.trim();
}
