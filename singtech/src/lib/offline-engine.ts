import { getProduct } from "@/lib/data-service";
import { CORRIDOR_ENDPOINT, CORRIDORS, INDUSTRIES } from "@/lib/labels";
import { sumBreakdown } from "@/lib/scoring";
import {
  HuntingLeadSchema,
  type AnalyzeCompanyRequest,
  type ComplianceCode,
  type HuntingLead,
  type IndustryId,
  type PlayId,
  type ProductId,
} from "@/types/singtech";

interface Template {
  industry: IndustryId;
  play: PlayId;
  keywords: RegExp;
  bundleName: string;
  products: ProductId[];
  starter: ProductId[];
  flags: ComplianceCode[];
  needs: string[];
  buyer: [role: string, title: string];
}

// First match wins; the last template is the default.
const TEMPLATES: Template[] = [
  {
    industry: "logistics",
    play: "maritime",
    keywords: /ship|vessel|port|marine|maritime|tanker|container|ocean|fleet|reefer/,
    bundleName: "Smart Maritime Fleet Suite",
    products: ["SGT-5G", "SGT-IOT", "SGT-CYBER"],
    starter: ["SGT-IOT"],
    flags: ["SG_CYBERSECURITY_ACT_CII", "IMO_MARITIME_CYBER"],
    needs: ["5G+ slicing at the port", "IoT connectivity for vessels and containers", "Managed security for OT networks"],
    buyer: ["VP Fleet Operations", "VP Fleet Digitalisation"],
  },
  {
    industry: "fintech",
    play: "banking",
    keywords: /bank|pay|fin|capital|wallet|remit|insur|trading/,
    bundleName: "Sovereign FinTech Corridor Stack",
    products: ["SGT-CUBE", "SGT-QSN", "SGT-CYBER"],
    starter: ["SGT-CYBER"],
    flags: ["INDIA_DPDP_ACT_2023", "RBI_DATA_LOCALIZATION", "SG_MAS_TRM"],
    needs: ["Low-latency corridor connectivity on CUBΣ", "Quantum-Safe Network for inter-site links", "Unified SASE and managed security"],
    buyer: ["Chief Information Security Officer", "CISO / VP Infrastructure"],
  },
  {
    industry: "logistics",
    play: "aviation-logistics",
    keywords: /logist|cargo|freight|air|aviation|courier|supply/,
    bundleName: "Connected Corridor Logistics Suite",
    products: ["SGT-IOT", "SGT-5G", "SGT-MOB"],
    starter: ["SGT-IOT"],
    flags: ["INDIA_DPDP_ACT_2023", "DOT_M2M_ESIM"],
    needs: ["Multi-country IoT connectivity for fleet trackers", "5G+ slicing for hub automation", "Managed mobility for drivers and hub staff"],
    buyer: ["Chief Technology Officer", "CTO / Head of Operations Technology"],
  },
  {
    industry: "ai-biotech",
    play: "ai-cloud",
    keywords: /\bai\b|ai\.|intelligen|model|gpu|bio|pharma|genom|lab|health|data/,
    bundleName: "Sovereign AI Compute & Interconnect Pack",
    products: ["SGT-REAI", "SGT-NXERA", "SGT-CUBE"],
    starter: ["SGT-REAI"],
    flags: ["INDIA_DPDP_ACT_2023", "SG_PDPA"],
    needs: ["In-region GPU capacity", "AI-ready colocation", "High-capacity interconnect on CUBΣ"],
    buyer: ["Head of AI Infrastructure", "VP Infrastructure / Head of AI Platform"],
  },
  {
    industry: "semi-ev",
    play: "india-sea",
    keywords: /semi|chip|electr|ev\b|motor|auto|battery|manufactur/,
    bundleName: "Smart Plant & IP Shield Bundle",
    products: ["SGT-5G", "SGT-IOT", "SGT-CYBER"],
    starter: ["SGT-IOT"],
    flags: ["INDIA_CERT_IN", "INDIA_DPDP_ACT_2023"],
    needs: ["5G+ slicing for plant automation", "IoT connectivity for equipment telemetry", "Managed OT security"],
    buyer: ["Chief Information Officer", "CIO / VP Manufacturing IT"],
  },
  {
    industry: "digital-infra",
    play: "india-sea",
    keywords: /./,
    bundleName: "India-SEA Secure Expansion Fabric",
    products: ["SGT-CUBE", "SGT-CYBER", "SGT-MOB"],
    starter: ["SGT-CUBE"],
    flags: ["INDIA_DPDP_ACT_2023", "SG_PDPA"],
    needs: ["Multi-site SD-WAN on CUBΣ", "Zero-trust Unified SASE", "Managed mobility for regional staff"],
    buyer: ["Head of IT Infrastructure", "CIO / Head of Infrastructure"],
  },
];

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const arrOf = (ids: ProductId[]) => ids.reduce((sum, id) => sum + getProduct(id)!.indicativeArrSgd, 0);

