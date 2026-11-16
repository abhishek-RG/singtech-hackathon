// Ask SingTech AI, rules-based preview. Answers five kinds of questions about one account using the
// same rules and records as the Account page. No language model is called: every sentence is built
// from computed results, every claim cites its source records, and every answer ends with a
// suggested next action. The Phase 2 agent (local model, retrieval) replaces the wording, not the facts.

import { MARKET_BY_CODE, PRODUCT_BY_CODE, RISK_REASON_BY_CODE } from '@singtech/shared';
import { getAdapter, resolveToday } from './data/adapter.js';
import { analyseAccount } from './rules/index.js';
import {
  evidenceLabel,
  getVisibleAccount,
  listAccountBook,
  loadBundle,
} from './account-intelligence.service.js';

export const INTENTS = Object.freeze([
  { code: 'summary', label: 'Account summary' },
  { code: 'why_at_risk', label: 'Why at risk?' },
  { code: 'renewal_plan', label: 'Renewal plan' },
  { code: 'missing', label: 'What are they missing?' },
  { code: 'next_action', label: 'Next best action' },
]);
const INTENT_CODES = INTENTS.map((i) => i.code);

const INTENT_PATTERNS = [
  ['why_at_risk', /\b(risk|why|health|problem|churn|switch|unhappy|leav)/],
  ['renewal_plan', /\b(renew|contract|expir|term)/],
  ['missing', /\b(miss|gap|cross|whitespace|sell|lack|product)/],
  ['next_action', /\b(next|action|talking|recommend|what should|do now)/],
  ['summary', /\b(summar|overview|who is|tell me|about|360|brief)/],
];

const GENERIC_NAME_WORDS = new Set(['pte', 'ltd', 'pvt', 'pty', 'group', 'retail', 'the', 'and']);

