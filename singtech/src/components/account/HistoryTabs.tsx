"use client";

import { Table } from "@astryxdesign/core/Table";
import { getProduct } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import type { AccountHistory, Invoice, SiteFeasibility, SlaIncident } from "@/lib/history";
import type { ProductId } from "@/types/singtech";
import { formatDate } from "../ui/dates";
import { Panel, SectionTitle, StatusWord } from "../ui/Panel";
import { NetStatusWord } from "./badges";

const productName = (id: string) => getProduct(id as ProductId)?.shortName ?? id;

interface SiteRow extends Record<string, unknown> {
  site: SiteFeasibility;
}

export function FeasibilityTable({ history }: { history: AccountHistory }) {
  return (
    <Panel title="Site feasibility" bodyClassName="p-0" action={<span className="text-[12px] text-secondary">Sample data</span>}>
      <div className="overflow-x-auto">
        <Table<SiteRow>
          data={history.sites.map((site) => ({ site }))}
          idKey={(r) => r.site.siteId}
          density="compact"
          verticalAlign="top"
          columns={[
            {
              key: "site",
              header: "Site",
              width: { type: "proportional", value: 3, minWidth: 220 },
              renderCell: ({ site: s }) => (
                <span className="block min-w-[200px]">
                  <span className="block text-[13px] font-medium text-primary">{s.name}</span>
                  <span className="block text-[12px] text-secondary">{s.address}</span>
                  {s.strain && <span className="mt-0.5 block text-[12px] text-st-warning">{s.strain}</span>}
                </span>
              ),
            },
            { key: "fiber", header: "Fibre", renderCell: ({ site: s }) => <NetStatusWord status={s.fiber} /> },
            { key: "fiveG", header: "5G", renderCell: ({ site: s }) => <NetStatusWord status={s.fiveG} /> },
            { key: "seats", header: "Seats", align: "end", renderCell: ({ site: s }) => <span className="tabular text-[13px]">{s.seats.toLocaleString("en-SG")}</span> },
          ]}
        />
      </div>
    </Panel>
  );
}

const INVOICE_TONE = { paid: "verified", overdue: "warning", disputed: "critical" } as const;
const INVOICE_LABEL = { paid: "Paid", overdue: "Overdue", disputed: "Disputed" } as const;

interface InvoiceRow extends Record<string, unknown> {
  invoice: Invoice;
}

