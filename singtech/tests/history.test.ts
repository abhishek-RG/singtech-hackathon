import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import accountsJson from "@/data/history/accounts.json";
import { getCompany } from "@/lib/data-service";
import {
  AccountHistoryJsonSchema,
  INVOICE_ID_PATTERN,
  OUTCOME_BUNDLES,
  PLAYBOOKS,
  daysUntil,
  findInvoice,
  getAccountHistory,
  getAllHistories,
  historyDocuments,
  isPreRenewalWindow,
  meddpiccTotal,
} from "@/lib/history";

const EXISTING = ["acct-lionrock-sg", "acct-straits-maritime-sg", "acct-aeropulse-sg", "acct-orchidbay-sg", "acct-helixveda-sg", "acct-harbourline-sg"];
const histories = getAllHistories();
const invoices = histories.flatMap((h) => h.invoices);
const TODAY = "2026-11-15";

describe("account history data", () => {
  it("validates against the schema and covers the 6 existing accounts plus the flagship", () => {
    expect(AccountHistoryJsonSchema.array().safeParse(accountsJson).success).toBe(true);
    expect(histories.map((h) => h.accountId).sort()).toEqual([...EXISTING, "acct-meridian-sg"].sort());
    for (const id of EXISTING) expect(getCompany(id)?.mode).toBe("farming");
    // The flagship is not in cached_companies.json, so it carries its own profile.
    expect(getCompany("acct-meridian-sg")).toBeUndefined();
    expect(getAccountHistory("acct-meridian-sg")?.profile).toBeDefined();
  });

  it("rejects an invoice whose lines do not sum to its amount", () => {
    const [first] = accountsJson;
    const broken = { ...first, invoices: first.invoices.map((i, n) => (n === 0 ? { ...i, amountSgd: i.amountSgd + 1 } : i)) };
    expect(AccountHistoryJsonSchema.safeParse(broken).success).toBe(false);
  });

  it("uses unique, well-formed invoice ids, including SGT-INV-2026-8841 on the flagship", () => {
    for (const i of invoices) expect(i.id).toMatch(INVOICE_ID_PATTERN);
    expect(new Set(invoices.map((i) => i.id)).size).toBe(invoices.length);
    const bill = findInvoice("SGT-INV-2026-8841");
    expect(bill?.accountId).toBe("acct-meridian-sg");
    expect(bill?.status).toBe("disputed");
    expect(findInvoice(" sgt-inv-2026-8841 ")).toBe(bill);
    expect(findInvoice("SGT-INV-2026-0000")).toBeUndefined();
  });

  it.each(invoices.map((i) => [i.id, i] as const))("%s: lines sum to the invoice amount", (_id, i) => {
    expect(i.lines.reduce((s, l) => s + l.amountSgd, 0)).toBe(i.amountSgd);
  });

  it.each(histories.map((h) => [h.accountId, h] as const))("%s: is internally consistent", (_id, h) => {
    const total = meddpiccTotal(h);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(16);
    expect(h.meddpicc.map((m) => m.key)).toHaveLength(8);
    expect(h.invoices.length).toBeGreaterThanOrEqual(4);
    expect(h.invoices.length).toBeLessThanOrEqual(8);
    expect(h.meetings.length).toBeGreaterThanOrEqual(3);
    expect(h.meetings.length).toBeLessThanOrEqual(6);
    // Unpaid invoices are past due as of the demo date.
    for (const i of h.invoices.filter((i) => i.status !== "paid")) expect(daysUntil(i.dueOn, TODAY)).toBeLessThan(0);
    // Invoices only bill products the account owns.
    const company = getCompany(h.accountId);
    const owned = new Set<string>(h.profile?.ownedProducts ?? (company?.mode === "farming" ? company.ownedProducts : []));
    for (const l of h.invoices.flatMap((i) => i.lines)) expect(owned.has(l.productId)).toBe(true);
    for (const p of h.productMix) expect(p.products).toEqual([...OUTCOME_BUNDLES[p.bundle as keyof typeof OUTCOME_BUNDLES]]);
    for (const s of h.sites.filter((s) => s.address.endsWith("Singapore"))) {
      expect(s.lat).toBeGreaterThan(1.15);
      expect(s.lat).toBeLessThan(1.48);
      expect(s.lng).toBeGreaterThan(103.6);
      expect(s.lng).toBeLessThan(104.1);
    }
    expect(h.route === "ncs-multi-lob").toBe(h.ncsLobs.length > 0);
  });

  it("makes the flagship exercise every edge case", () => {
    const m = getAccountHistory("acct-meridian-sg")!;
    expect(m.route).toBe("ncs-multi-lob");
    expect(m.billing.system).toBe("SAP-to-Oracle");
    expect(new Set(m.invoices.map((i) => i.status))).toEqual(new Set(["paid", "overdue", "disputed"]));
    expect(new Set(m.invoices.map((i) => i.billingSystem))).toEqual(new Set(["SAP", "Oracle"]));
    expect(new Set(m.sites.flatMap((s) => [s.fiber, s.fiveG]))).toEqual(new Set(["on-net", "near-net", "off-net"]));
    expect(new Set(m.meddpicc.map((x) => x.score))).toEqual(new Set([0, 1, 2]));
    expect(new Set(m.slaIncidents.map((s) => s.severity))).toEqual(new Set(["P1", "P2", "P3"]));
    expect(new Set(m.productMix.map((p) => p.bundle))).toEqual(new Set(Object.keys(OUTCOME_BUNDLES)));
    expect(isPreRenewalWindow(m.contractEndDate, TODAY)).toBe(true);
  });
});

