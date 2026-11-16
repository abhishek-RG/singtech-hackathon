"use client";

import Link from "next/link";
import { Table } from "@astryxdesign/core/Table";
import { useAppStore } from "@/state/app-store";
import type { CrmReceipt } from "@/types/singtech";
import { receiptText } from "./receipt";
import { PushResultLine } from "../account/PushAction";
import { GlassStats, PageHero, Panel } from "../ui/Panel";

interface Row extends Record<string, unknown> {
  receipt: CrmReceipt & { companyId: string };
}

function Destination({ name, configured }: { name: string; configured: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span aria-hidden className={`size-2 rounded-full ${configured ? "bg-st-verified" : "bg-[#8A8F9C]"}`} />
      <span className="font-semibold text-primary">{name}</span>
      <span className="text-secondary">{configured ? "webhook configured (https)" : "not configured: dispatches are saved here, not sent"}</span>
    </div>
  );
}

export function Outbox({ slackConfigured, salesforceConfigured }: { slackConfigured: boolean; salesforceConfigured: boolean }) {
  const { receipts, companies, pushResults } = useAppStore();
  const pushes = Object.entries(pushResults);
  const name = (id: string) => companies.find((c) => c.id === id)?.companyName ?? id;
  const rows: Row[] = receipts.map((receipt) => ({ receipt }));

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero
        title="Activity"
        subtitle="Every Salesforce push and webhook dispatch from this session, with the exact JSON bodies sent after redaction."
      >
        <GlassStats
          columns={4}
          items={[
            { label: "Salesforce pushes", value: pushes.length, note: `${pushes.filter(([, p]) => p.status === "synced").length} synced, ${pushes.filter(([, p]) => p.status === "local").length} saved locally` },
            { label: "Webhook dispatches", value: receipts.length, note: "Slack and Salesforce webhooks" },
            { label: "Slack webhook", value: slackConfigured ? "Configured" : "Not configured" },
            { label: "Salesforce webhook", value: salesforceConfigured ? "Configured" : "Not configured" },
          ]}
        />
      </PageHero>
      <Panel title={`Salesforce pushes (${pushes.length})`} bodyClassName="p-0">
        {pushes.length ? (
          <ul className="divide-y divide-st-line">
            {pushes.map(([id, r]) => (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-[13px] font-medium text-primary">{name(id)}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="tabular text-[12px] text-secondary">{new Date(r.at).toLocaleString("en-SG")}</span>
                  <PushResultLine result={r} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-[13px] text-secondary">No push yet. Open an account record and choose Push to Salesforce & Deal Room.</p>
        )}
      </Panel>
      <Panel title="Destinations">
        <div className="space-y-2">
          <Destination name="Slack co-sell room" configured={slackConfigured} />
          <Destination name="Salesforce" configured={salesforceConfigured} />
        </div>
        <p className="mt-3 text-[12px] text-secondary">
          Set <code className="tabular">SLACK_WEBHOOK_URL</code> or <code className="tabular">SALESFORCE_WEBHOOK_URL</code> in <code className="tabular">.env.local</code> and restart
          the server to send for real. Personal data is redacted on the server before anything leaves.
        </p>
      </Panel>
      <Panel title={`Dispatches (${receipts.length})`} bodyClassName="p-2">
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table<Row>
              data={rows}
              idKey={(r) => r.receipt.ticketId}
              verticalAlign="top"
              columns={[
                {
                  key: "when",
                  header: "Sent",
                  renderCell: ({ receipt: r }) => <span className="tabular text-[12px] whitespace-nowrap text-secondary">{new Date(r.timestamp).toLocaleString("en-SG")}</span>,
                },
                {
                  key: "account",
                  header: "Account",
                  renderCell: ({ receipt: r }) => (
                    <span className="text-[13px]">
                      <span className="block font-semibold text-primary">{name(r.companyId)}</span>
                      <span className="tabular block text-[12px] text-secondary">{r.ticketId}</span>
                    </span>
                  ),
                },
                {
                  key: "result",
                  header: "Result",
                  renderCell: ({ receipt: r }) => (
                    <span className="block min-w-[200px] text-[13px] text-primary">
                      {receiptText(r)}
                      {r.destinations.map((d) => (
                        <span key={d.name} className="block text-[12px] text-secondary">
                          {d.name === "slack" ? "Slack" : "Salesforce"}: {d.delivered ? "delivered" : d.configured ? "failed" : "not configured"}
                        </span>
                      ))}
                    </span>
                  ),
                },
                {
                  key: "payload",
                  header: "Payloads (after redaction)",
                  renderCell: ({ receipt: r }) => (
                    <details className="min-w-[280px] text-[12px]">
                      <summary className="cursor-pointer font-medium text-st-accent">
                        View JSON ({r.audit.redactedEntities} item{r.audit.redactedEntities === 1 ? "" : "s"} redacted)
                      </summary>
                      {(["slack", "salesforce"] as const).map((d) => (
                        <div key={d} className="mt-2">
                          <div className="mb-1 font-semibold text-secondary">{d === "slack" ? "Slack" : "Salesforce"}</div>
                          <pre className="tabular whitespace-pre-wrap rounded-lg bg-muted p-3 text-[12px] text-primary">{r.payloads[d]}</pre>
                        </div>
                      ))}
                    </details>
                  ),
                },
              ]}
            />
          </div>
        ) : (
          <p className="p-3 text-[13px] text-secondary">
            Nothing dispatched yet. Open any account from the{" "}
            <Link href="/dashboard" className="font-medium text-st-accent hover:underline">
              Overview
            </Link>{" "}
            and press Dispatch.
          </p>
        )}
      </Panel>
    </div>
  );
}
