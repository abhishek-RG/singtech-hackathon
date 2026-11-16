import { answerPending } from "@/lib/dealroom";

// Answers unanswered @SingTech questions in the Chatter deal room. Called by the deal-room page poll or a cron.
export async function POST() {
  try {
    return Response.json({ answered: await answerPending() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message.slice(0, 160) : "sync failed" }, { status: 502 });
  }
}

export const GET = POST;
