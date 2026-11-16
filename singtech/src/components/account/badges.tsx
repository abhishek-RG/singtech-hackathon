"use client";

import { HoverCard } from "@astryxdesign/core/HoverCard";
import { daysUntil, isPreRenewalWindow, meddpiccTotal, type AccountHistory, type NetStatus } from "@/lib/history";
import { StatusWord } from "../ui/Panel";
import { useToday } from "../ui/use-today";

export const NET_LABEL: Record<NetStatus, string> = { "on-net": "On-net", "near-net": "Near-net", "off-net": "Off-net" };
export const NET_TONE = { "on-net": "verified", "near-net": "warning", "off-net": "critical" } as const satisfies Record<NetStatus, string>;

export function NetStatusWord({ status }: { status: NetStatus }) {
  return <StatusWord tone={NET_TONE[status]}>{NET_LABEL[status]}</StatusWord>;
}

// 12 of 16 or more is a qualified deal; under 8 has gaps that block a forecast commit.
export const meddpiccTone = (total: number) => (total >= 12 ? "verified" : total >= 8 ? "warning" : "critical");

const triggerClass = "rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-st-ink";

export function MeddpiccBreakdown({ history }: { history: AccountHistory }) {
  return (
    <ul className="divide-y divide-st-line">
      {history.meddpicc.map((m) => (
        <li key={m.key} className="py-2 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium text-primary">{m.label}</span>
            <span className={`tabular ${m.score === 0 ? "text-st-red-ink" : m.score === 1 ? "text-st-warning" : "text-st-verified"}`}>{m.score}/2</span>
          </div>
          <p className="mt-0.5 text-[12px] text-secondary">{m.evidence}</p>
          {m.gap && <p className="mt-0.5 text-[12px] text-st-warning">Gap: {m.gap}</p>}
        </li>
      ))}
    </ul>
  );
}

export function MeddpiccBadge({ history, compact = false }: { history: AccountHistory; compact?: boolean }) {
  const total = meddpiccTotal(history);
  const gaps = history.meddpicc.filter((m) => m.gap).length;
  return (
    <HoverCard
      label={`MEDDPICC breakdown for ${history.accountName}`}
      touchTrigger="tap"
      placement="below"
      alignment="start"
      content={
        <div className="w-[340px] max-w-[80vw] p-3">
          <div className="mb-2 text-[13px] font-semibold text-primary">
            MEDDPICC {total} of 16, {gaps} gap{gaps === 1 ? "" : "s"}
          </div>
          <MeddpiccBreakdown history={history} />
        </div>
      }
    >
      <button type="button" className={triggerClass} aria-label={`MEDDPICC ${total} of 16, ${gaps} gaps. Show breakdown`}>
        <StatusWord tone={meddpiccTone(total)}>
          <span className="tabular">{compact ? `${total}/16` : `MEDDPICC ${total}/16`}</span>
        </StatusWord>
      </button>
    </HoverCard>
  );
}

const worst = (list: NetStatus[]): NetStatus => (list.includes("off-net") ? "off-net" : list.includes("near-net") ? "near-net" : "on-net");

export function FeasibilityBadge({ history, compact = false }: { history: AccountHistory; compact?: boolean }) {
  const sites = history.sites;
  const onNet = sites.filter((s) => s.fiber === "on-net" && s.fiveG === "on-net").length;
  const tone = NET_TONE[worst(sites.flatMap((s) => [s.fiber, s.fiveG]))];
  return (
    <HoverCard
      label={`Site feasibility for ${history.accountName}`}
      touchTrigger="tap"
      placement="below"
      alignment="start"
      content={
        <div className="w-[340px] max-w-[80vw] p-3">
          <div className="mb-2 text-[13px] font-semibold text-primary">Site feasibility: fibre and 5G</div>
          <ul className="divide-y divide-st-line">
            {sites.map((s) => (
              <li key={s.siteId} className="flex items-center justify-between gap-3 py-1.5 text-[12px]">
                <span className="min-w-0 truncate text-primary">{s.name}</span>
                <span className="flex shrink-0 gap-3">
                  <span className="text-secondary">
                    Fibre <NetStatusWord status={s.fiber} />
                  </span>
                  <span className="text-secondary">
                    5G <NetStatusWord status={s.fiveG} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <button type="button" className={triggerClass} aria-label={`${onNet} of ${sites.length} sites fully on-net. Show site feasibility`}>
        <StatusWord tone={tone}>
          <span className="tabular">{compact ? `${onNet}/${sites.length} on-net` : `${onNet} of ${sites.length} sites on-net`}</span>
        </StatusWord>
      </button>
    </HoverCard>
  );
}

// 12 to 18 months before contract end is the window to land an upsell before the renewal is negotiated.
export function RenewalFlag({ contractEndDate }: { contractEndDate: string }) {
  const today = useToday();
  if (!today) return null;
  const days = daysUntil(contractEndDate, today);
  if (isPreRenewalWindow(contractEndDate, today)) return <StatusWord tone="info">Pre-renewal window, {Math.round(days / 30)} months to renewal</StatusWord>;
  if (days >= 0 && days <= 90) return <StatusWord tone="critical">Renewal in {days} days</StatusWord>;
  if (days >= 0 && days < 365) return <StatusWord tone="warning">Renewal in {days} days</StatusWord>;
  return null;
}
