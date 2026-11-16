"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { FileText, PanelRightOpen, X } from "lucide-react";
import { getProduct } from "@/lib/data-service";
import { formatMinutesAgo, formatSgd, formatSgdCompact } from "@/lib/format";
import { getAccountHistory } from "@/lib/history";
import { useAppStore } from "@/state/app-store";
import type { Company, FarmingAccount } from "@/types/singtech";
import { FeasibilityBadge, MeddpiccBadge, RenewalFlag } from "../account/badges";
import { SignalsList, SourceLink } from "../account/AccountRecord";
import { recordHref } from "../account/records";
import { ChartCanvas, PALETTE } from "../charts/ChartCanvas";
import { CompanyLogo } from "../ui/CompanyLogo";
import { SectionTitle, StatusWord } from "../ui/Panel";

const SEVERITY_TONE = { critical: "critical", high: "warning", medium: "neutral" } as const;

function UsageTrend({ account }: { account: FarmingAccount }) {
  const t = account.usageTrend;
  const data = useMemo(
    () => ({
      labels: t.points.map((_, i) => (i === t.points.length - 1 ? "Today" : `D-${t.points.length - 1 - i}`)),
      datasets: [
        { label: t.label, data: t.points, borderColor: PALETTE.ink, backgroundColor: "transparent", tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
        { label: "Threshold", data: t.points.map(() => t.threshold), borderColor: PALETTE.red, borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false },
      ],
    }),
    [t],
  );
  const options = useMemo(
    () => ({
      interaction: { mode: "index" as const, intersect: false },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 5 } }, y: { ticks: { maxTicksLimit: 4 } } },
      plugins: { tooltip: { callbacks: { label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) => `${c.dataset.label}: ${c.parsed.y} ${t.unit}` } } },
    }),
    [t.unit],
  );
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <SectionTitle>{t.label}, last 14 days</SectionTitle>
        <span className="text-[12px] text-secondary">Sample data</span>
      </div>
      <ChartCanvas type="line" data={data} options={options} label={`${t.label} over 14 days, now ${t.points.at(-1)} ${t.unit} against a ${t.threshold} ${t.unit} threshold`} className="h-36" />
    </section>
  );
}