describe("meddpiccTotal", () => {
  it("sums the 8 scores", () => {
    const h = getAccountHistory("acct-meridian-sg")!;
    expect(meddpiccTotal(h)).toBe(10);
    expect(meddpiccTotal({ ...h, meddpicc: h.meddpicc.map((m) => ({ ...m, score: 2 as const })) })).toBe(16);
    expect(meddpiccTotal({ ...h, meddpicc: h.meddpicc.map((m) => ({ ...m, score: 0 as const })) })).toBe(0);
  });
});

describe("isPreRenewalWindow", () => {
  const end = "2028-04-30";
  const dayBefore = (days: number) => new Date(Date.parse(`${end}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);

  it.each([
    [364, false],
    [365, true],
    [548, true],
    [549, false],
  ])("%i days before contract end: %s", (days, expected) => {
    expect(daysUntil(end, dayBefore(days))).toBe(days);
    expect(isPreRenewalWindow(end, dayBefore(days))).toBe(expected);
  });

  it("handles leap years, datetimes, past contracts, and bad input", () => {
    expect(isPreRenewalWindow("2028-02-29", "2027-02-28")).toBe(true); // 366 days
    expect(isPreRenewalWindow(end, `${dayBefore(400)}T23:59:59Z`)).toBe(true);
    expect(isPreRenewalWindow("2026-01-01", TODAY)).toBe(false);
    expect(isPreRenewalWindow("not-a-date", TODAY)).toBe(false);
  });

  it("flags only the flagship on the demo date (the 6 existing accounts renew within 12 months)", () => {
    expect(histories.filter((h) => isPreRenewalWindow(h.contractEndDate, TODAY)).map((h) => h.accountId)).toEqual(["acct-meridian-sg"]);
  });
});

describe("historyDocuments", () => {
  const docs = historyDocuments();
  const ids = new Set(docs.map((d) => d.id));

  it("covers every account, invoice, meeting, incident, rep, and playbook with unique ids", () => {
    expect(ids.size).toBe(docs.length);
    for (const h of histories) {
      expect(ids).toContain(`account:${h.accountId}`);
      expect(ids).toContain(`rep:${h.rep.id}`);
      for (const i of h.invoices) expect(ids).toContain(`invoice:${i.id}`);
      for (const m of h.meetings) expect(ids).toContain(`meeting:${m.id}`);
      for (const s of h.slaIncidents) expect(ids).toContain(`incident:${s.id}`);
    }
    expect(docs.filter((d) => d.kind === "playbook")).toHaveLength(PLAYBOOKS.length);
    expect(PLAYBOOKS.length).toBeGreaterThanOrEqual(6);
    for (const d of docs) expect(d.text.length).toBeGreaterThan(40);
  });

  it("marks account data as sample and finds the disputed flagship invoice by id", () => {
    for (const d of docs.filter((d) => d.kind === "account")) expect(d.text).toContain("Sample account");
    expect(docs.find((d) => d.id === "invoice:SGT-INV-2026-8841")?.text).toContain("disputed");
  });

  it("keeps rag-corpus markdown in sync with playbooks.json", () => {
    for (const p of PLAYBOOKS) {
      expect(readFileSync(join(__dirname, "..", "rag-corpus", `${p.id}.md`), "utf8")).toBe(`# ${p.title}\n\n${p.body}\n`);
    }
  });

  it("keeps copy rules in the corpus: no em or en dashes, emoji, or exclamation marks", () => {
    for (const d of docs) expect(`${d.title} ${d.text}`).not.toMatch(/[\u2014\u2013!\p{Extended_Pictographic}]/u);
  });
});
