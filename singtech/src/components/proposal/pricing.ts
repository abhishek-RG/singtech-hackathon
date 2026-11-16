import { getProduct } from "@/lib/data-service";
import type { ProposalLine, ProposalStatus } from "@/state/app-store";
import type { ProductId } from "@/types/singtech";

export const TERMS = [12, 24, 36] as const;
export const MAX_DISCOUNT_PCT = 50;
// Above this, a sales manager signs off; at or below it the rep's delegated authority approves.
export const APPROVAL_THRESHOLD_PCT = 15;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(n) ? n : min, min), max);

// Indicative only: catalogue ARR / 12 per unit, less discount, rounded to whole SGD per month. Never Singtel list pricing.
export function listMrc(productId: ProductId): number {
  return Math.round((getProduct(productId)?.indicativeArrSgd ?? 0) / 12);
}

export function lineMrc(line: ProposalLine): number {
  const qty = Math.round(clamp(line.qty, 1, 999));
  const discount = clamp(line.discountPct, 0, MAX_DISCOUNT_PCT);
  return Math.round(listMrc(line.productId) * qty * (1 - discount / 100));
}

export const lineTcv = (line: ProposalLine) => lineMrc(line) * line.termMonths;

export function totals(lines: ProposalLine[]) {
  const mrc = lines.reduce((s, l) => s + lineMrc(l), 0);
  return { mrc, arr: mrc * 12, tcv: lines.reduce((s, l) => s + lineTcv(l), 0) };
}

export const needsApproval = (lines: ProposalLine[]) => lines.some((l) => l.discountPct > APPROVAL_THRESHOLD_PCT);

// Submitting within delegated authority approves at once; deeper discounts wait for the manager.
export const submitStatus = (lines: ProposalLine[]): ProposalStatus => (needsApproval(lines) ? "pending" : "approved");

export const STATUS_LABEL: Record<ProposalStatus, string> = { draft: "Draft", pending: "Pending approval", approved: "Approved", sent: "Sent" };

export const defaultLines = (products: readonly ProductId[]): ProposalLine[] => products.map((productId) => ({ productId, qty: 1, termMonths: 36, discountPct: 0 }));
