import { z } from "zod";
import accountsJson from "@/data/history/accounts.json";
import playbooksJson from "@/data/history/playbooks.json";
import repsJson from "@/data/history/reps.json";
import catalogJson from "@/data/catalog.json";
import { formatSgd } from "@/lib/format";
import { ProductIdSchema, type ProductId } from "@/types/singtech";

// Account history for existing customers. Every account, person, invoice, meeting, and incident here is fictional
// and must render as "Sample account" / "Sample data". Validated once at import, like data-service.ts.

export type NetStatus = "on-net" | "near-net" | "off-net";
export interface SiteFeasibility { siteId: string; name: string; address: string; lat: number; lng: number; fiber: NetStatus; fiveG: NetStatus; seats: number; strain?: string }
export type MeddpiccKey = "metrics" | "economicBuyer" | "decisionCriteria" | "decisionProcess" | "paperProcess" | "identifyPain" | "champion" | "competition";
export interface MeddpiccItem { key: MeddpiccKey; label: string; score: 0 | 1 | 2; evidence: string; gap?: string }
export interface Invoice { id: string; accountId: string; issuedOn: string; dueOn: string; amountSgd: number; status: "paid" | "overdue" | "disputed"; billingSystem: "SAP" | "Oracle"; lines: { productId: string; description: string; amountSgd: number }[]; note?: string }
export interface MeetingMinute { id: string; accountId: string; date: string; title: string; attendees: string[]; decisions: string[]; actions: { owner: string; action: string; due: string }[] }
export interface SlaIncident { id: string; accountId: string; date: string; severity: "P1" | "P2" | "P3"; summary: string; resolutionHours: number; creditSgd: number }
export type ContactRole = "champion" | "economic_buyer" | "influencer" | "approver" | "user";
export interface Contact { id: string; title: string; role: ContactRole; sentiment: "positive" | "neutral" | "negative" | "unengaged"; lastContactOn?: string; leftOn?: string }
export interface SupportCase { id: string; openedOn: string; category: "outage" | "performance" | "billing" | "complaint" | "request"; severity: "low" | "medium" | "high" | "critical"; subject: string; status: "open" | "resolved"; csat?: number; siteId?: string; competitor?: string }
export interface RepProfile { id: string; name: string; role: string; quotaSgd: number; closedSgd: number; winRatePct: number; avgCycleDays: number }
// Only set for sample accounts that are not (yet) in cached_companies.json, such as the flagship acct-meridian-sg.
export interface AccountProfile { industryLabel: string; hqLabel: string; coordinates: [number, number]; currentArrSgd: number; ownedProducts: ProductId[]; summary: string }
export interface AccountHistory {
  accountId: string;
  accountName: string;
  profile?: AccountProfile;
  route: "singtel-enterprise" | "ncs-multi-lob";
  ncsLobs: string[];
  sites: SiteFeasibility[];
  meddpicc: MeddpiccItem[];
  contractEndDate: string;
  billing: { system: "SAP" | "Oracle" | "SAP-to-Oracle"; frictionNotes: string[] };
  invoices: Invoice[];
  meetings: MeetingMinute[];
  slaIncidents: SlaIncident[];
  cases: SupportCase[];
  contacts: Contact[];
  competitors: { name: string; threat: string }[];
  rep: RepProfile;
  productMix: { bundle: string; products: string[]; gap: string }[];
}
export interface RagDoc { id: string; title: string; text: string; source: string; kind: "playbook" | "account" | "invoice" | "meeting" | "incident" | "rep" | "product" | "signal" }

const MEDDPICC_LABELS = {
  metrics: "Metrics",
  economicBuyer: "Economic Buyer",
  decisionCriteria: "Decision Criteria",
  decisionProcess: "Decision Process",
  paperProcess: "Paper Process",
  identifyPain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
} as const satisfies Record<MeddpiccKey, string>;
const MEDDPICC_KEYS = Object.keys(MEDDPICC_LABELS) as MeddpiccKey[];

