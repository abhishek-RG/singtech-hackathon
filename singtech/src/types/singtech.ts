import { z } from "zod";

// Schemas are the single source of truth: seed JSON is validated against them at load, and types are inferred from them.

export const ModeSchema = z.enum(["hunting", "farming"]);
export const SalesDeskSchema = z.enum(["all", "connectivity", "infraco", "cyber"]);
export const DivisionDeskSchema = SalesDeskSchema.exclude(["all"]);

// 6 core products from the mentor catalogue, plus 3 approved extras (RE:AI, Nxera, NCS).
export const ProductIdSchema = z.enum(["SGT-5G", "SGT-CUBE", "SGT-CYBER", "SGT-IOT", "SGT-MOB", "SGT-QSN", "SGT-REAI", "SGT-NXERA", "SGT-NCS"]);

export const CorridorIdSchema = z.enum(["blr-sg", "bom-pnq-sg", "maa-tuas", "jb-sg", "in-sg-other"]);
export const IndustryIdSchema = z.enum(["fintech", "logistics", "ai-biotech", "semi-ev", "digital-infra"]);
export const PlayIdSchema = z.enum(["maritime", "banking", "ai-cloud", "aviation-logistics", "india-sea"]);
// Growth rings: existing SG customers, partner co-sell, and India-Singapore corridor prospects. Enterprise and MNC only.
export const RingIdSchema = z.enum(["ring1", "ring2", "ring3"]);
// What made the account actionable now, for the "Opportunities by trigger source" chart.
export const TriggerSourceSchema = z.enum(["bandwidth", "renewal", "ai-compute", "cii-cyber"]);

export const ComplianceCodeSchema = z.enum([
  "INDIA_DPDP_ACT_2023",
  "RBI_DATA_LOCALIZATION",
  "INDIA_CERT_IN",
  "DOT_M2M_ESIM",
  "SG_PDPA",
  "SG_MAS_TRM",
  "MAS_QUANTUM_ADVISORY",
  "SG_CYBERSECURITY_ACT_CII",
  "MY_PDPA",
  "IMO_MARITIME_CYBER",
]);

const HttpsUrl = z.url({ protocol: /^https$/ });

export const SourceRefSchema = z.object({
  title: z.string().min(1),
  url: HttpsUrl,
  publisher: z.string().min(1),
  publishedAt: z.iso.date().optional(),
  kind: z.enum(["press", "company", "regulator", "simulated-telemetry"]),
});

export const SignalSchema = z.object({
  claim: z.string().min(1),
  source: SourceRefSchema,
});

export const CatalogProductSchema = z.object({
  id: ProductIdSchema,
  name: z.string().min(1),
  shortName: z.string().min(1),
  division: z.string().min(1),
  desk: DivisionDeskSchema,
  tier: z.enum(["core", "extra"]),
  targetBuyer: z.string().min(1),
  indicativeArrSgd: z.number().int().positive(),
  capabilities: z.string().min(1),
  source: SourceRefSchema,
});

export const ScoreComponentSchema = z.object({
  label: z.string().min(1),
  points: z.number().int(),
});

export const BundleSchema = z.object({
  bundleName: z.string().min(1),
  products: z.array(ProductIdSchema).min(1),
  estimatedArrSgd: z.number().int().positive(),
  starterDownsellBundle: z.array(ProductIdSchema).min(1),
  starterArrSgd: z.number().int().positive(),
});

export const DecisionMakerSchema = z.object({
  role: z.string().min(1),
  targetTitle: z.string().min(1),
  entryRoute: z.string().min(1),
  localPartnerNote: z.string().min(1),
});

export const CoSellPathSchema = z.object({
  partner: z.string().min(1),
  partnerType: z.enum(["ncs", "paragon-partner", "stt-gdc", "imda"]),
  note: z.string().min(1),
  source: SourceRefSchema,
});