// Quick view only: the full CRM record with history tabs lives at /accounts/<id>.
export function LeadPanel({ company, onClose }: { company: Company; onClose?: () => void }) {
  const { statuses, setStatus, liveAlertIds } = useAppStore();
  const status = statuses[company.id] ?? "open";
  const [tab, setTab] = useState("summary");
  const [draft, setDraft] = useState(company.draftOutreach);
  const history = getAccountHistory(company.id);

  const bundle = company.recommendedBundle;
  const entry = status === "downsold";
  const products = entry ? bundle.starterDownsellBundle : bundle.products;
  const arr = entry ? bundle.starterArrSgd : bundle.estimatedArrSgd;
  const existing = company.mode === "farming";

  const stats = [
    existing ? { label: "Current ARR", value: formatSgdCompact(company.currentArrSgd) } : { label: "Type", value: "Prospect" },
    { label: entry ? "Fast-track ARR" : "Upside", value: formatSgdCompact(arr) },
    existing ? { label: "Renewal", value: `${company.contractRenewalDays} days` } : { label: "Corridor", value: company.corridorLabel.split("<->").at(-1)!.trim() },
    { label: "Priority", value: `${company.priorityScore}` },
  ];

  return (
    <article className="flex min-h-full flex-col bg-surface" aria-label={`${company.companyName} quick view`}>
      <header className="space-y-3 border-b border-st-line px-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CompanyLogo id={company.id} name={company.companyName} size={40} />
            <div className="min-w-0">
              <p className="text-[12px] text-secondary">
                {existing ? "Customer" : "Prospect"}
                {company.isDemoAccount ? ", Sample account" : ""}
              </p>
              <h2 className="text-[18px] leading-tight font-semibold text-primary">{company.companyName}</h2>
              <p className="text-[13px] text-secondary">
                {company.hubLabel}, {company.industryLabel}
              </p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close quick view" className="-mr-2 rounded-md p-2 text-secondary hover:bg-st-hover">
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-y-2 sm:grid-cols-4 sm:divide-x sm:divide-st-line">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 sm:px-3 sm:first:pl-0">
              <dt className="truncate text-[12px] text-secondary">{s.label}</dt>
              <dd className="tabular truncate text-[15px] text-primary">{s.value}</dd>
            </div>
          ))}
        </dl>
        {history && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <MeddpiccBadge history={history} />
            <FeasibilityBadge history={history} />
            <RenewalFlag contractEndDate={history.contractEndDate} />
          </div>
        )}
        <TabList value={tab} onChange={setTab} role="tablist" size="sm">
          <Tab value="summary" label="Summary" panelId="pb-summary" />
          <Tab value="bundle" label="Bundle" panelId="pb-bundle" />
          <Tab value="outreach" label="Outreach draft" panelId="pb-outreach" />
        </TabList>
      </header>

      <div className="flex-1 px-5 py-4">
        {tab === "summary" && (
          <div id="pb-summary" role="tabpanel" className="space-y-5">
            <section>
              <SectionTitle>Why now</SectionTitle>
              <p className="text-[14px] leading-relaxed text-primary">{company.whyNow}</p>
            </section>
            {existing && <UsageTrend account={company} />}
            {existing && company.telemetryAlerts.length > 0 && (
              <section>
                <SectionTitle>Usage signals (sample data)</SectionTitle>
                <ul className="divide-y divide-st-line">
                  {company.telemetryAlerts.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                      <span className="min-w-0">
                        <span className="block font-medium text-primary">{a.metric}</span>
                        <span className="block text-secondary">
                          {a.currentValue}, threshold {a.threshold}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <StatusWord tone={SEVERITY_TONE[a.severity]}>{a.severity === "critical" ? "Critical" : a.severity === "high" ? "High" : "Medium"}</StatusWord>
                        <span className="text-[12px] text-secondary">{liveAlertIds.has(a.id) ? "Just now" : formatMinutesAgo(a.minutesAgo)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <SectionTitle>Evidence</SectionTitle>
              <SignalsList company={company} />
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <SectionTitle>Warm path</SectionTitle>
                {company.coSellPath ? (
                  <p className="text-[13px] text-primary">
                    <span className="mr-1.5 inline-block align-middle">
                      <CompanyLogo name={company.coSellPath.partner} size={20} />
                    </span>
                    <span className="font-semibold">{company.coSellPath.partner}.</span> {company.coSellPath.note} <SourceLink source={company.coSellPath.source} />
                  </p>
                ) : (
                  <p className="text-[13px] text-primary">{company.decisionMaker.entryRoute}</p>
                )}
              </div>
              <div>
                <SectionTitle>Who to engage</SectionTitle>
                <p className="text-[13px] font-semibold text-primary">{company.decisionMaker.targetTitle}</p>
                <p className="text-[13px] text-secondary">{company.nextAction}</p>
              </div>
            </section>
          </div>
        )}

        {tab === "bundle" && (
          <div id="pb-bundle" role="tabpanel" className="space-y-5">
            <SegmentedControl label="Bundle option" size="sm" value={entry ? "entry" : "full"} onChange={(v) => setStatus(company.id, v === "entry" ? "downsold" : "open")}>
              <SegmentedControlItem value="full" label="Full bundle" />
              <SegmentedControlItem value="entry" label="Fast-track entry" />
            </SegmentedControl>
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold text-primary">{entry ? `${bundle.bundleName}: fast-track entry` : bundle.bundleName}</span>
                <span className="tabular text-[14px] text-primary" data-testid="bundle-arr">
                  {formatSgd(arr)}
                </span>
              </div>
              <ul className="divide-y divide-st-line border-y border-st-line">
                {products.map((id) => {
                  const p = getProduct(id)!;
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                      <span className="min-w-0">
                        <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="block font-medium text-primary hover:underline">
                          {p.name}
                        </a>
                        <span className="block text-[12px] text-secondary">{p.division}</span>
                      </span>
                      <span className="tabular shrink-0 text-secondary">{formatSgdCompact(p.indicativeArrSgd)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[12px] text-secondary">Indicative, derived from catalogue ARR. Not Singtel list pricing.</p>
            </section>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" label={status === "qualified" ? "Qualified" : "Mark qualified"} onClick={() => setStatus(company.id, status === "qualified" ? "open" : "qualified")} />
              <Button size="sm" variant="ghost" label={status === "snoozed" ? "Snoozed to next quarter" : "Snooze to next quarter"} onClick={() => setStatus(company.id, status === "snoozed" ? "open" : "snoozed")} />
            </div>
          </div>
        )}

        {tab === "outreach" && (
          <div id="pb-outreach" role="tabpanel" className="space-y-2">
            <TextArea label="Executive message draft" value={draft} onChange={setDraft} rows={12} />
            <p className="text-[12px] text-secondary">A draft for you to review and send from your own mailbox. SingTech never emails a customer.</p>
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 grid gap-2 border-t border-st-line bg-surface px-5 py-3 sm:grid-cols-2">
        <Button variant="primary" label="Open full record" icon={<PanelRightOpen aria-hidden className="size-4" />} href={recordHref(company.id)} as={Link} onClick={onClose} width="100%" />
        <Button label="Build proposal" icon={<FileText aria-hidden className="size-4" />} href={`/proposals/${company.id}`} as={Link} onClick={onClose} width="100%" />
      </footer>
    </article>
  );
}
