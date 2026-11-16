import { buildAuditRecord } from "@/lib/pii-redactor";
import { RagBodySchema, runRag } from "@/lib/rag";

const enc = new TextEncoder();

// Server-sent events: audit, meta (citations), token (as gemma writes), done. The first token reaches the page in well under a second.
export async function POST(request: Request) {
  const parsed = RagBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question between 2 and 1000 characters." }, { status: 400 });
  const { record: audit } = buildAuditRecord(`${parsed.data.question}\n${parsed.data.context ?? ""}`, "rag-query");
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The reader closed the tab; the answer still finishes so the gateway can cache it.
        }
      };
      send("audit", audit);
      try {
        await runRag(parsed.data, ({ type, ...data }) => send(type, data));
      } catch {
        send("error", { message: "No answer came back. Try again." });
      }
      try {
        controller.close();
      } catch {
        // already closed by the reader
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
