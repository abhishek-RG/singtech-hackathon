// Date helpers, tenure and contract runway. Pure functions over ISO dates (YYYY-MM-DD, UTC).

const DAY_MS = 86_400_000;

const toTime = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso, toIso) {
  return Math.round((toTime(toIso) - toTime(fromIso)) / DAY_MS);
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** True when `iso` is on or before `today` and no more than `days` before it. */
export function isWithinDays(iso, today, days) {
  if (!iso) return false;
  const age = daysBetween(iso, today);
  return age >= 0 && age <= days;
}

/** Calendar years and months between two dates, counting only completed months. */
export function yearsAndMonths(fromIso, toIso) {
  const a = new Date(`${fromIso}T00:00:00Z`);
  const b = new Date(`${toIso}T00:00:00Z`);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12, total_months: months };
}

export function tenureSince(sinceIso, today) {
  return { since: sinceIso, ...yearsAndMonths(sinceIso, today) };
}

/** Customer tenure: `customer_since`, else the earliest service start. */
export function accountTenure(account, assets, today) {
  const earliest = assets
    .map((a) => a.start_date)
    .filter(Boolean)
    .sort()[0];
  const since = account.customer_since ?? earliest ?? null;
  return since ? tenureSince(since, today) : null;
}

/** Tenure of one service; a cancelled service stops counting at its end date. */
export function assetTenure(asset, today) {
  const until = asset.end_date && asset.end_date < today ? asset.end_date : today;
  return tenureSince(asset.start_date, until);
}

/** The nearest contract end on or after today. */
export function contractRunway(contracts, today) {
  const next = contracts
    .filter((c) => c.end_date >= today && c.status !== 'renewed' && c.status !== 'expired')
    .sort((a, b) => (a.end_date < b.end_date ? -1 : 1))[0];
  if (!next) return null;
  const days = daysBetween(today, next.end_date);
  return {
    contract_id: next.id,
    contract_number: next.contract_number,
    end_date: next.end_date,
    days,
    months: Math.round((days / 30.44) * 10) / 10,
  };
}
