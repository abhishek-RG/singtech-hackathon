import type { Company, FarmingAccount, ScoreComponent, TelemetryAlert } from "@/types/singtech";

const SEVERITY_POINTS: Record<TelemetryAlert["severity"], number> = { critical: 8, high: 5, medium: 2 };

export const sumBreakdown = (breakdown: ScoreComponent[]) => breakdown.reduce((sum, c) => sum + c.points, 0);

export function rankCompanies<T extends Company>(companies: T[]): T[] {
  return [...companies].sort((a, b) => b.priorityScore - a.priorityScore || a.companyName.localeCompare(b.companyName));
}

// Points are capped so the breakdown always sums to the displayed 0-100 score.
export function applyTelemetryEvent(account: FarmingAccount, alert: TelemetryAlert): FarmingAccount {
  const points = Math.min(SEVERITY_POINTS[alert.severity], 100 - account.priorityScore);
  return {
    ...account,
    priorityScore: account.priorityScore + points,
    telemetryAlerts: [alert, ...account.telemetryAlerts],
    scoreBreakdown: [...account.scoreBreakdown, { label: `Live usage signal: ${alert.metric}`, points }],
  };
}
