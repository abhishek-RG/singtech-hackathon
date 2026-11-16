"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Table } from "@astryxdesign/core/Table";
import { Headset, UserPlus } from "lucide-react";
import { getDashboardStats, QUARTER_TARGET_SGD } from "@/lib/data-service";
import { formatSgdCompact } from "@/lib/format";
import { BAND_LABEL, REASON_LABEL, healthFor } from "@/lib/health";
import { daysUntil, isPreRenewalWindow } from "@/lib/history";
import { isHotSignal, useAppStore } from "@/state/app-store";
import { RenewalFlag } from "../account/badges";
import { BAND_TONE } from "../account/HealthPanel";
import { recordHref, useAccountRecords, type AccountRecord } from "../account/records";
import { ChartCanvas, PALETTE } from "../charts/ChartCanvas";
import { CompanyLogo } from "../ui/CompanyLogo";
import { formatDate } from "../ui/dates";
import { GlassStats, PageHero, Panel, StatusWord } from "../ui/Panel";
import { useToday } from "../ui/use-today";
import { pipelineByStage, stageFor, upsideFor, type Stage } from "./pipeline";
import { SignalsPanel } from "./SignalsPanel";

// Deep links (?account=) open the quick view once.
export function OverviewRoute() {
  const params = useSearchParams();
  const { openPlaybook } = useAppStore();
  const account = params.get("account");
  useEffect(() => {
    if (account) openPlaybook(account);
  }, [account, openPlaybook]);
  return <Overview />;
}

interface Item extends Record<string, unknown> {
  record: AccountRecord;
  stage: Stage;
  upside: number;
  nextStep: string;
}

interface Watch extends Record<string, unknown> {
  record: AccountRecord;
  health: ReturnType<typeof healthFor>;
}

function AccountCell({ record }: { record: AccountRecord }) {
  return (
    <span className="flex min-w-[180px] items-center gap-2.5">
      <CompanyLogo id={record.id} name={record.name} size={24} />
      <span className="min-w-0">
        <Link href={recordHref(record.id)} className="block truncate text-[13px] font-medium text-primary hover:underline">
          {record.name}
        </Link>
        <span className="block truncate text-[12px] text-secondary">
          {record.isCustomer ? "Customer" : "Prospect"}
          {record.isSample ? ", Sample account" : ""}
        </span>
      </span>
    </span>
  );
}

function PipelineChart({ items }: { items: Item[] }) {
  const stages = useMemo(() => pipelineByStage(items), [items]);
  const data = useMemo(
    () => ({
      labels: stages.map((s) => `${s.stage} (${s.count})`),
      datasets: [{ label: "Indicative ARR", data: stages.map((s) => s.upside), backgroundColor: PALETTE.ink, borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.8 }],
    }),
    [stages],
  );
  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      scales: {
        x: { grid: { color: PALETTE.line }, ticks: { maxTicksLimit: 5, callback: (v: string | number) => formatSgdCompact(Number(v)).replace("SGD ", "") } },
        y: { grid: { display: false } },
      },
      plugins: { tooltip: { callbacks: { label: (c: { parsed: { x: number | null } }) => `Indicative ARR ${formatSgdCompact(c.parsed.x ?? 0)}` } } },
    }),
    [],
  );
  const summary = stages.map((s) => `${s.stage} ${formatSgdCompact(s.upside)}`).join(", ");
  return <ChartCanvas type="bar" data={data} options={options} label={`Pipeline by stage: ${summary}`} className="h-56" />;
}

