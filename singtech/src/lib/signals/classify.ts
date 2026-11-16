import { createHash } from "node:crypto";
import type { ProductId, ScoreComponent } from "@/types/singtech";
import type { RawSignal, Signal, SignalKind } from "./types";

interface TriggerRule {
  label: string;
  pattern: RegExp;
  products: ProductId[];
  weight: number;
}

// Keyword table: what the article says happened, and which catalogue products answer it.
export const TRIGGER_RULES: readonly TriggerRule[] = [
  {
    label: "Expansion or new office",
    pattern: /\b(expan(?:d|ds|ding|sion)|new (?:office|hub|facility|plant)|regional (?:hq|headquarters?)|headquarters|subsidiary|sets? up|opens?|enters?)\b/i,
    products: ["SGT-CUBE", "SGT-MOB", "SGT-CYBER"],
    weight: 20,
  },
  {
    label: "Data centre or colocation",
    pattern: /\b(data cent(?:re|er)s?|colocation|hyperscal\w*|\d+\s?mw)\b/i,
    products: ["SGT-NXERA", "SGT-CUBE"],
    weight: 25,
  },
  {
    label: "AI compute or sovereign AI",
    pattern: /\b(gpus?|ai|llms?|generative|genai|sovereign|nvidia|agentic|machine learning)\b/i,
    products: ["SGT-REAI"],
    weight: 15,
  },
  {
    label: "Cyber incident or regulation",
    pattern: /\b(breach(?:es|ed)?|ransomware|cyber ?attacks?|hack(?:ed|ers?)|pdpa|scams?|phishing|data leak|malware|cyber ?security|zero trust)\b/i,
    products: ["SGT-CYBER", "SGT-QSN"],
    weight: 25,
  },
  {
    label: "Port, warehouse or factory automation",
    pattern: /\b(ports?|terminals?|warehous(?:e|es|ing)|robot(?:s|ics)?|agvs?|factor(?:y|ies)|plants?|manufactur(?:e|er|ers|ing)|automation|industry 4\.0)\b/i,
    products: ["SGT-5G", "SGT-IOT"],
    weight: 20,
  },
  {
    label: "Fleet, logistics or cold chain",
    pattern: /\b(fleets?|logistics|cold chain|supply chains?|freight|trucking|last[- ]mile|shipping)\b/i,
    products: ["SGT-IOT", "SGT-MOB"],
    weight: 20,
  },
  {
    label: "Quantum-safe or encryption",
    pattern: /\b(quantum|pqc|post-quantum|encryption|cryptograph\w*)\b/i,
    products: ["SGT-QSN"],
    weight: 20,
  },
  {
    label: "5G or private network",
    pattern: /\b(5g|private networks?|network slicing|edge computing)\b/i,
    products: ["SGT-5G"],
    weight: 15,
  },
  {
    label: "Subsea cable or enterprise connectivity",
    pattern: /\b(subsea|submarine cables?|cable systems?|sd-wan|connectivity)\b/i,
    products: ["SGT-CUBE"],
    weight: 15,
  },
  {
    label: "IT services or digital transformation",
    pattern: /\b(digital transformation|it services|systems? integrat\w*|cloud migration|software development)\b/i,
    products: ["SGT-NCS"],
    weight: 15,
  },
  // Group businesses named outright map straight to their catalogue entry.
  { label: "Nxera data centres named", pattern: /\bnxera\b/i, products: ["SGT-NXERA"], weight: 10 },
  { label: "RE:AI sovereign cloud named", pattern: /\bre:ai\b/i, products: ["SGT-REAI"], weight: 10 },
  { label: "NCS named", pattern: /\bNCS\b/, products: ["SGT-NCS"], weight: 10 },
];

// A published GeBIZ tender is a direct lead, so it earns the full trigger allowance on its own.
export const TENDER_TRIGGER = "Public sector tender";
const WEIGHTS = new Map<string, number>([...TRIGGER_RULES.map((r) => [r.label, r.weight] as const), [TENDER_TRIGGER, 35]]);

