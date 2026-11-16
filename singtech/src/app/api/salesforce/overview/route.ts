import { connection } from "next/server";
import { getRoomFeed } from "@/lib/dealroom";
import { readRecords } from "@/lib/local-store";
import { isSalesforceConfigured, recordUrl, sf } from "@/lib/salesforce";

interface Opp {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  NextStep: string | null;
  LastModifiedDate: string;
  Account: { Name: string } | null;
}
interface Acct {
  Id: string;
  Name: string;
  LastModifiedDate: string;
}
interface Receipt {
  at: string;
  companyId: string;
  kind?: string;
  result: { status: string; opportunityUrl?: string; accountUrl?: string; error?: string };
}

// shortcut: one shared 15 s copy for every viewer (3 REST calls per refresh); a push topic would make it live.
let cache: { at: number; body: unknown } | null = null;

// The in-site Salesforce view: the org's open pipeline, recent accounts and the deal room, read as SingTech AI.
// Salesforce forbids framing its own pages (X-Frame-Options: DENY), so this is the contained, live alternative.
export async function GET() {
  await connection(); // live data: never prerender this at build time
  if (cache && Date.now() - cache.at < 15_000) return Response.json(cache.body);
  const receipts = (await readRecords<Receipt>("crm.json")).slice(0, 12); // stored newest first
  if (!isSalesforceConfigured()) return Response.json({ connected: false, receipts, opportunities: [], accounts: [], room: [] });
  try {
    const q = (soql: string) => sf<{ records: unknown[] }>(`/query?q=${encodeURIComponent(soql)}`);
    const [opps, accts, room] = await Promise.all([
      q("SELECT Id, Name, StageName, Amount, CloseDate, NextStep, LastModifiedDate, Account.Name FROM Opportunity WHERE IsClosed = false ORDER BY LastModifiedDate DESC LIMIT 25"),
      q("SELECT Id, Name, LastModifiedDate FROM Account ORDER BY LastModifiedDate DESC LIMIT 12"),
      getRoomFeed(),
    ]);
    const body = {
      connected: true,
      receipts,
      opportunities: (opps.records as Opp[]).map((o) => ({ id: o.Id, name: o.Name, stage: o.StageName, amount: o.Amount, closeDate: o.CloseDate, nextStep: o.NextStep, account: o.Account?.Name ?? "", updated: o.LastModifiedDate, url: recordUrl(o.Id) })),
      accounts: (accts.records as Acct[]).map((a) => ({ id: a.Id, name: a.Name, updated: a.LastModifiedDate, url: recordUrl(a.Id) })),
      room: room.messages.slice(0, 8).map((m) => ({ id: m.id, author: m.author, text: m.text.slice(0, 280), createdAt: m.createdAt, replies: m.replies.length })),
    };
    cache = { at: Date.now(), body };
    return Response.json(body);
  } catch (e) {
    return Response.json({ connected: false, error: e instanceof Error ? e.message.slice(0, 160) : "Salesforce error", receipts, opportunities: [], accounts: [], room: [] });
  }
}
