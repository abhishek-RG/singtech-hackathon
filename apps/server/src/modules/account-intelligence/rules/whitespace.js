// Whitespace: which of the six products an account lacks, and which signal makes each one
// relevant. A lacked product with no signal is listed but never recommended.

import { PRODUCTS } from '@singtech/shared';
import { isWithinDays } from './tenure.js';

const SERVICE_CATEGORIES = new Set(['outage', 'performance']);

export function computeWhitespace(bundle, today, config) {
  const { account, sites, assets, cases, activities } = bundle;
  const WS = config.whitespace;
  const W = WS.weights;
  const owned = new Set(assets.filter((a) => a.status !== 'cancelled').map((a) => a.product_code));
  const operationalSites = sites.filter((s) => WS.operational_site_types.includes(s.site_type));
  const operationalIds = new Set(operationalSites.map((s) => s.id));
  const offNetSites = sites.filter((s) => s.on_net === false);
  const offNetIds = new Set(offNetSites.map((s) => s.id));
  const recentActivities = activities.filter((a) =>
    isWithinDays(a.occurred_on, today, config.windows.change_days),
  );

  const signalsFor = (code) => {
    const signals = [];
    const add = (label, weight, evidenceIds) =>
      signals.push({ label, weight, evidence_ids: evidenceIds });

    if (code === '5G_PLUS' || code === 'IOT') {
      if (operationalSites.length) {
        add(
          `${operationalSites.length} plant or warehouse site${operationalSites.length > 1 ? 's' : ''}`,
          W.site_fit,
          operationalSites.map((s) => s.id),
        );
      }
    }
    // Incidents on the Singtel network point to a resilient second path (5G+). Incidents at sites
    // off the network point to extending the network there first (Singtel CUBΣ).
    const recentIncidents = cases.filter(
      (c) =>
        SERVICE_CATEGORIES.has(c.category) &&
        isWithinDays(c.opened_on, today, config.windows.case_days),
    );
    if (code === '5G_PLUS') {
      const onNet = recentIncidents.filter(
        (c) => operationalIds.has(c.site_id) && !offNetIds.has(c.site_id),
      );
      if (onNet.length) {
        add(
          `${onNet.length} service incidents at operational sites in ${config.windows.case_days} days`,
          W.outage_fit,
          onNet.map((c) => c.id),
        );
      }
    }
    if (code === 'CUBE' && offNetSites.length) {
      add(
        `${offNetSites.length} site${offNetSites.length > 1 ? 's' : ''} off the Singtel network`,
        W.off_net,
        offNetSites.map((s) => s.id),
      );
      const offNet = recentIncidents.filter((c) => offNetIds.has(c.site_id));
      if (offNet.length) {
        add(
          `${offNet.length} service incidents at off-network sites in ${config.windows.case_days} days`,
          W.outage_fit,
          offNet.map((c) => c.id),
        );
      }
    }
    if (code === 'IOT') {
      const removed = assets.filter(
        (a) =>
          a.product_code === 'IOT' &&
          a.change_type === 'removed' &&
          isWithinDays(a.changed_on, today, config.windows.change_days),
      );
      if (removed.length)
        add(
          'IoT was removed recently and can be won back',
          W.recently_removed,
          removed.map((a) => a.id),
        );
    }
    if (code === 'CYBER' && WS.regulated_industries.includes(account.industry)) {
      add(`${account.industry} is a regulated industry`, W.industry_fit, []);
    }
    if (code === 'QSN') {
      if (WS.quantum_safe_industries.includes(account.industry)) {
        add(`${account.industry} holds long-lived sensitive data`, W.industry_fit, []);
      }
      const dataCentres = sites.filter((s) => s.site_type === 'data_centre');
      if (dataCentres.length)
        add(
          'Runs its own data centre links',
          W.site_fit,
          dataCentres.map((s) => s.id),
        );
    }
    if (code === 'MOBILITY') {
      add(`Workforce of ${account.employee_band} without enterprise mobile`, W.workforce_fit, []);
    }

    const keywords = WS.interest_keywords[code] ?? [];
    const interested = recentActivities.filter((a) => {
      const text = `${a.subject} ${a.outcome} ${a.notes}`.toLowerCase();
      return keywords.some((k) => text.includes(k));
    });
    if (interested.length) {
      add(
        'Customer raised it in a recent conversation',
        W.stated_interest,
        interested.map((a) => a.id),
      );
    }
    return signals;
  };

  const lacked = PRODUCTS.filter((p) => !owned.has(p.code)).map((p) => {
    const signals = signalsFor(p.code);
    return {
      product_code: p.code,
      product_name: p.name,
      positioning: p.positioning,
      weight: signals.reduce((sum, s) => sum + s.weight, 0),
      signals,
    };
  });

  const ranked = lacked
    .filter((l) => l.weight > 0)
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        PRODUCTS.findIndex((p) => p.code === a.product_code) -
          PRODUCTS.findIndex((p) => p.code === b.product_code),
    );

  const competitorMentions = cases
    .filter(
      (c) => c.mentions_competitor && isWithinDays(c.opened_on, today, config.windows.change_days),
    )
    .map((c) => ({
      alias: c.competitor_alias,
      case_id: c.id,
      case_number: c.case_number,
      opened_on: c.opened_on,
    }));

  return {
    owned: PRODUCTS.filter((p) => owned.has(p.code)).map((p) => p.code),
    owned_count: owned.size,
    total_products: PRODUCTS.length,
    lacked,
    top_gap: ranked[0]?.product_code ?? null,
    competitor_mentions: competitorMentions,
  };
}
