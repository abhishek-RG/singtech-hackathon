import { describe, expect, it } from "vitest";
import { getCompany, getHuntingLeads } from "@/lib/data-service";
import { getAccountHistory, getAllHistories } from "@/lib/history";
import { accountDocuments, accountTimeline, interactionDocuments, RepInteractionSchema, repNotesText, type RepInteraction } from "@/lib/timeline";

const rep = (over: Partial<RepInteraction>): RepInteraction => ({ id: "rep-1", createdAt: "2026-11-16T00:00:00Z", accountId: "acct-meridian-sg", channel: "Notes", title: "Call with CIO", date: "2026-11-15", content: "CIO wants the recovery plan by Friday.", ...over });

describe("sales copilot timeline", () => {
  it("merges records, sample interactions and rep entries, newest first", () => {
    const h = getAccountHistory("acct-meridian-sg")!;
    const events = accountTimeline({ history: h, rep: [rep({}), rep({ id: "rep-2", accountId: "acct-lionrock-sg" })] });
    const channels = new Set(events.map((e) => e.channel));
    for (const c of ["Meeting", "Invoice", "Incident", "Support case", "Email", "Phone call", "WhatsApp", "Notes"]) expect(channels.has(c as never)).toBe(true);
    expect(events[0].id).toBe("rep-1");
    expect(events.some((e) => e.id === "rep-2")).toBe(false);
    expect(events.map((e) => e.date)).toEqual([...events.map((e) => e.date)].sort().reverse());
  });

  it("gives every sample account emails, calls or messages, all dated on or before 16 Nov 2026", () => {
    for (const h of getAllHistories()) {
      const sample = accountTimeline({ history: h }).filter((e) => e.origin === "sample");
      expect(sample.length).toBeGreaterThanOrEqual(3);
      for (const e of sample) expect(e.date <= "2026-11-16").toBe(true);
    }
    expect(interactionDocuments().every((d) => d.text.includes("Sample account"))).toBe(true);
  });

  it("shows a contact who left as a timeline event", () => {
    const events = accountTimeline({ history: getAccountHistory("acct-straits-maritime-sg")! });
    expect(events.find((e) => e.channel === "Contact change")?.title).toBe("Former Head of Maritime IT left the company");
  });

  it("builds a prospect timeline from public signals, each with its source link", () => {
    const lead = getHuntingLeads()[0];
    const events = accountTimeline({ company: getCompany(lead.id) });
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(e.url).toMatch(/^https:\/\//);
  });

  it("lists source documents plus the product pages asked for", () => {
    const docs = accountDocuments({ history: getAccountHistory("acct-orchidbay-sg")! }, ["SGT-REAI", "SGT-5G"]);
    expect(docs.find((d) => d.id === "SGT-5G")?.url).toMatch(/^https:\/\/www\.singtel\.com/);
    expect(docs.find((d) => d.id === "SGT-REAI")?.url).toMatch(/^https:\/\//);
    expect(docs.some((d) => d.type === "Email thread")).toBe(true);
  });

  it("keeps rep notes to one account and within the size limit", () => {
    const text = repNotesText([rep({}), rep({ id: "rep-2", content: "x".repeat(200) }), rep({ id: "rep-3", accountId: "acct-lionrock-sg", content: "other account" })], "acct-meridian-sg", 150);
    expect(text).toContain("CIO wants the recovery plan");
    expect(text).not.toContain("other account");
    expect(text.length).toBeLessThanOrEqual(150);
  });

  it("validates rep entries at the boundary", () => {
    const ok = { accountId: "acct-meridian-sg", channel: "Email", title: "Re: plan", date: "2026-11-15", content: "Body" };
    expect(RepInteractionSchema.safeParse(ok).success).toBe(true);
    expect(RepInteractionSchema.safeParse({ ...ok, channel: "Invoice" }).success).toBe(false);
    expect(RepInteractionSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
    expect(RepInteractionSchema.safeParse({ ...ok, content: "x".repeat(50_001) }).success).toBe(false);
    expect(RepInteractionSchema.safeParse({ ...ok, accountId: "../etc" }).success).toBe(false);
  });
});
