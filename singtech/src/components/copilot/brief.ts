import { getProduct } from "@/lib/data-service";
import type { AccountHistory } from "@/lib/history";
import type { Company, ProductId } from "@/types/singtech";

export interface CallBrief {
  whyNow: string;
  openProducts: string[];
  meddpiccGaps: string[];
  objections: string[];
}

const names = (ids: readonly string[]) => [...new Set(ids)].map((id) => getProduct(id as ProductId)?.name ?? id);

// Built only from the account's own record, so every line can be traced to the record page.
export function buildBrief(company: Company | undefined, history: AccountHistory | undefined): CallBrief {
  const owned = new Set<string>(company?.mode === "farming" ? company.ownedProducts : (history?.profile?.ownedProducts ?? []));
  const open = company
    ? company.mode === "farming"
      ? company.recommendedUpgrades
      : company.recommendedBundle.products
    : (history?.productMix.flatMap((p) => p.products) ?? []);

  const objections = history
    ? [
        ...history.competitors.map((c) => `${c.name}: ${c.threat}`),
        ...history.invoices.filter((i) => i.status !== "paid").map((i) => `${i.status === "disputed" ? "Disputed" : "Overdue"} invoice ${i.id}${i.note ? `: ${i.note}` : ""}`),
        ...history.slaIncidents.filter((s) => s.severity !== "P3").map((s) => `${s.id} (${s.severity}): ${s.summary}`),
      ]
    : company
      ? [company.complianceNote]
      : [];

  return {
    whyNow: company?.whyNow ?? history?.profile?.summary ?? "",
    openProducts: names(open.filter((id) => !owned.has(id))),
    meddpiccGaps: history?.meddpicc.filter((m) => m.gap).map((m) => `${m.label}: ${m.gap}`) ?? [],
    objections,
  };
}