// Outcome bundles: each productMix entry names one, and its products come from here so they cannot drift.
export const OUTCOME_BUNDLES = {
  "Unified SASE & SD-WAN + 5G": ["SGT-CYBER", "SGT-CUBE", "SGT-5G"],
  "Private 5G + Edge": ["SGT-5G"],
  "RE:AI sovereign AI + hyperscaler orchestration": ["SGT-REAI", "SGT-NXERA", "SGT-CUBE"],
} as const satisfies Record<string, readonly ProductId[]>;
type OutcomeBundle = keyof typeof OUTCOME_BUNDLES;

export const INVOICE_ID_PATTERN = /^SGT-INV-2026-\d{4}$/;
const IsoDate = z.iso.date();
const Text = z.string().min(1);
const NetStatusSchema = z.enum(["on-net", "near-net", "off-net"]);

const SiteSchema = z.object({
  siteId: Text,
  name: Text,
  address: Text,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  fiber: NetStatusSchema,
  fiveG: NetStatusSchema,
  seats: z.number().int().positive(),
  strain: Text.optional(),
});

const InvoiceJsonSchema = z
  .object({
    id: z.string().regex(INVOICE_ID_PATTERN),
    issuedOn: IsoDate,
    dueOn: IsoDate,
    amountSgd: z.number().int().positive(),
    status: z.enum(["paid", "overdue", "disputed"]),
    billingSystem: z.enum(["SAP", "Oracle"]),
    // Negative lines are service credits netted off the invoice.
    lines: z.array(z.object({ productId: ProductIdSchema, description: Text, amountSgd: z.number().int() })).min(1),
    note: Text.optional(),
  })
  .refine((i) => i.lines.reduce((s, l) => s + l.amountSgd, 0) === i.amountSgd, { message: "Invoice lines must sum to the invoice amount" })
  .refine((i) => i.dueOn >= i.issuedOn, { message: "Invoice is due before it is issued" });

export const AccountHistoryJsonSchema = z
  .object({
    accountId: z.string().regex(/^acct-[a-z0-9-]+$/),
    accountName: Text,
    profile: z
      .object({
        industryLabel: Text,
        hqLabel: Text,
        coordinates: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
        currentArrSgd: z.number().int().positive(),
        ownedProducts: z.array(ProductIdSchema).min(1),
        summary: Text,
      })
      .optional(),
    route: z.enum(["singtel-enterprise", "ncs-multi-lob"]),
    ncsLobs: z.array(Text),
    repId: Text,
    contractEndDate: IsoDate,
    sites: z.array(SiteSchema).min(1),
    meddpicc: z
      .array(z.object({ key: z.enum(MEDDPICC_KEYS), score: z.union([z.literal(0), z.literal(1), z.literal(2)]), evidence: Text, gap: Text.optional() }))
      .length(MEDDPICC_KEYS.length)
      .refine((items) => new Set(items.map((m) => m.key)).size === MEDDPICC_KEYS.length, { message: "Each MEDDPICC element must appear once" })
      .refine((items) => items.every((m) => m.score === 2 || m.gap), { message: "Every MEDDPICC score under 2 needs a gap" }),
    billing: z.object({ system: z.enum(["SAP", "Oracle", "SAP-to-Oracle"]), frictionNotes: z.array(Text).min(1) }),
    invoices: z.array(InvoiceJsonSchema).min(4).max(8),
    meetings: z
      .array(
        z.object({
          id: Text,
          date: IsoDate,
          title: Text,
          attendees: z.array(Text).min(1),
          decisions: z.array(Text).min(1),
          actions: z.array(z.object({ owner: Text, action: Text, due: IsoDate })),
        }),
      )
      .min(3)
      .max(6),
    slaIncidents: z.array(
      z.object({
        id: z.string().regex(/^INC-2026-\d{4}$/),
        date: IsoDate,
        severity: z.enum(["P1", "P2", "P3"]),
        summary: Text,
        resolutionHours: z.number().positive(),
        creditSgd: z.number().int().nonnegative(),
      }),
    ),
    cases: z.array(
      z.object({
        id: z.string().regex(/^CASE-2026-\d{4}$/),
        openedOn: IsoDate,
        category: z.enum(["outage", "performance", "billing", "complaint", "request"]),
        severity: z.enum(["low", "medium", "high", "critical"]),
        subject: Text,
        status: z.enum(["open", "resolved"]),
        csat: z.number().int().min(1).max(5).optional(),
        siteId: Text.optional(),
        competitor: Text.optional(),
      }),
    ),
    contacts: z
      .array(
        z.object({
          id: z.string().regex(/^CON-[A-Z]{2}-\d{2}$/),
          title: Text,
          role: z.enum(["champion", "economic_buyer", "influencer", "approver", "user"]),
          sentiment: z.enum(["positive", "neutral", "negative", "unengaged"]),
          lastContactOn: IsoDate.optional(),
          leftOn: IsoDate.optional(),
        }),
      )
      .min(1),
    competitors: z.array(z.object({ name: Text, threat: Text })).min(1),
    productMix: z.array(z.object({ bundle: z.enum(Object.keys(OUTCOME_BUNDLES) as [OutcomeBundle, ...OutcomeBundle[]]), gap: Text })).min(1),
  })
  .refine((a) => a.cases.every((c) => !c.siteId || a.sites.some((s) => s.siteId === c.siteId)), { message: "A case site must be one of the account's sites" })
  .refine((a) => (a.route === "ncs-multi-lob") === a.ncsLobs.length > 0, { message: "NCS lines of business are required for, and only for, NCS multi-LOB routes" })
  .refine((a) => a.billing.system === "SAP-to-Oracle" || a.invoices.every((i) => i.billingSystem === a.billing.system), {
    message: "Invoices must use the account's billing system",
  });

