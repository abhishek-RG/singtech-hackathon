"use client";

import Link from "next/link";
import { Badge } from "@astryxdesign/core/Badge";
import { Table } from "@astryxdesign/core/Table";
import { useAppStore } from "@/state/app-store";
import { FeasibilityBadge, MeddpiccBadge } from "../account/badges";
import { useAccountRecords, type AccountRecord } from "../account/records";
import { CompanyLogo } from "../ui/CompanyLogo";
import { formatSgdCompact } from "@/lib/format";
import { GlassStats, PageHero, Panel } from "../ui/Panel";
import { APPROVAL_THRESHOLD_PCT, STATUS_LABEL, totals } from "./pricing";
import { initialLines, STATUS_BADGE } from "./ProposalBuilder";

interface Row extends Record<string, unknown> {
  record: AccountRecord;
}

export function ProposalsIndex() {
  const records = useAccountRecords();
  const { proposals } = useAppStore();
  const drafts = Object.values(proposals);
  const rows: Row[] = [...records]
    .sort((a, b) => Number(Boolean(proposals[b.id])) - Number(Boolean(proposals[a.id])) || (b.company?.priorityScore ?? 0) - (a.company?.priorityScore ?? 0))
    .map((record) => ({ record }));

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero
        title="Deal desk"
        subtitle="Build a priced proposal per account from the catalogue, take it through approval, push it to Salesforce, and open the customer document. Pricing is indicative, derived from catalogue ARR."
      >
        <GlassStats
          items={[
            { label: "Drafts", value: drafts.filter((d) => d.status === "draft").length, note: "Being priced" },
            { label: "Pending approval", value: drafts.filter((d) => d.status === "pending").length, note: `Discount above ${APPROVAL_THRESHOLD_PCT}%` },
            { label: "Approved or sent", value: drafts.filter((d) => d.status === "approved" || d.status === "sent").length, note: "Ready for the customer" },
            { label: "TCV in proposals", value: formatSgdCompact(drafts.reduce((s, d) => s + totals(d.lines).tcv, 0)), note: "Indicative" },
          ]}
        />
      </PageHero>
      <Panel title={`${Object.keys(proposals).length} in progress, ${records.length} accounts`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <Table<Row>
            data={rows}
            idKey={(r) => r.record.id}
            density="compact"
            hasHover
            columns={[
              {
                key: "account",
                header: "Account",
                width: { type: "proportional", value: 3, minWidth: 220 },
                renderCell: ({ record: r }) => (
                  <span className="flex min-w-[200px] items-center gap-2.5">
                    <CompanyLogo id={r.id} name={r.name} size={24} />
                    <span className="min-w-0">
                      <Link href={`/proposals/${r.id}`} className="block truncate text-[13px] font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                      <span className="block truncate text-[12px] text-secondary">{r.company?.recommendedBundle.bundleName ?? "Outcome bundles from account history"}</span>
                    </span>
                  </span>
                ),
              },
              {
                key: "status",
                header: "Approval",
                renderCell: ({ record: r }) =>
                  proposals[r.id] ? <Badge variant={STATUS_BADGE[proposals[r.id].status]} label={STATUS_LABEL[proposals[r.id].status]} /> : <span className="text-[12px] text-secondary">Not started</span>,
              },
              { key: "meddpicc", header: "MEDDPICC", renderCell: ({ record: r }) => (r.history ? <MeddpiccBadge history={r.history} compact /> : <span className="text-[12px] text-secondary">Not qualified</span>) },
              { key: "sites", header: "Sites", renderCell: ({ record: r }) => (r.history ? <FeasibilityBadge history={r.history} compact /> : <span className="text-[12px] text-secondary">No site survey</span>) },
              {
                key: "tcv",
                header: "TCV (SGD)",
                align: "end",
                renderCell: ({ record: r }) => <span className="tabular text-[13px]">{totals(proposals[r.id]?.lines ?? initialLines(r)).tcv.toLocaleString("en-SG")}</span>,
              },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
