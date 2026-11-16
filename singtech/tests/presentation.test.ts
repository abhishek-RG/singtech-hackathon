import { describe, expect, it } from "vitest";
import { buildDirectory } from "@/lib/agent/directory";
import { PRESENTATION_SECONDS, presentationSteps } from "@/lib/agent/presentation";

describe("presentation mode", () => {
  const steps = presentationSteps(buildDirectory());

  it("has six steps that fit exactly in five minutes", () => {
    expect(steps).toHaveLength(6);
    expect(steps.reduce((s, x) => s + x.seconds, 0)).toBe(PRESENTATION_SECONDS);
  });

  it("ends on a supervised Salesforce update, never an automatic one", () => {
    const last = steps.at(-1)!;
    expect(last.plan?.steps.at(-1)?.kind).toBe("approveUpdate");
    expect(steps.flatMap((s) => s.plan?.steps ?? []).filter((x) => x.kind === "approveUpdate")).toHaveLength(1);
  });
});
