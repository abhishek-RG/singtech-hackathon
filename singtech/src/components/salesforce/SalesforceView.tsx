"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, CloudUpload, MessagesSquare, Radar, UserCheck } from "lucide-react";
import { formatSgdCompact } from "@/lib/format";
import { formatDate } from "../ui/dates";
import { GlassStats, PageHero, Panel, StatusWord } from "../ui/Panel";

interface Overview {
  connected: boolean;
  error?: string;
  opportunities: { id: string; name: string; stage: string; amount: number | null; closeDate: string; nextStep: string | null; account: string; updated: string; url: string }[];
  accounts: { id: string; name: string; updated: string; url: string }[];
  room: { id: string; author: string; text: string; createdAt: string; replies: number }[];
  receipts: { at: string; companyId: string; kind?: string; result: { status: string; opportunityUrl?: string; accountUrl?: string; error?: string } }[];
}

const POLL_MS = 20_000;
const external = "inline-flex items-center gap-0.5 font-medium text-primary underline";

// How work moves from SingTech into Salesforce; the counts come from this server's push receipts.
function Workflow({ data }: { data: Overview }) {
  const synced = data.receipts.filter((r) => r.result.status === "synced");
  const steps = [
    { icon: Radar, title: "Signal or account", detail: "News trigger, usage alert or a renewal window" },
    { icon: UserCheck, title: "Rep reviews in SingTech", detail: "Record, proposal or the AI's cited answer" },
    { icon: CheckCircle2, title: "Rep approves", detail: "Nothing is written without this click" },
    { icon: CloudUpload, title: "Salesforce updated", detail: `${synced.length} recent pushes synced: Account, Opportunity, next step` },
    { icon: MessagesSquare, title: "Deal room", detail: `${data.room.length} recent posts; SingTech AI answers questions there` },
  ];
  return (
    <Panel title="How SingTech works with Salesforce">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-3">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-primary">
              <span className="flex size-6 items-center justify-center rounded-full bg-st-red-fill text-st-red-ink">
                <s.icon aria-hidden className="size-3.5" />
              </span>
              {i + 1}. {s.title}
            </span>
            <span className="mt-1 block text-[12px] text-secondary">{s.detail}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function SalesforceView() {
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/salesforce/overview", { cache: "no-store" });
        setData((await res.json()) as Overview);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    };
    void load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const pipeline = data?.opportunities.reduce((s, o) => s + (o.amount ?? 0), 0) ?? 0;
  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero
        title="Salesforce"
        subtitle="Live from your Salesforce org, read as SingTech AI. Salesforce does not allow its own pages inside other sites, so the records show here, each with a link to open it in Salesforce."
        actions={
          data ? (
            <StatusWord tone={data.connected ? "verified" : "warning"}>{data.connected ? "Connected to Salesforce" : "Not connected to Salesforce"}</StatusWord>
          ) : (
            <span className="text-[12px] text-secondary">Connecting</span>
          )
        }
      >
        <GlassStats
          items={[
            { label: "Open opportunities", value: data?.opportunities.length ?? "...", note: "Not closed, newest first" },
            { label: "Open pipeline", value: data ? formatSgdCompact(pipeline) : "...", note: "Amounts as entered in Salesforce" },
            { label: "Pushed from SingTech", value: data?.receipts.filter((r) => r.result.status === "synced").length ?? "...", note: "Recent approved pushes" },
            { label: "Deal room posts", value: data?.room.length ?? "...", note: "Latest in the Chatter group" },
          ]}
        />
      </PageHero>

      {failed && <p role="alert" className="text-[13px] text-st-red-ink">The Salesforce view could not load. Check the connection and refresh.</p>}
      {data?.error && <p role="alert" className="text-[13px] text-st-red-ink">Salesforce returned an error: {data.error}</p>}
      {data && <Workflow data={data} />}

      <div className="grid grid-cols-12 gap-4">
        <Panel title="Open opportunities" className="col-span-12 xl:col-span-8" bodyClassName="p-0">
          {!data ? (
            <p className="p-4 text-[13px] text-secondary">Loading opportunities.</p>
          ) : data.opportunities.length === 0 ? (
            <p className="p-4 text-[13px] text-secondary">No open opportunities in Salesforce yet. Push an account from its record page to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead className="bg-[#f8fafc] text-left text-[12px] text-[#344054]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Opportunity</th>
                    <th className="px-4 py-2 font-semibold">Stage</th>
                    <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    <th className="px-4 py-2 font-semibold">Close</th>
                    <th className="px-4 py-2 font-semibold">Next step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0f4]">
                  {data.opportunities.map((o) => (
                    <tr key={o.id} className="align-top">
                      <td className="px-4 py-2.5">
                        <a href={o.url} target="_blank" rel="noopener noreferrer" className={external}>
                          {o.name} <ArrowUpRight aria-hidden className="size-3" />
                        </a>
                        <span className="block text-[12px] text-secondary">{o.account}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{o.stage}</td>
                      <td className="tabular px-4 py-2.5 text-right whitespace-nowrap">{o.amount ? formatSgdCompact(o.amount) : "None"}</td>
                      <td className="tabular px-4 py-2.5 whitespace-nowrap">{formatDate(o.closeDate)}</td>
                      <td className="px-4 py-2.5 text-secondary">{o.nextStep ?? "Not set"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <Panel title="Deal room" action={<Link href="/deal-room" target="_blank" className={external}>Open <ArrowUpRight aria-hidden className="size-3" /></Link>} bodyClassName="p-0">
            <ul className="divide-y divide-[#eef0f4]">
              {(data?.room ?? []).map((m) => (
                <li key={m.id} className="px-4 py-2.5 text-[13px]">
                  <span className="flex justify-between gap-2 text-[12px] text-secondary">
                    <span className="font-semibold text-primary">{m.author}</span>
                    <span>{m.replies ? `${m.replies} repl${m.replies === 1 ? "y" : "ies"}` : "No reply yet"}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-primary">{m.text}</span>
                </li>
              ))}
              {data && data.room.length === 0 && <li className="px-4 py-3 text-[13px] text-secondary">No posts yet.</li>}
            </ul>
          </Panel>
          <Panel title="Pushed from SingTech" bodyClassName="p-0">
            <ul className="divide-y divide-[#eef0f4]">
              {(data?.receipts ?? []).slice(0, 6).map((r, i) => {
                const url = r.result.opportunityUrl ?? r.result.accountUrl;
                return (
                  <li key={`${r.at}-${i}`} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[13px]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-primary">{r.companyId.replace(/^(acct|lead)-/, "").replace(/-/g, " ")}</span>
                      <span className="block text-[12px] text-secondary">
                        {r.kind === "update" ? "Account update" : "Account and opportunity"}, {formatDate(r.at)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <StatusWord tone={r.result.status === "synced" ? "verified" : "warning"}>{r.result.status === "synced" ? "Synced" : "Not synced"}</StatusWord>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className={`${external} text-[12px]`}>
                          Open <ArrowUpRight aria-hidden className="size-3" />
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
              {data && data.receipts.length === 0 && <li className="px-4 py-3 text-[13px] text-secondary">Nothing pushed from SingTech yet.</li>}
            </ul>
          </Panel>
          <Panel title="Recently updated accounts" bodyClassName="p-0">
            <ul className="divide-y divide-[#eef0f4]">
              {(data?.accounts ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 aria-hidden className="size-4 shrink-0 text-secondary" />
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">
                      {a.name}
                    </a>
                  </span>
                  <span className="tabular shrink-0 text-[12px] text-secondary">{formatDate(a.updated)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
