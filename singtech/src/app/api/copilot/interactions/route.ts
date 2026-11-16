import { connection } from "next/server";
import { getCompany } from "@/lib/data-service";
import { getAccountHistory } from "@/lib/history";
import { addRepInteraction, readRepInteractions } from "@/lib/interactions-store";
import { RepInteractionSchema } from "@/lib/timeline";

const ACCOUNT_ID = /^(acct|lead)-[a-z0-9-]{1,100}$/;
const MAX_BODY_BYTES = 80_000;
const fail = (status: number, error: string) => Response.json({ error }, { status });
const isKnown = (id: string) => Boolean(getAccountHistory(id) ?? getCompany(id));

// GET ?accountId=: the rep's own entries for one account. Records and sample interactions are built in the browser.
export async function GET(request: Request) {
  await connection();
  const accountId = new URL(request.url).searchParams.get("accountId") ?? "";
  if (!ACCOUNT_ID.test(accountId) || !isKnown(accountId)) return fail(400, "Unknown account.");
  return Response.json({ interactions: await readRepInteractions(accountId) });
}

// POST: add one email, note, transcript or read file to an account's timeline. Stored on this server only.
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413, "Entries up to 50,000 characters.");
  const parsed = RepInteractionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Check the entry and try again.");
  if (!isKnown(parsed.data.accountId)) return fail(400, "Unknown account.");
  try {
    return Response.json({ interaction: await addRepInteraction(parsed.data) });
  } catch (e) {
    console.error("Saving the timeline entry failed:", e instanceof Error ? e.message : e);
    return fail(500, "The entry could not be saved. Try again.");
  }
}