const formatSgd = (n) => `SGD ${Math.round(n).toLocaleString('en-SG')}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};
const tenureText = (t) => (t.years ? `${t.years} years ${t.months} months` : `${t.months} months`);
const productList = (codes) => codes.map((c) => PRODUCT_BY_CODE[c]?.name ?? c).join(', ');

export function detectIntent(message = '') {
  const text = message.toLowerCase();
  return INTENT_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

/** Finds an account the message names, among the accounts the viewer can see. */
export function matchAccount(message = '', accounts = []) {
  const text = message.toLowerCase();
  let best = null;
  for (const account of accounts) {
    const words = account.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 5 && !GENERIC_NAME_WORDS.has(w));
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits && (!best || hits > best.hits)) best = { account, hits };
  }
  return best?.account ?? null;
}

/**
 * @param request { account_id?, intent?, message? }
 * @param options { adapter?, today?, viewer }
 */
export async function answerQuestion(request = {}, options = {}) {
  const adapter = options.adapter ?? getAdapter(options.env);
  const today = options.today ?? resolveToday(options.env);
  const viewer = options.viewer ?? null;
  const message = typeof request.message === 'string' ? request.message.slice(0, 500) : '';
  const intent = INTENT_CODES.includes(request.intent) ? request.intent : detectIntent(message);

  let account = null;
  if (request.account_id) {
    account = await getVisibleAccount(adapter, request.account_id, viewer);
    if (!account) return null;
  } else if (message) {
    const visible = (await adapter.listAccounts()).filter((a) => getVisibleSync(a, viewer));
    account = matchAccount(message, visible);
  }

  if (!intent) {
    return {
      intent: null,
      account: account ? { id: account.id, name: account.name } : null,
      blocks: [
        {
          type: 'text',
          text: 'In this preview I answer questions about one account at a time: a summary, why it is at risk, a renewal plan, what it is missing, or the next best action. Pick one below, or name an account in your question.',
        },
      ],
      citations: [],
      next_action: null,
      card: null,
      suggestions: INTENTS.slice(0, 4),
    };
  }

  if (!account) {
    const book = await listAccountBook({}, { adapter, today, viewer });
    return {
      intent,
      account: null,
      blocks: [{ type: 'text', text: 'Which account should I look at?' }],
      citations: [],
      next_action: null,
      card: {
        type: 'pick_account',
        title: 'Pick an account',
        options: book.rows.slice(0, 4).map((r) => ({
          id: r.id,
          name: r.name,
          band: r.health.band,
          score: r.health.score,
        })),
      },
      suggestions: [],
    };
  }

  const bundle = await loadBundle(adapter, account);
  const analysis = analyseAccount(bundle, today);
  const blocks = COMPOSERS[intent](bundle, analysis);
  const action = analysis.next_action;
  blocks.push({
    type: 'action',
    text: `Suggested next action: ${action.label}${action.product_name ? ` (${action.product_name})` : ''}.`,
  });

  const ids = [
    ...new Set(blocks.flatMap((b) => (b.items ?? []).flatMap((i) => i.evidence_ids ?? []))),
  ];
  const citations = [];
  for (const id of ids) {
    const hit = await adapter.findRecord(id);
    if (hit) citations.push({ id, label: evidenceLabel(hit.table, hit.row) });
  }

  await adapter.writeAudit({
    actor_email: viewer?.email ?? 'system',
    action: 'ask_agent',
    account_id: account.id,
    details: { intent, message_length: message.length, mode: 'rules_preview' },
    occurred_at: new Date().toISOString(),
  });

  return {
    intent,
    account: { id: account.id, name: account.name },
    blocks,
    citations,
    next_action: {
      action: action.action,
      label: action.label,
      product_name: action.product_name,
    },
    card: {
      type: 'next_step',
      title: 'Pick a next step',
      options: [
        { kind: 'link', label: 'Open the account page', href: `/accounts/${account.id}` },
        ...(intent === 'next_action'
          ? []
          : [{ kind: 'intent', label: 'Show talking points', intent: 'next_action' }]),
        ...(intent === 'missing'
          ? []
          : [{ kind: 'intent', label: 'What are they missing?', intent: 'missing' }]),
      ],
    },
    suggestions: INTENTS.filter((i) => i.code !== intent && i.code !== 'next_action').slice(0, 3),
  };
}

function getVisibleSync(account, viewer) {
  return (
    account.account_type === 'business' &&
    (!viewer || viewer.role === 'admin' || account.owner_email === viewer.email)
  );
}

const COMPOSERS = {
  summary(bundle, a) {
    const { account } = bundle;
    const owned = a.whitespace.owned;
    const runway = a.contract_runway;
    const activeAssets = bundle.assets.filter((x) => x.status !== 'cancelled');
    const changes = a.changes.events.slice(0, 3);
    const blocks = [
      {
        type: 'text',
        text: `${account.name} is ${account.segment === 'mnc' ? 'an MNC' : 'an enterprise'} customer in ${MARKET_BY_CODE[account.market]?.name ?? account.market} (${account.industry.toLowerCase()}), with Singtel for ${tenureText(a.tenure)}.`,
      },
      {
        type: 'list',
        items: [
          {
            text: `Owns ${owned.length} of 6 products: ${productList(owned)}, worth ${formatSgd(a.revenue.monthly_sgd)} a month.`,
            evidence_ids: activeAssets.map((x) => x.id),
          },
          {
            text: `Health is ${a.health.band.replace('_', ' ')} (${a.health.score} of 100)${a.health.top_reason ? `, mainly ${RISK_REASON_BY_CODE[a.health.top_reason].label.toLowerCase()}` : ''}.`,
            evidence_ids: a.health.reasons
              .filter((r) => r.points < 0)
              .slice(0, 2)
              .flatMap((r) => r.evidence_ids),
          },
          runway
            ? {
                text: `Contract ${runway.contract_number} ends on ${formatDate(runway.end_date)}, in ${runway.days} days.`,
                evidence_ids: [runway.contract_id],
              }
            : { text: 'No active contract end on record.', evidence_ids: [] },
        ],
      },
    ];
    if (changes.length) {
      blocks.push({ type: 'text', text: 'What changed recently:' });
      blocks.push({
        type: 'list',
        items: changes.map((e) => ({
          text: `${formatDate(e.date)}: ${e.label}.`,
          evidence_ids: e.evidence_ids,
        })),
      });
    }
    return blocks;
  },

  why_at_risk(bundle, a) {
    const risks = a.health.reasons.filter((r) => r.points < 0);
    if (a.health.band === 'healthy') {
      const strengths = a.health.reasons.filter((r) => r.points > 0);
      return [
        {
          type: 'text',
          text: `${bundle.account.name} is healthy (${a.health.score} of 100) and not at risk.${risks.length ? ' A few signals are worth watching:' : ''}`,
        },
        ...(risks.length
          ? [
              {
                type: 'list',
                items: risks.map((r) => ({ text: r.label, evidence_ids: r.evidence_ids })),
              },
            ]
          : []),
        ...(strengths.length
          ? [
              { type: 'text', text: 'What is going well:' },
              {
                type: 'list',
                items: strengths.map((r) => ({ text: r.label, evidence_ids: r.evidence_ids })),
              },
            ]
          : []),
      ];
    }
    const reason =
      RISK_REASON_BY_CODE[a.health.top_reason]?.label.toLowerCase() ?? 'several signals';
    return [
      {
        type: 'text',
        text: `${bundle.account.name} is ${a.health.band === 'at_risk' ? 'at risk' : 'on watch'} (${a.health.score} of 100). The main reason is ${reason}. The signals behind the score:`,
      },
      {
        type: 'list',
        items: risks
          .slice(0, 5)
          .map((r) => ({ text: `${r.label} (${r.points} points)`, evidence_ids: r.evidence_ids })),
      },
    ];
  },

  renewal_plan(bundle, a) {
    const runway = a.contract_runway;
    if (!runway) {
      return [
        {
          type: 'text',
          text: `${bundle.account.name} has no active contract end on record, so there is no renewal to plan yet.`,
        },
      ];
    }
    const decider = bundle.contacts.find((c) => !c.left_company && c.role === 'decision_maker');
    const risk = a.health.reasons.filter((r) => r.points < 0).slice(0, 2);
    const gap = a.whitespace.lacked.find((l) => l.product_code === a.whitespace.top_gap);
    const items = [
      {
        text: `Start now: contract ${runway.contract_number} ends on ${formatDate(runway.end_date)}, in ${runway.days} days.`,
        evidence_ids: [runway.contract_id],
      },
      decider
        ? {
            text: `Confirm the decision maker, ${decider.full_name} (${decider.title}), and book a renewal review.`,
            evidence_ids: [decider.id],
          }
        : { text: 'Identify the decision maker before the renewal review.', evidence_ids: [] },
      ...risk.map((r) => ({
        text: `Resolve before the review: ${r.label.toLowerCase()}.`,
        evidence_ids: r.evidence_ids,
      })),
      {
        text: 'Build the value case on total cost, service levels and the bundle they already use, not on price alone.',
        evidence_ids: [],
      },
    ];
    if (gap)
      items.push({
        text: `Add ${gap.product_name} to the renewal scope: ${gap.signals[0].label.toLowerCase()}.`,
        evidence_ids: gap.signals.flatMap((s) => s.evidence_ids),
      });
    return [
      { type: 'text', text: `Renewal plan for ${bundle.account.name}:` },
      { type: 'list', ordered: true, items },
    ];
  },

  missing(bundle, a) {
    const lacked = [...a.whitespace.lacked].sort((x, y) => y.weight - x.weight);
    if (!lacked.length)
      return [{ type: 'text', text: `${bundle.account.name} already uses all six products.` }];
    const withSignal = lacked.filter((l) => l.weight > 0);
    const blocks = [
      {
        type: 'text',
        text: `${bundle.account.name} uses ${a.whitespace.owned_count} of 6 products. ${withSignal.length ? 'These gaps match a signal on the account:' : 'None of the missing products matches a signal yet, so I would grow what they already use.'}`,
      },
    ];
    if (withSignal.length) {
      blocks.push({
        type: 'list',
        items: withSignal.map((l) => ({
          text: `${l.product_name}${l.product_code === a.whitespace.top_gap ? ' (best fit)' : ''}: ${l.signals.map((s) => s.label.toLowerCase()).join('; ')}.`,
          evidence_ids: l.signals.flatMap((s) => s.evidence_ids),
        })),
      });
    }
    const quiet = lacked.filter((l) => l.weight === 0).map((l) => l.product_name);
    if (quiet.length) blocks.push({ type: 'text', text: `No signal yet for ${quiet.join(', ')}.` });
    return blocks;
  },

  next_action(bundle, a) {
    const n = a.next_action;
    return [
      {
        type: 'text',
        text: `For ${bundle.account.name}: ${n.label.toLowerCase()}${n.product_name ? ` with ${n.product_name}` : ''}.${n.contact ? ` Talk to ${n.contact.full_name}, ${n.contact.title}.` : ''}`,
      },
      {
        type: 'list',
        ordered: true,
        items: n.talking_points.map((t) => ({ text: t, evidence_ids: [] })),
      },
    ];
  },
};
