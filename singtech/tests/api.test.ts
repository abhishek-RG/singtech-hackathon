import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze-company/route";
import { POST as crm } from "@/app/api/webhook/crm/route";
import { computeRoi, getScenario } from "@/lib/roi";
import { getCompany } from "@/lib/data-service";
import { synthesizeLead } from "@/lib/offline-engine";
import { sumBreakdown } from "@/lib/scoring";
import { webhookUrl } from "@/lib/webhooks";
import type { AnalyzeCompanyResponse, CrmReceipt } from "@/types/singtech";

const req = (body: unknown) =>
  new Request("http://localhost/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

const deal = {
  companyName: "Straits Vanguard Maritime Lines",
  corridor: "Tuas Port <-> Chennai",
  bundleName: "Smart Maritime Fleet & Port 5G Suite",
  estimatedArrSgd: 400000,
  nextAction: "Email ops.lead@straits.example.com or call +65 9123 4567 to book the iSHIP review",
  complianceFlags: ["IMO_MARITIME_CYBER"],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/webhook/crm", () => {
  it("rejects malformed and invalid bodies", async () => {
    expect((await crm(req("not json"))).status).toBe(400);
    expect((await crm(req({ ...deal, estimatedArrSgd: -1 }))).status).toBe(400);
    expect((await crm(req({ ...deal, complianceFlags: ["MADE_UP"] }))).status).toBe(400);
  });

  it("returns a SIMULATED receipt when no webhook is configured", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "");
    vi.stubEnv("SALESFORCE_WEBHOOK_URL", "");
    const receipt = (await (await crm(req(deal))).json()) as CrmReceipt;
    expect(receipt.status).toBe("SIMULATED");
    expect(receipt.ticketId).toMatch(/^SGT-DEAL-/);
    expect(receipt.audit.redactedEntities).toBe(2);
    expect(receipt.destinations).toEqual([
      { name: "slack", configured: false, delivered: false },
      { name: "salesforce", configured: false, delivered: false },
    ]);
    expect(receipt.payloads.slack).toContain("[REDACTED_EMAIL_PDPA]");
    expect(JSON.stringify(receipt.payloads)).not.toContain("ops.lead@straits.example.com");
  });

  it("sends only redacted text to Slack and Salesforce", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/T/B/X");
    vi.stubEnv("SALESFORCE_WEBHOOK_URL", "https://salesforce.example.com/hook");
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const receipt = (await (await crm(req(deal))).json()) as CrmReceipt;
    expect(receipt.status).toBe("DELIVERED");
    expect(receipt.deliveredTo).toEqual(["slack", "salesforce"]);
    const sent = JSON.stringify(fetchMock.mock.calls);
    expect(sent).not.toContain("ops.lead@straits.example.com");
    expect(sent).not.toContain("9123 4567");
    expect(sent).toContain("[REDACTED_EMAIL_PDPA]");
    // The Outbox shows exactly what was posted.
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse((call as unknown as [string, RequestInit])[1].body as string));
    expect(bodies).toEqual([JSON.parse(receipt.payloads.slack), JSON.parse(receipt.payloads.salesforce)]);
  });

  it("ignores non-https webhook URLs and reports FAILED when delivery fails", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "http://insecure.example.com");
    vi.stubEnv("SALESFORCE_WEBHOOK_URL", "https://salesforce.example.com/hook");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    const receipt = (await (await crm(req(deal))).json()) as CrmReceipt;
    expect(receipt.status).toBe("FAILED");
  });
});

describe("webhookUrl", () => {
  it("accepts only parseable https URLs from env", () => {
    for (const bad of ["", "https://", "http://hooks.example.com", "not a url"]) {
      vi.stubEnv("SLACK_WEBHOOK_URL", bad);
      expect(webhookUrl("SLACK_WEBHOOK_URL")).toBeNull();
    }
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/T/B/X");
    expect(webhookUrl("SLACK_WEBHOOK_URL")).toBe("https://hooks.slack.com/services/T/B/X");
  });
});

describe("POST /api/analyze-company", () => {
  it("rejects non-https URLs and unknown corridors", async () => {
    expect((await analyze(req({ companyName: "X", websiteUrl: "http://x.com", corridor: "blr-sg" }))).status).toBe(400);
    expect((await analyze(req({ companyName: "X", websiteUrl: "https://x.com", corridor: "mars" }))).status).toBe(400);
  });

  it("falls back to the offline engine fast and redacts notes", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = (await (
      await analyze(req({
        companyName: "Ocean Network Express",
        websiteUrl: "https://www.one-line.com",
        corridor: "maa-tuas",
        notes: "Fleet CIO is reachable at cio@one-line.example.com",
      }))
    ).json()) as AnalyzeCompanyResponse;
    expect(res.engine).toBe("offline-engine");
    expect(res.latencyMs).toBeLessThan(120);
    expect(res.lead.play).toBe("maritime");
    expect(res.audit.sanitizedSnippet).toContain("[REDACTED_EMAIL_PDPA]");
    expect(JSON.stringify(res.lead)).not.toContain("cio@one-line.example.com");
  });
});

describe("offline engine", () => {
  it("is deterministic and internally consistent", () => {
    const input = { companyName: "Acme Payments", websiteUrl: "https://acme.example.com", corridor: "blr-sg" as const };
    const a = synthesizeLead(input);
    expect(synthesizeLead(input)).toEqual(a);
    expect(a.play).toBe("banking");
    expect(a.priorityScore).toBe(sumBreakdown(a.scoreBreakdown));
    expect(a.signals[0].source.url).toBe("https://acme.example.com");
  });
});

describe("ROI model", () => {
  const { scenario } = getScenario(getCompany("acct-helixveda-sg")!);

  it("reaches the modelled target at full capacity and improves monotonically", () => {
    const lo = computeRoi(scenario, scenario.slider.min);
    const hi = computeRoi(scenario, scenario.slider.max);
    expect(hi.projectedValue).toBe(scenario.target.value);
    expect(hi.reductionPct).toBeGreaterThan(lo.reductionPct);
    expect(hi.annualSavingsSgd).toBeGreaterThan(lo.annualSavingsSgd);
    expect(hi.annualSavingsSgd).toBeLessThanOrEqual(scenario.baselineAnnualCostSgd);
  });

  it("labels hunting-lead scenarios as illustrative", () => {
    expect(getScenario(getCompany("lead-tazapay-sg")!).isIllustrative).toBe(true);
    expect(getScenario(getCompany("acct-lionrock-sg")!).isIllustrative).toBe(false);
  });
});
