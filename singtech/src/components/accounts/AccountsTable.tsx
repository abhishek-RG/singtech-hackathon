"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Table, type TableColumn } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PanelRight, UserPlus } from "lucide-react";
import { filterCompanies } from "@/lib/data-service";
import { formatSgdCompact } from "@/lib/format";
import { BAND_LABEL, healthFor } from "@/lib/health";
import { useAppStore } from "@/state/app-store";
import { FeasibilityBadge, MeddpiccBadge } from "../account/badges";
import { BAND_TONE } from "../account/HealthPanel";
import { recordHref, useAccountRecords, type AccountRecord } from "../account/records";
import { CompanyLogo } from "../ui/CompanyLogo";
import { formatDate } from "../ui/dates";
import { SignalsPanel } from "../overview/SignalsPanel";
import { GlassStats, PageHero, Panel, StatusWord } from "../ui/Panel";

interface Row extends Record<string, unknown> {
  record: AccountRecord;
}

type Scope = "all" | "customers" | "prospects";

const TITLES: Record<Scope, { title: string; subtitle: string }> = {
  all: { title: "Accounts", subtitle: "Every customer and prospect in your book. Customers are sample accounts; prospects are real companies with public sources." },
  customers: { title: "Customers", subtitle: "Existing Singtel enterprise customers. All are sample accounts with sample data." },
  prospects: { title: "Prospects", subtitle: "Real companies with a public expansion signal, ranked by priority." },
};

// Prospects have no contract, sites, or qualification yet, so those columns would only say "None".
const PROSPECT_HIDDEN = new Set(["meddpicc", "feasibility", "current", "renewal", "type", "health"]);

const money = (n?: number) => (n ? formatSgdCompact(n).replace("SGD ", "") : "None");

