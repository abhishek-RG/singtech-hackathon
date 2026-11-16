import type { ComplianceCode, CorridorId, IndustryId, RingId, SalesDesk } from "@/types/singtech";

// `tag` is the 1-2 word name used everywhere in the UI; `label` is the long heading on Proposals.
export const RINGS: { id: RingId; label: string; short: string; tag: string; stack: string }[] = [
  { id: "ring1", label: "Ring 1: Existing SG Customer Upgrades (Tuas, Changi, Marina Bay, Biopolis)", short: "Existing SG Customer Upgrades", tag: "SG Core", stack: "CUBΣ and Paragon usage signals on current contracts" },
  { id: "ring2", label: "Ring 2: NCS & Paragon Partner Co-Sells", short: "NCS & Paragon Partner Co-Sells", tag: "Partner Co-Sell", stack: "Warm paths through NCS and Singtel 5G+ partners" },
  { id: "ring3", label: "Ring 3: Johor SEZ & India (STT GDC) Expansions", short: "Johor SEZ & India Expansions", tag: "Corridors", stack: "TM Nxera Johor, STT GDC India, and Singtel corridors" },
];

export const ringLabel = (id: RingId) => RINGS.find((r) => r.id === id)!.tag;

export const CORRIDORS: Record<CorridorId, string> = {
  "blr-sg": "Bengaluru <-> Singapore",
  "bom-pnq-sg": "Mumbai / Pune <-> Singapore",
  "maa-tuas": "Chennai <-> Tuas Port",
  "jb-sg": "Johor SEZ <-> Singapore",
  "in-sg-other": "Other India <-> Singapore",
};

export const INDUSTRIES: Record<IndustryId, string> = {
  fintech: "FinTech & Banking",
  logistics: "Logistics, Maritime & Aviation",
  "ai-biotech": "AI, Biotech & Healthcare",
  "semi-ev": "Manufacturing & Precision Engineering",
  "digital-infra": "Digital Infrastructure & IT Services",
};

export const DESKS: Record<SalesDesk, string> = {
  all: "All Divisions (One-Singtel)",
  connectivity: "Connectivity & Paragon 5G",
  infraco: "Digital InfraCo (Nxera & RE:AI)",
  cyber: "Cyber & DART CII Defence",
};

export const PLACES = {
  singapore: [1.2903, 103.8519],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  chennai: [13.0827, 80.2707],
  johor: [1.4239, 103.6123],
  hyderabad: [17.385, 78.4867],
} as const satisfies Record<string, readonly [number, number]>;

// Singtel infrastructure the rep sells on top of, drawn as fixed hub markers.
export const HUBS: { name: string; position: readonly [number, number]; regional?: boolean }[] = [
  { name: "Tuas Mega Port (Paragon 5G+)", position: [1.24, 103.62] },
  { name: "Nxera DC Tuas (58MW)", position: [1.3215, 103.6365] },
  { name: "Changi Aviation Hub", position: [1.3644, 103.9915] },
  { name: "Marina Bay Financial District", position: [1.2806, 103.854] },
  { name: "one-north Biopolis", position: [1.304, 103.793] },
  { name: "TM Nxera Johor (Iskandar Puteri)", position: PLACES.johor, regional: true },
  { name: "STT GDC Mumbai", position: PLACES.mumbai, regional: true },
  { name: "STT GDC Bengaluru", position: PLACES.bengaluru, regional: true },
  { name: "STT GDC Chennai", position: PLACES.chennai, regional: true },
];

// Where each corridor's far end sits, for drawing corridor arcs from Singapore.
export const CORRIDOR_ENDPOINT: Record<CorridorId, readonly [number, number]> = {
  "blr-sg": PLACES.bengaluru,
  "bom-pnq-sg": PLACES.mumbai,
  "maa-tuas": PLACES.chennai,
  "jb-sg": PLACES.johor,
  "in-sg-other": PLACES.hyderabad,
};

// Short badge text for compliance clearance; the full regulation name stays in the link title.
export const COMPLIANCE_SHORT: Record<ComplianceCode, string> = {
  SG_CYBERSECURITY_ACT_CII: "SG CII Act",
  SG_MAS_TRM: "MAS TRM",
  SG_PDPA: "SG PDPA",
  INDIA_DPDP_ACT_2023: "India DPDP",
  MAS_QUANTUM_ADVISORY: "MAS Quantum Advisory",
  RBI_DATA_LOCALIZATION: "RBI Data Localisation",
  INDIA_CERT_IN: "CERT-In",
  DOT_M2M_ESIM: "DoT M2M eSIM",
  MY_PDPA: "Malaysia PDPA",
  IMO_MARITIME_CYBER: "IMO Maritime Cyber",
};
