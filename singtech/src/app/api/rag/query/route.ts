import { buildAuditRecord } from "@/lib/pii-redactor";
import { RagBodySchema, runRag } from "@/lib/rag";

export async function POST(request: Request) {
  const parsed = RagBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question between 2 and 1000 characters." }, { status: 400 });
  const { record: audit } = buildAuditRecord(`${parsed.data.question}\n${parsed.data.context ?? ""}`, "rag-query");
  return Response.json({ ...(await runRag(parsed.data)), audit });
}