export function pickTemplate(text: string) {
  const t = text.toLowerCase();
  return TEMPLATES.find((tpl) => tpl.keywords.test(t))!;
}

// Deterministic, network-free Lead Card so the Analyze flow never fails on stage. Inputs must already be PII-redacted.
export function synthesizeLead({ companyName, websiteUrl, corridor, notes }: AnalyzeCompanyRequest): HuntingLead {
  const host = new URL(websiteUrl).hostname.replace(/^www\./, "");
  const tpl = pickTemplate(`${companyName} ${host} ${notes ?? ""}`);
  const h = hash(companyName.toLowerCase());
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || h.toString(36);
  const [lat, lng] = CORRIDOR_ENDPOINT[corridor];
  const corridorLabel = CORRIDORS[corridor];
  const scoreBreakdown = [
    { label: `Corridor fit: ${corridorLabel}`, points: 26 + (h % 8) },
    { label: `Bundle fit: ${INDUSTRIES[tpl.industry]}`, points: 22 + ((h >> 3) % 8) },
    { label: "Signal to confirm in discovery", points: 10 + ((h >> 6) % 6) },
  ];

  return HuntingLeadSchema.parse({
    id: `lead-live-${slug}`,
    mode: "hunting",
    isDemoAccount: false,
    companyName,
    hqCity: "To be confirmed",
    corridor,
    corridorLabel,
    industry: tpl.industry,
    industryLabel: INDUSTRIES[tpl.industry],
    play: tpl.play,
    ring: "ring3",
    trigger: tpl.play === "ai-cloud" ? "ai-compute" : "bandwidth",
    relationshipLabel: "New Prospect · Added by rep",
    hubLabel: corridorLabel,
    coordinates: [lat + ((h % 100) - 50) / 400, lng + (((h >> 4) % 100) - 50) / 400],
    priorityScore: sumBreakdown(scoreBreakdown),
    scoreBreakdown,
    whyNow: `Submitted for live analysis on the ${corridorLabel} corridor. Verify a public expansion signal before outreach.`,
    signals: [
      {
        claim: `${companyName} was submitted by a Singtel rep for analysis. No public expansion signal has been verified yet.`,
        source: { title: `${companyName} website (submitted URL)`, url: websiteUrl, publisher: host, kind: "company" },
      },
    ],
    hypothesis: `Industry playbook for ${INDUSTRIES[tpl.industry]}. SingTech assesses a likely fit for the ${tpl.bundleName}; confirm needs in discovery before quoting.`,
    likelyNeeds: tpl.needs,
    recommendedBundle: {
      bundleName: tpl.bundleName,
      products: tpl.products,
      estimatedArrSgd: arrOf(tpl.products),
      starterDownsellBundle: tpl.starter,
      starterArrSgd: arrOf(tpl.starter),
    },
    complianceFlags: tpl.flags,
    complianceNote: "Compliance flags are inferred from the industry template. Confirm data residency and sector rules during discovery.",
    decisionMaker: {
      role: tpl.buyer[0],
      targetTitle: tpl.buyer[1],
      entryRoute: "Qualify via the Singtel corridor desk before outreach",
      localPartnerNote: "Regional last-mile through Singtel Group and Bridge Alliance partners",
    },
    nextAction: `Verify a public expansion signal for ${companyName}, then book a discovery call on the ${corridorLabel} corridor.`,
    draftOutreach: `Subject: Singtel support for ${companyName} on the ${corridorLabel} corridor\n\nHi [Name],\n\nSingtel Enterprise works with companies operating across India and Southeast Asia on connectivity, cloud, and cyber security. Based on your sector, we think the ${tpl.bundleName} may be relevant.\n\nWould a 20-minute discovery call be useful to see whether it fits your plans?`,
  });
}
