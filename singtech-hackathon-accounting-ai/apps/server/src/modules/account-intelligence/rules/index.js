// Runs every rule for one account. Numbers come from code and config only; AI is never used here.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detectChanges } from './changes.js';
import { computeHealth } from './health.js';
import { decideNextAction } from './next-action.js';
import { revenueAtStake } from './revenue-at-stake.js';
import { accountTenure, contractRunway } from './tenure.js';
import { computeWhitespace } from './whitespace.js';

let cachedConfig = null;

export function loadRulesConfig() {
  cachedConfig ??= JSON.parse(
    readFileSync(fileURLToPath(new URL('./config.json', import.meta.url)), 'utf8'),
  );
  return cachedConfig;
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    out[key] =
      isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return out;
}

/** Base config with the account's industry overrides applied. */
export function configForIndustry(config, industry) {
  return deepMerge(config, config.industry_overrides?.[industry]);
}

/**
 * @param bundle { account, sites, contacts, assets, contracts, cases, activities, bills, opportunities }
 * @param today  ISO date
 */
export function analyseAccount(bundle, today, baseConfig = loadRulesConfig()) {
  const config = configForIndustry(baseConfig, bundle.account.industry);
  const tenure = accountTenure(bundle.account, bundle.assets, today);
  const runway = contractRunway(bundle.contracts, today);
  const changes = detectChanges(bundle, today, config);
  const health = computeHealth(bundle, today, config, { spendTrend: changes.spend_trend });
  const whitespace = computeWhitespace(bundle, today, config);
  const nextAction = decideNextAction(bundle, { health, whitespace, runway }, config);
  const revenue = revenueAtStake(bundle.assets, health.band, config);
  return {
    rules_version: config.version,
    today,
    tenure,
    contract_runway: runway,
    changes,
    health,
    whitespace,
    next_action: nextAction,
    revenue,
  };
}
