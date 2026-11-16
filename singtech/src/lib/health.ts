import { getCompany, getProduct } from "./data-service";
import { formatSgd } from "./format";
import type { AccountHistory, SupportCase } from "./history";
import type { ProductId } from "@/types/singtech";

// Account health (0 to 100) and one next best action, from the account's own records. Rules only, no AI:
// the same records always give the same result, and every reason names the records it came from.
// Adapted from the team's account-intelligence rules (health.js, next-action.js) to SingTech's sample data.

/** The sample records are a snapshot; scoring them against a fixed date keeps the demo stable from day to day. */
export const SAMPLE_DATA_AS_OF = "2026-11-16";

export type HealthBand = "healthy" | "watch" | "at_risk";
export type RiskReason = "service" | "price" | "partial_move" | "relationship" | "coverage" | "billing";
export type ActionCode = "service_recovery" | "renewal_value_case" | "stakeholder_remap" | "billing_resolution" | "coverage_plan" | "cross_sell" | "executive_meeting" | "upsell";
export interface HealthReason { code: string; label: string; reason: RiskReason | "strength"; points: number; evidence: string[] }
export interface NextBestAction { code: ActionCode; label: string; productId?: ProductId; contact?: string; path: { question: string; answer: string }[]; talkingPoints: string[] }
export interface AccountHealth { score: number; band: HealthBand; reasons: HealthReason[]; topReason?: RiskReason; renewalDays: number; daysSinceMeeting?: number; revenueAtStakeSgd: number; action: NextBestAction }

export const BAND_LABEL: Record<HealthBand, string> = { healthy: "Healthy", watch: "Watch", at_risk: "At risk" };
export const REASON_LABEL: Record<RiskReason, string> = {
  service: "Service issues",
  price: "Price pressure",
  partial_move: "Partial move to a competitor",
  relationship: "Relationship gap",
  coverage: "Coverage gap",
  billing: "Billing friction",
};

const RULES = {
  bands: { healthy: 70, watch: 40 },
  windows: { incident: 120, change: 180, offNetCase: 90, staleMeeting: 90, recentReview: 60, renewal: 120 },
  penalty: { p1: 15, p2: 8, complaint: 10, lowCsat: 5, lowCsatMax: 2, competitor: 15, offNetCase: 8, disputed: 10, overdue: 8, keyContactLeft: 20, noMeeting: 15, buyerUnengaged: 10 },
  caps: { incident: 30, complaint: 20, lowCsat: 15, competitor: 30, offNetCase: 16, billing: 18, keyContactLeft: 30 } as Record<string, number>,
  credit: { recentReview: 5 },
  bandWeight: { at_risk: 1, watch: 0.5, healthy: 0.1 },
} as const;

// A risk reason maps to a play; none of them is a discount. Price pressure gets a value case instead.
const RISK_ACTION: Record<RiskReason, ActionCode> = {
  service: "service_recovery",
  price: "renewal_value_case",
  partial_move: "renewal_value_case",
  relationship: "stakeholder_remap",
  coverage: "coverage_plan",
  billing: "billing_resolution",
};

const ACTION_LABEL: Record<ActionCode, string> = {
  service_recovery: "Run a service recovery plan",
  renewal_value_case: "Build the renewal value case",
  stakeholder_remap: "Rebuild the stakeholder map",
  billing_resolution: "Resolve the open billing items",
  coverage_plan: "Close the coverage gap at off-network sites",
  cross_sell: "Propose the missing service",
  executive_meeting: "Book an executive review",
  upsell: "Grow what the customer already buys",
};

const DAY_MS = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / DAY_MS);
const within = (date: string, asOf: string, window: number) => {
  const d = days(date, asOf);
  return d >= 0 && d <= window;
};

const PRICE = /\b(cheaper|price|pricing|cost|fee|rates?)\b/i;
const PARTIAL = /\b(rfp|tender|moved to|switching to)\b/i;