export function BillingTab({ history }: { history: AccountHistory }) {
  const open = history.invoices.filter((i) => i.status !== "paid");
  return (
    <div className="space-y-4">
      <Panel title="Billing" action={<span className="text-[12px] text-secondary">Sample data</span>}>
        <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-[12px] text-secondary">Billing system</dt>
            <dd className="font-medium text-primary">{history.billing.system === "SAP-to-Oracle" ? "SAP, migrating to Oracle" : history.billing.system}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-secondary">Open items</dt>
            <dd className="tabular font-medium text-primary">
              {open.length} ({formatSgd(open.reduce((s, i) => s + i.amountSgd, 0))})
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-secondary">Invoices this year</dt>
            <dd className="tabular font-medium text-primary">{history.invoices.length}</dd>
          </div>
        </dl>
        {history.billing.frictionNotes.length > 0 && (
          <div className="mt-4">
            <SectionTitle>{history.billing.system === "SAP-to-Oracle" ? "SAP to Oracle friction" : "Billing notes"}</SectionTitle>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-primary">
              {history.billing.frictionNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <Panel title={`Invoices (${history.invoices.length})`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <Table<InvoiceRow>
            data={history.invoices.map((invoice) => ({ invoice }))}
            idKey={(r) => r.invoice.id}
            density="compact"
            verticalAlign="top"
            columns={[
              {
                key: "id",
                header: "Bill ID",
                width: { type: "proportional", value: 1, minWidth: 170 },
                renderCell: ({ invoice: i }) => <span className="font-id whitespace-nowrap text-primary">{i.id}</span>,
              },
              { key: "issued", header: "Issued", renderCell: ({ invoice: i }) => <span className="tabular text-[13px] whitespace-nowrap">{formatDate(i.issuedOn)}</span> },
              { key: "due", header: "Due", renderCell: ({ invoice: i }) => <span className="tabular text-[13px] whitespace-nowrap">{formatDate(i.dueOn)}</span> },
              {
                key: "lines",
                header: "Lines",
                width: { type: "proportional", value: 3, minWidth: 220 },
                renderCell: ({ invoice: i }) => (
                  <span className="block min-w-[200px] text-[12px] text-secondary">
                    {i.lines.map((l) => (
                      <span key={l.description} className="block">
                        {productName(l.productId)}: {l.description}
                      </span>
                    ))}
                    {i.note && <span className="mt-0.5 block text-st-warning">{i.note}</span>}
                  </span>
                ),
              },
              { key: "system", header: "System", renderCell: ({ invoice: i }) => <span className="text-[13px]">{i.billingSystem}</span> },
              { key: "amount", header: "Amount (SGD)", align: "end", width: { type: "proportional", value: 1, minWidth: 120 }, renderCell: ({ invoice: i }) => <span className="tabular text-[13px]">{i.amountSgd.toLocaleString("en-SG")}</span> },
              { key: "status", header: "Status", renderCell: ({ invoice: i }) => <StatusWord tone={INVOICE_TONE[i.status]}>{INVOICE_LABEL[i.status]}</StatusWord> },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}

export function MeetingsTab({ history }: { history: AccountHistory }) {
  const meetings = [...history.meetings].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-4">
      {meetings.map((m) => (
        <Panel key={m.id} id={`ev-${m.id}`} className="scroll-mt-24" title={m.title} action={<span className="tabular text-[12px] text-secondary">{formatDate(m.date)}</span>}>
          <p className="text-[12px] text-secondary">Attendees: {m.attendees.join("; ")}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <SectionTitle>Decisions</SectionTitle>
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-primary">
                {m.decisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <SectionTitle>Actions</SectionTitle>
              {m.actions.length ? (
                <ul className="space-y-1.5 text-[13px]">
                  {m.actions.map((a) => (
                    <li key={a.action}>
                      <span className="text-primary">{a.action}</span>
                      <span className="block text-[12px] text-secondary">
                        {a.owner}, due <span className="tabular">{formatDate(a.due)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-secondary">No actions recorded.</p>
              )}
            </div>
          </div>
        </Panel>
      ))}
      {meetings.length === 0 && <p className="text-[13px] text-secondary">No meeting minutes recorded.</p>}
    </div>
  );
}

const SEVERITY_TONE = { P1: "critical", P2: "warning", P3: "neutral" } as const;

interface IncidentRow extends Record<string, unknown> {
  incident: SlaIncident;
}

export function ServiceTab({ history }: { history: AccountHistory }) {
  const credits = history.slaIncidents.reduce((s, i) => s + i.creditSgd, 0);
  return (
    <div className="space-y-4">
    <CasesPanel history={history} />
    <Panel title={`SLA incidents (${history.slaIncidents.length})`} bodyClassName="p-0" action={<span className="tabular text-[12px] text-secondary">Credits issued {formatSgd(credits)}</span>}>
      {history.slaIncidents.length ? (
        <div className="overflow-x-auto">
          <Table<IncidentRow>
            data={history.slaIncidents.map((incident) => ({ incident }))}
            idKey={(r) => r.incident.id}
            density="compact"
            verticalAlign="top"
            columns={[
              { key: "id", header: "Ticket", renderCell: ({ incident: i }) => <span className="font-id whitespace-nowrap">{i.id}</span> },
              { key: "date", header: "Date", renderCell: ({ incident: i }) => <span className="tabular text-[13px] whitespace-nowrap">{formatDate(i.date)}</span> },
              { key: "sev", header: "Severity", renderCell: ({ incident: i }) => <StatusWord tone={SEVERITY_TONE[i.severity]}>{i.severity}</StatusWord> },
              {
                key: "summary",
                header: "Summary",
                width: { type: "proportional", value: 3, minWidth: 240 },
                renderCell: ({ incident: i }) => <span className="block min-w-[220px] text-[13px] text-primary">{i.summary}</span>,
              },
              { key: "hours", header: "Resolution (h)", align: "end", renderCell: ({ incident: i }) => <span className="tabular text-[13px]">{i.resolutionHours}</span> },
              { key: "credit", header: "Credit (SGD)", align: "end", renderCell: ({ incident: i }) => <span className="tabular text-[13px]">{i.creditSgd.toLocaleString("en-SG")}</span> },
            ]}
          />
        </div>
      ) : (
        <p className="p-4 text-[13px] text-secondary">No SLA incidents this contract year.</p>
      )}
    </Panel>
    </div>
  );
}

const CASE_TONE = { critical: "critical", high: "critical", medium: "warning", low: "neutral" } as const;
const ROLE_LABEL = { champion: "Champion", economic_buyer: "Economic buyer", influencer: "Influencer", approver: "Approver", user: "User" } as const;
const SENTIMENT_TONE = { positive: "verified", neutral: "neutral", negative: "critical", unengaged: "warning" } as const;

// Hand-rolled list rather than a Table: each row needs an anchor id so health evidence can scroll to it.
function CasesPanel({ history }: { history: AccountHistory }) {
  const open = history.cases.filter((c) => c.status === "open").length;
  return (
    <Panel title={`Support cases (${history.cases.length})`} bodyClassName="p-0" action={<span className="text-[12px] text-secondary">{open} open, sample data</span>}>
      <ul className="divide-y divide-st-line">
        {history.cases.map((c) => (
          <li key={c.id} id={`ev-${c.id}`} className="scroll-mt-24 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              <span className="font-id text-primary">{c.id}</span>
              <span className="tabular text-secondary">{formatDate(c.openedOn)}</span>
              <StatusWord tone={CASE_TONE[c.severity]}>{c.severity[0].toUpperCase() + c.severity.slice(1)} {c.category}</StatusWord>
              <StatusWord tone={c.status === "open" ? "info" : "neutral"}>{c.status === "open" ? "Open" : "Resolved"}</StatusWord>
              {c.csat !== undefined && <span className={`tabular ${c.csat <= 2 ? "font-semibold text-st-red-ink" : "text-secondary"}`}>Satisfaction {c.csat} of 5</span>}
              {c.competitor && <span className="font-semibold text-st-red-ink">Mentions {c.competitor}</span>}
            </div>
            <p className="mt-0.5 text-[13px] text-primary">{c.subject}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function ContactsPanel({ history }: { history: AccountHistory }) {
  return (
    <Panel title="Key contacts" bodyClassName="p-0" action={<span className="text-[12px] text-secondary">By role, sample data</span>}>
      <ul id="rec-contacts" className="divide-y divide-st-line">
        {history.contacts.map((c) => (
          <li key={c.id} id={`ev-${c.id}`} className="scroll-mt-24 px-4 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className={`text-[13px] font-medium ${c.leftOn ? "text-secondary line-through" : "text-primary"}`}>{c.title}</span>
              <StatusWord tone={c.leftOn ? "critical" : SENTIMENT_TONE[c.sentiment]}>{c.leftOn ? "Left" : c.sentiment[0].toUpperCase() + c.sentiment.slice(1)}</StatusWord>
            </div>
            <p className="text-[12px] text-secondary">
              {ROLE_LABEL[c.role]}, {c.leftOn ? `left on ${formatDate(c.leftOn)}` : c.lastContactOn ? `last contact ${formatDate(c.lastContactOn)}` : "no contact on record"}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function CompetitionTab({ history }: { history: AccountHistory }) {
  return (
    <Panel title="Competitive landscape" action={<span className="text-[12px] text-secondary">Sample data</span>}>
      <ul className="divide-y divide-st-line">
        {history.competitors.map((c) => (
          <li key={c.name} className="py-2.5 first:pt-0 last:pb-0">
            <div className="text-[13px] font-semibold text-primary">{c.name}</div>
            <p className="text-[13px] text-secondary">{c.threat}</p>
          </li>
        ))}
      </ul>
      {history.competitors.length === 0 && <p className="text-[13px] text-secondary">No competitor recorded on this account.</p>}
    </Panel>
  );
}

export function ProductMixTab({ history, owned = [] }: { history: AccountHistory; owned?: ProductId[] }) {
  return (
    <div className="space-y-4">
      {history.productMix.map((p) => (
        <Panel key={p.bundle} title={p.bundle} action={<span className="text-[12px] text-secondary">Outcome-based bundle</span>}>
          <ul className="divide-y divide-st-line">
            {p.products.map((id) => {
              const product = getProduct(id as ProductId);
              const isOwned = owned.includes(id as ProductId);
              return (
                <li key={id} className="flex items-center justify-between gap-3 py-2 text-[13px] first:pt-0">
                  {product ? (
                    <a href={product.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {product.name}
                    </a>
                  ) : (
                    <span>{id}</span>
                  )}
                  <StatusWord tone={isOwned ? "verified" : "neutral"}>{isOwned ? "In contract" : "Not yet sold"}</StatusWord>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[13px] text-primary">
            <span className="font-semibold">Gap: </span>
            {p.gap}
          </p>
        </Panel>
      ))}
    </div>
  );
}
