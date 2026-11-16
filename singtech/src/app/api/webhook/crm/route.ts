import { formatSgd, newId } from "@/lib/format";
import { buildAuditRecord, sanitizeEnterprisePayload } from "@/lib/pii-redactor";
import { webhookUrl } from "@/lib/webhooks";
import { CrmWebhookRequestSchema, type CrmReceipt } from "@/types/singtech";

const CHANNEL = "#singtel-cosell-deal-room";
const TIMEOUT_MS = 5_000;

async function post(url: string, payload: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CrmWebhookRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  }
  const deal = parsed.data;
  const clean = (s: string) => sanitizeEnterprisePayload(s).sanitizedText;
  const ticketId = newId("SGT-DEAL").toUpperCase();

  const summary = [
    `Co-Sell deal: ${deal.companyName}`,
    `Corridor: ${deal.corridor}`,
    `Bundle: ${deal.bundleName} (${formatSgd(deal.estimatedArrSgd)} ARR)`,
    `Next action: ${deal.nextAction}`,
    `Compliance: ${deal.complianceFlags.join(", ") || "None flagged"}`,
  ].join("\n");
  const { record: audit, sanitizedText } = buildAuditRecord(summary, "webhook-crm");

  // Built once: these exact bodies are what gets posted and what the Outbox shows.
  const slackBody = { text: `*${ticketId}*\n${sanitizedText}` };
  const salesforceBody = {
    ticketId,
    companyName: clean(deal.companyName),
    corridor: clean(deal.corridor),
    bundleName: clean(deal.bundleName),
    estimatedArrSgd: deal.estimatedArrSgd,
    nextAction: clean(deal.nextAction),
    complianceFlags: deal.complianceFlags,
  };

  const slack = webhookUrl("SLACK_WEBHOOK_URL");
  const salesforce = webhookUrl("SALESFORCE_WEBHOOK_URL");
  const [slackOk, salesforceOk] = await Promise.all([
    slack ? post(slack, slackBody) : Promise.resolve(false),
    salesforce ? post(salesforce, salesforceBody) : Promise.resolve(false),
  ]);

  const deliveredTo: CrmReceipt["deliveredTo"] = [...(slackOk ? ["slack" as const] : []), ...(salesforceOk ? ["salesforce" as const] : [])];
  const receipt: CrmReceipt = {
    status: !slack && !salesforce ? "SIMULATED" : deliveredTo.length ? "DELIVERED" : "FAILED",
    ticketId,
    timestamp: new Date().toISOString(),
    channel: CHANNEL,
    deliveredTo,
    destinations: [
      { name: "slack", configured: Boolean(slack), delivered: slackOk },
      { name: "salesforce", configured: Boolean(salesforce), delivered: salesforceOk },
    ],
    payloads: { slack: JSON.stringify(slackBody, null, 2), salesforce: JSON.stringify(salesforceBody, null, 2) },
    audit,
  };
  return Response.json(receipt);
}