/** Which risk a case points to: its words first, then whether its site is off the Singtel network. */
export function classifyCase(c: SupportCase, history: AccountHistory): RiskReason {
  if (PRICE.test(c.subject)) return "price";
  if (PARTIAL.test(c.subject)) return "partial_move";
  const site = history.sites.find((s) => s.siteId === c.siteId);
  if (site?.fiber === "off-net") return "coverage";
  return c.category === "billing" ? "billing" : "service";
}

export const bandFor = (score: number): HealthBand => (score >= RULES.bands.healthy ? "healthy" : score >= RULES.bands.watch ? "watch" : "at_risk");

function collectReasons(h: AccountHistory, asOf: string): HealthReason[] {
  const { penalty: P, windows: W } = RULES;
  const used: Record<string, number> = {};
  const reasons: HealthReason[] = [];
  const penalise = (cap: string, code: string, label: string, reason: RiskReason, points: number, evidence: string[]) => {
    const allowed = Math.min(points, (RULES.caps[cap] ?? Infinity) - (used[cap] ?? 0));
    if (allowed <= 0) return;
    used[cap] = (used[cap] ?? 0) + allowed;
    reasons.push({ code, label, reason, points: -allowed, evidence });
  };

  for (const i of h.slaIncidents.filter((x) => x.severity !== "P3" && within(x.date, asOf, W.incident))) {
    // Labels leave out record IDs: the evidence list carries them, and the UI shows each as a link.
    penalise("incident", "severe_incident", `${i.severity} incident: ${i.summary}`, "service", i.severity === "P1" ? P.p1 : P.p2, [i.id]);
  }
  for (const c of h.cases.filter((x) => within(x.openedOn, asOf, W.change))) {
    const reason = classifyCase(c, h);
    if (c.category === "complaint") penalise("complaint", "complaint", `Complaint: ${c.subject}`, reason, P.complaint, [c.id]);
    if (c.csat !== undefined && c.csat <= P.lowCsatMax) penalise("lowCsat", "low_satisfaction", `Satisfaction ${c.csat} of 5 on a ${c.category} case`, reason, P.lowCsat, [c.id]);
    if (c.competitor) penalise("competitor", "competitor_mention", `${c.competitor} mentioned: ${c.subject}`, reason, P.competitor, [c.id]);
    const site = h.sites.find((s) => s.siteId === c.siteId);
    if (site?.fiber === "off-net" && (c.category === "outage" || c.category === "performance") && within(c.openedOn, asOf, W.offNetCase)) {
      penalise("offNetCase", "off_net_case", `${c.category === "outage" ? "Outage" : "Performance"} case at ${site.name}, a site off the Singtel network`, "coverage", P.offNetCase, [c.id, site.siteId]);
    }
  }
  for (const inv of h.invoices.filter((x) => x.status !== "paid")) {
    penalise("billing", `invoice_${inv.status}`, `Invoice ${inv.status}, ${formatSgd(inv.amountSgd)}`, "billing", inv.status === "disputed" ? P.disputed : P.overdue, [inv.id]);
  }
  relationshipReasons(h, asOf, penalise, reasons);
  return reasons;
}

type Penalise = (cap: string, code: string, label: string, reason: RiskReason, points: number, evidence: string[]) => void;

function relationshipReasons(h: AccountHistory, asOf: string, penalise: Penalise, reasons: HealthReason[]) {
  const { penalty: P, windows: W } = RULES;
  for (const c of h.contacts.filter((x) => x.leftOn && (x.role === "champion" || x.role === "economic_buyer") && within(x.leftOn, asOf, W.change))) {
    penalise("keyContactLeft", "key_contact_left", `${c.title} left the company on ${c.leftOn}`, "relationship", P.keyContactLeft, [c.id]);
  }
  if (h.meddpicc.find((m) => m.key === "economicBuyer")?.score === 0) {
    const buyer = h.contacts.filter((c) => c.role === "economic_buyer" && !c.leftOn).map((c) => c.id);
    penalise("buyer", "buyer_unengaged", "Economic buyer not engaged", "relationship", P.buyerUnengaged, buyer);
  }
  const last = h.meetings.filter((m) => m.date <= asOf).at(-1);
  const since = last ? days(last.date, asOf) : undefined;
  if (since === undefined || since > W.staleMeeting) {
    penalise("meeting", "no_recent_meeting", last ? `No meeting in ${since} days` : "No meeting on record", "relationship", P.noMeeting, last ? [last.id] : []);
  } else if (since <= W.recentReview) {
    reasons.push({ code: "recent_review", label: `Account review on ${last!.date}: ${last!.title}`, reason: "strength", points: RULES.credit.recentReview, evidence: [last!.id] });
  }
}

