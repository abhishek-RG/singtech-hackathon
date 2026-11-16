// Health score 0 to 100 with reasons. Starts at 100, subtracts weighted penalties and adds small
// credits from rules config. Every reason names the records it came from (evidence_ids).
// No AI is involved: the same data and config always give the same score.

import { CONTACT_ROLE_BY_CODE, RISK_REASONS } from '@singtech/shared';
import { contractRunway, daysBetween, isWithinDays } from './tenure.js';

const SEVERE = new Set(['high', 'critical']);
const SERVICE_CATEGORIES = new Set(['outage', 'performance']);
const KEY_ROLES = new Set(['champion', 'decision_maker']);
const RISK_REASON_CODES = RISK_REASONS.map((r) => r.code);

/** Which risk reason a case points to, from its text, its site and its category. */
export function classifyCase(c, sitesById, config) {
  const text = `${c.subject} ${c.description}`.toLowerCase();
  if (config.case_keywords.price_perception.some((k) => text.includes(k)))
    return 'price_perception';
  if (config.case_keywords.partial_move.some((k) => text.includes(k))) return 'partial_move';
  const site = c.site_id ? sitesById.get(c.site_id) : null;
  if (site && site.on_net === false) return 'coverage_gap';
  return 'service_issues';
}

export function bandFor(score, config) {
  if (score >= config.bands.healthy) return 'healthy';
  if (score >= config.bands.watch) return 'watch';
  return 'at_risk';
}

/**
 * @param bundle   { account, sites, contacts, assets, contracts, cases, activities, opportunities }
 * @param today    ISO date
 * @param config   rules config for the account's industry
 * @param context  { spendTrend } from changes.js
 */
