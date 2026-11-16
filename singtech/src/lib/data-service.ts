import { z } from "zod";
import callTranscriptJson from "@/data/call_transcript.json";
import catalogJson from "@/data/catalog.json";
import companiesJson from "@/data/cached_companies.json";
import regulationsJson from "@/data/regulations.json";
import roiScenariosJson from "@/data/roi_scenarios.json";
import { rankCompanies } from "@/lib/scoring";
import {
  CallTurnSchema,
  CatalogProductSchema,
  CompanySchema,
  RegulationSchema,
  RoiScenarioSchema,
  type ComplianceCode,
  type Company,
  type CorridorId,
  type DivisionDesk,
  type FarmingAccount,
  type HuntingLead,
  type IndustryId,
  type Mode,
  type PlayId,
  type ProductId,
  type RingId,
  type SalesDesk,
} from "@/types/singtech";

// Self-contained: everything is bundled and validated once at import, so reads never touch the network.
const catalog = z.array(CatalogProductSchema).parse(catalogJson);
const companies = rankCompanies(z.array(CompanySchema).parse(companiesJson));
const regulations = z.array(RegulationSchema).parse(regulationsJson);
const callTranscript = z.array(CallTurnSchema).parse(callTranscriptJson);
const roiScenarios = z.array(RoiScenarioSchema).parse(roiScenariosJson);

const productsById = new Map(catalog.map((p) => [p.id, p]));

export const getCatalog = () => catalog;
export const getProduct = (id: ProductId) => productsById.get(id);
export const getRegulations = () => regulations;
export const getRegulation = (code: ComplianceCode) => regulations.find((r) => r.code === code);
export const getCallTranscript = () => callTranscript;
export const getRoiScenario = (companyId: string) => roiScenarios.find((s) => s.companyId === companyId);
export const getCompany = (id: string) => companies.find((c) => c.id === id);
export const getHuntingLeads = () => companies.filter((c): c is HuntingLead => c.mode === "hunting");
export const getFarmingAccounts = () => companies.filter((c): c is FarmingAccount => c.mode === "farming");

export const productDesk = (id: ProductId): DivisionDesk => productsById.get(id)!.desk;

export const companyMatchesDesk = (company: Company, desk: SalesDesk) =>
  desk === "all" || company.recommendedBundle.products.some((id) => productDesk(id) === desk);

export interface CompanyFilter {
  mode?: Mode;
  play?: PlayId;
  ring?: RingId;
  corridor?: CorridorId;
  industry?: IndustryId;
  desk?: SalesDesk;
  query?: string;
}

export const getCompanies = (filter: CompanyFilter = {}) => filterCompanies(companies, filter);

// Works on any list, so the UI can filter the live (telemetry-updated) companies with the same rules.
export function filterCompanies<T extends Company>(
  list: T[],
  { mode, play, ring, corridor, industry, desk = "all", query }: CompanyFilter = {},
): T[] {
  const q = query?.trim().toLowerCase();
  return list.filter(
    (c) =>
      (!mode || c.mode === mode) &&
      (!play || c.play === play) &&
      (!ring || c.ring === ring) &&
      (!corridor || c.corridor === corridor) &&
      (!industry || c.industry === industry) &&
      companyMatchesDesk(c, desk) &&
      (!q || [c.companyName, c.hqCity, c.hubLabel, c.corridorLabel, c.industryLabel, c.whyNow, c.coSellPath?.partner ?? "", ...c.recommendedBundle.products.map((id) => productsById.get(id)?.shortName ?? "")].some((f) => f.toLowerCase().includes(q))),
  );
}

export function getPortfolioKpis(accounts: FarmingAccount[] = getFarmingAccounts()) {
  const alerts = accounts.flatMap((a) => a.telemetryAlerts);
  return {
    totalManagedArrSgd: accounts.reduce((sum, a) => sum + a.currentArrSgd, 0),
    upgradeArrSgd: accounts.reduce((sum, a) => sum + a.recommendedBundle.estimatedArrSgd, 0),
    activeAlerts: alerts.length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
  };
}

// Home-screen strip: every number is derived from the live company list, never hardcoded.
export function getEngagementKpis(list: Company[] = companies) {
  const existing = list.filter((c): c is FarmingAccount => c.mode === "farming");
  return {
    priorityPlays: list.length,
    existingUpgrades: existing.length,
    expansions: list.length - existing.length,
    pipelineArrSgd: list.reduce((sum, c) => sum + c.recommendedBundle.estimatedArrSgd, 0),
    avgLift: existing.length
      ? existing.reduce((sum, a) => sum + (a.currentArrSgd + a.recommendedBundle.estimatedArrSgd) / a.currentArrSgd, 0) / existing.length
      : 0,
    accountsOverThreshold: existing.filter((a) => a.telemetryAlerts.some((t) => t.severity !== "medium")).length,
    warmPaths: list.filter((c) => c.coSellPath).length,
  };
}

// Rep's quarterly weighted target; a planning input, not a reported figure.
export const QUARTER_TARGET_SGD = 5_000_000;
// Stage weights for the forecast: upgrades on existing contracts close far more often than new-logo corridor deals.
export const WIN_WEIGHT = { existing: 0.8, prospect: 0.45 } as const;

const sumBy = <K extends string>(list: Company[], key: (c: Company) => K, keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, list.filter((c) => key(c) === k).reduce((s, c) => s + c.recommendedBundle.estimatedArrSgd, 0)])) as Record<K, number>;

// Every dashboard chart reads from this, so the widgets always agree with the ranked list and the drawer.
export function getDashboardStats(list: Company[] = companies) {
  const byProduct = Object.fromEntries(catalog.map((p) => [p.id, 0])) as Record<ProductId, number>;
  for (const c of list) for (const id of c.recommendedBundle.products) byProduct[id] += productsById.get(id)!.indicativeArrSgd;
  const weighted = list.reduce((s, c) => s + c.recommendedBundle.estimatedArrSgd * (c.mode === "farming" ? WIN_WEIGHT.existing : WIN_WEIGHT.prospect), 0);
  return {
    byProduct,
    byRing: sumBy(list, (c) => c.ring, ["ring1", "ring2", "ring3"] as const),
    byTrigger: sumBy(list, (c) => c.trigger, ["bandwidth", "renewal", "ai-compute", "cii-cyber"] as const),
    byHub: sumBy(list, (c) => (c.ring === "ring3" ? "regional" : "sg"), ["sg", "regional"] as const),
    weightedForecastSgd: Math.round(weighted),
    attainmentPct: Math.round((weighted / QUARTER_TARGET_SGD) * 100),
  };
}