const PRODUCT_ORDER: ProductId[] = ["SGT-5G", "SGT-CUBE", "SGT-CYBER", "SGT-IOT", "SGT-MOB", "SGT-QSN", "SGT-REAI", "SGT-NXERA", "SGT-NCS"];

export function classify(text: string): { triggers: string[]; products: ProductId[] } {
  const hits = TRIGGER_RULES.filter((r) => r.pattern.test(text));
  const products = new Set(hits.flatMap((r) => r.products));
  return { triggers: hits.map((r) => r.label), products: PRODUCT_ORDER.filter((p) => products.has(p)) };
}

const SINGTEL_GROUP = /\b(singtel|nxera|digital infraco)\b|\bre:ai\b/i;
export const resolveKind = (kind: RawSignal["kind"], text: string): SignalKind =>
  kind !== "auto" ? kind : SINGTEL_GROUP.test(text) || /\bNCS\b/.test(text) ? "singtel-news" : "prospect-trigger";

const DAY_MS = 86_400_000;
export const RELEVANCE_LABEL = "Singapore and India relevance";

function recencyPoints(publishedAt: string | null, now: number): number {
  if (!publishedAt) return 4;
  const days = Math.max(0, (now - Date.parse(publishedAt)) / DAY_MS);
  return days <= 2 ? 30 : days <= 7 ? 24 : days <= 30 ? 16 : days <= 90 ? 9 : days <= 365 ? 4 : 0;
}

function relevancePoints(text: string): number {
  const sg = /\b(singapore|s'pore)\b/i.test(text) ? 10 : /\b(south-?east asia|asean|apac|asia[- ]pacific|malaysia|johor|indonesia|batam|thailand|vietnam|philippines)\b/i.test(text) ? 5 : 0;
  const india = /\b(bengaluru|bangalore)\b/i.test(text) ? 10 : /\b(india|indian|mumbai|chennai|hyderabad|pune|delhi|gurugram|noida|hosur)\b/i.test(text) ? 7 : 0;
  return sg + india;
}

// Additive score, max 30 + 35 + 15 + 20 = 100, so the parts always sum to the score with no clamping.
export function scoreSignal(input: { text: string; publishedAt: string | null; triggers: string[]; products: ProductId[] }, now: number) {
  const triggerPoints = Math.min(35, input.triggers.reduce((sum, t) => sum + (WEIGHTS.get(t) ?? 0), 0));
  const scoreBreakdown: ScoreComponent[] = [
    { label: "Recency", points: recencyPoints(input.publishedAt, now) },
    { label: "Trigger strength", points: triggerPoints },
    { label: "Product fit", points: Math.min(15, 5 * input.products.length) },
    { label: RELEVANCE_LABEL, points: relevancePoints(input.text) },
  ];
  return { score: scoreBreakdown.reduce((sum, c) => sum + c.points, 0), scoreBreakdown };
}

export const signalId = (url: string) => createHash("sha1").update(url).digest("hex");

export function buildSignal(raw: RawSignal, now: number): Signal {
  const text = `${raw.title} ${raw.snippet} ${raw.source}`;
  const found = classify(text);
  const triggers = [...new Set([...(raw.extraTriggers ?? []), ...found.triggers])];
  const extra = new Set([...found.products, ...(raw.extraProducts ?? [])]);
  const products = PRODUCT_ORDER.filter((p) => extra.has(p));
  return {
    id: signalId(raw.url),
    title: raw.title,
    url: raw.url,
    publishedAt: raw.publishedAt,
    source: raw.source,
    snippet: raw.snippet.slice(0, 600),
    kind: resolveKind(raw.kind, text),
    ...(raw.matchedCompany ? { matchedCompany: raw.matchedCompany } : {}),
    products,
    triggers,
    ...scoreSignal({ text, publishedAt: raw.publishedAt, triggers, products }, now),
  };
}

// Recompute only the score (recency moves with time); stored products and triggers stay as curated.
export const rescore = (s: Signal, now: number): Signal => ({
  ...s,
  ...scoreSignal({ text: `${s.title} ${s.snippet} ${s.source}`, publishedAt: s.publishedAt, triggers: s.triggers, products: s.products }, now),
});
