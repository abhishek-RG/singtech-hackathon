import { describe, expect, it } from "vitest";
import { defaultLines, lineMrc, lineTcv, listMrc, needsApproval, submitStatus, totals } from "@/components/proposal/pricing";
import { getProduct } from "@/lib/data-service";
import type { ProposalLine } from "@/state/app-store";

const line = (patch: Partial<ProposalLine> = {}): ProposalLine => ({ productId: "SGT-CUBE", qty: 1, termMonths: 36, discountPct: 0, ...patch });

describe("proposal pricing (indicative, from catalogue ARR)", () => {
  it("derives unit MRC from catalogue ARR / 12, rounded to whole SGD", () => {
    expect(listMrc("SGT-CUBE")).toBe(Math.round(getProduct("SGT-CUBE")!.indicativeArrSgd / 12));
    expect(listMrc("SGT-IOT")).toBe(5417); // 65,000 / 12 = 5,416.67
  });

  it("applies quantity and discount to the line MRC, and term to TCV", () => {
    const l = line({ qty: 3, discountPct: 10, termMonths: 24 });
    expect(lineMrc(l)).toBe(Math.round(10_000 * 3 * 0.9));
    expect(lineTcv(l)).toBe(lineMrc(l) * 24);
  });

  it("clamps discount to 0-50% and quantity to at least 1", () => {
    expect(lineMrc(line({ discountPct: 80 }))).toBe(lineMrc(line({ discountPct: 50 })));
    expect(lineMrc(line({ discountPct: -5 }))).toBe(lineMrc(line()));
    expect(lineMrc(line({ qty: 0 }))).toBe(lineMrc(line({ qty: 1 })));
  });

  it("totals MRC, ARR and TCV across lines", () => {
    const lines = [line(), line({ productId: "SGT-5G", termMonths: 12 })];
    const t = totals(lines);
    expect(t.mrc).toBe(lineMrc(lines[0]) + lineMrc(lines[1]));
    expect(t.arr).toBe(t.mrc * 12);
    expect(t.tcv).toBe(lineTcv(lines[0]) + lineTcv(lines[1]));
    expect(totals([])).toEqual({ mrc: 0, arr: 0, tcv: 0 });
  });

  it("routes discounts above 15% to manager approval", () => {
    expect(needsApproval([line({ discountPct: 15 })])).toBe(false);
    expect(submitStatus([line({ discountPct: 15 })])).toBe("approved");
    expect(submitStatus([line(), line({ discountPct: 20 })])).toBe("pending");
  });

  it("starts each line at qty 1, 36 months, no discount", () => {
    expect(defaultLines(["SGT-5G"])).toEqual([{ productId: "SGT-5G", qty: 1, termMonths: 36, discountPct: 0 }]);
  });
});