const CompanyBaseShape = {
  id: z.string().regex(/^(lead|acct)-[a-z0-9-]+$/),
  companyName: z.string().min(1),
  hqCity: z.string().min(1),
  corridor: CorridorIdSchema,
  corridorLabel: z.string().min(1),
  industry: IndustryIdSchema,
  industryLabel: z.string().min(1),
  play: PlayIdSchema,
  ring: RingIdSchema,
  trigger: TriggerSourceSchema,
  relationshipLabel: z.string().min(1),
  hubLabel: z.string().min(1),
  coSellPath: CoSellPathSchema.optional(),
  coordinates: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  priorityScore: z.number().int().min(0).max(100),
  scoreBreakdown: z.array(ScoreComponentSchema).min(1),
  whyNow: z.string().min(1),
  signals: z.array(SignalSchema).min(1),
  hypothesis: z.string().min(1),
  likelyNeeds: z.array(z.string().min(1)).min(1),
  recommendedBundle: BundleSchema,
  complianceFlags: z.array(ComplianceCodeSchema).min(1),
  complianceNote: z.string().min(1),
  decisionMaker: DecisionMakerSchema,
  nextAction: z.string().min(1),
  draftOutreach: z.string().min(1),
  isDemoAccount: z.boolean(),
};

export const HuntingLeadSchema = z.object({ ...CompanyBaseShape, mode: z.literal("hunting") });

export const TelemetryAlertSchema = z.object({
  id: z.string().min(1),
  metric: z.string().min(1),
  currentValue: z.string().min(1),
  threshold: z.string().min(1),
  severity: z.enum(["critical", "high", "medium"]),
  minutesAgo: z.number().int().nonnegative(),
  desk: DivisionDeskSchema,
  simulated: z.literal(true),
});

export const AccountPlanStepSchema = z.object({
  phase: z.string().min(1),
  title: z.string().min(1),
  arrImpactSgd: z.number().int().positive(),
});

// 14 daily readings of the account's main usage metric (sample data, like the account itself).
export const UsageTrendSchema = z.object({
  label: z.string().min(1),
  unit: z.string().min(1),
  threshold: z.number(),
  points: z.array(z.number()).length(14),
});

export const FarmingAccountSchema = z.object({
  ...CompanyBaseShape,
  mode: z.literal("farming"),
  usageTrend: UsageTrendSchema,
  currentArrSgd: z.number().int().positive(),
  contractRenewalDays: z.number().int().nonnegative(),
  ownedProducts: z.array(ProductIdSchema).min(1),
  recommendedUpgrades: z.array(ProductIdSchema).min(1),
  telemetryAlerts: z.array(TelemetryAlertSchema),
  accountPlanSteps: z.array(AccountPlanStepSchema).min(1),
});

export const CompanySchema = z.discriminatedUnion("mode", [HuntingLeadSchema, FarmingAccountSchema]);

export const CoSellSignalSchema = z.object({
  badge: z.string().min(1),
  trigger: z.string().min(1),
  recommendedProducts: z.array(z.string().min(1)).min(1),
  complianceAlert: z.string().min(1),
  estimatedUpliftSgd: z.number().int().positive(),
  suggestedTalkTrack: z.string().min(1),
});

export const CallTurnSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().regex(/^\d{2}:\d{2}$/),
  speaker: z.string().min(1),
  text: z.string().min(1),
  triggerKeywords: z.array(z.string().min(1)),
  detectedSignal: CoSellSignalSchema.nullable(),
});

export const RoiScenarioSchema = z.object({
  companyId: z.string().min(1),
  bottleneck: z.object({ label: z.string().min(1), value: z.number().positive(), unit: z.string().min(1) }),
  target: z.object({ label: z.string().min(1), value: z.number().positive(), unit: z.string().min(1) }),
  slider: z.object({
    kind: z.enum(["bandwidth-gbps", "gpu-h100", "tokens-m"]),
    min: z.number().positive(),
    max: z.number().positive(),
    step: z.number().positive(),
    default: z.number().positive(),
  }),
  baselineAnnualCostSgd: z.number().int().positive(),
  frameworks: z.array(ComplianceCodeSchema).min(1),
});

export const RegulationSchema = z.object({
  code: ComplianceCodeSchema,
  name: z.string().min(1),
  jurisdiction: z.enum(["India", "Singapore", "Malaysia", "International"]),
  summary: z.string().min(1),
  source: SourceRefSchema,
});

