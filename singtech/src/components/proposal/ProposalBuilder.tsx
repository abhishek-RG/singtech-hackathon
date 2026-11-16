"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { IconButton } from "@astryxdesign/core/IconButton";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Table } from "@astryxdesign/core/Table";
import { CheckCircle2, Clock3, ExternalLink, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { getCatalog, getCompany } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import { useAppStore, type ProposalDraft, type ProposalLine, type ProposalStatus } from "@/state/app-store";
import type { ProductId } from "@/types/singtech";
import { FeasibilityBadge, MeddpiccBadge } from "../account/badges";
import { recordHref, useAccountRecord, type AccountRecord } from "../account/records";
import { formatDate } from "../ui/dates";
import { GlassStats, PageHero, Panel } from "../ui/Panel";
import { LogoTile } from "../account/AccountRecord";
import { PushAction } from "../account/PushAction";
import { BillingContext, CompetitorPanel, NarrativePanel } from "./DealContext";
import { APPROVAL_THRESHOLD_PCT, defaultLines, lineMrc, lineTcv, listMrc, MAX_DISCOUNT_PCT, needsApproval, STATUS_LABEL, submitStatus, TERMS, totals } from "./pricing";

const PRODUCT_OPTIONS = getCatalog().map((p) => ({ value: p.id, label: p.shortName, description: p.division }));
const TERM_OPTIONS = TERMS.map((t) => ({ value: String(t), label: `${t} months` }));
export const STATUS_BADGE = { draft: "neutral", pending: "warning", approved: "success", sent: "info" } as const satisfies Record<ProposalStatus, string>;

// Where the deal is and what to do next (ported from the Codex prototype): build, review, approved, sent.
function ProposalWorkflow({ status, requiresManager }: { status: ProposalStatus; requiresManager: boolean }) {
  const position = { draft: 0, pending: 1, approved: 2, sent: 3 }[status];
  const steps = [
    { label: "Build offer", detail: "Line items and indicative terms", icon: Clock3 },
    { label: requiresManager ? "Manager review" : "Authority check", detail: requiresManager ? "Needed for this discount" : "Within rep authority", icon: ShieldCheck },
    { label: "Approved", detail: "Ready for customer use", icon: CheckCircle2 },
    { label: "Send to customer", detail: "Record the final handoff", icon: Send },
  ];
  const next =
    status === "draft"
      ? "Review the line items, then submit the proposal."
      : status === "pending"
        ? "A sales manager needs to approve the discount before customer delivery."
        : status === "approved"
          ? "The proposal is approved. Confirm the customer handoff when it is sent."
          : "This proposal is marked sent. Keep the Salesforce opportunity current as the deal moves.";
  return (
    <section aria-label="Proposal workflow" className="rounded-[10px] border border-st-line bg-white px-4 py-3">
      <p className="text-[13px] font-semibold text-primary">{next}</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCurrent = index === position;
          const isComplete = index < position || (status === "approved" && index === 1 && !requiresManager);
          return (
            <li key={step.label} aria-current={isCurrent ? "step" : undefined} className={`flex items-start gap-2 rounded-md border px-2.5 py-2 ${isCurrent ? "border-st-red bg-st-red-fill" : "border-st-line"}`}>
              <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${isComplete ? "text-st-verified" : isCurrent ? "text-st-red-ink" : "text-secondary"}`} />
              <span className="min-w-0 text-[12px]">
                <span className="block font-semibold text-primary">{step.label}</span>
                <span className="block text-secondary">{isComplete ? "Done" : step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function initialLines(record: AccountRecord): ProposalLine[] {
  if (record.company) return defaultLines(record.company.recommendedBundle.products);
  const owned = new Set(record.history?.profile?.ownedProducts ?? []);
  const gaps = [...new Set(record.history?.productMix.flatMap((p) => p.products) ?? [])].filter((id) => !owned.has(id as ProductId));
  return defaultLines(gaps as ProductId[]);
}

interface LineRow extends Record<string, unknown> {
  line: ProposalLine;
  index: number;
}

export function ProposalBuilder({ id }: { id: string }) {
  const record = useAccountRecord(id);
  const { proposals, saveProposal } = useAppStore();
  const saved = proposals[id];
  const draft: ProposalDraft | undefined = useMemo(() => saved ?? (record ? { lines: initialLines(record), status: "draft", updatedAt: "" } : undefined), [saved, record]);

  if (!record || !draft) {
    return (
      <div className="px-4 py-10 lg:px-6">
        <EmptyState title="Account not found" description="Pick an account from the proposals list." actions={<Button label="All proposals" href="/proposals" as={Link} />} />
      </div>
    );
  }

  const save = (next: Partial<ProposalDraft>) => saveProposal(id, { ...draft, ...next, updatedAt: new Date().toISOString() });
  // Any edit after submission sends the proposal back to draft, so approvals always match the numbers.
  const setLines = (lines: ProposalLine[]) => save({ lines, status: "draft" });
  const updateLine = (index: number, patch: Partial<ProposalLine>) => setLines(draft.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const t = totals(draft.lines);
  const status = draft.status;
  const hasCustomerDoc = Boolean(getCompany(id));

  return (
    <div className="space-y-4 px-4 py-5 lg:px-6">
      <PageHero
        leading={<LogoTile id={record.id} name={record.name} size={40} />}
        title={`Proposal: ${record.name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="st-light rounded-sm">
              <Badge variant={STATUS_BADGE[status]} label={STATUS_LABEL[status]} />
            </span>
            {record.isSample && <span>Sample account</span>}
            {record.history && <MeddpiccBadge history={record.history} />}
            {record.history && <FeasibilityBadge history={record.history} />}
            <Link href={recordHref(record.id)} className="font-medium text-primary underline">
              Account record
            </Link>
          </span>
        }
        actions={
          <>
            {hasCustomerDoc && <Button label="Open customer document" icon={<ExternalLink aria-hidden className="size-4" />} href={`/proposal/${id}`} target="_blank" rel="noopener noreferrer" />}
            {status === "draft" && <Button variant="primary" label="Submit for approval" onClick={() => save({ status: submitStatus(draft.lines) })} isDisabled={draft.lines.length === 0} />}
            {status === "pending" && <Button variant="primary" label="Approve as sales manager" onClick={() => save({ status: "approved" })} />}
            {status === "approved" && <Button variant="primary" label="Mark as sent" onClick={() => save({ status: "sent" })} />}
            {status !== "draft" && <Button label="Back to draft" onClick={() => save({ status: "draft" })} />}
          </>
        }
      >
        <GlassStats
          items={[
            { label: "Monthly (MRC)", value: formatSgd(t.mrc), note: `${draft.lines.length} line items` },
            { label: "Annual (ARR)", value: formatSgd(t.arr), note: "Indicative, from catalogue ARR" },
            { label: "Contract value (TCV)", value: formatSgd(t.tcv), note: "Across each line's term" },
            { label: "Approval", value: STATUS_LABEL[status], note: needsApproval(draft.lines) ? `Discount above ${APPROVAL_THRESHOLD_PCT}%: manager sign-off` : "Within rep authority" },
          ]}
        />
      </PageHero>

      <ProposalWorkflow status={status} requiresManager={needsApproval(draft.lines)} />

      <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 min-w-0 space-y-4 xl:col-span-8">
      <Panel
        agentId="proposal-lines"
        title={`Line items (${draft.lines.length})`}
        bodyClassName="p-0"
        action={<Button size="sm" label="Add line" icon={<Plus aria-hidden className="size-4" />} onClick={() => setLines([...draft.lines, { productId: "SGT-CUBE", qty: 1, termMonths: 36, discountPct: 0 }])} />}
      >
        <div className="overflow-x-auto">
          <Table<LineRow>
            data={draft.lines.map((line, index) => ({ line, index }))}
            idKey={(r) => r.index}
            density="compact"
            columns={[
              {
                key: "product",
                header: "Product",
                width: { type: "proportional", value: 2, minWidth: 190 },
                renderCell: ({ line, index }) => (
                  <div className="min-w-[180px]">
                    <Selector label={`Product, line ${index + 1}`} isLabelHidden size="sm" options={PRODUCT_OPTIONS} value={line.productId} onChange={(v) => updateLine(index, { productId: v as ProductId })} width="100%" />
                  </div>
                ),
              },
              {
                key: "qty",
                header: "Qty",
                renderCell: ({ line, index }) => (
                  <NumberInput label={`Quantity, line ${index + 1}`} isLabelHidden size="sm" value={line.qty} min={1} max={999} isIntegerOnly onChange={(v) => updateLine(index, { qty: v })} width={72} />
                ),
              },
              {
                key: "term",
                header: "Term",
                renderCell: ({ line, index }) => (
                  <Selector label={`Term, line ${index + 1}`} isLabelHidden size="sm" options={TERM_OPTIONS} value={String(line.termMonths)} onChange={(v) => updateLine(index, { termMonths: Number(v) as ProposalLine["termMonths"] })} width={120} />
                ),
              },
              {
                key: "discount",
                header: "Discount",
                renderCell: ({ line, index }) => (
                  <NumberInput
                    label={`Discount, line ${index + 1}`}
                    isLabelHidden
                    size="sm"
                    value={line.discountPct}
                    min={0}
                    max={MAX_DISCOUNT_PCT}
                    units="%"
                    onChange={(v) => updateLine(index, { discountPct: v })}
                    width={88}
                    status={line.discountPct > APPROVAL_THRESHOLD_PCT ? { type: "warning" } : undefined}
                  />
                ),
              },
              { key: "list", header: "Unit MRC", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px] text-secondary">{listMrc(line.productId).toLocaleString("en-SG")}</span> },
              { key: "mrc", header: "Line MRC", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px]">{lineMrc(line).toLocaleString("en-SG")}</span> },
              { key: "tcv", header: "Line TCV", align: "end", renderCell: ({ line }) => <span className="tabular text-[13px] font-medium">{lineTcv(line).toLocaleString("en-SG")}</span> },
              {
                key: "remove",
                header: "",
                align: "end",
                renderCell: ({ index }) => (
                  <IconButton label={`Remove line ${index + 1}`} icon={<Trash2 aria-hidden className="size-4" />} variant="ghost" size="sm" onClick={() => setLines(draft.lines.filter((_, i) => i !== index))} />
                ),
              },
            ]}
          />
        </div>
        <dl className="grid grid-cols-3 border-t border-st-line">
          {[
            { label: "Monthly (MRC)", value: t.mrc },
            { label: "Annual (ARR)", value: t.arr },
            { label: "Contract value (TCV)", value: t.tcv },
          ].map((k, i) => (
            <div key={k.label} className={`px-4 py-3 text-right ${i > 0 ? "border-l border-st-line" : ""}`}>
              <dt className="text-[12px] text-secondary">{k.label}</dt>
              <dd className="tabular text-[16px] font-semibold text-primary">{formatSgd(k.value)}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <NarrativePanel accountId={id} name={record.name} bundle={record.company?.recommendedBundle.bundleName ?? "proposed outcome bundle"} />
      <p className="text-[12px] text-secondary">
        Amounts in SGD. Indicative, derived from catalogue ARR; not Singtel list pricing. Discounts above {APPROVAL_THRESHOLD_PCT}% need sales manager approval
        {needsApproval(draft.lines) ? " (this proposal does)" : ""}.{draft.updatedAt ? ` Saved in this browser, ${formatDate(draft.updatedAt)}.` : ""}
      </p>
      </div>
      <div className="col-span-12 min-w-0 space-y-4 xl:col-span-4">
        <Panel title="Salesforce">
          <p className="mb-3 text-[13px] text-secondary">Creates or updates the Opportunity and a next-step Task after you approve. Nothing reaches the customer.</p>
          <div className="flex flex-wrap items-center gap-2">
            <PushAction accountId={id} company={record.company} variant="secondary" label="Push to Salesforce" />
          </div>
        </Panel>
        <BillingContext history={record.history} />
        <CompetitorPanel accountId={id} name={record.name} history={record.history} />
      </div>
      </div>
    </div>
  );
}
