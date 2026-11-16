import { getProduct } from "@/lib/data-service";
import { meddpiccTotal, type AccountHistory } from "@/lib/history";
import type { ProposalStatus } from "@/state/app-store";
import type { Company, LeadStatus, ProductId } from "@/types/singtech";

export const STAGES = ["Prospecting", "Qualification", "Needs analysis", "Proposal", "Negotiation"] as const;
export type Stage = (typeof STAGES)[number];

// Stage is derived, never stored: a sent proposal beats qualification, and MEDDPICC drives the rest.
export function stageFor(input: { isCustomer: boolean; history?: AccountHistory; proposal?: ProposalStatus; leadStatus?: LeadStatus }): Stage {
  if (input.proposal === "sent") return "Negotiation";
  if (input.proposal === "pending" || input.proposal === "approved") return "Proposal";
  if (!input.history) return input.isCustomer || input.leadStatus === "qualified" ? "Qualification" : "Prospecting";
  const total = meddpiccTotal(input.history);
  return total >= 12 ? "Proposal" : total >= 8 ? "Needs analysis" : "Qualification";
}

// Indicative upside: the recommended bundle, or for history-only accounts the catalogue ARR of bundle products not yet owned.
export function upsideFor(company?: Company, history?: AccountHistory): number {
  if (company) return company.recommendedBundle.estimatedArrSgd;
  if (!history) return 0;
  const owned = new Set(history.profile?.ownedProducts ?? []);
  const gaps = new Set(history.productMix.flatMap((p) => p.products).filter((id) => !owned.has(id as ProductId)));
  return [...gaps].reduce((sum, id) => sum + (getProduct(id as ProductId)?.indicativeArrSgd ?? 0), 0);
}

export function pipelineByStage(items: { stage: Stage; upside: number }[]) {
  return STAGES.map((stage) => {
    const list = items.filter((i) => i.stage === stage);
    return { stage, count: list.length, upside: list.reduce((s, i) => s + i.upside, 0) };
  });
}
