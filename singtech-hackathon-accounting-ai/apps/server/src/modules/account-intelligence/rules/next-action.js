// Next best action: a decision tree that routes every account to exactly one action.
//
//   1. Is the account at risk or on watch?   yes -> action for the top reason (config)
//   2. Does a renewal fall inside the window? yes -> renewal with value case
//   3. Is a product missing with a signal?    yes -> cross-sell that product
//   4. Has the relationship gone quiet?       yes -> executive meeting
//                                             no  -> upsell what they already buy
//
// No branch ends in a discount. A price perception reason routes to a value case.

import { ACTION_BY_CODE, PRODUCT_BY_CODE, RISK_REASON_BY_CODE } from '@singtech/shared';

export function decideNextAction(bundle, analysis, config) {
  const { account, contacts, assets } = bundle;
  const { health, whitespace, runway } = analysis;
  const tree = config.decision_tree;
  const path = [];
  let action;
  let productCode = null;

  const atRisk = health.band !== 'healthy';
  path.push({ question: 'Is the account at risk or on watch?', answer: atRisk ? 'Yes' : 'No' });

  if (atRisk) {
    action = tree.risk_actions[health.top_reason] ?? tree.fallback_risk_action;
    const reasonLabel = RISK_REASON_BY_CODE[health.top_reason]?.label ?? 'Several signals';
    path.push({ question: 'What is the main reason?', answer: reasonLabel });
    // Every protect play carries the strongest gap, so the save conversation also opens growth.
    productCode = whitespace.top_gap;
  } else {
    const renewalSoon = Boolean(runway && runway.days <= config.windows.renewal_days);
    path.push({
      question: 'Does a renewal fall inside the window?',
      answer: renewalSoon ? 'Yes' : 'No',
    });
    if (renewalSoon) {
      action = 'renewal_value_case';
      productCode = whitespace.top_gap;
    } else {
      path.push({
        question: 'Is a product missing with a matching signal?',
        answer: whitespace.top_gap ? 'Yes' : 'No',
      });
      if (whitespace.top_gap) {
        action = 'cross_sell';
        productCode = whitespace.top_gap;
      } else {
        const stale =
          health.days_since_meeting === null ||
          health.days_since_meeting > config.windows.stale_meeting_days;
        path.push({ question: 'Has the relationship gone quiet?', answer: stale ? 'Yes' : 'No' });
        if (stale) {
          action = 'executive_meeting';
        } else {
          action = 'upsell';
          productCode = upsellProduct(assets);
        }
      }
    }
  }

  const meta = ACTION_BY_CODE[action];
  const contact = primaryContact(contacts);
  return {
    action,
    label: meta.label,
    kind: meta.kind,
    product_code: productCode,
    product_name: productCode ? PRODUCT_BY_CODE[productCode].name : null,
    contact: contact
      ? { id: contact.id, full_name: contact.full_name, title: contact.title }
      : null,
    path,
    talking_points: talkingPoints(action, {
      account,
      health,
      whitespace,
      runway,
      productCode,
      contacts,
      assets,
    }),
    draft_message: null,
  };
}

/** The owned product to grow: the latest one added or upgraded, else the largest by value. */
function upsellProduct(assets) {
  const active = assets.filter((a) => a.status !== 'cancelled');
  const grown = active
    .filter((a) => a.change_type === 'added' || a.change_type === 'upgraded')
    .sort((a, b) => (a.changed_on < b.changed_on ? 1 : -1));
  if (grown.length) return grown[0].product_code;
  return (
    [...active].sort((a, b) => b.monthly_value_sgd - a.monthly_value_sgd)[0]?.product_code ?? null
  );
}

function primaryContact(contacts) {
  const current = contacts.filter((c) => !c.left_company);
  return (
    current.find((c) => c.role === 'champion') ??
    current.find((c) => c.role === 'decision_maker') ??
    current[0] ??
    null
  );
}

