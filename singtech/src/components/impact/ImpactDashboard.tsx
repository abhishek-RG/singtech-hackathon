"use client";

import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { ArrowUpRight } from "lucide-react";
import { getCatalog } from "@/lib/data-service";
import { formatSgd, formatSgdCompact } from "@/lib/format";
import { RINGS } from "@/lib/labels";
import { useAppStore } from "@/state/app-store";
import { GlassStats, KpiStrip, PageHero, Panel } from "../ui/Panel";

const TARGETS = [
  { value: "+340%", label: "Qualified Opportunities Generated", note: "vs. manual account research baseline" },
  { value: "+28%", label: "Sales Cycle Conversion Uplift", note: "from signal-timed outreach to existing customers" },
  { value: "2.4x", label: "Average Deal Size Expansion", note: "via multi-pillar One-Singtel bundling" },
];

// Only figures confirmed on the cited pages; each benchmark comes from one company or engagement, as the sources say.
const BENCHMARKS = [
  {
    org: "EY: telco B2B AI case study",
    figure: "+50%",
    claim: "increase in B2B lead conversion after AI models were deployed across about 3,000 customer data points.",
    url: "https://www.ey.com/en_ie/services/ai/case-studies/how-ai-can-enhance-b2b-sales",
  },
  {
    org: "Lumen Technologies with Microsoft Copilot for Sales",
    figure: "4 hrs / week",
    claim: "saved per seller on average, which Lumen estimates is worth $50 million annually.",
    url: "https://news.microsoft.com/source/features/digital-transformation/the-only-way-how-copilot-is-helping-propel-an-evolution-at-lumen-technologies/",
  },
  {
    org: "Wipro: telecom B2B growth with AI",
    figure: "Up to 25%",
    claim: "of upsell opportunities were missed in one telco engagement, where manual reviews stretched B2B sales cycles to 6 to 9 months.",
    url: "https://www.wipro.com/communications/articles/how-leading-telecom-companies-are-reconnecting-b2b-growth-with-ai/",
  },
];

const PHASES = [
  {
    phase: "Phase 1",
    title: "30-day shadow mode with Singtel Singapore Enterprise",
    detail: "SingTech ranks existing customers from CUBΣ and Paragon usage signals beside current account plans. Client Partners compare its picks with their own pipeline, and baselines for all three targets are captured.",
  },
  {
    phase: "Phase 2",
    title: "Co-sell with NCS, Nxera, and Singtel 5G+ partners",
    detail: "Client Partners act on playbooks with the Connectivity, Digital InfraCo, and Cyber desks and with NCS account teams in one deal room. Every outbound message is rep-approved.",
  },
  {
    phase: "Phase 3",
    title: "Regional corridors: TM Nxera Johor and STT GDC India",
    detail: "Follow existing customers into the Johor-Singapore SEZ and India on one Singtel contract, with per-market data residency controls.",
  },
];

const avgProductArr = getCatalog().reduce((s, p) => s + p.indicativeArrSgd, 0) / getCatalog().length;

export function ImpactDashboard() {
  const { companies, statuses, receipts, pushResults } = useAppStore();
  const qualified = companies.filter((c) => statuses[c.id] === "qualified");
  const byRing = RINGS.map((r) => {
    const list = companies.filter((c) => c.ring === r.id);
    return { ...r, count: list.length, arr: list.reduce((s, c) => s + c.recommendedBundle.estimatedArrSgd, 0) };
  });
  const maxArr = Math.max(...byRing.map((r) => r.arr));
  const avgBundle = companies.reduce((s, c) => s + c.recommendedBundle.estimatedArrSgd, 0) / companies.length;
  const pushes = Object.values(pushResults);

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero tone="red" title="Impact" subtitle="Pilot targets to measure in Phase 1 (targets, not results), sourced telco benchmarks, this session's activity, and the rollout plan.">
        <GlassStats columns={3} items={TARGETS.map((t) => ({ label: t.label, value: t.value, note: t.note }))} />
      </PageHero>

      <Panel title="Global telco benchmarks" action={<span className="text-[12px] text-secondary">Each figure links to its source</span>} bodyClassName="p-0">
        <ul className="divide-y divide-st-line">
          {BENCHMARKS.map((b) => (
            <li key={b.org} className="grid gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[140px_minmax(0,1fr)]">
              <span className="tabular text-[18px] font-semibold text-primary">{b.figure}</span>
              <span className="min-w-0 text-[13px] text-primary">
                {b.claim}{" "}
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary underline">
                  {b.org} <ArrowUpRight aria-hidden className="size-3" />
                </a>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <KpiStrip
        items={[
          { label: "Qualified this session", value: qualified.length, note: formatSgd(qualified.reduce((s, c) => s + c.recommendedBundle.estimatedArrSgd, 0)) },
          { label: "Pushed to Salesforce", value: pushes.length, note: `${pushes.filter((p) => p.status === "synced").length} synced, ${pushes.filter((p) => p.status === "local").length} saved locally` },
          { label: "Outbox dispatches", value: receipts.length, note: "Slack and Salesforce webhooks" },
          { label: "Bundle vs. single product", value: `${(avgBundle / avgProductArr).toFixed(1)}x`, note: "Average bundle ARR over one product" },
        ]}
      />

      <div className="grid grid-cols-12 gap-4">
        <Panel title="Pipeline by growth ring" className="col-span-12 lg:col-span-6" action={<span className="text-[12px] text-secondary">Indicative ARR</span>}>
          <ul className="space-y-3">
            {byRing.map((r) => (
              <li key={r.id}>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-[13px]">
                  <span className="font-medium text-primary">
                    {r.short} <span className="font-normal text-secondary">({r.count} accounts)</span>
                  </span>
                  <span className="tabular text-primary">{formatSgdCompact(r.arr)}</span>
                </div>
                <ProgressBar label={`${r.short} pipeline`} isLabelHidden value={r.arr} max={maxArr} variant="neutral" />
                <div className="mt-0.5 text-[12px] text-secondary">{r.stack}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Rollout plan" className="col-span-12 lg:col-span-6">
          <ol className="space-y-3">
            {PHASES.map((p, i) => (
              <li key={p.phase} className="flex gap-3">
                <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-st-line text-[12px] font-semibold text-primary">{i + 1}</span>
                <div>
                  <div className="text-[13px] font-semibold text-primary">
                    {p.phase}: {p.title}
                  </div>
                  <p className="text-[13px] text-secondary">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