const RepSchema = z.object({
  id: Text,
  name: Text,
  role: Text,
  quotaSgd: z.number().int().positive(),
  closedSgd: z.number().int().nonnegative(),
  winRatePct: z.number().min(0).max(100),
  avgCycleDays: z.number().int().positive(),
});

const PlaybookSchema = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), title: Text, body: Text });

type AccountHistoryJson = z.infer<typeof AccountHistoryJsonSchema>;

const reps = z.array(RepSchema).parse(repsJson);
const repsById = new Map(reps.map((r) => [r.id, r]));
export const PLAYBOOKS = z.array(PlaybookSchema).parse(playbooksJson);

function toHistory({ repId, meddpicc, invoices, meetings, slaIncidents, productMix, ...rest }: AccountHistoryJson): AccountHistory {
  const rep = repsById.get(repId);
  if (!rep) throw new Error(`Unknown rep ${repId} on ${rest.accountId}`);
  const { accountId } = rest;
  return {
    ...rest,
    rep,
    meddpicc: meddpicc.map((m) => ({ ...m, label: MEDDPICC_LABELS[m.key] })),
    invoices: invoices.map((i) => ({ ...i, accountId })),
    meetings: meetings.map((m) => ({ ...m, accountId })),
    slaIncidents: slaIncidents.map((s) => ({ ...s, accountId })),
    productMix: productMix.map((p) => ({ ...p, products: [...OUTCOME_BUNDLES[p.bundle]] })),
  };
}

const histories = z.array(AccountHistoryJsonSchema).parse(accountsJson).map(toHistory);
const historiesById = new Map(histories.map((h) => [h.accountId, h]));
const invoicesById = new Map(histories.flatMap((h) => h.invoices.map((i) => [i.id, i] as const)));
if (historiesById.size !== histories.length) throw new Error("Duplicate account id in history data");
if (invoicesById.size !== histories.reduce((n, h) => n + h.invoices.length, 0)) throw new Error("Duplicate invoice id in history data");

export const getAccountHistory = (accountId: string) => historiesById.get(accountId);
export const getAllHistories = () => histories;
export const findInvoice = (billId: string) => invoicesById.get(billId.trim().toUpperCase());
export const meddpiccTotal = (h: AccountHistory) => h.meddpicc.reduce((sum, m) => sum + m.score, 0);

