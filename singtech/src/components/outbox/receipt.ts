import type { CrmReceipt } from "@/types/singtech";

// Plain-language dispatch outcome; the Outbox shows the full payload behind it.
export const receiptText = (r: CrmReceipt) =>
  r.status === "DELIVERED"
    ? `Delivered to ${r.deliveredTo.map((d) => (d === "slack" ? "Slack" : "Salesforce")).join(" and ")}`
    : r.status === "FAILED"
      ? "Delivery failed, saved to Outbox"
      : "Saved to Outbox, not sent: no Slack or Salesforce webhook configured";
