"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Table } from "@astryxdesign/core/Table";
import { getProduct } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import type { ProposalDraft, ProposalLine } from "@/state/app-store";
import type { ProductId } from "@/types/singtech";
import { defaultLines, lineMrc, lineTcv, totals } from "./pricing";

const KEY = "singtech.proposals.v1";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

interface Row extends Record<string, unknown> {
  line: ProposalLine;
  index: number;
}

// Shows the rep's approved or sent line items from this browser; otherwise the recommended bundle at standard terms.
export function CustomerLines({ id, bundle }: { id: string; bundle: ProductId[] }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const saved = useMemo(() => {
    try {
      const all = raw ? (JSON.parse(raw) as Record<string, ProposalDraft>) : {};
      const d = all[id];
      return d && (d.status === "approved" || d.status === "sent") ? d : undefined;
    } catch {
      return undefined;
    }
  }, [raw, id]);
  const lines = saved?.lines ?? defaultLines(bundle);
  const t = totals(lines);
  return (
    <section className="overflow-hidden rounded-[10px] border border-st-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-st-line px-4 py-3">
        <h2 className="text-[16px] font-semibold text-primary">Proposed services</h2>
        <span className="text-[12px] text-secondary">{saved ? "Approved proposal" : "Recommended bundle, standard 36-month term"}</span>
      </header>
      <div className="overflow-x-auto">
        <Table<Row>
          data={lines.map((line, index) => ({ line, index }))}
          idKey={(r) => r.index}
          density="compact"
          columns={[
            {
              key: "product",
              header: "Service",
              width: { type: "proportional", value: 3, minWidth: 200 },
              renderCell: ({ line }) => {
                const p = getProduct(line.productId);
                return p ? (
                  <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-primary underline decoration-st-line underline-offset-2">
                    {p.name}
                  </a>
                ) : (
                  line.productId
                );
              },
            },
            { key: "qty", header: "Qty", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px]">{line.qty}</span> },
            { key: "term", header: "Term", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px]">{line.termMonths} months</span> },
            { key: "mrc", header: "Monthly (SGD)", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px]">{lineMrc(line).toLocaleString("en-SG")}</span> },
            { key: "tcv", header: "Contract (SGD)", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px] font-medium">{lineTcv(line).toLocaleString("en-SG")}</span> },
          ]}
        />
      </div>
      <dl className="grid grid-cols-3 border-t border-st-line text-right">
        {[
          { label: "Monthly", value: t.mrc },
          { label: "Annual", value: t.arr },
          { label: "Contract value", value: t.tcv },
        ].map((k, i) => (
          <div key={k.label} className={`px-4 py-3 ${i ? "border-l border-st-line" : ""}`}>
            <dt className="text-[12px] text-secondary">{k.label}</dt>
            <dd className="tabular text-[16px] font-semibold text-primary">{formatSgd(k.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-st-line px-4 py-2 text-[12px] text-secondary">Indicative pricing for discussion, derived from catalogue values. Not a quote; Singtel confirms pricing after discovery.</p>
    </section>
  );
}
