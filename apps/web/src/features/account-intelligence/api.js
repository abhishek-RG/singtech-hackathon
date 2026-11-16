// API calls for the SingTech AI Account Intelligence feature, built on lib/api.js.

import { api } from '../../lib/api.js';

const BASE = '/account-intelligence';

export async function getMeta({ signal } = {}) {
  return (await api.get(`${BASE}/meta`, { signal })).data;
}

export async function getAccountBook({ signal } = {}) {
  return (await api.get(`${BASE}/accounts`, { signal })).data;
}

export async function getAccount(id, { signal } = {}) {
  return (await api.get(`${BASE}/accounts/${encodeURIComponent(id)}`, { signal })).data;
}

export async function getEvidence(accountId, evidenceId, { signal } = {}) {
  const path = `${BASE}/accounts/${encodeURIComponent(accountId)}/evidence/${encodeURIComponent(evidenceId)}`;
  return (await api.get(path, { signal })).data;
}

// ---------- Demo sign-in (session lives in an httpOnly cookie) ----------

export async function signIn(email, password) {
  return (await api.post(`${BASE}/auth/login`, { email, password })).data.user;
}

export async function signOut() {
  await api.post(`${BASE}/auth/logout`, {});
}

export async function getCurrentUser({ signal } = {}) {
  return (await api.get(`${BASE}/auth/me`, { signal })).data.user;
}

export async function getDemoAccounts({ signal } = {}) {
  return (await api.get(`${BASE}/auth/demo-accounts`, { signal })).data.accounts;
}

// ---------- Ask SingTech AI (rules-based preview) ----------

export async function askAssistant({ accountId, intent, message }, { signal } = {}) {
  const body = {};
  if (accountId) body.account_id = accountId;
  if (intent) body.intent = intent;
  if (message) body.message = message;
  return (await api.post(`${BASE}/assistant`, body, { signal })).data;
}
