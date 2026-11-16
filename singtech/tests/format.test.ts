import { describe, expect, it } from "vitest";
import { formatSgdCompact } from "@/lib/format";

describe("formatSgdCompact", () => {
  it("rounds half up instead of trusting floating point", () => {
    expect(formatSgdCompact(5_395_000)).toBe("SGD 5.40M");
    expect(formatSgdCompact(2_625_000)).toBe("SGD 2.63M");
  });

  it("switches to millions at the rounding boundary", () => {
    expect(formatSgdCompact(999_600)).toBe("SGD 1.00M");
    expect(formatSgdCompact(999_499)).toBe("SGD 999K");
    expect(formatSgdCompact(425_000)).toBe("SGD 425K");
    expect(formatSgdCompact(0)).toBe("SGD 0K");
  });
});