export const PiiAuditRecordSchema = z.object({
  id: z.string().min(1),
  timestamp: z.iso.datetime(),
  route: z.enum(["analyze-company", "webhook-crm", "local-preview", "rag-query", "file-upload", "salesforce-update", "deal-room"]),
  rawSnippet: z.string(),
  sanitizedSnippet: z.string(),
  redactedEntities: z.number().int().nonnegative(),
  enforcedPolicies: z.array(z.string()),
});

export const AnalyzeCompanyRequestSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  websiteUrl: HttpsUrl.max(300),
  corridor: CorridorIdSchema,
  notes: z.string().max(2000).optional(),
});

export const CrmWebhookRequestSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  corridor: z.string().trim().min(1).max(120),
  bundleName: z.string().trim().min(1).max(160),
  estimatedArrSgd: z.number().int().nonnegative().max(100_000_000),
  nextAction: z.string().trim().min(1).max(1000),
  complianceFlags: z.array(ComplianceCodeSchema).max(20),
});

export type Mode = z.infer<typeof ModeSchema>;
export type SalesDesk = z.infer<typeof SalesDeskSchema>;
export type DivisionDesk = z.infer<typeof DivisionDeskSchema>;
export type ProductId = z.infer<typeof ProductIdSchema>;
export type CorridorId = z.infer<typeof CorridorIdSchema>;
export type IndustryId = z.infer<typeof IndustryIdSchema>;
export type PlayId = z.infer<typeof PlayIdSchema>;
export type RingId = z.infer<typeof RingIdSchema>;
export type TriggerSource = z.infer<typeof TriggerSourceSchema>;
export type CoSellPath = z.infer<typeof CoSellPathSchema>;
export type ComplianceCode = z.infer<typeof ComplianceCodeSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
export type ScoreComponent = z.infer<typeof ScoreComponentSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type DecisionMaker = z.infer<typeof DecisionMakerSchema>;
export type HuntingLead = z.infer<typeof HuntingLeadSchema>;
export type TelemetryAlert = z.infer<typeof TelemetryAlertSchema>;
export type AccountPlanStep = z.infer<typeof AccountPlanStepSchema>;
export type FarmingAccount = z.infer<typeof FarmingAccountSchema>;
export type UsageTrend = z.infer<typeof UsageTrendSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type LeadStatus = "open" | "qualified" | "downsold" | "snoozed";
export type CoSellSignal = z.infer<typeof CoSellSignalSchema>;
export type CallTurn = z.infer<typeof CallTurnSchema>;
export type RoiScenario = z.infer<typeof RoiScenarioSchema>;
export type Regulation = z.infer<typeof RegulationSchema>;
export type PiiAuditRecord = z.infer<typeof PiiAuditRecordSchema>;
export type AnalyzeCompanyRequest = z.infer<typeof AnalyzeCompanyRequestSchema>;
export type CrmWebhookRequest = z.infer<typeof CrmWebhookRequestSchema>;

export interface RoiResult {
  reductionPct: number;
  annualSavingsSgd: number;
  frameworksCleared: ComplianceCode[];
}

export interface PilotTicket {
  ticketId: string;
  companyId: string;
  createdAt: string;
}

export interface AnalyzeCompanyResponse {
  lead: HuntingLead;
  engine: "claude" | "offline-engine";
  latencyMs: number;
  audit: PiiAuditRecord;
}

export interface OutboundDestination {
  name: "slack" | "salesforce";
  configured: boolean;
  delivered: boolean;
}

export interface CrmReceipt {
  status: "DELIVERED" | "SIMULATED" | "FAILED";
  ticketId: string;
  timestamp: string;
  channel: "#singtel-cosell-deal-room";
  deliveredTo: ("slack" | "salesforce")[];
  destinations: OutboundDestination[];
  // The exact JSON bodies posted (or that would be posted), after PII redaction, so reps can verify dispatch in the Outbox.
  payloads: { slack: string; salesforce: string };
  audit: PiiAuditRecord;
}
