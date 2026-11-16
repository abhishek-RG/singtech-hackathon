import { describe, expect, it } from "vitest";
import {
  getCallTranscript,
  getCatalog,
  getCompanies,
  getCompany,
  getDashboardStats,
  getEngagementKpis,
  getFarmingAccounts,
  getHuntingLeads,
  getPortfolioKpis,
  getProduct,
  getRegulation,
  getRoiScenario,
} from "@/lib/data-service";
import { synthesizeLead } from "@/lib/offline-engine";
import { sumBreakdown } from "@/lib/scoring";
import type { ProductId } from "@/types/singtech";

const arrOf = (ids: ProductId[]) => ids.reduce((sum, id) => sum + getProduct(id)!.indicativeArrSgd, 0);

describe("seed dataset integrity", () => {
  const companies = getCompanies();

  it("loads 6 prospects and 6 enterprise customers with unique ids", () => {
    expect(getHuntingLeads()).toHaveLength(6);
    expect(getFarmingAccounts()).toHaveLength(6);
    expect(new Set(companies.map((c) => c.id)).size).toBe(12);
  });

  it("loads the full catalogue, including the Oct-Nov 2026 launches, and the transcript", () => {
    // Mentor catalogue: 6 core products on singtel.com, plus the 3 approved extras.
    expect(getCatalog().filter((p) => p.tier === "core").map((p) => p.shortName)).toEqual(["5G+", "CUBΣ", "Cyber Security", "IoT", "Mobility", "Quantum-Safe Network"]);
    for (const p of getCatalog().filter((p) => p.tier === "core")) expect(p.source.url).toMatch(/^https:\/\/www\.singtel\.com\/business\/products-services\//);
    expect(getCatalog().filter((p) => p.tier === "extra").map((p) => p.id)).toEqual(["SGT-REAI", "SGT-NXERA", "SGT-NCS"]);
    expect(getCallTranscript()).toHaveLength(5);
  });

  it("places real companies only in Ring 3 and existing customers in Rings 1 and 2", () => {
    for (const lead of getHuntingLeads()) expect(lead.ring).toBe("ring3");
    for (const acct of getFarmingAccounts()) expect(["ring1", "ring2"]).toContain(acct.ring);
    for (const ring of ["ring1", "ring2", "ring3"] as const) expect(getCompanies({ ring }).length).toBeGreaterThan(0);
  });

  it.each(companies.map((c) => [c.id, c] as const))("%s: score equals its breakdown", (_id, c) => {
    expect(c.priorityScore).toBe(sumBreakdown(c.scoreBreakdown));
  });

  it.each(companies.map((c) => [c.id, c] as const))("%s: bundle ARR equals catalogue sum", (_id, c) => {
    const b = c.recommendedBundle;
    expect(b.estimatedArrSgd).toBe(arrOf(b.products));
    expect(b.starterArrSgd).toBe(arrOf(b.starterDownsellBundle));
    expect(b.starterArrSgd).toBeLessThan(b.estimatedArrSgd);
  });

  it.each(companies.map((c) => [c.id, c] as const))("%s: compliance flags map to regulations", (_id, c) => {
    for (const code of c.complianceFlags) expect(getRegulation(code)).toBeDefined();
  });

  it("prospects are real companies backed only by public sources", () => {
    for (const lead of getHuntingLeads()) {
      expect(lead.isDemoAccount).toBe(false);
      expect(lead.signals.every((s) => s.source.kind !== "simulated-telemetry")).toBe(true);
    }
  });

  it("existing accounts pair a usage signal with a public reference, a co-sell path and an ROI scenario", () => {
    for (const acct of getFarmingAccounts()) {
      expect(acct.isDemoAccount).toBe(true);
      expect(acct.coSellPath).toBeDefined();
      expect(acct.signals.some((s) => s.source.kind === "simulated-telemetry")).toBe(true);
      expect(acct.signals.some((s) => s.source.kind !== "simulated-telemetry")).toBe(true);
      expect([...acct.recommendedUpgrades].sort()).toEqual([...acct.recommendedBundle.products].sort());
      expect(acct.ownedProducts.some((p) => acct.recommendedUpgrades.includes(p))).toBe(false);
      expect(getRoiScenario(acct.id)).toBeDefined();
    }
  });
});

describe("getPortfolioKpis", () => {
  it("derives the Account Growth header from the data", () => {
    expect(getPortfolioKpis()).toEqual({
      totalManagedArrSgd: 970_000,
      upgradeArrSgd: 2_538_000,
      activeAlerts: 11,
      criticalAlerts: 3,
    });
  });
});

describe("getEngagementKpis", () => {
  it("derives the home KPI strip from the company list", () => {
    const k = getEngagementKpis();
    expect(k).toMatchObject({ priorityPlays: 12, existingUpgrades: 6, expansions: 6, pipelineArrSgd: 4_774_000, accountsOverThreshold: 6, warmPaths: 6 });
    expect(k.avgLift).toBeGreaterThan(2);
  });

  it("returns zeros for an empty list", () => {
    expect(getEngagementKpis([])).toMatchObject({ priorityPlays: 0, pipelineArrSgd: 0, avgLift: 0, warmPaths: 0 });
  });
});

describe("getCompanies", () => {
  it("returns companies ranked by priority score", () => {
    const scores = getCompanies().map((c) => c.priorityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("filters by mode, ring, corridor, industry, desk and query", () => {
    expect(getCompanies({ mode: "farming" }).every((c) => c.mode === "farming")).toBe(true);
    expect(getCompanies({ ring: "ring2" }).map((c) => c.id).sort()).toEqual(["acct-harbourline-sg", "acct-helixveda-sg"]);
    expect(getCompanies({ corridor: "blr-sg" }).map((c) => c.id)).toContain("lead-juspay-in");
    expect(getCompanies({ industry: "fintech", mode: "hunting" }).map((c) => c.id).sort()).toEqual(["lead-juspay-in", "lead-tazapay-sg"]);
    expect(getCompanies({ desk: "infraco" }).map((c) => c.id)).toContain("lead-sarvam-in");
    expect(getCompanies({ desk: "infraco" }).map((c) => c.id)).not.toContain("lead-juspay-in");
    expect(getCompanies({ query: "tuas" }).map((c) => c.id)).toContain("acct-straits-maritime-sg");
    expect(getCompanies({ query: "  JUSPAY " }).map((c) => c.id)).toEqual(["lead-juspay-in"]);
    expect(getCompanies({ query: "re:ai" }).map((c) => c.id)).toContain("acct-helixveda-sg");
    expect(getCompanies({ query: "david lim" })).toEqual([]);
    expect(getCompanies({ query: "ncs cloud practice" }).map((c) => c.id)).toEqual(["acct-harbourline-sg"]);
  });

  it("serves the cached dataset well under the 50ms stage budget", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) getCompanies({ desk: "cyber", query: "bank" });
    expect((performance.now() - start) / 100).toBeLessThan(50);
  });

  it("returns undefined for unknown ids", () => {
    expect(getCompany("lead-nope")).toBeUndefined();
  });
});

describe("getDashboardStats", () => {
  const total = getEngagementKpis().pipelineArrSgd;
  const s = getDashboardStats();
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

  it("splits the same pipeline every way, with no ARR lost or double counted", () => {
    expect(sum(s.byProduct)).toBe(total);
    expect(sum(s.byRing)).toBe(total);
    expect(sum(s.byTrigger)).toBe(total);
    expect(sum(s.byHub)).toBe(total);
  });

  it("weights existing upgrades above prospects against the quarterly target", () => {
    expect(s.weightedForecastSgd).toBe(Math.round(2_538_000 * 0.8 + 2_236_000 * 0.45));
    expect(s.attainmentPct).toBe(61);
    expect(getDashboardStats([]).attainmentPct).toBe(0);
  });

  it("counts a Johor corridor prospect as regional, not Singapore core", () => {
    const lead = synthesizeLead({ companyName: "Iskandar Cold Chain", websiteUrl: "https://example.com", corridor: "jb-sg" });
    expect(lead.coordinates[0]).toBeLessThan(5);
    expect(getDashboardStats([lead]).byHub).toEqual({ sg: 0, regional: lead.recommendedBundle.estimatedArrSgd });
  });
});
