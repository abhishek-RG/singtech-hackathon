import { getRoiScenario } from "@/lib/data-service";
import type { Company, RoiResult, RoiScenario } from "@/types/singtech";

// Hunting leads have no telemetry, so their portal uses clearly labelled illustrative assumptions.
function illustrativeScenario(company: Company): RoiScenario {
  return {
    companyId: company.id,
    bottleneck: { label: "Baseline cross-border transfer window (illustrative)", value: 8, unit: "h" },
    target: { label: "Modelled window on the proposed Singtel bundle", value: 0.5, unit: "h" },
    slider: { kind: "bandwidth-gbps", min: 10, max: 100, step: 10, default: 20 },
    baselineAnnualCostSgd: Math.round((company.recommendedBundle.estimatedArrSgd * 0.8) / 1000) * 1000,
    frameworks: company.complianceFlags,
  };
}

export function getScenario(company: Company): { scenario: RoiScenario; isIllustrative: boolean } {
  const scenario = getRoiScenario(company.id);
  return scenario ? { scenario, isIllustrative: false } : { scenario: illustrativeScenario(company), isIllustrative: true };
}

// The minimum commitment already captures 60% of the improvement; full capacity reaches the modelled target.
export function computeRoi(s: RoiScenario, capacity: number): RoiResult & { projectedValue: number } {
  const { min, max } = s.slider;
  const f = (Math.min(Math.max(capacity, min), max) - min) / (max - min || 1);
  const projected = s.bottleneck.value - (s.bottleneck.value - s.target.value) * (0.6 + 0.4 * f);
  return {
    projectedValue: Math.round(projected * 10) / 10,
    reductionPct: Math.round((1 - projected / s.bottleneck.value) * 100),
    annualSavingsSgd: Math.round((s.baselineAnnualCostSgd * (0.45 + 0.35 * f)) / 1000) * 1000,
    frameworksCleared: s.frameworks,
  };
}
