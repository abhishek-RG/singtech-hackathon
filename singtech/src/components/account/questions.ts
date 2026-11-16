import type { AccountHistory } from "@/lib/history";
import type { Company } from "@/types/singtech";

// Suggested questions come from the account's own data, so each one has a record that can answer it.
export function suggestedQuestions(name: string, history?: AccountHistory, company?: Company): string[] {
  if (history) {
    const invoice = history.invoices.find((i) => i.status !== "paid") ?? history.invoices.at(-1);
    const gap = history.meddpicc.find((m) => m.gap);
    const rival = history.competitors[0];
    return [
      invoice && `Status of ${invoice.id}`,
      gap && `How do we close the ${gap.label} gap on ${name}?`,
      rival && `How should we position against ${rival.name} at ${name}?`,
      history.billing.system === "SAP-to-Oracle" ? `What billing friction does the SAP to Oracle move cause for ${name}?` : `When does ${name} renew, and what should we land before then?`,
    ].filter((q): q is string => Boolean(q));
  }
  return [
    `What do we know about ${name}?`,
    `Which Singtel products fit ${name} and why?`,
    company ? `What compliance rules apply to ${name} on the ${company.corridorLabel.replace("<->", "to")} corridor?` : `What compliance rules apply to ${name}?`,
  ];
}
