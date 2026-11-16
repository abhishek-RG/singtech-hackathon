import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getCatalog, getProduct } from "@/lib/data-service";
import { sanitizeCopy } from "@/lib/format";
import { sumBreakdown } from "@/lib/scoring";
import { ComplianceCodeSchema, HuntingLeadSchema, IndustryIdSchema, PlayIdSchema, ProductIdSchema, type HuntingLead } from "@/types/singtech";

const MODEL = "claude-opus-5-5";
const TIMEOUT_MS = 15_000;

// No array length limits here: structured outputs reject some JSON Schema constraints, so lengths are enforced after parsing.
const LeadDraftSchema = z.object({
  industry: IndustryIdSchema,
  industryLabel: z.string(),
  play: PlayIdSchema,
  whyNow: z.string(),
  hypothesis: z.string(),
  likelyNeeds: z.array(z.string()),
  bundleName: z.string(),
  products: z.array(ProductIdSchema),
  starterProducts: z.array(ProductIdSchema),
  scoreBreakdown: z.array(z.object({ label: z.string(), points: z.number().int() })),
  complianceFlags: z.array(ComplianceCodeSchema),
  complianceNote: z.string(),
  decisionRole: z.string(),
  decisionTargetTitle: z.string(),
  entryRoute: z.string(),
  nextAction: z.string(),
  draftOutreach: z.string(),
});

const SYSTEM = `You are SingTech, a sales intelligence engine for Singtel Enterprise. Draft a Lead Card for a prospect on an India-Southeast Asia corridor.
Rules:
- Recommend only products from this catalogue: ${JSON.stringify(getCatalog().map(({ id, name, capabilities }) => ({ id, name, capabilities })))}.
- products: 2 or 3 ids. starterProducts: 1 or 2 ids, a cheaper subset or entry point.
- scoreBreakdown: exactly 3 items whose points sum to between 55 and 85. Include one item for signal uncertainty.
- You have no verified news about this company. Never state facts about it as reported. Phrase whyNow as what the rep should verify, and hypothesis as SingTech's assessment.
- Professional B2B telecom tone. No emojis, no em dashes, no en dashes, no exclamation marks.
- draftOutreach: subject line, greeting "Hi [Name],", two short paragraphs, end with a question. Do not invent facts about the company.`;

let client: Anthropic | undefined;

export const isClaudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Returns a Claude-refined lead, or null on any failure (no key, timeout, refusal, invalid output) so the caller keeps the offline lead.
 * `base` supplies identity, location, and the verified signal; `sanitizedBrief` must already be PII-redacted.
 */
export async function refineLeadWithClaude(base: HuntingLead, sanitizedBrief: string): Promise<HuntingLead | null> {
  if (!isClaudeConfigured()) return null;
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    // Server-side fallback reroutes a policy decline to another model inside the same call.
    const response = await client.beta.messages.create({
      model: MODEL,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(LeadDraftSchema) },
      messages: [{ role: "user", content: sanitizedBrief }],
    });
    if (response.stop_reason !== "end_turn") return null;
    // Thinking blocks can precede the answer, so select by type rather than content[0].
    const text = response.content.find((block) => block.type === "text")?.text;
    if (!text) return null;
    const draft = LeadDraftSchema.safeParse(JSON.parse(text));
    if (!draft.success) return null;
    return toLead(base, draft.data);
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.warn(`Claude API error ${error.status}; using offline engine`);
    else console.warn("Claude call failed; using offline engine");
    return null;
  }
}

function toLead(base: HuntingLead, d: z.infer<typeof LeadDraftSchema>): HuntingLead | null {
  const products = [...new Set(d.products)].slice(0, 3);
  const starter = [...new Set(d.starterProducts)].slice(0, 2);
  const breakdown = d.scoreBreakdown.slice(0, 3).map((c) => ({ label: sanitizeCopy(c.label), points: Math.max(0, Math.min(40, c.points)) }));
  const arr = (ids: typeof products) => ids.reduce((sum, id) => sum + getProduct(id)!.indicativeArrSgd, 0);
  if (products.length === 0 || starter.length === 0 || breakdown.length === 0) return null;
  if (arr(starter) >= arr(products)) return null;

  const lead = HuntingLeadSchema.safeParse({
    ...base,
    industry: d.industry,
    industryLabel: sanitizeCopy(d.industryLabel),
    play: d.play,
    priorityScore: Math.min(100, sumBreakdown(breakdown)),
    scoreBreakdown: breakdown,
    whyNow: sanitizeCopy(d.whyNow),
    hypothesis: sanitizeCopy(d.hypothesis),
    likelyNeeds: d.likelyNeeds.slice(0, 4).map(sanitizeCopy),
    recommendedBundle: {
      bundleName: sanitizeCopy(d.bundleName),
      products,
      estimatedArrSgd: arr(products),
      starterDownsellBundle: starter,
      starterArrSgd: arr(starter),
    },
    complianceFlags: [...new Set(d.complianceFlags)].length ? [...new Set(d.complianceFlags)] : base.complianceFlags,
    complianceNote: sanitizeCopy(d.complianceNote),
    decisionMaker: {
      ...base.decisionMaker,
      role: sanitizeCopy(d.decisionRole),
      targetTitle: sanitizeCopy(d.decisionTargetTitle),
      entryRoute: sanitizeCopy(d.entryRoute),
    },
    nextAction: sanitizeCopy(d.nextAction),
    draftOutreach: sanitizeCopy(d.draftOutreach),
  });
  return lead.success && lead.data.priorityScore === sumBreakdown(lead.data.scoreBreakdown) ? lead.data : null;
}