/** The risk with the most points against it; ties go to the reason listed first in REASON_LABEL. */
function topReason(reasons: HealthReason[]): RiskReason | undefined {
  const totals = new Map<RiskReason, number>();
  for (const r of reasons) if (r.reason !== "strength") totals.set(r.reason, (totals.get(r.reason) ?? 0) - r.points);
  const order = Object.keys(REASON_LABEL) as RiskReason[];
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))[0]?.[0];
}

export interface AssessInput { owned: readonly ProductId[]; arrSgd?: number; asOf?: string; productName?: (id: ProductId) => string }

export function assessAccount(h: AccountHistory, { owned, arrSgd = 0, asOf = SAMPLE_DATA_AS_OF, productName = (id) => id }: AssessInput): AccountHealth {
  const reasons = collectReasons(h, asOf);
  const score = Math.max(0, Math.min(100, 100 + reasons.reduce((s, r) => s + r.points, 0)));
  const band = bandFor(score);
  const top = topReason(reasons);
  const renewalDays = days(asOf, h.contractEndDate);
  const last = h.meetings.filter((m) => m.date <= asOf).at(-1);
  const daysSinceMeeting = last ? days(last.date, asOf) : undefined;
  const gap = h.productMix.flatMap((p) => p.products as ProductId[]).find((id) => !owned.includes(id));
  const action = decideAction({ h, band, top, renewalDays, daysSinceMeeting, gap, owned, reasons, productName });
  return { score, band, reasons, topReason: top, renewalDays, daysSinceMeeting, revenueAtStakeSgd: Math.round(arrSgd * RULES.bandWeight[band]), action };
}

interface Decide { h: AccountHistory; band: HealthBand; top?: RiskReason; renewalDays: number; daysSinceMeeting?: number; gap?: ProductId; owned: readonly ProductId[]; reasons: HealthReason[]; productName: (id: ProductId) => string }

// One action per account: risk first, then the renewal window, then a missing service, then a quiet relationship.
function decideAction(d: Decide): NextBestAction {
  const path: NextBestAction["path"] = [];
  const atRisk = d.band !== "healthy";
  path.push({ question: "Is the account at risk or on watch?", answer: atRisk ? `Yes, ${BAND_LABEL[d.band].toLowerCase()}` : "No" });
  let code: ActionCode;
  if (atRisk && d.top) {
    path.push({ question: "What is the main reason?", answer: REASON_LABEL[d.top] });
    code = RISK_ACTION[d.top];
  } else {
    const renewalSoon = d.renewalDays >= 0 && d.renewalDays <= RULES.windows.renewal;
    path.push({ question: `Is the renewal within ${RULES.windows.renewal} days?`, answer: renewalSoon ? `Yes, ${d.renewalDays} days` : "No" });
    const stale = d.daysSinceMeeting === undefined || d.daysSinceMeeting > RULES.windows.staleMeeting;
    if (!renewalSoon) path.push({ question: "Is a service from the product mix missing?", answer: d.gap ? `Yes, ${d.productName(d.gap)}` : "No" });
    if (!renewalSoon && !d.gap) path.push({ question: "Has the relationship gone quiet?", answer: stale ? "Yes" : "No" });
    code = renewalSoon ? "renewal_value_case" : d.gap ? "cross_sell" : stale ? "executive_meeting" : "upsell";
  }
  // CUBΣ is the managed network that can run over a partner tail, so it is the honest answer to an off-network site.
  const productId = code === "upsell" ? d.owned[0] : code === "coverage_plan" ? "SGT-CUBE" : code === "stakeholder_remap" || code === "billing_resolution" ? undefined : d.gap;
  const current = d.h.contacts.filter((c) => !c.leftOn);
  const contact = (current.find((c) => c.role === "champion") ?? current.find((c) => c.role === "economic_buyer") ?? current[0])?.title;
  const label = code === "cross_sell" && productId ? `Propose ${d.productName(productId)}` : ACTION_LABEL[code];
  return { code, label, productId, contact, path, talkingPoints: talkingPoints(code, d, productId) };
}