function Overview() {
  const { companies, proposals, statuses, feed } = useAppStore();
  const hot = feed.alerts[0] ?? feed.signals.find(isHotSignal);
  const records = useAccountRecords();
  const today = useToday();

  const items: Item[] = useMemo(
    () =>
      records.map((record) => ({
        record,
        stage: stageFor({ isCustomer: record.isCustomer, history: record.history, proposal: proposals[record.id]?.status, leadStatus: statuses[record.id] }),
        upside: upsideFor(record.company, record.history),
        nextStep: record.company?.nextAction ?? record.history?.meetings.at(-1)?.actions[0]?.action ?? "Book the next account review.",
      })),
    [records, proposals, statuses],
  );

  const stats = getDashboardStats(companies);
  const renewals = records
    .filter((r): r is AccountRecord & { history: NonNullable<AccountRecord["history"]> } => Boolean(r.history))
    .sort((a, b) => a.history.contractEndDate.localeCompare(b.history.contractEndDate));
  const within180 = today ? renewals.filter((r) => daysUntil(r.history.contractEndDate, today) <= 180).length : undefined;
  const preRenewal = today ? renewals.filter((r) => isPreRenewalWindow(r.history.contractEndDate, today)).length : undefined;
  // Retention first: the customers with the most revenue at stake lead the page.
  const watchlist = renewals
    .map((record) => ({ record, health: healthFor(record.history) }))
    .sort((a, b) => b.health.revenueAtStakeSgd - a.health.revenueAtStakeSgd || a.health.score - b.health.score);
  const flagged = watchlist.filter((w) => w.health.band !== "healthy");
  const nextSteps = [...items].sort((a, b) => (b.record.company?.priorityScore ?? 0) - (a.record.company?.priorityScore ?? 0)).slice(0, 8);

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero
        tone="red"
        title="Good to see you, Sarah"
        subtitle="Senior Client Partner, Singtel Enterprise (SG). Customers below are sample accounts; prospects are real companies with sourced signals."
        actions={
          <>
            <Button label="Add prospect" icon={<UserPlus aria-hidden className="size-4" />} href="/accounts/prospects/new" as={Link} />
            <Button variant="primary" label="Ask the co-pilot" icon={<Headset aria-hidden className="size-4" />} href="/copilot" as={Link} />
          </>
        }
      >
        <GlassStats
          items={[
          { label: "Open pipeline", value: formatSgdCompact(items.reduce((s, i) => s + i.upside, 0)), note: `${items.length} accounts, indicative ARR` },
          { label: "Weighted forecast", value: formatSgdCompact(stats.weightedForecastSgd), note: `${stats.attainmentPct}% of ${formatSgdCompact(QUARTER_TARGET_SGD)} quarterly target` },
          { label: "Renewals in 180 days", value: within180 ?? "None", note: `of ${renewals.length} customer contracts` },
          { label: "In pre-renewal window", value: preRenewal ?? "None", note: "12 to 18 months before contract end" },
          { label: "At risk or on watch", value: flagged.length, note: `${formatSgdCompact(flagged.reduce((s, w) => s + w.health.revenueAtStakeSgd, 0))} revenue at stake` },
          ]}
          columns={5}
        />
        {hot && (
          <a href={hot.url} target="_blank" rel="noopener noreferrer" className="st-card mt-3 flex items-center gap-3 px-4 py-2.5 text-[13px] text-primary hover:border-[#c7ccd5]">
            <span className="shrink-0 rounded-sm bg-st-red-fill px-1.5 py-px text-[11px] font-semibold text-st-red-ink">Latest signal</span>
            <span className="min-w-0 flex-1 truncate">
              {hot.matchedCompany ? `${hot.matchedCompany}: ` : ""}
              {hot.title}
            </span>
            <span className="hidden shrink-0 text-secondary sm:inline">{hot.source}</span>
          </a>
        )}
      </PageHero>

      <div className="grid grid-cols-12 gap-4">
        <Panel agentId="retention" title="Retention watchlist" className="col-span-12 xl:col-span-8" bodyClassName="p-0" action={<span className="text-[12px] text-secondary">Sample accounts, rules-based health</span>}>
          <div className="overflow-x-auto">
            <Table<Watch>
              data={watchlist}
              idKey={(w) => w.record.id}
              density="compact"
              verticalAlign="top"
              hasHover
              columns={[
                { key: "account", header: "Account", width: { type: "proportional", value: 2, minWidth: 200 }, renderCell: ({ record }) => <AccountCell record={record} /> },
                {
                  key: "health",
                  header: "Health",
                  renderCell: ({ health }) => (
                    <span className="flex flex-col gap-0.5 whitespace-nowrap">
                      <span className="tabular text-[13px] font-semibold text-primary">{health.score}</span>
                      <StatusWord tone={BAND_TONE[health.band]}>{BAND_LABEL[health.band]}</StatusWord>
                    </span>
                  ),
                },
                {
                  key: "action",
                  header: "Next best action",
                  width: { type: "proportional", value: 3, minWidth: 240 },
                  renderCell: ({ health }) => (
                    <span className="block min-w-[220px] text-[13px]">
                      <span className="block font-medium text-primary">{health.action.label}</span>
                      <span className="block text-[12px] text-secondary">{health.topReason && health.band !== "healthy" ? REASON_LABEL[health.topReason] : `Renewal in ${health.renewalDays} days`}</span>
                    </span>
                  ),
                },
                { key: "stake", header: "At stake", align: "end", renderCell: ({ health }) => <span className="tabular text-[13px] whitespace-nowrap">{formatSgdCompact(health.revenueAtStakeSgd)}</span> },
              ]}
            />
          </div>
        </Panel>

        <Panel title="Pipeline by stage" className="col-span-12 xl:col-span-4" action={<span className="text-[12px] text-secondary">Indicative ARR</span>}>
          <PipelineChart items={items} />
        </Panel>

        <Panel agentId="next-steps" title="Next steps" className="col-span-12 xl:col-span-8" bodyClassName="p-0" action={<Link href="/accounts" className="text-[13px] font-medium text-primary underline">All accounts</Link>}>
          <div className="overflow-x-auto">
            <Table<Item>
              data={nextSteps}
              idKey={(i) => i.record.id}
              density="compact"
              verticalAlign="top"
              hasHover
              columns={[
                { key: "account", header: "Account", width: { type: "proportional", value: 2, minWidth: 200 }, renderCell: ({ record }) => <AccountCell record={record} /> },
                {
                  key: "next",
                  header: "Next step",
                  width: { type: "proportional", value: 3, minWidth: 260 },
                  renderCell: ({ nextStep }) => <span className="line-clamp-2 min-w-[240px] text-[13px] text-primary">{nextStep}</span>,
                },
                { key: "stage", header: "Stage", renderCell: ({ stage }) => <span className="text-[13px] whitespace-nowrap">{stage}</span> },
                { key: "upside", header: "Upside (SGD)", align: "end", renderCell: ({ upside }) => <span className="tabular text-[13px]">{formatSgdCompact(upside).replace("SGD ", "")}</span> },
              ]}
            />
          </div>
        </Panel>

        <Panel agentId="renewals" title="Renewals" className="col-span-12 xl:col-span-4" bodyClassName="p-0" action={<span className="text-[12px] text-secondary">Sample accounts</span>}>
          <ul className="divide-y divide-st-line">
            {renewals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                <AccountCell record={r} />
                <span className="flex flex-col items-end gap-0.5">
                  <span className="tabular text-[13px] text-primary">{formatDate(r.history.contractEndDate)}</span>
                  <RenewalFlag contractEndDate={r.history.contractEndDate} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <SignalsPanel className="col-span-12" />
      </div>
    </div>
  );
}
