import { daysUntil } from "@/lib/history";
import { CORRIDOR_ENDPOINT, PLACES } from "@/lib/labels";
import type { AccountRecord } from "../account/records";

// One map pin and one list row per account, built only from fields the record already has (no invented values).
export type CoverageFilter = "all" | "customers" | "prospects";

export interface CoverageRow {
  id: string;
  name: string;
  isCustomer: boolean;
  isSample: boolean;
  // Ranked companies can open the quick-view drawer; history-only sample accounts open their record only.
  hasQuickView: boolean;
  coordinates: [number, number];
  inSingapore: boolean;
  // Where the corridor arc ends on the regional view, if the account has one.
  arcTo?: readonly [number, number];
  currentArrSgd?: number;
  upsideSgd?: number;
  renewalDays?: number;
  priority?: number;
  nextStep?: string;
  // Real prospects only: the latest public signal and the page it came from.
  signal?: { claim: string; url: string };
}

export interface CoverageTotals {
  accounts: number;
  currentArrSgd: number;
  upsideSgd: number;
  renewalsWithin180: number;
}

const SG_BOX = { south: 1.15, north: 1.48, west: 103.6, east: 104.1 };
const isInSingapore = ([lat, lng]: readonly [number, number]) => lat >= SG_BOX.south && lat <= SG_BOX.north && lng >= SG_BOX.west && lng <= SG_BOX.east;

export function toCoverageRow(r: AccountRecord, today?: string): CoverageRow | undefined {
  const c = r.company;
  const coordinates = c?.coordinates ?? r.history?.profile?.coordinates;
  if (!coordinates) return undefined;
  const renewalDays = c?.mode === "farming" ? c.contractRenewalDays : r.history && today ? daysUntil(r.history.contractEndDate, today) : undefined;
  const lastMeeting = r.history?.meetings.at(-1);
  return {
    id: r.id,
    name: r.name,
    isCustomer: r.isCustomer,
    isSample: r.isSample,
    hasQuickView: Boolean(c),
    coordinates: [coordinates[0], coordinates[1]],
    inSingapore: isInSingapore(coordinates),
    arcTo: c ? (c.mode === "hunting" ? PLACES.singapore : CORRIDOR_ENDPOINT[c.corridor]) : undefined,
    currentArrSgd: r.currentArrSgd,
    upsideSgd: c?.recommendedBundle.estimatedArrSgd,
    renewalDays,
    priority: c?.priorityScore,
    nextStep: c?.nextAction ?? lastMeeting?.actions[0]?.action,
    // Sample customers are fictional, so only real prospects carry a news-style signal.
    signal: c && !c.isDemoAccount && c.signals[0] ? { claim: c.signals[0].claim, url: c.signals[0].source.url } : undefined,
  };
}

// Highest priority first; accounts without a score (history-only samples) follow, soonest renewal first.
export function coverageRows(records: AccountRecord[], filter: CoverageFilter, today?: string): CoverageRow[] {
  return records
    .filter((r) => filter === "all" || (filter === "customers" ? r.isCustomer : !r.isCustomer))
    .map((r) => toCoverageRow(r, today))
    .filter((row): row is CoverageRow => Boolean(row))
    .sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1) || (a.renewalDays ?? Infinity) - (b.renewalDays ?? Infinity) || a.name.localeCompare(b.name));
}

export function coverageTotals(rows: CoverageRow[]): CoverageTotals {
  return {
    accounts: rows.length,
    currentArrSgd: rows.reduce((s, r) => s + (r.currentArrSgd ?? 0), 0),
    upsideSgd: rows.reduce((s, r) => s + (r.upsideSgd ?? 0), 0),
    renewalsWithin180: rows.filter((r) => r.isCustomer && r.renewalDays !== undefined && r.renewalDays >= 0 && r.renewalDays <= 180).length,
  };
}
