import { z } from "zod";
import seedJson from "@/data/signals_seed.json";
import { getHuntingLeads, getProduct } from "@/lib/data-service";
import { buildSignal, RELEVANCE_LABEL, rescore } from "./classify";
import { fetchSource, SOURCES } from "./sources";
import { SignalSchema, type RawSignal, type Signal, type SignalKind, type SignalsResult, type SourceStatus } from "./types";

export type { Signal, SignalKind, SignalsResult, SourceStatus } from "./types";

// Verified, dated snapshot (src/data/signals_seed.json): always merged in, and the whole answer when no feed responds.
const seed = z.array(SignalSchema).parse(seedJson);

const TTL_MS = 15 * 60_000;
const FAILED_TTL_MS = 60_000; // retry sooner when every feed failed
const MIN_REFRESH_MS = 60_000; // refresh=1 cannot hammer the feeds
const DEFAULT_LIMIT = 50;
const SEED_SOURCE = "Cached snapshot";

let cache: { at: number; ttl: number; result: SignalsResult } | null = null;
let inflight: Promise<SignalsResult> | null = null;

const byRank = (a: Signal, b: Signal) => b.score - a.score || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");

const titleTokens = (title: string) => new Set(title.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2));

function similar(a: Set<string>, b: Set<string>) {
  const shared = [...a].filter((w) => b.has(w)).length;
  return shared / (a.size + b.size - shared || 1) >= 0.8;
}

// Same url (same id) or a near-identical title from another outlet: keep the highest-ranked copy.
export function dedupe(signals: Signal[]): Signal[] {
  const kept: { signal: Signal; tokens: Set<string> }[] = [];
  for (const signal of [...signals].sort(byRank)) {
    const tokens = titleTokens(signal.title);
    if (!kept.some((k) => k.signal.id === signal.id || similar(k.tokens, tokens))) kept.push({ signal, tokens });
  }
  return kept.map((k) => k.signal);
}

// Only real prospects are matched by name; sample accounts are fictional and never tied to news.
function withProspect(raw: RawSignal): RawSignal {
  if (raw.matchedCompany) return raw;
  const text = `${raw.title} ${raw.snippet}`.toLowerCase();
  const lead = getHuntingLeads().find((l) => text.includes(l.companyName.toLowerCase()));
  return lead ? { ...raw, matchedCompany: lead.companyName } : raw;
}

const relevance = (s: Signal) => s.scoreBreakdown.find((c) => c.label === RELEVANCE_LABEL)?.points ?? 0;

// A live item earns a place only if a rule fired, and a prospect item must also touch Singapore, the region, or India.
// Fatalities, crime and scandal are never a sales trigger, whatever keywords they share with one.
const TRAGEDY = /\b(dies|died|dead|death|deaths|killed|kills|asphyxiat\w*|suicide|murder\w*|rape|fatal\w*|scandal\w*|sex|spy|espionage|arrest\w*)\b/i;
const keepLive = (s: Signal) =>
  SignalSchema.safeParse(s).success && s.triggers.length > 0 && (s.kind !== "prospect-trigger" || relevance(s) > 0) && !TRAGEDY.test(`${s.title} ${s.snippet}`);

const seedResult = (now: number, sources: SourceStatus[]): SignalsResult => ({
  signals: dedupe(seed.map((s) => rescore(s, now))),
  fetchedAt: new Date(now).toISOString(),
  live: false,
  sources: [...sources, { name: SEED_SOURCE, ok: true, count: seed.length }],
});

async function collect(): Promise<SignalsResult> {
  const now = Date.now();
  const settled = await Promise.allSettled(SOURCES.map((def) => fetchSource(def)));
  const live = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value.map((raw) => buildSignal(withProspect({ ...raw, title: raw.title.slice(0, 400) }), now)).filter(keepLive) : [],
  );
  const sources = SOURCES.map((def, i) => {
    const r = settled[i];
    return { name: def.name, ok: r.status === "fulfilled", count: r.status === "fulfilled" ? r.value.length : 0 };
  });
  const base = seedResult(now, sources);
  if (!sources.some((s) => s.ok)) return base;
  return { ...base, signals: dedupe([...live, ...base.signals]), live: true };
}

export async function getSignals(opts: { kind?: SignalKind; refresh?: boolean; limit?: number } = {}): Promise<SignalsResult> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? DEFAULT_LIMIT));
  let result: SignalsResult;
  try {
    const now = Date.now();
    const age = cache ? now - cache.at : Infinity;
    if (cache && age < (opts.refresh ? Math.min(MIN_REFRESH_MS, cache.ttl) : cache.ttl)) {
      result = cache.result;
    } else {
      inflight ??= collect().finally(() => (inflight = null));
      result = await inflight;
      cache = { at: Date.now(), ttl: result.live ? TTL_MS : FAILED_TTL_MS, result };
    }
  } catch {
    result = seedResult(Date.now(), SOURCES.map((def) => ({ name: def.name, ok: false, count: 0 })));
  }
  const signals = result.signals.filter((s) => !opts.kind || s.kind === opts.kind).slice(0, limit);
  return { ...result, signals };
}

// Last fetched signals, or the snapshot before any fetch: synchronous, for document indexers.
export const getCachedSignals = (): Signal[] => cache?.result.signals ?? seed;

export function signalDocuments(signals: Signal[]): { id: string; title: string; text: string; source: string; kind: "signal" }[] {
  return signals.map((s) => ({
    id: s.id,
    title: s.title,
    text: [
      s.title,
      s.snippet,
      `Source: ${s.source}${s.publishedAt ? `, ${s.publishedAt.slice(0, 10)}` : ""}.`,
      s.matchedCompany ? `Company: ${s.matchedCompany}.` : "",
      s.triggers.length ? `Triggers: ${s.triggers.join(", ")}.` : "",
      s.products.length ? `Products: ${s.products.map((p) => getProduct(p)?.name ?? p).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    source: s.url,
    kind: "signal" as const,
  }));
}
