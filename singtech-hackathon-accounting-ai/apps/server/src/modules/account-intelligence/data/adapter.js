// Data access for the SingTech AI Account Intelligence module.
//
// One interface, two implementations. The service only ever calls getAdapter() and the methods
// below, so switching from simulated data to Supabase is an environment change, not a code change.
//
//   SUPABASE_URL and SUPABASE_ANON_KEY both set  -> SupabaseAdapter (PLAN step 11)
//   otherwise                                    -> MockAdapter (seed JSON, simulated data)
//
// Every method is async and returns plain rows shaped like docs/account-intelligence/DATA-MODEL.md.
//
//   listAccounts({ market, segment, industry })   business accounts
//   getAccount(id)                                account | null
//   getAccountTree(id)                            { parent, children[] } | null
//   getSites(accountId)
//   getContacts(accountId)
//   getAssets(accountId, { includeHistory })      includeHistory=false drops cancelled services
//   getContracts(accountId)
//   getCases(accountId, { since })                since = ISO date, inclusive
//   getActivities(accountId, { since })
//   getBills(accountId, { months })               latest N monthly bills, oldest first
//   getOpportunities(accountId)
//   findRecord(id)                                { table, row } | null, for evidence links
//   saveHealthScore(row)                          row
//   writeAudit(row)                               void

import { createMockAdapter } from './mock.adapter.js';

export const ADAPTER_METHODS = Object.freeze([
  'listAccounts',
  'getAccount',
  'getAccountTree',
  'getSites',
  'getContacts',
  'getAssets',
  'getContracts',
  'getCases',
  'getActivities',
  'getBills',
  'getOpportunities',
  'findRecord',
  'saveHealthScore',
  'writeAudit',
]);

let mockSingleton = null;

/** True when both Supabase settings are present (non-empty). */
export function hasSupabaseConfig(env = process.env) {
  return Boolean(env.SUPABASE_URL?.trim() && env.SUPABASE_ANON_KEY?.trim());
}

/** Returns the adapter chosen by the environment. */
export function getAdapter(env = process.env) {
  if (hasSupabaseConfig(env)) {
    const error = new Error(
      'Supabase settings are present but the Supabase adapter is not built yet (PLAN step 11). ' +
        'Leave SUPABASE_URL and SUPABASE_ANON_KEY empty to use simulated data.',
    );
    error.code = 'ADAPTER_UNAVAILABLE';
    error.status = 503;
    throw error;
  }
  mockSingleton ??= createMockAdapter();
  return mockSingleton;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "Today" for every rule: DEMO_TODAY when it is a valid YYYY-MM-DD date, otherwise the real
 * local date. The demo pins 2026-11-16 so tenure and runway never drift on stage.
 */
export function resolveToday(env = process.env, now = new Date()) {
  const pinned = env.DEMO_TODAY?.trim();
  if (pinned && ISO_DATE.test(pinned) && !Number.isNaN(Date.parse(pinned))) return pinned;
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
