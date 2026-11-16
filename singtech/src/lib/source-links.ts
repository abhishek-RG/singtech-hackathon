import interactionsJson from "@/data/history/interactions.json";
import { findInvoice, getAllHistories, type AccountHistory } from "./history";

// Where a cited SingTech record lives in the app, from its retrieval document ID ("invoice:SGT-INV-2026-8841", "meeting:MTG-...").
// Web sources link to their own URL instead; IDs with no page (playbooks, uploads, rep notes) return undefined.
const owner = (has: (h: AccountHistory) => boolean) => getAllHistories().find(has)?.accountId;
const OVERVIEW: Record<string, string> = { "overview-prospects": "/accounts/prospects", "overview-customers": "/accounts/customers", "overview-health": "/dashboard", "overview-invoices": "/dashboard" };

export function sourceHref(docId: string): string | undefined {
  const at = docId.indexOf(":");
  const kind = at > 0 ? docId.slice(0, at) : "";
  const key = docId.slice(at + 1);
  const account = (id: string | undefined, tab?: string) => id && `/accounts/${id}${tab ? `?tab=${tab}&ev=${encodeURIComponent(key)}` : ""}`;
  switch (kind) {
    case "account":
    case "health":
      return `/accounts/${key}`;
    case "invoice":
      return account(findInvoice(key)?.accountId, "billing");
    case "meeting":
      return account(owner((h) => h.meetings.some((m) => m.id === key)), "meetings");
    case "incident":
      return account(owner((h) => h.slaIncidents.some((s) => s.id === key)), "service");
    case "interaction": {
      const id = (interactionsJson as { id: string; accountId: string }[]).find((i) => i.id === key)?.accountId;
      return id && `/sales-copilot?account=${id}`;
    }
    case "rep":
      return "/insights";
  }
  if (/^(acct|lead)-[a-z0-9-]+$/.test(docId)) return `/accounts/${docId}`;
  return OVERVIEW[docId];
}