export function computeHealth(bundle, today, config, { spendTrend } = {}) {
  const { sites, contacts, assets, contracts, cases, activities, opportunities } = bundle;
  const P = config.penalties;
  const caps = config.caps;
  const W = config.windows;
  const sitesById = new Map(sites.map((s) => [s.id, s]));
  const used = {};
  const reasons = [];

  const penalise = (code, label, reason, points, evidenceIds) => {
    const cap = caps[code] ?? Infinity;
    const allowed = Math.min(points, cap - (used[code] ?? 0));
    if (allowed <= 0) return;
    used[code] = (used[code] ?? 0) + allowed;
    reasons.push({ code, label, reason, points: -allowed, evidence_ids: evidenceIds });
  };
  const credit = (code, label, points, evidenceIds) => {
    reasons.push({ code, label, reason: 'strength', points, evidence_ids: evidenceIds });
  };

  // Cases: severity, satisfaction, competitor mentions, complaints, off-network sites.
  for (const c of cases) {
    const age = daysBetween(c.opened_on, today);
    if (age < 0) continue;
    const reason = classifyCase(c, sitesById, config);
    const site = c.site_id ? sitesById.get(c.site_id) : null;
    if (SEVERE.has(c.severity) && age <= W.case_days) {
      penalise(
        'severe_case',
        `${capitalise(c.severity)} ${c.category} case ${c.case_number}`,
        reason,
        P.severe_case,
        [c.id],
      );
    }
    if (c.csat !== null && c.csat <= P.low_satisfaction_max_csat && age <= W.change_days) {
      penalise(
        'low_satisfaction',
        `Satisfaction ${c.csat} of 5 on case ${c.case_number}`,
        reason,
        P.low_satisfaction,
        [c.id],
      );
    }
    if (c.mentions_competitor && age <= W.change_days) {
      penalise(
        'competitor_mention',
        `${c.competitor_alias} mentioned in case ${c.case_number}`,
        reason,
        P.competitor_mention,
        [c.id],
      );
    }
    if (c.category === 'complaint' && age <= W.change_days) {
      penalise('complaint', `Complaint: ${c.subject}`, reason, P.complaint, [c.id]);
    }
    if (site && site.on_net === false && SERVICE_CATEGORIES.has(c.category) && age <= W.case_days) {
      penalise(
        'off_net_site_case',
        `${capitalise(c.category)} case at off-network site ${site.name}`,
        'coverage_gap',
        P.off_net_site_case,
        [c.id, site.id],
      );
    }
  }

  // Services removed or downgraded inside the change window.
  for (const a of assets) {
    if (!isWithinDays(a.changed_on, today, W.change_days)) continue;
    if (a.change_type === 'removed') {
      penalise('service_removed', `${a.product_name} removed`, 'partial_move', P.service_removed, [
        a.id,
      ]);
    } else if (a.change_type === 'downgraded') {
      penalise(
        'service_downgraded',
        `${a.product_name} downgraded`,
        'partial_move',
        P.service_downgraded,
        [a.id],
      );
    }
  }

  if (spendTrend?.direction === 'down') {
    penalise(
      'spend_decline',
      `Spend down ${Math.abs(spendTrend.pct)}% over ${spendTrend.months} months`,
      'partial_move',
      P.spend_decline,
      spendTrend.evidence_ids,
    );
  }

  // Relationship: key contacts leaving, and time since the last meeting or business review.
  for (const c of contacts) {
    if (c.left_company && KEY_ROLES.has(c.role) && isWithinDays(c.left_on, today, W.change_days)) {
      const role = CONTACT_ROLE_BY_CODE[c.role].label.toLowerCase();
      penalise(
        'champion_left',
        `${c.full_name}, ${role}, left the company`,
        'relationship',
        P.champion_left,
        [c.id],
      );
    }
  }
  const meetings = activities
    .filter((a) => a.activity_type === 'meeting' || a.activity_type === 'qbr')
    .filter((a) => a.occurred_on <= today)
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1));
  const lastMeeting = meetings[0] ?? null;
  const daysSinceMeeting = lastMeeting ? daysBetween(lastMeeting.occurred_on, today) : null;
  if (daysSinceMeeting === null || daysSinceMeeting > W.stale_meeting_days) {
    const label = lastMeeting ? `No meeting in ${daysSinceMeeting} days` : 'No meeting on record';
    penalise(
      'no_recent_meeting',
      label,
      'relationship',
      P.no_recent_meeting,
      lastMeeting ? [lastMeeting.id] : [],
    );
  }

  // Coverage: new sites opened off the Singtel network.
  for (const s of sites) {
    if (s.on_net === false && isWithinDays(s.opened_on, today, W.new_site_days)) {
      penalise(
        'off_net_site',
        `New site off the Singtel network: ${s.name}`,
        'coverage_gap',
        P.off_net_site,
        [s.id],
      );
    }
  }

  // Renewal exposure: contract ending soon with no open renewal opportunity.
  const runway = contractRunway(contracts, today);
  const openRenewal = opportunities.some(
    (o) => o.opportunity_type === 'renewal' && o.stage !== 'won' && o.stage !== 'lost',
  );
  if (runway && runway.days <= W.renewal_days && !openRenewal) {
    penalise(
      'renewal_without_opportunity',
      `Contract ${runway.contract_number} ends in ${runway.days} days with no renewal opportunity`,
      'renewal_exposure',
      P.renewal_without_opportunity,
      [runway.contract_id],
    );
  }

  // Credits.
  const C = config.credits;
  const lastQbr = meetings.find((a) => a.activity_type === 'qbr');
  if (lastQbr && isWithinDays(lastQbr.occurred_on, today, W.recent_qbr_days)) {
    credit(
      'recent_qbr',
      `Business review ${daysBetween(lastQbr.occurred_on, today)} days ago`,
      C.recent_qbr,
      [lastQbr.id],
    );
  }
  if (spendTrend?.direction === 'up') {
    credit(
      'spend_growth',
      `Spend up ${spendTrend.pct}% over ${spendTrend.months} months`,
      C.spend_growth,
      spendTrend.evidence_ids,
    );
  }
  let growthCredit = 0;
  for (const a of assets) {
    if (
      (a.change_type === 'added' || a.change_type === 'upgraded') &&
      isWithinDays(a.changed_on, today, W.change_days)
    ) {
      const points = Math.min(C.service_growth, C.service_growth_cap - growthCredit);
      if (points <= 0) break;
      growthCredit += points;
      credit('service_growth', `${a.product_name} ${a.change_type}`, points, [a.id]);
    }
  }

  const total = reasons.reduce((sum, r) => sum + r.points, 0);
  const score = Math.max(0, Math.min(100, 100 + total));
  const band = bandFor(score, config);

  const reasonTotals = Object.fromEntries(RISK_REASON_CODES.map((code) => [code, 0]));
  for (const r of reasons)
    if (r.points < 0 && r.reason in reasonTotals) reasonTotals[r.reason] += -r.points;
  let topReason = null;
  if (band !== 'healthy') {
    for (const code of RISK_REASON_CODES) {
      if (
        reasonTotals[code] > 0 &&
        (topReason === null || reasonTotals[code] > reasonTotals[topReason])
      ) {
        topReason = code;
      }
    }
  }

  reasons.sort((a, b) => a.points - b.points || a.code.localeCompare(b.code));
  return {
    score,
    band,
    top_reason: topReason,
    reason_totals: reasonTotals,
    reasons,
    days_since_meeting: daysSinceMeeting,
  };
}

function capitalise(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
