// SingTech AI Account Intelligence service: loads an account's records through the adapter,
// runs the rules, and shapes the responses for the Account book and the Account page.
// No req/res here; routes call these functions.

import { PRODUCTS } from '@singtech/shared';
import { canView } from './auth/auth.service.js';
import { getAdapter, resolveToday } from './data/adapter.js';
import { analyseAccount, loadRulesConfig } from './rules/index.js';
import { assetTenure, daysBetween } from './rules/tenure.js';

// Every function takes options.viewer (the signed-in user). Routes always pass it. Admins see every
// account; account managers see only the accounts they own. Without a viewer (tests, scripts) all
// accounts are visible.

export async function loadBundle(adapter, account) {
  const id = account.id;
  const [sites, contacts, assets, contracts, cases, activities, bills, opportunities] =
    await Promise.all([
      adapter.getSites(id),
      adapter.getContacts(id),
      adapter.getAssets(id),
      adapter.getContracts(id),
      adapter.getCases(id),
      adapter.getActivities(id),
      adapter.getBills(id, { months: 12 }),
      adapter.getOpportunities(id),
    ]);
  return { account, sites, contacts, assets, contracts, cases, activities, bills, opportunities };
}

function context({ adapter, today, env, viewer } = {}) {
  return {
    adapter: adapter ?? getAdapter(env),
    today: today ?? resolveToday(env),
    viewer: viewer ?? null,
  };
}

/** The account if it exists, is a business account and the viewer may see it, else null. */
export async function getVisibleAccount(adapter, id, viewer) {
  const account = await adapter.getAccount(id);
  if (!account || account.account_type !== 'business' || !canView(viewer, account)) return null;
  return account;
}

export async function getMeta(options = {}) {
  const { adapter, today } = context(options);
  return {
    source: adapter.source,
    simulated: adapter.source === 'mock',
    rules_version: loadRulesConfig().version,
    today,
    products: PRODUCTS,
  };
}

/** Account book rows: every existing business account, sorted by revenue at stake. */
export async function listAccountBook(filters = {}, options = {}) {
  const { adapter, today, viewer } = context(options);
  const accounts = (
    await adapter.listAccounts({
      market: filters.market,
      segment: filters.segment,
      industry: filters.industry,
    })
  ).filter((account) => canView(viewer, account));
  const names = new Map((await adapter.listAccounts()).map((a) => [a.id, a.name]));

  const rows = [];
  for (const account of accounts) {
    const bundle = await loadBundle(adapter, account);
    const analysis = analyseAccount(bundle, today);
    if (filters.band && analysis.health.band !== filters.band) continue;
    await adapter.saveHealthScore(healthRow(account.id, analysis));
    rows.push({
      id: account.id,
      name: account.name,
      parent_id: account.parent_id,
      parent_name: account.parent_id ? (names.get(account.parent_id) ?? null) : null,
      segment: account.segment,
      industry: account.industry,
      market: account.market,
      country: account.country,
      owner_name: account.owner_name,
      health: {
        score: analysis.health.score,
        band: analysis.health.band,
        top_reason: analysis.health.top_reason,
      },
      products_owned: analysis.whitespace.owned_count,
      products_total: analysis.whitespace.total_products,
      monthly_sgd: analysis.revenue.monthly_sgd,
      arr_sgd: analysis.revenue.arr_sgd,
      revenue_at_stake_sgd: analysis.revenue.revenue_at_stake_sgd,
      tenure: analysis.tenure,
      contract_runway: analysis.contract_runway,
      top_gap: analysis.whitespace.top_gap,
      next_action: {
        action: analysis.next_action.action,
        label: analysis.next_action.label,
        product_code: analysis.next_action.product_code,
      },
    });
  }

  rows.sort((a, b) => b.revenue_at_stake_sgd - a.revenue_at_stake_sgd || b.arr_sgd - a.arr_sgd);
  return { today, rows };
}

/** The full Account page bundle, or null when the account does not exist. */
export async function getAccountDetail(id, options = {}) {
  const { adapter, today, viewer } = context(options);
  const account = await getVisibleAccount(adapter, id, viewer);
  if (!account) return null;

  const bundle = await loadBundle(adapter, account);
  const analysis = analyseAccount(bundle, today);
  const tree = await adapter.getAccountTree(id);
  await adapter.saveHealthScore(healthRow(id, analysis));
  await adapter.writeAudit({
    actor_email: viewer?.email ?? 'system',
    action: 'view_account',
    account_id: id,
    details: { rules_version: analysis.rules_version },
    occurred_at: new Date().toISOString(),
  });

  return {
    simulated: adapter.source === 'mock',
    account,
    parent: tree.parent
      ? { ...pick(tree.parent, ['id', 'name', 'market']), visible: canView(viewer, tree.parent) }
      : null,
    children: tree.children.map((c) => ({
      ...pick(c, ['id', 'name', 'market']),
      visible: canView(viewer, c),
    })),
    sites: bundle.sites,
    contacts: bundle.contacts,
    assets: bundle.assets.map((a) => ({ ...a, tenure: assetTenure(a, today) })),
    contracts: bundle.contracts.map((c) => ({ ...c, days_to_end: daysBetween(today, c.end_date) })),
    cases: bundle.cases,
    activities: bundle.activities,
    opportunities: bundle.opportunities,
    bills: {
      months: bundle.bills.map((b) =>
        pick(b, ['id', 'bill_number', 'period_start', 'period_end', 'amount_sgd', 'status']),
      ),
      trend: analysis.changes.spend_trend,
    },
    ...analysis,
  };
}

/** One source record behind an evidence link, scoped to the account it belongs to. */
export async function getEvidence(accountId, evidenceId, options = {}) {
  const { adapter, viewer } = context(options);
  if (!(await getVisibleAccount(adapter, accountId, viewer))) return null;
  const hit = await adapter.findRecord(evidenceId);
  if (!hit) return null;
  const owner = hit.row.account_id ?? hit.row.billing_account_id;
  if (owner !== accountId) return null;
  return { table: hit.table, label: evidenceLabel(hit.table, hit.row), row: hit.row };
}

export function evidenceLabel(table, row) {
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
      return `${row.subject} (${row.occurred_on})`;
    case 'sites':
      return `Site: ${row.name}`;
    case 'opportunities':
      return `Opportunity: ${row.name}`;
    default:
      return row.id;
  }
}

export function healthRow(accountId, analysis) {
  return {
    account_id: accountId,
    computed_at: new Date().toISOString(),
    score: analysis.health.score,
    band: analysis.health.band,
    reasons: analysis.health.reasons,
    revenue_at_stake_sgd: analysis.revenue.revenue_at_stake_sgd,
    rules_version: analysis.rules_version,
  };
}

function pick(row, keys) {
  return Object.fromEntries(keys.map((k) => [k, row[k]]));
}
