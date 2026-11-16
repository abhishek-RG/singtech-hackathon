"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { ArrowUpRight } from "lucide-react";
import { filterCompanies } from "@/lib/data-service";
import { formatSgdCompact } from "@/lib/format";
import { useAppStore } from "@/state/app-store";
import { recordHref, useAccountRecords } from "../account/records";
import { CorridorMap } from "../explorer/CorridorMap";
import { CompanyLogo } from "../ui/CompanyLogo";
import { GlassStats, PageHero, Panel, StatusWord } from "../ui/Panel";
import { useToday } from "../ui/use-today";
import { coverageRows, coverageTotals, type CoverageFilter, type CoverageRow } from "./coverage";

const FILTER_LABEL: Record<CoverageFilter, string> = { all: "All accounts", customers: "Customers", prospects: "Prospects" };

function rowStatus(r: CoverageRow) {
  if (r.isCustomer) return r.renewalDays === undefined ? "Customer" : `Customer, renews in ${r.renewalDays} days`;
  return r.signal ? "Prospect, recent public signal" : "Prospect";
}

function RowDetail({ row }: { row: CoverageRow }) {
  const { openPlaybook } = useAppStore();
  return (
    <div className="space-y-2 border-l-[3px] border-st-red bg-white px-4 pt-1 pb-3 text-[13px] text-primary">
      {row.nextStep && (
        <p>
          <span className="font-semibold">Next step: </span>
          {row.nextStep}
        </p>
      )}
      {row.signal && (
        <p>
          <span className="font-semibold">Latest signal: </span>
          {row.signal.claim}{" "}
          <a href={row.signal.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium underline">
            Source <ArrowUpRight aria-hidden className="size-3" />
          </a>
        </p>
      )}
      {row.upsideSgd !== undefined && (
        <p className="tabular text-secondary">
          Indicative upside {formatSgdCompact(row.upsideSgd)} a year (catalogue estimate, not list pricing){row.isSample ? ". Sample data." : "."}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="primary" label="Open record" href={recordHref(row.id)} as={Link} />
        {row.hasQuickView && <Button size="sm" label="Quick view" onClick={() => openPlaybook(row.id)} />}
      </div>
    </div>
  );
}

// Rep job: which accounts sit where, and what is the next move on each. The map and the list select the same record.
export function CoverageMap() {
  const { companies, desk } = useAppStore();
  const records = useAccountRecords();
  const today = useToday();
  const [filter, setFilter] = useState<CoverageFilter>("all");
  const [regional, setRegional] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const rows = useMemo(() => {
    // The division scope applies to ranked companies; history-only sample accounts show only when the scope is all.
    const inScope = new Set(filterCompanies(companies, { desk }).map((c) => c.id));
    return coverageRows(
      records.filter((r) => (r.company ? inScope.has(r.id) : desk === "all")),
      filter,
      today,
    );
  }, [companies, desk, filter, records, today]);
  const totals = coverageTotals(rows);
  const selected = rows.find((r) => r.id === selectedId);

  // A pin picked on the map scrolls its row into view; the list stays the place to act.
  useEffect(() => {
    if (selectedId) rowRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [selectedId]);

  const select = (id: string) => setSelectedId((cur) => (cur === id ? undefined : id));

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero title="Coverage map" subtitle="Where your customers and prospects are. Pick an account on the map or in the list to see its next step.">
        <GlassStats
          items={[
            { label: "Accounts shown", value: totals.accounts, note: FILTER_LABEL[filter] },
            { label: "Current annual value", value: totals.currentArrSgd ? formatSgdCompact(totals.currentArrSgd) : "None", note: "Customers, sample data" },
            { label: "Indicative upside", value: formatSgdCompact(totals.upsideSgd), note: "Catalogue estimate" },
            { label: "Renewals in 180 days", value: totals.renewalsWithin180, note: "Customers" },
          ]}
        />
      </PageHero>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel
          title="Map"
          bodyClassName="p-0"
          action={
            <SegmentedControl label="Map view" size="sm" value={regional ? "regional" : "sg"} onChange={(v) => setRegional(v === "regional")}>
              <SegmentedControlItem value="sg" label="Singapore" />
              <SegmentedControlItem value="regional" label="India-Singapore corridor" />
            </SegmentedControl>
          }
        >
          <div className="h-[360px] overflow-hidden rounded-b-xl lg:h-[calc(100dvh-330px)] lg:min-h-[460px]">
            <CorridorMap rows={rows} selectedId={selectedId} onSelect={select} regional={regional} />
          </div>
        </Panel>

        <Panel
          title={`${FILTER_LABEL[filter]} (${rows.length})`}
          bodyClassName="p-0"
          action={
            <SegmentedControl label="Account type" size="sm" value={filter} onChange={(v) => setFilter(v as CoverageFilter)}>
              <SegmentedControlItem value="all" label="All" />
              <SegmentedControlItem value="customers" label="Customers" />
              <SegmentedControlItem value="prospects" label="Prospects" />
            </SegmentedControl>
          }
        >
          {rows.length === 0 ? (
            <p className="p-4 text-[13px] text-secondary">No accounts match this filter. Choose All to see every account.</p>
          ) : (
            <ul className="divide-y divide-st-line lg:max-h-[calc(100dvh-330px)] lg:min-h-[460px] lg:overflow-y-auto">
              {rows.map((r) => {
                const isSelected = r.id === selectedId;
                return (
                  <li
                    key={r.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(r.id, el);
                      else rowRefs.current.delete(r.id);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-st-hover ${isSelected ? "bg-st-selected" : ""}`}
                    >
                      <CompanyLogo id={r.id} name={r.name} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-primary">{r.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-secondary">
                          <StatusWord tone={!r.isCustomer ? "info" : r.renewalDays !== undefined && r.renewalDays <= 90 ? "warning" : "neutral"}>{rowStatus(r)}</StatusWord>
                          {r.isSample && <span>Sample account</span>}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-right text-[13px] text-primary">
                        {r.currentArrSgd ? formatSgdCompact(r.currentArrSgd) : r.upsideSgd !== undefined ? `+${formatSgdCompact(r.upsideSgd)}` : ""}
                        <span className="block text-[11px] text-secondary">{r.currentArrSgd ? "a year" : r.upsideSgd !== undefined ? "upside" : ""}</span>
                      </span>
                    </button>
                    {isSelected && <RowDetail row={r} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
      {selected && <p className="sr-only" aria-live="polite">{`${selected.name} selected on the map.`}</p>}
    </div>
  );
}