const DAY_MS = 86_400_000;
const PRE_RENEWAL_MIN_DAYS = 365;
const PRE_RENEWAL_MAX_DAYS = 548;
// Accepts ISO dates or datetimes; compares calendar days in UTC so the result never depends on the server's timezone.
const dayNumber = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS;
const addDays = (iso: string, days: number) => new Date((dayNumber(iso) + days) * DAY_MS).toISOString().slice(0, 10);

/** Whole days from `today` to `date` (negative when `date` has passed). NaN for an invalid date. */
export const daysUntil = (date: string, today: string) => dayNumber(date) - dayNumber(today);

/** True 12 to 18 months before contract end: 365 to 548 days inclusive. `today` is passed in, never read from the clock. */
export function isPreRenewalWindow(contractEndDate: string, today: string): boolean {
  const days = daysUntil(contractEndDate, today);
  return days >= PRE_RENEWAL_MIN_DAYS && days <= PRE_RENEWAL_MAX_DAYS;
}

// ---- Plain-text documents for retrieval

const productNames = new Map(catalogJson.map((p) => [p.id, p.shortName]));
const productLabel = (id: string) => `${productNames.get(id) ?? id} (${id})`;
const ACCOUNTS_SOURCE = "src/data/history/accounts.json";
const sample = (h: AccountHistory) => `${h.accountName} (Sample account, fictional)`;
const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n");

function accountDoc(h: AccountHistory): RagDoc {
  const route = h.route === "ncs-multi-lob" ? `NCS multi-LOB (${h.ncsLobs.join("; ")})` : "Singtel Enterprise";
  return {
    id: `account:${h.accountId}`,
    title: `${h.accountName}: account history`,
    kind: "account",
    source: `${ACCOUNTS_SOURCE}#${h.accountId}`,
    text: lines(
      `${sample(h)}. Account ID ${h.accountId}.`,
      h.profile && `${h.profile.industryLabel}, ${h.profile.hqLabel}. ${h.profile.summary} Current ARR ${formatSgd(h.profile.currentArrSgd)}. Owns ${h.profile.ownedProducts.map(productLabel).join(", ")}.`,
      `Route: ${route}.`,
      `Account executive: ${h.rep.name}, ${h.rep.role}.`,
      `Contract end date: ${h.contractEndDate}. Pre-renewal upsell window: ${addDays(h.contractEndDate, -PRE_RENEWAL_MAX_DAYS)} to ${addDays(h.contractEndDate, -PRE_RENEWAL_MIN_DAYS)}.`,
      `Billing system: ${h.billing.system}. Billing friction: ${h.billing.frictionNotes.join(" ")}`,
      "Sites:",
      ...h.sites.map((s) => `- ${s.name}, ${s.address}: fibre ${s.fiber}, 5G ${s.fiveG}, ${s.seats} seats.${s.strain ? ` Strain: ${s.strain}` : ""}`),
      `MEDDPICC total: ${meddpiccTotal(h)} of 16.`,
      ...h.meddpicc.map((m) => `- ${m.label} ${m.score}/2: ${m.evidence}${m.gap ? ` Gap: ${m.gap}` : ""}`),
      "Competitors:",
      ...h.competitors.map((c) => `- ${c.name}: ${c.threat}`),
      "Outcome-based product mix:",
      ...h.productMix.map((p) => `- ${p.bundle} (${p.products.map(productLabel).join(", ")}): ${p.gap}`),
      `Invoices: ${h.invoices.map((i) => `${i.id} (${i.status})`).join(", ")}.`,
      `SLA incidents: ${h.slaIncidents.length ? h.slaIncidents.map((s) => `${s.id} (${s.severity})`).join(", ") : "none"}.`,
      "Key contacts (by role):",
      ...h.contacts.map((c) => `- ${c.title}: ${c.role.replace("_", " ")}, ${c.sentiment}${c.leftOn ? `, left the company on ${c.leftOn}` : c.lastContactOn ? `, last contact ${c.lastContactOn}` : ", no contact on record"}.`),
      "Support cases:",
      ...h.cases.map((c) => `- ${c.id} (${c.openedOn}, ${c.category}, ${c.severity}, ${c.status}${c.csat ? `, satisfaction ${c.csat} of 5` : ""}${c.competitor ? `, mentions ${c.competitor}` : ""}): ${c.subject}`),
    ),
  };
}

