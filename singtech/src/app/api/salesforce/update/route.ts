import { z } from "zod";
import { getCompany } from "@/lib/data-service";
import { getAccountHistory } from "@/lib/history";
import { appendRecord } from "@/lib/local-store";
import { buildAuditRecord } from "@/lib/pii-redactor";
import { isSalesforceConfigured, postToFeed, postToGroup, recordUrl, richHtml, upsertAccount } from "@/lib/salesforce";

const BodySchema = z
  .object({
    accountId: z.string().min(1).max(120),
    subject: z.string().trim().min(4).max(200),
    note: z.string().trim().min(10).max(3000),
  })
  .strict();

// Tasks are deliberately omitted: the SingTech AI Salesforce licence cannot create them.
// The approved update is kept in the account feed and the deal room instead.
export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { accountId, subject, note } = parsed.data;
  const name = getCompany(accountId)?.companyName ?? getAccountHistory(accountId)?.accountName;
  if (!name) return Response.json({ error: "Unknown account" }, { status: 404 });

  const { record: audit, sanitizedText: cleanNote } = buildAuditRecord(note, "salesforce-update");
  const cleanSubject = buildAuditRecord(subject, "salesforce-update").sanitizedText;
  let result: { status: "synced" | "local"; accountId?: string; chatterPostId?: string; accountUrl?: string; error?: string; elapsedMs?: number };
  if (isSalesforceConfigured()) {
    try {
      const sfAccountId = await upsertAccount(name, {});
      const blocks = [
        { heading: `Deal room: Update on ${name}`, lines: [cleanSubject] },
        { heading: "Details", lines: cleanNote.split(/\n+/).filter(Boolean).slice(0, 12) },
        { heading: "Record", lines: [recordUrl(sfAccountId)] },
      ];
      const text = `Deal room: Update on ${name}. ${cleanSubject}\n${cleanNote}\nAccount: ${recordUrl(sfAccountId)}`;
      // These independent posts used to run one after another. Starting them together removes one Salesforce round trip
      // from an approved update, while a non-essential Account feed failure still cannot block the deal-room handoff.
      const [groupPost] = await Promise.all([
        postToGroup(text, richHtml(blocks)),
        postToFeed(sfAccountId, text, richHtml(blocks.slice(0, 2))).catch((e) => console.error(`Account feed post skipped: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`)),
      ]);
      result = { status: "synced", accountId: sfAccountId, chatterPostId: groupPost, accountUrl: recordUrl(sfAccountId), elapsedMs: Date.now() - startedAt };
    } catch (e) {
      result = { status: "local", error: e instanceof Error ? e.message.slice(0, 160) : "Salesforce error", elapsedMs: Date.now() - startedAt };
    }
  } else {
    result = { status: "local", error: "Not synced to Salesforce", elapsedMs: Date.now() - startedAt };
  }
  await appendRecord("crm.json", { at: new Date().toISOString(), companyId: accountId, kind: "update", subject: cleanSubject, result });
  return Response.json(
    { ...result, audit },
    { headers: { "Server-Timing": `salesforce;dur=${result.elapsedMs ?? Date.now() - startedAt}` } },
  );
}
