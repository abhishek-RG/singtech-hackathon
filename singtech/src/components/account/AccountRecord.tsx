"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { ArrowUpRight, FileText, Headset } from "lucide-react";
import { getProduct, getRegulation } from "@/lib/data-service";
import { formatSgd, formatSgdCompact } from "@/lib/format";
import { meddpiccTotal } from "@/lib/history";
import { COMPLIANCE_SHORT } from "@/lib/labels";
import type { Company, SourceRef } from "@/types/singtech";
import { useAgent } from "../agent/AgentProvider";
import { CompanyLogo } from "../ui/CompanyLogo";
import { formatDate } from "../ui/dates";
import { GlassStats, PageHero, Panel, SectionTitle } from "../ui/Panel";
import { AskPanel } from "./AskAccount";
import { suggestedQuestions } from "./questions";
import { RecordNews } from "./RecordNews";
import { FeasibilityBadge, MeddpiccBadge, MeddpiccBreakdown, RenewalFlag } from "./badges";
import { evidenceTab, HealthPanel } from "./HealthPanel";
import { BillingTab, CompetitionTab, ContactsPanel, FeasibilityTable, MeetingsTab, ProductMixTab, ServiceTab } from "./HistoryTabs";
import { PushAction } from "./PushAction";
import { useAccountRecord, type AccountRecord } from "./records";

export function SourceLink({ source }: { source: SourceRef }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary underline decoration-st-line underline-offset-2 hover:decoration-current">
      {source.publisher}
      {source.publishedAt ? `, ${formatDate(source.publishedAt)}` : ""}
      <ArrowUpRight aria-hidden className="size-3" />
    </a>
  );
}

// Every claim carries its source link; usage-signal references are sample data and are listed separately.
export function SignalsList({ company }: { company: Company }) {
  const signals = company.signals.filter((s) => s.source.kind !== "simulated-telemetry");
  if (!signals.length) return <p className="text-[13px] text-secondary">No signal found.</p>;
  return (
    <ul className="space-y-2.5">
      {signals.map((s, i) => (
        <li key={i} className="text-[13px] leading-relaxed text-primary">
          {s.claim} <SourceLink source={s.source} />
        </li>
      ))}
    </ul>
  );
}

// White tile behind the logo, outlined so it reads on the light header.
export function LogoTile({ id, name, size = 48 }: { id: string; name: string; size?: 32 | 40 | 48 }) {
  return (
    <span className="st-light shrink-0 rounded-[10px] border border-st-line bg-white p-1">
      <CompanyLogo id={id} name={name} size={size} />
    </span>
  );
}

