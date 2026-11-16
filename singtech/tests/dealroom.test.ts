import { describe, expect, it } from "vitest";
import { isAnswered, isQuestionPost, needsAnswer, questionText, toMessage } from "@/lib/dealroom";
import type { ChatterElement } from "@/lib/salesforce";

const BOT = "005BOT";
const post = (text: string, actor = "005REP", comments: { user: string; text: string }[] = []): ChatterElement => ({
  id: "0D5x",
  createdDate: "2026-11-16T01:00:00.000Z",
  actor: { id: actor, displayName: actor === BOT ? "SingTech AI" : "Priya Rao" },
  body: { text },
  capabilities: { comments: { page: { items: comments.map((c, i) => ({ id: `c${i}`, createdDate: "2026-11-16T01:00:02.000Z", user: { id: c.user, displayName: "x" }, body: { text: c.text } })) } } },
});

describe("deal room bot", () => {
  it("answers mentions, questions and bill IDs, never its own posts or deal summaries", () => {
    expect(needsAnswer("@SingTech what does LionRock owe")).toBe(true);
    expect(needsAnswer("Judge: why this bundle?")).toBe(true);
    expect(needsAnswer("Check SGT-INV-2026-8841 please")).toBe(true);
    expect(needsAnswer("Great demo")).toBe(false);
    expect(needsAnswer("SingTech AI: answer? [1]")).toBe(false);
    expect(needsAnswer("Deal room: LionRock pushed?")).toBe(false);
  });

  it("never triggers on its own user, except for relayed guest questions", () => {
    expect(isQuestionPost(post("Why is SGT-INV-2026-8841 disputed?"), BOT)).toBe(true);
    expect(isQuestionPost(post("Root Cause\nThe credit was not netted?", BOT), BOT)).toBe(false);
    expect(isQuestionPost(post("Question from Judge Tan: Why is SGT-INV-2026-8841 disputed?", BOT), BOT)).toBe(true);
    expect(isQuestionPost(post("Question from Judge Tan: What is the status of current prospect Sarvam AI", BOT), BOT)).toBe(true);
  });

  it("treats a reply by the bot user as answered", () => {
    expect(isAnswered(post("Why?", "005REP", [{ user: "005REP", text: "me too" }]), BOT)).toBe(false);
    expect(isAnswered(post("Why?", "005REP", [{ user: BOT, text: "Root Cause" }]), BOT)).toBe(true);
    expect(isAnswered(post("Why?", "005REP", [{ user: "005OLD", text: "SingTech AI: old style" }]), BOT)).toBe(true);
  });

  it("shows guests by name and the bot as SingTech AI", () => {
    const m = toMessage(post("Question from Judge Tan: What is LionRock&#39;s renewal date?", BOT, [{ user: BOT, text: "Answer\nJanuary 2027 [1]" }]), BOT);
    expect(m).toMatchObject({ author: "Judge Tan", text: "What is LionRock's renewal date?", isBot: false });
    expect(m.replies[0]).toMatchObject({ author: "SingTech AI", isBot: true });
    expect(questionText("Question from Judge Tan: @SingTech check SGT-INV-2026-8841")).toBe("check SGT-INV-2026-8841");
  });
});

describe("salesforce field access", () => {
  it("reads the fields Salesforce refuses to write", async () => {
    const { blockedFields } = await import("@/lib/salesforce");
    expect(blockedFields(new Error('Salesforce 400: [{"message":"Unable to create/update fields: Description. Please check the security settings'))).toEqual(["Description"]);
    expect(blockedFields(new Error("Salesforce 400: Unable to create/update fields: Description, Amount. Please check"))).toEqual(["Description", "Amount"]);
    expect(blockedFields(new Error("Salesforce 400: REQUIRED_FIELD_MISSING"))).toEqual([]);
  });
});

describe("feed rich text", () => {
  it("round-trips headings and bullets between HTML and plain lines", async () => {
    const { htmlToText, richHtml } = await import("@/lib/salesforce");
    const html = richHtml([{ heading: "Root Cause", lines: ["Credit <not> netted & re-billed"] }, { heading: "Next Actions", lines: ["Reissue by 2026-11-27"], isList: true }]);
    expect(html).toBe("<p><b>Root Cause</b></p><p>Credit &lt;not&gt; netted &amp; re-billed</p><p><b>Next Actions</b></p><ul><li>Reissue by 2026-11-27</li></ul>");
    expect(htmlToText(html)).toBe("Root Cause\nCredit <not> netted & re-billed\nNext Actions\n\n- Reissue by 2026-11-27");
  });
});

describe("deal room cutoff", () => {
  it("hides posts made before DEAL_ROOM_SINCE and keeps everything when it is unset", async () => {
    const { isAfterCutoff } = await import("@/lib/dealroom");
    expect(isAfterCutoff("2026-11-16T09:00:00.000Z", "2026-11-16T10:00:00Z")).toBe(false);
    expect(isAfterCutoff("2026-11-16T10:00:01.000+0000", "2026-11-16T10:00:00Z")).toBe(true);
    expect(isAfterCutoff("2026-11-01T00:00:00Z", undefined)).toBe(true);
    expect(isAfterCutoff("2026-11-01T00:00:00Z", "not a date")).toBe(true);
  });
});
