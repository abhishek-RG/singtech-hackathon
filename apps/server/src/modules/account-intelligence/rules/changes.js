// Change detection: what changed on an account inside the configured window, newest first.
// Every event carries the ids of the records it came from.

import { CONTACT_ROLE_BY_CODE } from '@singtech/shared';
import { daysBetween, isWithinDays } from './tenure.js';

const SEVERE = new Set(['high', 'critical']);
const round1 = (n) => Math.round(n * 10) / 10;

/** Spend over the last N monthly bills against the N before them. */
export function spendTrend(bills, config) {
  const n = config.spend.trend_months;
  const sorted = [...bills].sort((a, b) => (a.period_start < b.period_start ? -1 : 1));
  if (sorted.length < n * 2) return null;
  const last = sorted.slice(-n);
  const prior = sorted.slice(-n * 2, -n);
  const sum = (rows) => rows.reduce((total, b) => total + b.amount_sgd, 0);
  const lastSgd = Math.round(sum(last) * 100) / 100;
  const priorSgd = Math.round(sum(prior) * 100) / 100;
  const pct = priorSgd > 0 ? round1((lastSgd / priorSgd - 1) * 100) : 0;
  const direction =
    pct <= -config.spend.decline_pct ? 'down' : pct >= config.spend.growth_pct ? 'up' : 'flat';
  return {
    months: n,
    last_sgd: lastSgd,
    prior_sgd: priorSgd,
    pct,
    direction,
    as_of: last.at(-1).period_end,
    evidence_ids: last.map((b) => b.id),
  };
}

export function detectChanges(bundle, today, config) {
  const { sites, contacts, assets, cases, bills } = bundle;
  const windowDays = config.windows.change_days;
  const caseDays = config.windows.case_days;
  const inWindow = (iso) => isWithinDays(iso, today, windowDays);
  const events = [];
  const push = (event) => events.push({ direction: 'neutral', ...event });

  for (const a of assets) {
    if (!a.change_type || !inWindow(a.changed_on)) continue;
    const verb = {
      added: 'added',
      upgraded: 'upgraded',
      downgraded: 'downgraded',
      removed: 'removed',
    }[a.change_type];
    push({
      date: a.changed_on,
      type: `service_${a.change_type}`,
      label: `${a.product_name} ${verb}`,
      direction:
        a.change_type === 'added' || a.change_type === 'upgraded' ? 'positive' : 'negative',
      from_sgd: a.previous_monthly_value_sgd,
      to_sgd: a.monthly_value_sgd,
      evidence_ids: [a.id],
    });
  }

  for (const s of sites) {
    if (inWindow(s.opened_on)) {
      push({
        date: s.opened_on,
        type: 'site_opened',
        label: s.on_net ? `New site: ${s.name}` : `New site off the Singtel network: ${s.name}`,
        direction: s.on_net ? 'positive' : 'negative',
        evidence_ids: [s.id],
      });
    }
    if (inWindow(s.closed_on)) {
      push({
        date: s.closed_on,
        type: 'site_closed',
        label: `Site closed: ${s.name}`,
        direction: 'negative',
        evidence_ids: [s.id],
      });
    }
  }

  for (const c of contacts) {
    if (!c.left_company || !inWindow(c.left_on)) continue;
    const role = CONTACT_ROLE_BY_CODE[c.role]?.label ?? c.role;
    push({
      date: c.left_on,
      type: 'contact_left',
      label: `${c.full_name} (${role.toLowerCase()}) left the company`,
      direction: 'negative',
      evidence_ids: [c.id],
    });
  }

  for (const c of cases) {
    if (!c.mentions_competitor || !inWindow(c.opened_on)) continue;
    push({
      date: c.opened_on,
      type: 'competitor_mentioned',
      label: `${c.competitor_alias} mentioned in case ${c.case_number}`,
      direction: 'negative',
      evidence_ids: [c.id],
    });
  }

  const severe = cases.filter((c) => SEVERE.has(c.severity));
  const recent = severe.filter((c) => isWithinDays(c.opened_on, today, caseDays));
  const previous = severe.filter((c) => {
    const age = daysBetween(c.opened_on, today);
    return age > caseDays && age <= caseDays * 2;
  });
  if (recent.length >= 2 && recent.length > previous.length) {
    push({
      date: recent
        .map((c) => c.opened_on)
        .sort()
        .at(-1),
      type: 'severe_cases_rising',
      label: `${recent.length} severe cases in ${caseDays} days (${previous.length} in the ${caseDays} days before)`,
      direction: 'negative',
      evidence_ids: recent.map((c) => c.id),
    });
  }

  const trend = spendTrend(bills, config);
  if (trend && trend.direction !== 'flat') {
    push({
      date: trend.as_of,
      type: trend.direction === 'down' ? 'spend_down' : 'spend_up',
      label: `Spend ${trend.direction} ${Math.abs(trend.pct)}% over ${trend.months} months`,
      direction: trend.direction === 'down' ? 'negative' : 'positive',
      evidence_ids: trend.evidence_ids,
    });
  }

  events.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.type.localeCompare(b.type),
  );
  return { window_days: windowDays, events, spend_trend: trend };
}
