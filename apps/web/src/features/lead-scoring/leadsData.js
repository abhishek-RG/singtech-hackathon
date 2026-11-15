// Dummy enterprise & government lead scoring dataset and pure helper functions.

export const SORT_KEYS = {
  SCORE: 'score',
  PRICE: 'price',
};

export const SORT_OPTIONS = [
  { value: SORT_KEYS.SCORE, label: 'Highest Metric Score' },
  { value: SORT_KEYS.PRICE, label: 'Highest Potential Sale Price' },
];

export function calculatePotentialSalePrice(yearlyPrice, expectedContractYears) {
  return yearlyPrice * expectedContractYears;
}

const RAW_COMPANIES = [
  {
    id: 'global-financial-mnc',
    companyName: 'Global Financial MNC',
    sector: 'MNC',
    engagementScore: 92,
    recommendedProduct: 'Unified SASE + 5G',
    yearlyPrice: 350000,
    expectedContractYears: 3,
    keyPointers: [
      'Strategic Fit: Expanding regional wealth-management hubs across Singapore and APAC requiring ultra-low-latency, compliance-grade cross-border connectivity.',
      'Current Infrastructure Gap: Legacy MPLS backhaul and fragmented branch firewalls create cloud-application bottlenecks and heavy MAS audit overhead.',
      'Immediate Sales Action: Schedule a CISO architecture workshop this week to pitch a phased Unified SASE + 5G network slicing pilot for their Singapore HQ.',
    ],
  },
  {
    id: 'national-transport-logistics-board',
    companyName: 'National Transport & Logistics Board',
    sector: 'Government',
    engagementScore: 86,
    recommendedProduct: 'Private 5G + Edge Computing',
    yearlyPrice: 480000,
    expectedContractYears: 5,
    keyPointers: [
      'Strategic Fit: Spearheading national smart-port and autonomous fleet telemetry initiatives backed by approved multi-year public digital infrastructure budgets.',
      'Current Infrastructure Gap: Public Wi-Fi and legacy 4G corridors suffer from packet loss and high latency during peak automated crane and AGV handoffs.',
      'Immediate Sales Action: Deliver a tailored Private 5G + Multi-Access Edge Computing (MEC) tender brief and arrange a live Singtel 5G Garage demonstration.',
    ],
  },
  {
    id: 'multinational-manufacturing-corp',
    companyName: 'Multinational Manufacturing Corp',
    sector: 'MNC',
    engagementScore: 78,
    recommendedProduct: 'Managed Zero Trust',
    yearlyPrice: 320000,
    expectedContractYears: 4,
    keyPointers: [
      'Strategic Fit: Operating four high-precision semiconductor and electronics plants across ASEAN with strict 24/7 operational technology (OT) uptime mandates.',
      'Current Infrastructure Gap: Flat factory-floor networks expose industrial IoT controllers to lateral cyber risks when third-party equipment vendors connect remotely.',
      'Immediate Sales Action: Propose a 30-day Managed Zero Trust Network Access (ZTNA) security assessment targeting IT/OT segmentation at their Jurong facility.',
    ],
  },
];

export const LEAD_COMPANIES = RAW_COMPANIES.map((company) => ({
  ...company,
  potentialSalePrice: calculatePotentialSalePrice(
    company.yearlyPrice,
    company.expectedContractYears,
  ),
}));

export function sortCompanies(companies, sortBy = SORT_KEYS.SCORE) {
  return [...companies].sort((a, b) => {
    if (sortBy === SORT_KEYS.PRICE) {
      return b.potentialSalePrice - a.potentialSalePrice;
    }
    return b.engagementScore - a.engagementScore;
  });
}

export function getCompanyById(companyId) {
  return LEAD_COMPANIES.find((company) => company.id === companyId) ?? null;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

export function getScoreTier(score) {
  if (score >= 85) {
    return { label: 'Hot Lead · High Readiness', status: 'ok' };
  }
  if (score >= 70) {
    return { label: 'Warm Lead · Active Evaluation', status: 'ok' };
  }
  return { label: 'Nurture · Early Discovery', status: 'idle' };
}
