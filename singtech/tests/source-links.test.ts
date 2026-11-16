import { describe, expect, it } from "vitest";
import { sourceHref } from "@/lib/source-links";

describe("source links", () => {
  it("opens the record behind each cited SingTech document", () => {
    expect(sourceHref("invoice:SGT-INV-2026-8841")).toBe("/accounts/acct-meridian-sg?tab=billing&ev=SGT-INV-2026-8841");
    expect(sourceHref("incident:INC-2026-0814")).toBe("/accounts/acct-meridian-sg?tab=service&ev=INC-2026-0814");
    expect(sourceHref("meeting:MTG-MA-2026-06")).toBe("/accounts/acct-meridian-sg?tab=meetings&ev=MTG-MA-2026-06");
    expect(sourceHref("account:acct-lionrock-sg")).toBe("/accounts/acct-lionrock-sg");
    expect(sourceHref("health:acct-orchidbay-sg")).toBe("/accounts/acct-orchidbay-sg");
    expect(sourceHref("interaction:IX-HL-02")).toBe("/sales-copilot?account=acct-harbourline-sg");
    expect(sourceHref("lead-juspay")).toBe("/accounts/lead-juspay");
    expect(sourceHref("overview-prospects")).toBe("/accounts/prospects");
  });

  it("returns nothing for sources without a page", () => {
    for (const id of ["playbook:renewal", "upload", "notes", "invoice:SGT-INV-2026-0000", "web#1"]) expect(sourceHref(id)).toBeUndefined();
  });
});
