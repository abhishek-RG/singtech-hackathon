"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Table } from "@astryxdesign/core/Table";
import { getCatalog, getPortfolioKpis } from "@/lib/data-service";
import { formatMinutesAgo, formatSgdCompact } from "@/lib/format";
import { DESKS } from "@/lib/labels";
import { useAppStore } from "@/state/app-store";
import type { FarmingAccount, ProductId } from "@/types/singtech";
import { recordHref } from "../account/records";
import { CompanyLogo } from "../ui/CompanyLogo";
import { GlassStats, PageHero, Panel, StatusWord } from "../ui/Panel";

const SEVERITY_TONE = { critical: "critical", high: "warning", medium: "neutral" } as const;

// One column per core product, plus one for the extras (RE:AI, Nxera, NCS).
const COLUMNS: { key: string; header: string; ids: ProductId[] }[] = [
  ...getCatalog()
    .filter((p) => p.tier === "core")
    .map((p) => ({ key: p.id, header: p.shortName, ids: [p.id] })),
  { key: "extras", header: "RE:AI, Nxera, NCS", ids: getCatalog().filter((p) => p.tier === "extra").map((p) => p.id) },
];

interface Row extends Record<string, unknown> {
  account: FarmingAccount;
}

// Owned products read "Active"; recommended upgrades show their indicative value; nothing else is drawn.
function Coverage({ account, ids }: { account: FarmingAccount; ids: ProductId[] }) {
  const inPillar = getCatalog().filter((p) => ids.includes(p.id));
  const owned = inPillar.some((p) => account.ownedProducts.includes(p.id));
  const gap = inPillar.filter((p) => account.recommendedUpgrades.includes(p.id)).reduce((s, p) => s + p.indicativeArrSgd, 0);
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      {owned && <StatusWord tone="verified">Active</StatusWord>}
      {gap > 0 && (
        <span title="Recommended upgrade" className="tabular text-[12px] text-primary">
          +{formatSgdCompact(gap).replace("SGD ", "")}
        </span>
      )}
    </span>
  );
}

export function AccountView() {
  const { accounts, liveAlertIds, desk, openPlaybook } = useAppStore();
  const params = useSearchParams();
  const deepLink = params.get("account");
  useEffect(() => {
    if (deepLink) openPlaybook(deepLink);
  }, [deepLink, openPlaybook]);

  const kpis = getPortfolioKpis(accounts);
  const rows: Row[] = accounts.map((account) => ({ account }));
  const stream = accounts
    .flatMap((a) => a.telemetryAlerts.map((alert) => ({ alert, account: a })))
    .filter(({ alert }) => desk === "all" || alert.desk === desk)
    .sort((x, y) => Number(liveAlertIds.has(y.alert.id)) - Number(liveAlertIds.has(x.alert.id)) || x.alert.minutesAgo - y.alert.minutesAgo);

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero title="Customers" subtitle="Existing Singtel customers: current footprint and recommended upgrades. All accounts here are sample accounts with sample data.">
        <GlassStats
          items={[
          { label: "Current ARR", value: formatSgdCompact(kpis.totalManagedArrSgd), note: `${accounts.length} accounts` },
          { label: "Recommended upgrades", value: `+${formatSgdCompact(kpis.upgradeArrSgd)}`, note: "Indicative ARR" },
          { label: "Usage signals", value: kpis.activeAlerts, note: `${kpis.criticalAlerts} critical` },
          { label: "Renewals in 90 days", value: accounts.filter((a) => a.contractRenewalDays <= 90).length, note: `of ${accounts.length} accounts` },
          ]}
        />
      </PageHero>

      <Panel title="Footprint and expansion potential" bodyClassName="p-0" action={<span className="text-[12px] text-secondary">Active contracts and indicative upgrade ARR (SGD)</span>}>
        <div className="overflow-x-auto">
          <Table<Row>
            data={rows}
            idKey={(r) => r.account.id}
            hasHover
            density="compact"
            columns={[
              {
                key: "account",
                header: "Account",
                width: { type: "proportional", value: 3, minWidth: 260 },
                renderCell: ({ account: a }) => (
                  <span className="flex min-w-[220px] items-center gap-2.5">
                    <CompanyLogo id={a.id} name={a.companyName} size={24} />
                    <span className="min-w-0">
                      <Link href={recordHref(a.id)} className="block truncate text-[13px] font-medium text-primary hover:underline">
                        {a.companyName}
                      </Link>
                      <span className="block truncate text-[12px] text-secondary">Sample account, renews in {a.contractRenewalDays} days</span>
                    </span>
                  </span>
                ),
              },
              ...COLUMNS.map((col) => ({
                key: col.key,
                header: col.header,
                renderCell: ({ account: a }: Row) => <Coverage account={a} ids={col.ids} />,
              })),
              {
                key: "arr",
                header: "ARR (SGD)",
                align: "end" as const,
                renderCell: ({ account: a }: Row) => <span className="tabular text-[13px] text-primary">{formatSgdCompact(a.currentArrSgd).replace("SGD ", "")}</span>,
              },
            ]}
          />
        </div>
      </Panel>

      <Panel title="CUBΣ and Paragon usage signals" action={<span className="text-[12px] text-secondary">{DESKS[desk]}, sample data</span>}>
        <ul className="divide-y divide-st-line">
          {stream.map(({ alert, account }) => (
            <li key={alert.id}>
              <button type="button" onClick={() => openPlaybook(account.id)} className="flex w-full items-start gap-3 py-2.5 text-left first:pt-0 last:pb-0 hover:bg-st-hover">
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block font-medium text-primary">
                    {account.companyName}: <span className="font-normal">{alert.metric}</span>
                  </span>
                  <span className="block text-secondary">
                    {alert.currentValue}, threshold {alert.threshold}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <StatusWord tone={SEVERITY_TONE[alert.severity]}>{alert.severity === "critical" ? "Critical" : alert.severity === "high" ? "High" : "Medium"}</StatusWord>
                  <span className="text-[12px] text-secondary">{liveAlertIds.has(alert.id) ? "Just now" : formatMinutesAgo(alert.minutesAgo)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
