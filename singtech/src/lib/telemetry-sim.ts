import type { TelemetryAlert } from "@/types/singtech";

type Preset = { accountId: string } & Omit<TelemetryAlert, "id" | "minutesAgo" | "simulated">;

// One CUBΣ or Paragon usage spike per growth ring, cycled in order so each division gets a live trigger on stage.
const PRESETS: Preset[] = [
  {
    accountId: "acct-straits-maritime-sg",
    metric: "Tuas Port 5G slice saturation (Paragon)",
    currentValue: "97.1% sustained, berth cranes queuing",
    threshold: "< 75% utilisation",
    severity: "critical",
    desk: "connectivity",
  },
  {
    accountId: "acct-lionrock-sg",
    metric: "Marina Bay trading jitter spike (CUBΣ)",
    currentValue: "5.1 ms at market open",
    threshold: "< 1.5 ms SLA",
    severity: "critical",
    desk: "connectivity",
  },
  {
    accountId: "acct-helixveda-sg",
    metric: "GPU queue wait at one-north",
    currentValue: "8 h queue for training jobs",
    threshold: "< 30 min",
    severity: "high",
    desk: "infraco",
  },
  {
    accountId: "acct-orchidbay-sg",
    metric: "Ward device load at Novena (CUBΣ)",
    currentValue: "93% peak across inpatient wards",
    threshold: "< 70% utilisation",
    severity: "high",
    desk: "connectivity",
  },
  {
    accountId: "acct-aeropulse-sg",
    metric: "OT remote access burst at Changi MRO hangar",
    currentValue: "6 unrecognised sessions blocked in 15 min",
    threshold: "Zero tolerance",
    severity: "medium",
    desk: "cyber",
  },
];

export function nextLiveAlert(n: number): { accountId: string; alert: TelemetryAlert } {
  const { accountId, ...rest } = PRESETS[n % PRESETS.length];
  return { accountId, alert: { ...rest, id: `tel-live-${n + 1}`, minutesAgo: 0, simulated: true } };
}