function talkingPoints(action, ctx) {
  const { account, health, whitespace, runway, productCode, contacts } = ctx;
  const product = productCode ? PRODUCT_BY_CODE[productCode].name : null;
  const gap = productCode ? whitespace.lacked.find((l) => l.product_code === productCode) : null;
  const signal = gap ? [...gap.signals].sort((a, b) => b.weight - a.weight)[0]?.label : undefined;
  const rival = whitespace.competitor_mentions[0]?.alias;
  const reasonsFor = (reason) => health.reasons.filter((r) => r.reason === reason && r.points < 0);

  switch (action) {
    case 'service_recovery': {
      const incidents = health.reasons.filter((r) => r.code === 'severe_case').length;
      return [
        `Acknowledge the ${incidents} severe incidents in the last 90 days and share the root causes.`,
        'Offer a written service recovery plan with named owners and fortnightly reviews.',
        product
          ? `Propose ${product} as a resilient second path for the affected sites (${signal?.toLowerCase()}).`
          : 'Agree the service levels the customer needs before the next review.',
        rival
          ? `${rival} has been asked for an alternative; close the gap before it becomes a tender.`
          : null,
      ].filter(Boolean);
    }
    case 'renewal_value_case': {
      const ending = runway
        ? `Contract ${runway.contract_number} ends in ${runway.days} days.`
        : 'Renewal is approaching.';
      if (health.top_reason === 'partial_move') {
        const removed = reasonsFor('partial_move').find((r) => r.code === 'service_removed');
        return [
          ending,
          removed
            ? `Understand why ${removed.label.replace(/ removed$/, '')} moved and what it would take to win it back.`
            : 'Understand which services are moving and why.',
          rival
            ? `${rival} is shortlisted. Lead with total value across the bundle, not a single line item.`
            : 'Lead with total value across the bundle.',
          product
            ? `Bring ${product} back into the renewal scope with a clear service commitment.`
            : null,
        ].filter(Boolean);
      }
      return [
        ending,
        `Build a value case for ${account.name}: total cost, service levels and the bundle they already use.`,
        rival
          ? `Answer the ${rival} comparison with like-for-like scope, not price alone.`
          : 'Anchor the conversation on outcomes, not price alone.',
        product ? `Add ${product} to the renewal scope (${signal?.toLowerCase()}).` : null,
      ].filter(Boolean);
    }
    case 'stakeholder_remap': {
      const left = contacts.find((c) => c.left_company);
      const decider = contacts.find((c) => !c.left_company && c.role === 'decision_maker');
      return [
        left
          ? `${left.full_name} left on ${formatDate(left.left_on)}. The account has no active champion.`
          : 'The account has no active champion.',
        decider
          ? `Ask ${decider.full_name} for an introduction to the new technology lead.`
          : 'Identify the new technology lead.',
        'Book an executive meeting within 30 days to reset the relationship.',
        product ? `Use ${product} as the conversation opener (${signal?.toLowerCase()}).` : null,
      ].filter(Boolean);
    }
    case 'cross_sell':
      return [
        `${account.name} does not use ${product} today.`,
        `Why now: ${signal ? signal.charAt(0).toLowerCase() + signal.slice(1) : 'it matches their profile'}.`,
        `Propose a scoped ${product} pilot with a named sponsor and success measures.`,
      ];
    case 'upsell':
      return [
        `${account.name} is healthy, with ${whitespace.owned_count} of ${whitespace.total_products} products.`,
        product
          ? `Extend ${product}: it is the service they have grown most recently.`
          : 'Extend the services they already rely on.',
        'Agree expansion volumes and timing at the next business review.',
      ];
    case 'executive_meeting':
    default:
      return [
        'The relationship has gone quiet.',
        'Book an executive meeting to review priorities for the next twelve months.',
        'Bring a short account review: services, tenure and what has changed.',
      ];
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2026-08-12 -> 12 Aug 2026 */
function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}
