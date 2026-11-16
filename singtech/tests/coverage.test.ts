import { describe, expect, it } from "vitest";
import type { AccountRecord } from "@/components/account/records";
import { coverageRows, coverageTotals, toCoverageRow } from "@/components/insights/coverage";
import { getCompanies } from "@/lib/data-service";
import { getAccountHistory, getAllHistories } from "@/lib/history";

// Same shape useAccountRecords builds: every ranked company plus history-only sample accounts (Meridian).
const companies = getCompanies();
const records: AccountRecord[] = [
  ...companies.map((c) => ({
    id: c.id,
    name: c.companyName,
    company: c,
    history: getAccountHistory(c.id),
    isCustomer: c.mode === "farming",
    isSample: c.isDemoAccount,
    currentArrSgd: c.mode === "farming" ? c.currentArrSgd : undefined,
  })),
  ...getAllHistories()
    .filter((h) => !companies.some((c) => c.id === h.accountId))
    .map((h) => ({ id: h.accountId, name: h.accountName, history: h, isCustomer: true, isSample: true, currentArrSgd: h.profile?.currentArrSgd })),
];
const TODAY = "2026-11-16";

describe("coverage map rows", () => {
  it("shows every account with a location, including the history-only sample account", () => {
    const rows = coverageRows(records, "all", TODAY);
    expect(rows.length).toBe(records.length);
    expect(rows.find((r) => r.id === "acct-meridian-sg")).toMatchObject({ isCustomer: true, isSample: true, hasQuickView: false, inSingapore: true });
    expect(rows.find((r) => r.id === "acct-meridian-sg")?.renewalDays).toBeGreaterThan(0);
  });

  it("filters customers and prospects without overlap", () => {
    const customers = coverageRows(records, "customers", TODAY);
    const prospects = coverageRows(records, "prospects", TODAY);
    expect(customers.every((r) => r.isCustomer)).toBe(true);
    expect(prospects.every((r) => !r.isCustomer)).toBe(true);
    expect(customers.length + prospects.length).toBe(coverageRows(records, "all", TODAY).length);
  });

  it("ranks by priority, then puts unscored accounts by soonest renewal", () => {
    const rows = coverageRows(records, "all", TODAY);
    const scored = rows.filter((r) => r.priority !== undefined).map((r) => r.priority!);
    expect(scored).toEqual([...scored].sort((a, b) => b - a));
    expect(rows.at(-1)?.priority).toBeUndefined();
  });

  it("gives source links only to real prospects, never to sample accounts", () => {
    const rows = coverageRows(records, "all", TODAY);
    expect(rows.filter((r) => r.isSample).every((r) => !r.signal)).toBe(true);
    for (const r of rows.filter((x) => x.signal)) expect(r.signal!.url).toMatch(/^https:\/\//);
  });

  it("totals are exactly the sums of the rows shown", () => {
    const rows = coverageRows(records, "customers", TODAY);
    const t = coverageTotals(rows);
    expect(t.accounts).toBe(rows.length);
    expect(t.currentArrSgd).toBe(rows.reduce((s, r) => s + (r.currentArrSgd ?? 0), 0));
    expect(t.upsideSgd).toBe(rows.reduce((s, r) => s + (r.upsideSgd ?? 0), 0));
    expect(t.renewalsWithin180).toBe(rows.filter((r) => (r.renewalDays ?? -1) >= 0 && r.renewalDays! <= 180).length);
    expect(coverageTotals([])).toEqual({ accounts: 0, currentArrSgd: 0, upsideSgd: 0, renewalsWithin180: 0 });
  });

  it("skips a record with no location instead of guessing one", () => {
    expect(toCoverageRow({ id: "x", name: "No location", isCustomer: true, isSample: true }, TODAY)).toBeUndefined();
  });
});