const invoiceDoc = (h: AccountHistory, i: Invoice): RagDoc => ({
  id: `invoice:${i.id}`,
  title: `Invoice ${i.id}: ${h.accountName}`,
  kind: "invoice",
  source: `${ACCOUNTS_SOURCE}#${i.id}`,
  text: lines(
    `Invoice ${i.id} for ${sample(h)}, account ${h.accountId}.`,
    `Issued ${i.issuedOn}, due ${i.dueOn}. Amount ${formatSgd(i.amountSgd)}. Status: ${i.status}. Billing system: ${i.billingSystem}.`,
    "Lines:",
    ...i.lines.map((l) => `- ${productLabel(l.productId)}: ${l.description}, ${formatSgd(l.amountSgd)}`),
    i.note && `Note: ${i.note}`,
  ),
});

const meetingDoc = (h: AccountHistory, m: MeetingMinute): RagDoc => ({
  id: `meeting:${m.id}`,
  title: `${m.title}: ${h.accountName}, ${m.date}`,
  kind: "meeting",
  source: `${ACCOUNTS_SOURCE}#${m.id}`,
  text: lines(
    `Meeting minutes for ${sample(h)}, ${m.date}: ${m.title}.`,
    `Attendees (by role): ${m.attendees.join("; ")}.`,
    "Decisions:",
    ...m.decisions.map((d) => `- ${d}`),
    "Actions:",
    ...(m.actions.length ? m.actions.map((a) => `- ${a.owner}: ${a.action} (due ${a.due})`) : ["- None"]),
  ),
});

const incidentDoc = (h: AccountHistory, s: SlaIncident): RagDoc => ({
  id: `incident:${s.id}`,
  title: `SLA incident ${s.id} (${s.severity}): ${h.accountName}`,
  kind: "incident",
  source: `${ACCOUNTS_SOURCE}#${s.id}`,
  text: `SLA incident ${s.id}, severity ${s.severity}, at ${sample(h)} on ${s.date}. ${s.summary} Resolved in ${s.resolutionHours} hours. Service credit: ${formatSgd(s.creditSgd)}.`,
});

function repDoc(rep: RepProfile): RagDoc {
  const owned = histories.filter((h) => h.rep.id === rep.id);
  return {
    id: `rep:${rep.id}`,
    title: `Account executive log: ${rep.name}, ${rep.role}`,
    kind: "rep",
    source: `src/data/history/reps.json#${rep.id}`,
    text: lines(
      `Account executive ${rep.name} (sample data, fictional), ${rep.role}.`,
      `Quota ${formatSgd(rep.quotaSgd)}; closed ${formatSgd(rep.closedSgd)} (${Math.round((rep.closedSgd / rep.quotaSgd) * 100)}% attainment).`,
      `Win rate ${rep.winRatePct}%. Average sales cycle ${rep.avgCycleDays} days.`,
      `Accounts: ${owned.length ? owned.map((h) => `${h.accountName} (${h.accountId}), MEDDPICC ${meddpiccTotal(h)} of 16, contract end ${h.contractEndDate}`).join("; ") : "none"}.`,
    ),
  };
}

const playbookDoc = (p: z.infer<typeof PlaybookSchema>): RagDoc => ({
  id: `playbook:${p.id}`,
  title: p.title,
  kind: "playbook",
  source: `rag-corpus/${p.id}.md`,
  text: `${p.title}\n\n${p.body}`,
});

const documents: RagDoc[] = [
  ...PLAYBOOKS.map(playbookDoc),
  ...histories.flatMap((h) => [
    accountDoc(h),
    ...h.invoices.map((i) => invoiceDoc(h, i)),
    ...h.meetings.map((m) => meetingDoc(h, m)),
    ...h.slaIncidents.map((s) => incidentDoc(h, s)),
  ]),
  ...reps.map(repDoc),
];

/** Every account, invoice, meeting, incident, rep log, and playbook as plain-text documents. */
export const historyDocuments = (): RagDoc[] => [...documents];