function talkingPoints(code: ActionCode, d: Decide, productId?: ProductId): string[] {
  const of = (reason: RiskReason) => d.reasons.filter((r) => r.reason === reason);
  const rival = d.h.cases.find((c) => c.competitor)?.competitor;
  const product = productId ? d.productName(productId) : undefined;
  const openBills = d.h.invoices.filter((i) => i.status !== "paid").map((i) => i.id);
  const points: (string | false | undefined)[] = {
    service_recovery: [
      `Acknowledge ${of("service").filter((r) => r.code === "severe_incident").map((r) => r.evidence[0]).join(" and ") || "the recent service cases"} and share the root cause.`,
      "Offer a written service recovery plan with named owners and fortnightly reviews.",
      rival && `${rival} is in conversation with the customer; close the gap before it becomes a tender.`,
      product && `Offer ${product} as a resilient second path for the affected sites, as part of the fix.`,
    ],
    renewal_value_case: [
      `Renewal on ${d.h.contractEndDate}, ${d.renewalDays} days away.`,
      of("price").length > 0 && `${rival ?? "A competitor"} is quoting a lower price; answer with outcomes delivered this term, not a discount.`,
      "Quantify uptime, incidents resolved and credits issued this contract term.",
      openBills.length > 0 && `Clear ${openBills.join(", ")} before the renewal paper goes to committee.`,
      product && `Include ${product} in the renewal scope.`,
    ],
    stakeholder_remap: [
      ...of("relationship").map((r) => `${r.label}.`),
      "Map who now owns the budget and the technical decision, and book introductions within two weeks.",
      "Re-confirm the success criteria agreed with the previous sponsor.",
    ],
    billing_resolution: [`Resolve ${openBills.join(", ")} with the billing specialist before the next review.`, "Confirm the corrected amounts to the customer's finance team in writing."],
    coverage_plan: [
      `${of("coverage").length} recent issue${of("coverage").length === 1 ? "" : "s"} at sites off the Singtel network: ${offNetSites(d.h).join(", ")}.`,
      rival && `${rival} has offered an alternative link; respond with a managed option before it becomes a tender.`,
      `${d.owned.includes("SGT-CUBE") ? "Extend" : "Scope"} CUBΣ over a partner tail for those sites, with Singtel as the single point of accountability.`,
      "Agree the partner tail service levels in writing.",
    ],
    cross_sell: [
      d.h.productMix.find((p) => productId && p.products.includes(productId))?.gap,
      product && `Propose ${product} as the next step, with a scoped pilot.`,
    ],
    executive_meeting: [d.daysSinceMeeting === undefined ? "No meeting on record." : `No account review in ${d.daysSinceMeeting} days.`, "Book an executive review and bring the account plan."],
    upsell: [product && `Usage and satisfaction are healthy; propose more of ${product}.`, "Bring a growth plan to the next account review."],
  }[code];
  return points.filter((p): p is string => Boolean(p));
}

const offNetSites = (h: AccountHistory) => h.sites.filter((s) => s.fiber === "off-net").map((s) => s.name);

const cache = new Map<string, AccountHealth>();

/** Health for a sample account, with owned products and ARR from its company record. Static data, so it is cached. */
export function healthFor(h: AccountHistory): AccountHealth {
  const hit = cache.get(h.accountId);
  if (hit) return hit;
  const c = getCompany(h.accountId);
  const farming = c?.mode === "farming" ? c : undefined;
  const result = assessAccount(h, {
    owned: h.profile?.ownedProducts ?? farming?.ownedProducts ?? [],
    arrSgd: h.profile?.currentArrSgd ?? farming?.currentArrSgd ?? 0,
    productName: (id) => getProduct(id)?.shortName ?? id,
  });
  cache.set(h.accountId, result);
  return result;
}
