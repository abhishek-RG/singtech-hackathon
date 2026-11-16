// MockAdapter: serves the simulated seed JSON from memory. Same methods and row shapes as the
// SupabaseAdapter (see adapter.js). Rows are copied on the way out so callers cannot mutate the
// in-memory data.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEED_TABLES } from './schema.js';

const SEED_DIR = new URL('./seed/', import.meta.url);

// Tables an evidence id can point at.
const EVIDENCE_TABLES = [
  'cases',
  'assets',
  'contracts',
  'contacts',
  'bills',
  'activities',
  'sites',
  'opportunities',
];

const copy = (value) => structuredClone(value);
const byDate = (column) => (a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0);

function readSeedTable(name) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`${name}.json`, SEED_DIR)), 'utf8'));
}

export function createMockAdapter(
  seed = Object.fromEntries(SEED_TABLES.map((t) => [t, readSeedTable(t)])),
) {
  const tables = Object.fromEntries(SEED_TABLES.map((t) => [t, seed[t] ?? []]));
  const idIndex = new Map();
  for (const table of EVIDENCE_TABLES) {
    for (const row of tables[table]) idIndex.set(row.id, { table, row });
  }
  const accountsById = new Map(tables.accounts.map((a) => [a.id, a]));
  const healthScores = new Map();
  const auditLog = [];

  const forAccount = (table, accountId, column = 'account_id') =>
    tables[table].filter((row) => row[column] === accountId);

  return {
    source: 'mock',

    async listAccounts({ market, segment, industry } = {}) {
      return copy(
        tables.accounts
          .filter((a) => a.account_type === 'business')
          .filter((a) => !market || a.market === market)
          .filter((a) => !segment || a.segment === segment)
          .filter((a) => !industry || a.industry === industry)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    },

    async getAccount(id) {
      const account = accountsById.get(id);
      return account ? copy(account) : null;
    },

    async getAccountTree(id) {
      const account = accountsById.get(id);
      if (!account) return null;
      const parent = account.parent_id ? (accountsById.get(account.parent_id) ?? null) : null;
      const children = tables.accounts
        .filter((a) => a.parent_id === id)
        .sort((a, b) => a.name.localeCompare(b.name));
      return copy({ parent, children });
    },

    async getSites(accountId) {
      return copy(forAccount('sites', accountId).sort(byDate('opened_on')));
    },

    async getContacts(accountId) {
      return copy(forAccount('contacts', accountId));
    },

    async getAssets(accountId, { includeHistory = true } = {}) {
      return copy(
        forAccount('assets', accountId)
          .filter((a) => includeHistory || a.status !== 'cancelled')
          .sort(byDate('start_date')),
      );
    },

    async getContracts(accountId) {
      return copy(forAccount('contracts', accountId).sort(byDate('end_date')));
    },

    async getCases(accountId, { since } = {}) {
      return copy(
        forAccount('cases', accountId)
          .filter((c) => !since || c.opened_on >= since)
          .sort(byDate('opened_on'))
          .reverse(),
      );
    },

    async getActivities(accountId, { since } = {}) {
      return copy(
        forAccount('activities', accountId)
          .filter((a) => !since || a.occurred_on >= since)
          .sort(byDate('occurred_on'))
          .reverse(),
      );
    },

    async getBills(accountId, { months } = {}) {
      const bills = forAccount('bills', accountId, 'billing_account_id').sort(
        byDate('period_start'),
      );
      return copy(months ? bills.slice(-months) : bills);
    },

    async getOpportunities(accountId) {
      return copy(forAccount('opportunities', accountId).sort(byDate('created_on')).reverse());
    },

    async findRecord(id) {
      const hit = idIndex.get(id);
      return hit ? copy(hit) : null;
    },

    async saveHealthScore(row) {
      healthScores.set(row.account_id, copy(row));
      return copy(row);
    },

    async writeAudit(row) {
      auditLog.push(copy(row));
      if (auditLog.length > 500) auditLog.shift();
    },

    // Test and debug helpers, mock only.
    _latestHealthScore: (accountId) => copy(healthScores.get(accountId) ?? null),
    _auditLog: () => copy(auditLog),
  };
}