// One table for all three account views; the scope only changes the starting filter.
export function AccountsTable({ scope }: { scope: Scope }) {
  const { companies, desk, openPlaybook } = useAppStore();
  const records = useAccountRecords();
  const [type, setType] = useState<Scope>(scope);
  const [query, setQuery] = useState("");

  const rows: Row[] = useMemo(() => {
    const mode = type === "customers" ? "farming" : type === "prospects" ? "hunting" : undefined;
    const matched = new Set(filterCompanies(companies, { desk, query, mode }).map((c) => c.id));
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => (r.company ? matched.has(r.id) : type !== "prospects" && desk === "all" && (!q || r.name.toLowerCase().includes(q))))
      .map((record) => ({ record }));
  }, [records, companies, desk, query, type]);

  const inView = rows.map((r) => r.record);
  const table = (
      <Panel
        title={`${rows.length} account${rows.length === 1 ? "" : "s"}`}
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {scope === "all" && (
              <SegmentedControl label="Account type" size="sm" value={type} onChange={(v) => setType(v as Scope)}>
                <SegmentedControlItem value="all" label="All" />
                <SegmentedControlItem value="customers" label="Customers" />
                <SegmentedControlItem value="prospects" label="Prospects" />
              </SegmentedControl>
            )}
            <TextInput label="Search accounts" isLabelHidden size="sm" value={query} onChange={setQuery} placeholder="Name, hub, product" hasClear />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table<Row>
            data={rows}
            idKey={(r) => r.record.id}
            hasHover
            density="compact"
            columns={(
              [
              {
                key: "account",
                header: "Account",
                width: { type: "proportional", value: 3, minWidth: 240 },
                renderCell: ({ record: r }) => (
                  <span className="flex min-w-[220px] items-center gap-2.5">
                    <CompanyLogo id={r.id} name={r.name} size={24} />
                    <span className="min-w-0">
                      <Link href={recordHref(r.id)} className="block truncate text-[13px] font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                      <span className="block truncate text-[12px] text-secondary">
                        {r.company?.hubLabel ?? r.history?.profile?.hqLabel}
                        {r.isSample ? ", Sample account" : ""}
                      </span>
                    </span>
                  </span>
                ),
              },
              { key: "type", header: "Type", renderCell: ({ record: r }) => <span className="text-[13px]">{r.isCustomer ? "Customer" : "Prospect"}</span> },
              {
                key: "health",
                header: "Health",
                renderCell: ({ record: r }) => {
                  if (!r.history) return <span className="text-[12px] text-secondary">Not scored</span>;
                  const h = healthFor(r.history);
                  return (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="tabular text-[13px] font-semibold">{h.score}</span>
                      <StatusWord tone={BAND_TONE[h.band]}>{BAND_LABEL[h.band]}</StatusWord>
                    </span>
                  );
                },
              },
              {
                key: "meddpicc",
                header: "MEDDPICC",
                renderCell: ({ record: r }) => (r.history ? <MeddpiccBadge history={r.history} compact /> : <span className="text-[12px] text-secondary">Not qualified</span>),
              },
              {
                key: "feasibility",
                header: "Sites",
                renderCell: ({ record: r }) => (r.history ? <FeasibilityBadge history={r.history} compact /> : <span className="text-[12px] text-secondary">No site survey</span>),
              },
              { key: "current", header: "ARR (SGD)", align: "end", renderCell: ({ record: r }) => <span className="tabular text-[13px]">{money(r.currentArrSgd)}</span> },
              {
                key: "upside",
                header: "Upside (SGD)",
                align: "end",
                renderCell: ({ record: r }) => <span className="tabular text-[13px]">{money(r.company?.recommendedBundle.estimatedArrSgd)}</span>,
              },
              {
                key: "renewal",
                header: "Renewal",
                align: "end",
                renderCell: ({ record: r }) => <span className="tabular text-[13px] whitespace-nowrap">{r.history ? formatDate(r.history.contractEndDate) : "None"}</span>,
              },
              {
                key: "priority",
                header: "Priority",
                align: "end",
                renderCell: ({ record: r }) =>
                  r.company ? (
                    r.company.priorityScore >= 90 ? (
                      <StatusWord tone="critical">
                        <span className="tabular">{r.company.priorityScore}</span>
                      </StatusWord>
                    ) : (
                      <span className="tabular text-[13px]">{r.company.priorityScore}</span>
                    )
                  ) : (
                    <span className="text-[13px] text-secondary">None</span>
                  ),
              },
              {
                key: "quick",
                header: "",
                align: "end",
                renderCell: ({ record: r }) =>
                  r.company ? <IconButton label={`Quick view of ${r.name}`} icon={<PanelRight aria-hidden className="size-4" />} variant="ghost" size="sm" onClick={() => openPlaybook(r.id)} /> : null,
              },
            ] satisfies TableColumn<Row>[]
            ).filter((c) => !(type === "prospects" && PROSPECT_HIDDEN.has(c.key)))}
          />
        </div>
      </Panel>
  );

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero
        title={TITLES[scope].title}
        subtitle={TITLES[scope].subtitle}
        actions={<Button variant="primary" label="Add prospect" icon={<UserPlus aria-hidden className="size-4" />} href="/accounts/prospects/new" as={Link} />}
      >
        <GlassStats
          items={[
            { label: "Accounts in view", value: inView.length, note: `${inView.filter((r) => r.isCustomer).length} customers, ${inView.filter((r) => !r.isCustomer).length} prospects` },
            type === "prospects"
              ? { label: "Sourced signals", value: inView.reduce((s, r) => s + (r.company?.signals.filter((x) => x.source.kind !== "simulated-telemetry").length ?? 0), 0), note: "Each with a source link" }
              : { label: "Current ARR", value: formatSgdCompact(inView.reduce((s, r) => s + (r.currentArrSgd ?? 0), 0)), note: "Sample accounts" },
            { label: "Upside", value: formatSgdCompact(inView.reduce((s, r) => s + (r.company?.recommendedBundle.estimatedArrSgd ?? 0), 0)), note: "Indicative ARR" },
            type === "prospects"
              ? { label: "Priority 90 or above", value: inView.filter((r) => (r.company?.priorityScore ?? 0) >= 90).length, note: "Act this week" }
              : { label: "At risk or on watch", value: inView.filter((r) => r.history && healthFor(r.history).band !== "healthy").length, note: "Rules-based account health" },
          ]}
        />
      </PageHero>
      {scope === "prospects" ? (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 min-w-0 xl:col-span-8">{table}</div>
          <SignalsPanel className="col-span-12 xl:col-span-4" title="Prospect triggers" filter={(sig) => sig.kind === "prospect-trigger"} limit={8} />
        </div>
      ) : (
        table
      )}
    </div>
  );
}