// One specific next move before the dense history (ported from the Codex prototype). It states the evidence boundary:
// prospect signals are sourced; customer context is sample data.
function NextMove({ record }: { record: AccountRecord }) {
  const { company, history } = record;
  const action = company?.nextAction ?? history?.meetings.at(-1)?.actions[0]?.action ?? "Confirm the next account review with the customer team.";
  const owner = history?.meetings.at(-1)?.actions[0]?.owner;
  const evidence = company?.signals.filter((s) => s.source.kind !== "simulated-telemetry").length ?? 0;
  return (
    <section aria-label="Recommended next move" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-st-line border-l-[3px] border-l-st-red bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-st-red-ink">Recommended next move</p>
        <h2 className="mt-0.5 text-[15px] leading-snug font-semibold text-primary">{action}</h2>
        <p className="mt-0.5 text-[12px] text-secondary">
          {owner ? `Suggested owner: ${owner}` : record.isSample ? "Sample account context; validate with the account team." : `${evidence} sourced signal${evidence === 1 ? "" : "s"} support this priority.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" label="Prepare the conversation" icon={<Headset aria-hidden className="size-4" />} href={`/copilot?account=${record.id}`} as={Link} />
        <Button size="sm" label="Ask about this move" href={`/ai?ask=${encodeURIComponent(`What should I do next with ${record.name}? Use the account evidence and give me a short plan.`)}`} as={Link} />
      </div>
    </section>
  );
}

function Actions({ record }: { record: AccountRecord }) {
  return (
    <>
      <Button label="Call prep" icon={<Headset aria-hidden className="size-4" />} href={`/copilot?account=${record.id}`} as={Link} />
      <Button label="Build proposal" icon={<FileText aria-hidden className="size-4" />} href={`/proposals/${record.id}`} as={Link} />
      <PushAction accountId={record.id} company={record.company} />
    </>
  );
}

function Hero({ record }: { record: AccountRecord }) {
  const { company, history } = record;
  const place = company ? `${company.hubLabel}, ${company.industryLabel}` : history?.profile ? `${history.profile.hqLabel}, ${history.profile.industryLabel}` : "";
  const stats = [
    { label: "Current ARR", value: record.currentArrSgd ? formatSgd(record.currentArrSgd) : "None" },
    company && { label: "Upside (indicative)", value: formatSgd(company.recommendedBundle.estimatedArrSgd) },
    history && { label: "Renewal date", value: formatDate(history.contractEndDate) },
    company && { label: "Priority", value: `${company.priorityScore} of 100` },
    history && { label: "Route", value: history.route === "ncs-multi-lob" ? "NCS multi-LOB" : "Singtel Enterprise", note: history.ncsLobs.join(", ") || undefined },
    history ? { label: "Account executive", value: history.rep.name, note: history.rep.role } : company && { label: "Corridor", value: company.corridorLabel.split("<->").at(-1)!.trim(), note: company.corridorLabel.replace("<->", "to") },
  ].filter((x): x is { label: string; value: string; note?: string } => Boolean(x));
  return (
    <PageHero
      leading={<LogoTile id={record.id} name={record.name} />}
      title={record.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{record.isCustomer ? "Customer" : "Prospect"}</span>
          {record.isSample && <span className="rounded-sm border border-st-line bg-white px-1.5 py-px text-[11px] font-medium text-secondary">Sample account</span>}
          <span>{place}</span>
        </span>
      }
      actions={
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <Actions record={record} />
        </div>
      }
    >
      <GlassStats items={stats} columns={stats.length >= 6 ? 6 : stats.length >= 5 ? 5 : 4} />
      {history && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <MeddpiccBadge history={history} />
          <FeasibilityBadge history={history} />
          <RenewalFlag contractEndDate={history.contractEndDate} />
        </div>
      )}
    </PageHero>
  );
}

function BundlePanel({ company }: { company: Company }) {
  const b = company.recommendedBundle;
  return (
    <Panel title="Recommended bundle" action={<span className="tabular text-[13px] text-primary">{formatSgd(b.estimatedArrSgd)} ARR</span>}>
      <p className="text-[13px] font-medium text-primary">{b.bundleName}</p>
      <ul className="mt-2 divide-y divide-st-line border-y border-st-line">
        {b.products.map((id) => {
          const p = getProduct(id)!;
          return (
            <li key={id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
              <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                {p.name}
              </a>
              <span className="tabular shrink-0 text-secondary">{formatSgdCompact(p.indicativeArrSgd)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-secondary">Indicative, derived from catalogue ARR. Not Singtel list pricing.</p>
      <div className="mt-4">
        <SectionTitle>Compliance</SectionTitle>
        <p className="text-[13px]">
          {company.complianceFlags.map((code, i) => (
            <span key={code}>
              {i > 0 && ", "}
              <a href={getRegulation(code)!.source.url} target="_blank" rel="noopener noreferrer" title={getRegulation(code)!.name} className="text-primary underline decoration-st-line underline-offset-2">
                {COMPLIANCE_SHORT[code]}
              </a>
            </span>
          ))}
        </p>
        <p className="mt-1 text-[12px] text-secondary">{company.complianceNote}</p>
      </div>
    </Panel>
  );
}

function OverviewTab({ record }: { record: AccountRecord }) {
  const { company, history } = record;
  return (
    <div className="space-y-4">
      <Panel title="Why now">
        {company ? (
          <>
            <p className="text-[14px] leading-relaxed text-primary">{company.whyNow}</p>
            <div className="mt-4">
              <SectionTitle>Evidence</SectionTitle>
              <SignalsList company={company} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <SectionTitle>Who to engage</SectionTitle>
                <p className="text-[13px] font-medium text-primary">{company.decisionMaker.targetTitle}</p>
                <p className="text-[13px] text-secondary">{company.decisionMaker.entryRoute}</p>
              </div>
              <div>
                <SectionTitle>Next step</SectionTitle>
                <p className="text-[13px] text-primary">{company.nextAction}</p>
              </div>
            </div>
            {company.coSellPath && (
              <div className="mt-4 flex items-start gap-3 border-t border-st-line pt-4">
                <CompanyLogo name={company.coSellPath.partner} size={32} />
                <div className="min-w-0">
                  <SectionTitle>Warm path: {company.coSellPath.partner}</SectionTitle>
                  <p className="text-[13px] text-primary">
                    {company.coSellPath.note} <SourceLink source={company.coSellPath.source} />
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[14px] leading-relaxed text-primary">{history?.profile?.summary}</p>
        )}
      </Panel>
      <div className="grid gap-4 2xl:grid-cols-2">
        {history && (
          <Panel agentId="meddpicc" title={`MEDDPICC ${meddpiccTotal(history)} of 16`} action={<span className="text-[12px] text-secondary">Gaps in amber</span>}>
            <MeddpiccBreakdown history={history} />
          </Panel>
        )}
        {company && <BundlePanel company={company} />}
      </div>
      {history && <FeasibilityTable history={history} />}
    </div>
  );
}

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "billing", label: "Billing" },
  { value: "meetings", label: "Meetings" },
  { value: "service", label: "Service" },
  { value: "competition", label: "Competition" },
  { value: "mix", label: "Product mix" },
];

export function AccountRecordView({ id }: { id: string }) {
  const record = useAccountRecord(id);
  // ?tab=billing&ev=SGT-INV-... (a cited source) opens that tab and scrolls to the record; clicking a tab overrides the link.
  const params = useSearchParams();
  const linkKey = `${params.get("tab") ?? ""}|${params.get("ev") ?? ""}`;
  const linkedTab = TABS.find((t) => t.value === params.get("tab"))?.value ?? "overview";
  const [picked, setPicked] = useState<{ key: string; tab: string } | null>(null);
  const tab = picked?.key === linkKey ? picked.tab : linkedTab;
  const setTab = (next: string) => setPicked({ key: linkKey, tab: next });
  useEffect(() => {
    const ev = linkKey.split("|")[1];
    if (!ev) return;
    const t = window.setTimeout(() => (document.getElementById(`ev-${ev}`) ?? document.getElementById(`rec-${linkedTab}`))?.scrollIntoView({ block: "center" }), 300);
    return () => window.clearTimeout(t);
  }, [linkKey, linkedTab]);
  const { touchRecent } = useAgent();
  // Keyed on id and name (strings): the record object is rebuilt each render and would loop through the provider.
  const recordId = record?.id;
  const recordName = record?.name;
  useEffect(() => {
    if (recordId && recordName) touchRecent({ id: recordId, name: recordName });
  }, [recordId, recordName, touchRecent]);

  if (!record) {
    return (
      <div className="px-4 py-10 lg:px-6">
        <EmptyState
          title="Account not found"
          description="Prospects added in an earlier session are not kept after a reload. Add the prospect again or pick an account from the list."
          actions={<Button label="All accounts" href="/accounts" as={Link} />}
        />
      </div>
    );
  }

  const { history, company } = record;
  const owned = company?.mode === "farming" ? company.ownedProducts : (history?.profile?.ownedProducts ?? []);
  // Evidence chips switch to the tab that holds the record, then scroll to its row when it has one.
  const showEvidence = (evidenceId: string) => {
    const target = evidenceTab(evidenceId);
    if (target !== "contacts") setTab(target);
    requestAnimationFrame(() => (document.getElementById(`ev-${evidenceId}`) ?? document.getElementById(`rec-${target}`))?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  };
  return (
    <div className="space-y-4 px-4 pt-5 pb-24 lg:px-6 lg:pb-8">
      <Hero record={record} />
      {history ? <HealthPanel accountId={record.id} name={record.name} history={history} onEvidence={showEvidence} /> : <NextMove record={record} />}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 min-w-0 space-y-4 xl:col-span-8">
          {history ? (
            <>
              <div className="rounded-[10px] border border-st-line bg-white px-2">
                <TabList value={tab} onChange={setTab} role="tablist">
                  {TABS.map((t) => (
                    <Tab key={t.value} value={t.value} label={t.label} panelId={`rec-${t.value}`} />
                  ))}
                </TabList>
              </div>
              <div id={`rec-${tab}`} role="tabpanel">
                {tab === "overview" && <OverviewTab record={record} />}
                {tab === "billing" && <BillingTab history={history} />}
                {tab === "meetings" && <MeetingsTab history={history} />}
                {tab === "service" && <ServiceTab history={history} />}
                {tab === "competition" && <CompetitionTab history={history} />}
                {tab === "mix" && <ProductMixTab history={history} owned={owned} />}
              </div>
            </>
          ) : (
            <OverviewTab record={record} />
          )}
        </div>
        <div className="col-span-12 min-w-0 space-y-4 xl:col-span-4">
          {history && <ContactsPanel history={history} />}
          <AskPanel title="Ask about this account" accountId={record.id} suggestions={suggestedQuestions(record.name, history, company)} prefix={`ask-${record.id}`} />
          <RecordNews record={record} />
        </div>
      </div>
      {/* Below 1024px the record actions sit in a sticky bottom bar (CLAUDE.md section 3). */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-st-line bg-white px-4 py-3 lg:hidden">
        <Actions record={record} />
      </div>
    </div>
  );
}
