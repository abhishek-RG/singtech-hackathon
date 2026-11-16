import { refineLeadWithClaude } from "@/lib/claude";
import { synthesizeLead } from "@/lib/offline-engine";
import { buildAuditRecord, sanitizeEnterprisePayload } from "@/lib/pii-redactor";
import { CORRIDORS } from "@/lib/labels";
import { AnalyzeCompanyRequestSchema, type AnalyzeCompanyResponse } from "@/types/singtech";

export async function POST(request: Request) {
  const started = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = AnalyzeCompanyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  }
  const input = parsed.data;

  // The privacy gate runs before anything leaves this server; only sanitized text reaches Claude.
  const brief = [
    `Company: ${input.companyName}`,
    `Website: ${input.websiteUrl}`,
    `Corridor: ${CORRIDORS[input.corridor]}`,
    input.notes ? `Rep notes: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const { record: audit, sanitizedText } = buildAuditRecord(brief, "analyze-company");

  const offline = synthesizeLead({
    ...input,
    companyName: sanitizeEnterprisePayload(input.companyName).sanitizedText,
    notes: input.notes && sanitizeEnterprisePayload(input.notes).sanitizedText,
  });
  const refined = await refineLeadWithClaude(offline, sanitizedText);

  const response: AnalyzeCompanyResponse = {
    lead: refined ?? offline,
    engine: refined ? "claude" : "offline-engine",
    latencyMs: Math.round(performance.now() - started),
    audit,
  };
  return Response.json(response);
}
