import { z } from "zod";
import { answerPost, postRoomMessage, questionText } from "@/lib/dealroom";
import { buildAuditRecord } from "@/lib/pii-redactor";
import { runRag } from "@/lib/rag";

const BodySchema = z
  .object({
    name: z.string().trim().max(40).default(""),
    text: z.string().trim().min(2).max(500),
  })
  .strict();

// shortcut: per-process in-memory rate limit (5 posts per minute per IP); use a shared store if this ever runs on more than one instance.
const hits = new Map<string, number[]>();
const enc = new TextEncoder();

// Posts to Chatter and streams the answer to the page while the same answer is written back to Chatter.
export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 5) return Response.json({ error: "Too many messages. Wait a minute." }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Write between 2 and 500 characters." }, { status: 400 });
  const { record: audit } = buildAuditRecord(parsed.data.text, "deal-room");
  // Everything typed in the deal room is addressed to SingTech AI, so every message gets an answer.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The page went away; the Chatter reply still completes.
        }
      };
      // The answer is written while the question is posted to Chatter; the reply follows as soon as both are done.
      const answer = runRag({ question: questionText(parsed.data.text), sessionId: `room-${Date.now().toString(36)}` }, ({ type, ...data }) => send(type, data));
      try {
        const posted = await postRoomMessage(parsed.data.name || "Guest", parsed.data.text);
        send("posted", { id: posted.id, live: posted.live, audit });
        await answerPost(posted.id, posted.text, posted.live, undefined, answer);
        send("replied", { live: posted.live });
      } catch {
        send("error", { message: "The answer could not be posted. The bot will retry on the next sync." });
      }
      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
