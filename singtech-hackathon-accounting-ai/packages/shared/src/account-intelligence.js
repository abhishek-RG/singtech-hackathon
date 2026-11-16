// Account Intelligence (farming) constants shared by the SingTech AI web app and API.
// Pure data and pure functions only: no DOM, no Node APIs.

export const MODULE_LABEL = 'Account Intelligence';
export const SIMULATED_DATA_LABEL = 'Simulated data';
export const DISPLAY_CURRENCY = 'SGD';

// The six Singtel enterprise products. Codes are stable identifiers used in data and rules;
// names are what the UI shows.
export const PRODUCTS = Object.freeze([
  {
    code: '5G_PLUS',
    name: '5G+',
    positioning: 'Enterprise 5G with network slicing and edge computing for sites and operations.',
  },
  {
    code: 'CUBE',
    name: 'Singtel CUBΣ',
    positioning: 'Network as a service: on-demand, software-defined connectivity across markets.',
  },
  {
    code: 'CYBER',
    name: 'Cyber Security',
    positioning: 'Managed detection and response, threat intelligence and security operations.',
  },
  {
    code: 'IOT',
    name: 'Internet of Things',
    positioning: 'Managed connectivity and platforms for connected assets, fleets and plants.',
  },
  {
    code: 'MOBILITY',
    name: 'Mobility',
    positioning: 'Enterprise mobile plans, devices and mobile device management for the workforce.',
  },
  {
    code: 'QSN',
    name: 'Quantum-Safe Network',
    positioning: 'Quantum-safe encryption for critical links, built for long-lived data.',
  },
]);

export const PRODUCT_CODES = Object.freeze(PRODUCTS.map((product) => product.code));
export const PRODUCT_BY_CODE = Object.freeze(
  Object.fromEntries(PRODUCTS.map((product) => [product.code, product])),
);

// Health bands. Cut-offs are mirrored in apps/server rules config; the shared copy is for labels
// and for the UI, so the two can never disagree on what a score means.
export const HEALTH_BANDS = Object.freeze([
  { code: 'healthy', label: 'Healthy', min: 70, tone: 'success' },
  { code: 'watch', label: 'Watch', min: 40, tone: 'warning' },
  { code: 'at_risk', label: 'At risk', min: 0, tone: 'danger' },
]);

export const HEALTH_BAND_BY_CODE = Object.freeze(
  Object.fromEntries(HEALTH_BANDS.map((band) => [band.code, band])),
);

/** Returns the band object for a 0 to 100 score. */
export function bandForScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return HEALTH_BAND_BY_CODE.at_risk;
  return HEALTH_BANDS.find((band) => value >= band.min) ?? HEALTH_BAND_BY_CODE.at_risk;
}

// The six next best actions the decision tree can end in. There is no discount action on
// purpose: a price perception reason routes to a value case, never to a price cut.
export const ACTION_TYPES = Object.freeze([
  { code: 'executive_meeting', label: 'Executive meeting', kind: 'protect' },
  { code: 'service_recovery', label: 'Service recovery plan', kind: 'protect' },
  { code: 'renewal_value_case', label: 'Renewal with value case', kind: 'protect' },
  { code: 'stakeholder_remap', label: 'Re-map stakeholders', kind: 'protect' },
  { code: 'cross_sell', label: 'Cross-sell', kind: 'grow' },
  { code: 'upsell', label: 'Upsell', kind: 'grow' },
]);

export const ACTION_BY_CODE = Object.freeze(
  Object.fromEntries(ACTION_TYPES.map((action) => [action.code, action])),
);

// Markets Singtel's enterprise business serves, with the local billing currency.
export const MARKETS = Object.freeze([
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
]);

export const MARKET_BY_CODE = Object.freeze(
  Object.fromEntries(MARKETS.map((market) => [market.code, market])),
);

export const INDUSTRIES = Object.freeze([
  'Financial services',
  'Manufacturing',
  'Logistics',
  'Healthcare',
  'Retail',
  'Technology',
  'Energy',
]);

export const SEGMENTS = Object.freeze([
  { code: 'enterprise', label: 'Enterprise' },
  { code: 'mnc', label: 'MNC' },
]);

// Roles a contact can hold on an account. "champion" leaving is a relationship risk signal.
export const CONTACT_ROLES = Object.freeze([
  { code: 'decision_maker', label: 'Decision maker' },
  { code: 'influencer', label: 'Influencer' },
  { code: 'technical_buyer', label: 'Technical buyer' },
  { code: 'champion', label: 'Champion' },
  { code: 'procurement', label: 'Procurement' },
]);

export const CONTACT_ROLE_BY_CODE = Object.freeze(
  Object.fromEntries(CONTACT_ROLES.map((role) => [role.code, role])),
);

// Why an account is at risk or on watch. The health rules name one of these as the top reason.
export const RISK_REASONS = Object.freeze([
  { code: 'service_issues', label: 'Service issues' },
  { code: 'price_perception', label: 'Price perception' },
  { code: 'relationship', label: 'Relationship' },
  { code: 'partial_move', label: 'Partial move to a competitor' },
  { code: 'coverage_gap', label: 'Coverage gap' },
]);

export const RISK_REASON_BY_CODE = Object.freeze(
  Object.fromEntries(RISK_REASONS.map((reason) => [reason.code, reason])),
);
