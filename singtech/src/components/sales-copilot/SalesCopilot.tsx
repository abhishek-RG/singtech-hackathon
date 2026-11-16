"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Selector } from "@astryxdesign/core/Selector";
import { History, Plus, Sparkles } from "lucide-react";
import { getProduct } from "@/lib/data-service";
import { accountDocuments, accountTimeline, type RepInteraction } from "@/lib/timeline";
import type { ProductId } from "@/types/singtech";
import { useAccountRecords } from "../account/records";
import { PageHero } from "../ui/Panel";
import { useToday } from "../ui/use-today";
import { CopilotIntelligence } from "./CopilotIntelligence";
import { CopilotTimeline } from "./CopilotTimeline";

type View = "timeline" | "intelligence";

// Sales Copilot: pick an enterprise, read its whole history on one timeline, and ask questions grounded in it.
export function SalesCopilot() {
  const records = useAccountRecords();
  const params = useSearchParams();
  const router = useRouter();
  const today = useToday() ?? "2026-11-16";
  const ordered = useMemo(() => [...records].sort((a, b) => Number(b.isCustomer) - Number(a.isCustomer) || a.name.localeCompare(b.name)), [records]);
  const accountId = params.get("account") ?? ordered[0]?.id ?? "";
  const record = ordered.find((r) => r.id === accountId) ?? ordered[0];
  const [view, setView] = useState<View>(params.get("view") === "intelligence" ? "intelligence" : "timeline");
  // Saved entries are kept with the account they were loaded for, so switching accounts never shows the previous list.
  const [saved, setSaved] = useState<{ id: string; list: RepInteraction[]; error?: string }>({ id: "", list: [] });
  const recordId = record?.id;
  const rep = useMemo(() => (saved.id === recordId ? saved.list : []), [saved, recordId]);
  const loadError = saved.id === recordId ? saved.error : undefined;

  useEffect(() => {
    if (!recordId) return;
    const ctrl = new AbortController();
    fetch(`/api/copilot/interactions?accountId=${encodeURIComponent(recordId)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { interactions: RepInteraction[] }) => setSaved({ id: recordId, list: d.interactions }))
      .catch((e: Error) => e.name !== "AbortError" && setSaved({ id: recordId, list: [], error: "Your saved entries could not be loaded. The records below are still complete." }));
    return () => ctrl.abort();
  }, [recordId]);

  const company = record?.company;
  const owned = useMemo<ProductId[]>(() => (company?.mode === "farming" ? company.ownedProducts : (record?.history?.profile?.ownedProducts ?? [])), [company, record]);
  const events = useMemo(() => (record ? accountTimeline({ history: record.history, company, rep }) : []), [record, company, rep]);
  const documents = useMemo(() => {
    if (!record) return [];
    const suggested: ProductId[] = company ? (company.mode === "farming" ? company.recommendedUpgrades : company.recommendedBundle.products) : [];
    return accountDocuments({ history: record.history, company, rep }, [...new Set([...owned, ...suggested])]);
  }, [record, company, rep, owned]);
  if (!record) return null;

  const select = (id: string) => router.replace(`/sales-copilot?account=${encodeURIComponent(id)}${view === "intelligence" ? "&view=intelligence" : ""}`, { scroll: false });
  const added = (r: RepInteraction) => setSaved((s) => ({ id: r.accountId, list: [r, ...(s.id === r.accountId ? s.list : [])] }));
  const place = company ? `${company.industryLabel}, ${company.hubLabel}` : record.history?.profile ? `${record.history.profile.industryLabel}, ${record.history.profile.hqLabel}` : "";
  const navButton = (v: View, label: string, Icon: typeof History, count?: number) => (
    <button type="button" onClick={() => setView(v)} aria-current={view === v ? "page" : undefined} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] ${view === v ? "bg-st-red-fill font-semibold text-st-red-ink" : "text-secondary hover:bg-st-hover hover:text-primary"}`}>
      <Icon aria-hidden className="size-4" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="tabular text-[12px]">{count}</span>}
    </button>
  );

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero title="Sales Copilot" subtitle="Every email, call, message, bill and case for one enterprise on a single timeline, with answers grounded in that history." />
      <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside aria-label="Customer workspace sections" className="st-card space-y-3 p-4 lg:sticky lg:top-[72px]">
          <div>
            <Selector
              label="Enterprise"
              hasSearch
              size="sm"
              width="100%"
              value={record.id}
              onChange={select}
              options={ordered.map((r) => ({ value: r.id, label: r.name, description: r.isCustomer ? "Customer, Sample account" : "Prospect" }))}
            />
            <p className="mt-1.5 text-[12px] text-secondary">{place}</p>
          </div>
          <Link href="/accounts/prospects/new" className="flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
            <Plus aria-hidden className="size-4" /> Add enterprise
          </Link>
          <div className="border-t border-st-line pt-3">
            <p className="mb-1 text-[12px] font-semibold text-secondary">Customer record</p>
            {navButton("timeline", "Timeline", History, events.length)}
            {navButton("intelligence", "Intelligence", Sparkles)}
          </div>
          <div className="border-t border-st-line pt-3">
            <p className="mb-1.5 text-[12px] font-semibold text-secondary">Current services</p>
            {owned.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {owned.map((id) => (
                  <li key={id} className="rounded-full bg-st-red-fill px-2 py-0.5 text-[12px] text-st-red-ink">
                    {getProduct(id)?.shortName ?? id}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-secondary">Not a Singtel customer yet.</p>
            )}
          </div>
        </aside>
        <section aria-label={view === "timeline" ? "Timeline" : "Intelligence"} className="min-w-0">
          {loadError && (
            <p role="alert" className="mb-3 text-[13px] text-st-red-ink">
              {loadError}
            </p>
          )}
          {view === "timeline" ? (
            <CopilotTimeline key={record.id} accountId={record.id} events={events} documents={documents} today={today} onAdded={added} />
          ) : (
            <CopilotIntelligence key={record.id} accountId={record.id} name={record.name} history={record.history} eventCount={events.length} docCount={documents.length} today={today} onAdded={added} />
          )}
        </section>
      </div>
    </div>
  );
}
