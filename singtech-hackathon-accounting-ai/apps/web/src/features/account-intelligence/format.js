// Display formatting for the SingTech AI Account Intelligence screens. Numbers are computed by
// the API; these helpers only format them.

import {
  ACTION_BY_CODE,
  CONTACT_ROLE_BY_CODE,
  HEALTH_BAND_BY_CODE,
  MARKET_BY_CODE,
  PRODUCT_BY_CODE,
  RISK_REASON_BY_CODE,
  SEGMENTS,
} from '@singtech/shared';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const wholeNumber = new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 });

export const EMPTY = '-';

/** 414000 -> "SGD 414,000" */
export function formatSgd(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return `SGD ${wholeNumber.format(Math.round(value))}`;
}

/** 414000 -> "414,000" (for columns whose header already says SGD) */
export function formatAmount(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return wholeNumber.format(Math.round(value));
}

/** 2027-04-30 -> "30 Apr 2027" */
export function formatDate(iso) {
  if (!iso) return EMPTY;
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** { years: 10, months: 7 } -> "10 y 7 m" */
export function formatTenure(tenure) {
  if (!tenure) return EMPTY;
  if (tenure.years === 0) return `${tenure.months} m`;
  return `${tenure.years} y ${tenure.months} m`;
}

/** 60 -> "in 60 days" */
export function formatRunway(days) {
  if (days === null || days === undefined) return EMPTY;
  if (days === 0) return 'today';
  if (days === 1) return 'in 1 day';
  return `in ${wholeNumber.format(days)} days`;
}

export const bandLabel = (band) => HEALTH_BAND_BY_CODE[band]?.label ?? band;
export const reasonLabel = (reason) => RISK_REASON_BY_CODE[reason]?.label ?? null;
export const productName = (code) => (code ? (PRODUCT_BY_CODE[code]?.name ?? code) : null);
export const marketName = (code) => MARKET_BY_CODE[code]?.name ?? code;
export const actionLabel = (code) => ACTION_BY_CODE[code]?.label ?? code;
export const roleLabel = (code) => CONTACT_ROLE_BY_CODE[code]?.label ?? code;
export const segmentLabel = (code) => SEGMENTS.find((s) => s.code === code)?.label ?? code;

/** "service_request" -> "Service request" */
export function humanise(value) {
  if (value === null || value === undefined || value === '') return EMPTY;
  const text = String(value).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "12" -> "+12", "-12" stays. Used for health points. */
export const signedPoints = (points) => (points > 0 ? `+${points}` : String(points));

/** Readable label for a source record, matching the API's evidence labels. */
export function recordLabel(table, row) {
  switch (table) {
    case 'cases':
      return `Case ${row.case_number}`;
    case 'assets':
      return `Service: ${row.product_name}`;
    case 'contracts':
      return `Contract ${row.contract_number}`;
    case 'contacts':
      return `Contact: ${row.full_name}`;
    case 'bills':
      return `Bill ${row.bill_number}`;
    case 'activities':
      return `${humanise(row.activity_type)} on ${formatDate(row.occurred_on)}`;
    case 'sites':
      return `Site: ${row.name}`;
    case 'opportunities':
      return `Opportunity: ${row.name}`;
    default:
      return 'Source record';
  }
}

/** id -> { table, label } for every record in an Account page bundle. */
export function buildEvidenceIndex(detail) {
  const index = new Map();
  if (!detail) return index;
  const add = (table, rows) =>
    rows.forEach((row) => index.set(row.id, { table, label: recordLabel(table, row) }));
  add('cases', detail.cases);
  add('assets', detail.assets);
  add('contracts', detail.contracts);
  add('contacts', detail.contacts);
  add('activities', detail.activities);
  add('sites', detail.sites);
  add('opportunities', detail.opportunities);
  add('bills', detail.bills.months);
  return index;
}
