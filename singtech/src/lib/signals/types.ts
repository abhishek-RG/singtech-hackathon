import { z } from "zod";
import { ProductIdSchema, ScoreComponentSchema, type ProductId } from "@/types/singtech";

export const SignalKindSchema = z.enum(["singtel-news", "prospect-trigger", "tender"]);

// One dated news item or tender with a real source URL, mapped to catalogue products by rules.
export const SignalSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{40}$/), // sha1 of url
  title: z.string().min(1).max(400),
  url: z.url({ protocol: /^https$/ }),
  publishedAt: z.iso.datetime().nullable(),
  source: z.string().min(1),
  snippet: z.string().max(600),
  kind: SignalKindSchema,
  matchedCompany: z.string().min(1).optional(),
  products: z.array(ProductIdSchema),
  triggers: z.array(z.string().min(1)),
  score: z.number().int().min(0).max(100),
  // Additive parts of score: recency, trigger strength, product fit, Singapore and India relevance.
  scoreBreakdown: z.array(ScoreComponentSchema).length(4),
});

export const SignalsQuerySchema = z
  .object({
    kind: SignalKindSchema.optional(),
    refresh: z.enum(["0", "1"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export type Signal = z.infer<typeof SignalSchema>;
export type SignalKind = Signal["kind"];

export interface SourceStatus {
  name: string;
  ok: boolean;
  count: number;
}

export interface SignalsResult {
  signals: Signal[];
  fetchedAt: string;
  live: boolean;
  sources: SourceStatus[];
}

// What a fetcher hands to the classifier before ids, products, triggers, and score exist.
export interface RawSignal {
  title: string;
  url: string;
  publishedAt: string | null;
  source: string;
  snippet: string;
  kind: SignalKind | "auto";
  matchedCompany?: string;
  extraTriggers?: string[];
  extraProducts?: ProductId[];
}
