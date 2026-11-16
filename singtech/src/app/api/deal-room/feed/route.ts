import { after, connection } from "next/server";
import { answerAll, getRoomFeed } from "@/lib/dealroom";

let lastSync = 0;

// The page polls this every 3s. The same Chatter read finds questions typed straight into Chatter; they are answered after the response is sent.
// shortcut: one Chatter read per poll counts against the Developer Edition's 15,000 daily API calls (about 1,200 an hour with one viewer); move to a Chatter push topic if the room stays open all day.
export async function GET() {
  await connection(); // live data: never prerender this at build time
  const { messages, live, pending } = await getRoomFeed();
  if (pending.length && Date.now() - lastSync > 3_000) {
    lastSync = Date.now();
    after(() => answerAll(pending).catch(() => 0));
  }
  return Response.json({ messages, live });
}
