import { describe, expect, it } from "vitest";
import { buildBrief } from "@/components/copilot/brief";
import { pipelineByStage, stageFor, upsideFor } from "@/components/overview/pipeline";
import { findDuplicate, normalizeName } from "@/components/prospect/duplicates";
import { getCompany, getProduct } from "@/lib/data-service";
import { getAccountHistory, meddpiccTotal } from "@/lib/history";
import logos from "@/data/logos.json";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("pipeline stage derivation", () => {
  const lion = getAccountHistory("acct-lionrock-sg")!;

  it("puts unqualified prospects in Prospecting and qualified ones in Qualification", () => {
    expect(stageFor({ isCustomer: false })).toBe("Prospecting");
    expect(stageFor({ isCustomer: false, leadStatus: "qualified" })).toBe("Qualification");
  });

  it("uses MEDDPICC for customers and lets a proposal status override it", () => {
    const total = meddpiccTotal(lion);
    expect(stageFor({ isCustomer: true, history: lion })).toBe(total >= 12 ? "Proposal" : total >= 8 ? "Needs analysis" : "Qualification");
    expect(stageFor({ isCustomer: true, history: lion, proposal: "pending" })).toBe("Proposal");
    expect(stageFor({ isCustomer: true, history: lion, proposal: "sent" })).toBe("Negotiation");
  });

  it("sums upside per stage and keeps every stage in order", () => {
    const rows = pipelineByStage([
      { stage: "Proposal", upside: 100 },
      { stage: "Proposal", upside: 50 },
      { stage: "Prospecting", upside: 10 },
    ]);
    expect(rows.map((r) => r.stage)).toEqual(["Prospecting", "Qualification", "Needs analysis", "Proposal", "Negotiation"]);
    expect(rows.find((r) => r.stage === "Proposal")).toEqual({ stage: "Proposal", count: 2, upside: 150 });
  });

  it("takes upside from the bundle, or from unowned outcome-bundle products for history-only accounts", () => {
    const company = getCompany("lead-juspay-in")!;
    expect(upsideFor(company)).toBe(company.recommendedBundle.estimatedArrSgd);
    const meridian = getAccountHistory("acct-meridian-sg");
    if (meridian) {
      const owned = new Set(meridian.profile?.ownedProducts ?? []);
      const gaps = [...new Set(meridian.productMix.flatMap((p) => p.products))].filter((id) => !owned.has(id as never));
      expect(upsideFor(undefined, meridian)).toBe(gaps.reduce((s, id) => s + getProduct(id as never)!.indicativeArrSgd, 0));
    }
    expect(upsideFor()).toBe(0);
  });
});

describe("prospect duplicate check", () => {
  const book = [{ name: "Tata Electronics" }, { name: "CapitaLand India Trust" }, { name: "Juspay" }];

  it("ignores legal suffixes and punctuation", () => {
    expect(normalizeName("Juspay Technologies Pvt. Ltd.")).toBe("juspay technologies");
    expect(findDuplicate("Tata Electronics Private Limited", book)?.name).toBe("Tata Electronics");
    expect(findDuplicate("JUSPAY", book)?.name).toBe("Juspay");
  });

  it("does not match unrelated or too-short names", () => {
    expect(findDuplicate("Tazapay", book)).toBeUndefined();
    expect(findDuplicate("Ta", book)).toBeUndefined();
    expect(findDuplicate("Capital Logistics", book)).toBeUndefined();
  });
});

describe("call brief", () => {
  it("lists MEDDPICC gaps and competitor objections from the account history", () => {
    const brief = buildBrief(getCompany("acct-lionrock-sg"), getAccountHistory("acct-lionrock-sg"));
    const h = getAccountHistory("acct-lionrock-sg")!;
    expect(brief.meddpiccGaps).toHaveLength(h.meddpicc.filter((m) => m.gap).length);
    expect(brief.objections.some((o) => o.startsWith(h.competitors[0].name))).toBe(true);
    expect(brief.whyNow).toBe(getCompany("acct-lionrock-sg")!.whyNow);
  });

  it("never lists a product the customer already owns as open", () => {
    const company = getCompany("acct-lionrock-sg")!;
    const brief = buildBrief(company, getAccountHistory(company.id));
    const ownedNames = company.mode === "farming" ? company.ownedProducts.map((id) => getProduct(id)!.name) : [];
    expect(brief.openProducts.filter((p) => ownedNames.includes(p))).toEqual([]);
  });
});

describe("company logos", () => {
  it("maps only real prospects (never sample accounts) and every file exists", () => {
    for (const id of Object.keys(logos.companies)) expect(id.startsWith("lead-")).toBe(true);
    for (const entry of [...Object.values(logos.companies), ...Object.values(logos.partners)]) {
      expect(existsSync(join(__dirname, "..", "public", entry.file))).toBe(true);
      expect(entry.file).toBe(`/logos/${entry.domain}.png`);
    }
  });
});

describe("account question suggestions", () => {
  it("builds questions from the account's own invoices, gaps, and rivals", async () => {
    const { suggestedQuestions } = await import("@/components/account/questions");
    const h = getAccountHistory("acct-meridian-sg")!;
    const qs = suggestedQuestions(h.accountName, h);
    const open = h.invoices.find((i) => i.status !== "paid")!;
    expect(qs[0]).toBe(`Status of ${open.id}`);
    expect(qs.some((q) => q.includes(h.competitors[0].name))).toBe(true);
    expect(qs.every((q) => q.length >= 2 && q.length <= 1000)).toBe(true);
  });

  it("falls back to prospect questions without history", async () => {
    const { suggestedQuestions } = await import("@/components/account/questions");
    const c = getCompany("lead-juspay-in")!;
    expect(suggestedQuestions(c.companyName, undefined, c)).toHaveLength(3);
  });
});
