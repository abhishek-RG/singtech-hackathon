import { describe, expect, it } from "vitest";
import { companyMatchesDesk, getCompany, productDesk } from "@/lib/data-service";
import { applyTelemetryEvent, rankCompanies, sumBreakdown } from "@/lib/scoring";
import type { FarmingAccount, TelemetryAlert } from "@/types/singtech";

const account = (id: string) => getCompany(id) as FarmingAccount;

const alert = (severity: TelemetryAlert["severity"]): TelemetryAlert => ({
  id: "tel-live-1",
  metric: "Live roaming eSIM surge",
  currentValue: "3.1x baseline",
  threshold: "< 1.5x baseline",
  severity,
  minutesAgo: 0,
  desk: "connectivity",
  simulated: true,
});

describe("applyTelemetryEvent", () => {
  it.each([
    ["critical", 8],
    ["high", 5],
    ["medium", 2],
  ] as const)("adds %s severity points and keeps score equal to breakdown", (severity, points) => {
    const before = account("acct-aeropulse-sg");
    const after = applyTelemetryEvent(before, alert(severity));
    expect(after.priorityScore).toBe(before.priorityScore + points);
    expect(after.priorityScore).toBe(sumBreakdown(after.scoreBreakdown));
    expect(after.telemetryAlerts[0].id).toBe("tel-live-1");
    expect(after.scoreBreakdown.at(-1)?.label).toContain("Live roaming eSIM surge");
  });

  it("caps the score at 100", () => {
    const after = applyTelemetryEvent(account("acct-lionrock-sg"), alert("critical"));
    expect(after.priorityScore).toBe(100);
    expect(sumBreakdown(after.scoreBreakdown)).toBe(100);
  });

  it("does not mutate the input account", () => {
    const before = account("acct-helixveda-sg");
    const snapshot = structuredClone(before);
    applyTelemetryEvent(before, alert("high"));
    expect(before).toEqual(snapshot);
  });
});

describe("rankCompanies", () => {
  it("sorts by score, then name", () => {
    const a = { ...account("acct-aeropulse-sg"), priorityScore: 90, companyName: "B" };
    const b = { ...account("acct-helixveda-sg"), priorityScore: 90, companyName: "A" };
    const c = { ...account("acct-lionrock-sg"), priorityScore: 95 };
    expect(rankCompanies([a, b, c]).map((x) => x.companyName)).toEqual([c.companyName, "A", "B"]);
  });
});

describe("desk routing", () => {
  it("maps products to sales desks", () => {
    expect(productDesk("SGT-CUBE")).toBe("connectivity");
    expect(productDesk("SGT-REAI")).toBe("infraco");
    expect(productDesk("SGT-QSN")).toBe("cyber");
  });

  it("matches a company when any bundle product belongs to the desk", () => {
    const juspay = getCompany("lead-juspay-in")!;
    expect(companyMatchesDesk(juspay, "all")).toBe(true);
    expect(companyMatchesDesk(juspay, "connectivity")).toBe(true);
    expect(companyMatchesDesk(juspay, "cyber")).toBe(true);
    expect(companyMatchesDesk(juspay, "infraco")).toBe(false);
  });
});
