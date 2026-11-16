import { describe, expect, it } from "vitest";
import { assessAccount, bandFor, classifyCase, healthFor } from "@/lib/health";
import { getAllHistories, getAccountHistory } from "@/lib/history";

const h = (id: string) => getAccountHistory(id)!;

describe("account health (rules from the team's account-intelligence module)", () => {
  it("scores every sample account and picks one action, matching the story in the records", () => {
    const got = Object.fromEntries(getAllHistories().map((x) => [x.accountId, (({ score, band, topReason, action }) => [score, band, topReason ?? null, action.code])(healthFor(x))]));
    expect(got).toEqual({
      "acct-lionrock-sg": [100, "healthy", null, "renewal_value_case"],
      "acct-straits-maritime-sg": [24, "at_risk", "service", "service_recovery"],
      "acct-aeropulse-sg": [95, "healthy", "billing", "renewal_value_case"],
      "acct-orchidbay-sg": [62, "watch", "price", "renewal_value_case"],
      "acct-helixveda-sg": [100, "healthy", null, "cross_sell"],
      "acct-harbourline-sg": [59, "watch", "coverage", "coverage_plan"],
      "acct-meridian-sg": [27, "at_risk", "service", "service_recovery"],
    });
  });

  it("ties every penalty to the records it came from", () => {
    for (const x of getAllHistories()) {
      const ids = new Set([...x.invoices, ...x.slaIncidents, ...x.cases, ...x.contacts, ...x.meetings, ...x.sites.map((s) => ({ id: s.siteId }))].map((r) => r.id));
      for (const r of healthFor(x).reasons) {
        if (r.code !== "buyer_unengaged") expect(r.evidence.length).toBeGreaterThan(0);
        for (const e of r.evidence) expect(ids.has(e)).toBe(true);
      }
    }
  });

  it("caps repeated penalties and clamps the score to 0..100", () => {
    const base = h("acct-meridian-sg");
    const many = { ...base, cases: Array.from({ length: 6 }, (_, i) => ({ ...base.cases[1], id: `CASE-2026-90${i}0` })) };
    const health = assessAccount(many, { owned: [] });
    expect(health.reasons.filter((r) => r.code === "competitor_mention").reduce((s, r) => s + r.points, 0)).toBe(-30);
    expect(health.score).toBeGreaterThanOrEqual(0);
  });

  it("reads price pressure, tenders and off-network sites from a case", () => {
    const x = h("acct-harbourline-sg");
    expect(classifyCase({ ...x.cases[0], subject: "StarHub is cheaper" }, x)).toBe("price");
    expect(classifyCase({ ...x.cases[0], subject: "Customer issued an RFP", siteId: undefined }, x)).toBe("partial_move");
    expect(classifyCase(x.cases[0], x)).toBe("coverage");
    expect([bandFor(70), bandFor(69), bandFor(40), bandFor(39)]).toEqual(["healthy", "watch", "watch", "at_risk"]);
  });

  it("weights revenue at stake by band and never recommends a discount", () => {
    const straits = healthFor(h("acct-straits-maritime-sg"));
    expect(straits.revenueAtStakeSgd).toBe(180_000);
    for (const x of getAllHistories()) expect(healthFor(x).action.talkingPoints.join(" ")).not.toMatch(/offer (a )?discount|discount of/i);
    expect(healthFor(h("acct-orchidbay-sg")).action.talkingPoints.join(" ")).toContain("not a discount");
  });
});
