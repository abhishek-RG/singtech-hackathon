import { describe, expect, it } from "vitest";
import { buildDirectory } from "@/lib/agent/directory";
import { findAccounts, planCommand, showcasePlan, type AgentStep } from "@/lib/agent/plan";

const dir = buildDirectory();
const kinds = (steps: AgentStep[]) => steps.map((s) => s.kind);

describe("agent planner", () => {
  it("finds accounts by full name or distinctive first word", () => {
    expect(findAccounts("open lionrock please", dir).map((a) => a.id)).toEqual(["acct-lionrock-sg"]);
    expect(findAccounts("What about Meridian Arcwell Group?", dir).map((a) => a.id)).toEqual(["acct-meridian-sg"]);
    expect(findAccounts("open the deal room", dir)).toEqual([]);
  });

  it("opens an account, checks MEDDPICC gaps and drafts a proposal, in that order", () => {
    const plan = planCommand("Open LionRock Quantitative Bank, check its MEDDPICC gaps, and draft a proposal", dir);
    expect(plan.intent).toBe("workflow");
    expect(plan.title).toBe("Open LionRock Quantitative Bank, check MEDDPICC gaps, draft a proposal");
    expect(kinds(plan.steps)).toEqual(["say", "go", "highlight", "go", "highlight", "click", "waitIdle", "highlight"]);
    const meddpicc = plan.steps[2] as Extract<AgentStep, { kind: "highlight" }>;
    expect(meddpicc.note).toMatch(/^Gaps: |No MEDDPICC record/);
    expect(plan.steps[3]).toMatchObject({ kind: "go", href: "/proposals/acct-lionrock-sg" });
  });

  it("checks a bill ID on its account and stops for approval before Salesforce", () => {
    const plan = planCommand("Check SGT-INV-2026-8841 and push an update to Salesforce", dir);
    expect(plan.accounts).toEqual([{ id: "acct-meridian-sg", name: "Meridian Arcwell Group" }]);
    expect(plan.steps[1]).toMatchObject({ kind: "go", href: "/accounts/acct-meridian-sg" });
    expect(plan.steps.some((s) => s.kind === "type" && s.text.includes("SGT-INV-2026-8841"))).toBe(true);
    expect(plan.steps.at(-1)).toMatchObject({ kind: "approveUpdate", accountId: "acct-meridian-sg", subject: "Billing follow-up: SGT-INV-2026-8841" });
  });

  it("answers where things are and shows them", () => {
    const plan = planCommand("Where do I find disputed invoices?", dir);
    expect(plan.intent).toBe("locate");
    expect(plan.reply).toContain("SGT-INV-2026-8841");
    expect(plan.steps.at(-1)).toMatchObject({ kind: "highlight", target: { text: "SGT-INV-2026-8841" } });
    expect(planCommand("where are my renewals", dir).steps.at(-1)).toMatchObject({ kind: "highlight", target: { css: '[data-agent="renewals"]' } });
  });

  it("treats plain questions as questions, scoped to a named account", () => {
    expect(planCommand("Why is SGT-INV-2026-8841 disputed?", dir)).toMatchObject({ intent: "question", steps: [{ kind: "ask", accountId: "acct-meridian-sg" }] });
    expect(planCommand("What should I pitch to LionRock at renewal?", dir)).toMatchObject({ intent: "question", steps: [{ kind: "ask", accountId: "acct-lionrock-sg" }] });
  });

  it("never writes to Salesforce without an approval step, including the showcase", () => {
    const plan = showcasePlan(dir);
    expect(plan.steps.filter((s) => s.kind === "approveUpdate")).toHaveLength(1);
    expect(plan.steps.at(-1)?.kind).toBe("approveUpdate");
    expect(plan.accounts.map((a) => a.id)).toEqual(["acct-lionrock-sg", "acct-meridian-sg"]);
  });
});
