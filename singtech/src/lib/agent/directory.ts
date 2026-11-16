import { getCompanies } from "@/lib/data-service";
import { getAllHistories } from "@/lib/history";
import type { Directory } from "./plan";

// Everything the planner may name: catalogue companies plus history-only sample accounts (Meridian), their invoices and gaps.
export function buildDirectory(): Directory {
  const histories = getAllHistories();
  const withHistory = new Set(histories.map((h) => h.accountId));
  const companies = getCompanies();
  const known = new Set(companies.map((c) => c.id));
  return {
    accounts: [
      ...companies.map((c) => ({ id: c.id, name: c.companyName, hasHistory: withHistory.has(c.id) })),
      ...histories.filter((h) => !known.has(h.accountId)).map((h) => ({ id: h.accountId, name: h.accountName, hasHistory: true })),
    ],
    invoices: histories.flatMap((h) => h.invoices.map((i) => ({ id: i.id, accountId: h.accountId, status: i.status, amountSgd: i.amountSgd }))),
    meddpiccGaps: Object.fromEntries(histories.map((h) => [h.accountId, h.meddpicc.filter((m) => m.score < 2).map((m) => m.label)])),
  };
}
