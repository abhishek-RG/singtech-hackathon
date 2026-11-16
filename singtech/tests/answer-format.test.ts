import { describe, expect, it } from "vitest";
import { answerBlocks, blocksToText, parseAnswer, summaryHeading } from "@/lib/answer-format";

describe("parseAnswer", () => {
  it("splits summary and actions across lines", () => {
    const r = parseAnswer("SUMMARY: The credit was not netted [1].\nACTIONS:\n- Create the supplier site code by 2026-11-20 [2]\n- Reissue SGT-INV-2026-8841 [2]");
    expect(r.summary).toBe("The credit was not netted [1].");
    expect(r.actions).toEqual(["Create the supplier site code by 2026-11-20 [2]", "Reissue SGT-INV-2026-8841 [2]"]);
  });

  it("handles actions on one line and keeps hyphenated words", () => {
    const r = parseAnswer("SUMMARY: SAP-to-Oracle billing broke [1]. ACTIONS: - Call the AP lead [1] - Send the credit note [2]");
    expect(r.summary).toBe("SAP-to-Oracle billing broke [1].");
    expect(r.actions).toEqual(["Call the AP lead [1]", "Send the credit note [2]"]);
  });

  it("drops placeholder actions", () => {
    expect(parseAnswer("SUMMARY: Paid [1].\nACTIONS:\n- No further actions are specified in the passages [1].").actions).toEqual([]);
    expect(parseAnswer("SUMMARY: Paid [1].\nACTIONS:\nNone").actions).toEqual([]);
  });

  it("works on a partial stream and on answers without the format", () => {
    expect(parseAnswer("SUMMARY: The inv").summary).toBe("The inv");
    expect(parseAnswer("From SingTech records: LionRock renews in January.")).toEqual({ summary: "From SingTech records: LionRock renews in January.", actions: [] });
  });
});

describe("answer blocks", () => {
  it("merges repeated sources into one line", () => {
    const blocks = answerBlocks("When does Orchid Bay renew?", "SUMMARY: April 2027 [1, 2].", [
      { title: "Orchid Bay Medical Group: account history", source: "" },
      { title: "Orchid Bay Medical Group: account history", source: "" },
      { title: "Renewal playbook", source: "" },
    ]);
    expect(blocks.at(-1)?.lines).toEqual(["[1, 2] Orchid Bay Medical Group: account history (SingTech records, sample data)", "[3] Renewal playbook (SingTech records, sample data)"]);
  });

  it("uses Root Cause for problems and Answer otherwise", () => {
    expect(summaryHeading("Why is SGT-INV-2026-8841 disputed?")).toBe("Root Cause");
    expect(summaryHeading("What should I pitch to LionRock?")).toBe("Answer");
  });

  it("builds Root Cause, Next Actions and Sources for Chatter", () => {
    const blocks = answerBlocks("Check SGT-INV-2026-8841", "SUMMARY: Credit not netted [1].\nACTIONS:\n- Reissue [1]", [
      { title: "Invoice SGT-INV-2026-8841", source: "" },
      { title: "Singtel H1 FY2025", source: "https://www.singtel.com/about-us/investor-relations" },
    ]);
    expect(blocks.map((b) => b.heading)).toEqual(["Root Cause", "Next Actions", "Sources"]);
    expect(blocksToText(blocks)).toContain("- [2] Singtel H1 FY2025 (https://www.singtel.com/about-us/investor-relations)");
    expect(blocksToText(blocks)).toContain("(SingTech records, sample data)");
  });
});
