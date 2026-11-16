// Tests for the SingTech AI Account Intelligence module (node:test, run by `npm test`).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ACTION_BY_CODE,
  HEALTH_BAND_BY_CODE,
  MARKET_BY_CODE,
  PRODUCT_CODES,
} from '@singtech/shared';
import { createApp } from '../../app.js';
import { ADAPTER_METHODS, getAdapter, hasSupabaseConfig, resolveToday } from './data/adapter.js';
import { createMockAdapter } from './data/mock.adapter.js';
import { COMPETITOR_ALIASES, RISK_REASONS, SEED_TABLES, TABLES } from './data/schema.js';
import { FX_TO_SGD, buildSeed } from './data/seed/generate.js';
import { analyseAccount, configForIndustry, loadRulesConfig } from './rules/index.js';
import { accountTenure, contractRunway, yearsAndMonths } from './rules/tenure.js';
import * as service from './account-intelligence.service.js';
import { SESSION_COOKIE, createSessionToken } from './auth/auth.service.js';

const TODAY = '2026-11-16';

const SEED_DIR = new URL('./data/seed/', import.meta.url);
const readSeed = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`${name}.json`, SEED_DIR)), 'utf8'));

const seed = Object.fromEntries([...SEED_TABLES, 'stories'].map((name) => [name, readSeed(name)]));
const idsOf = (table) => new Set(seed[table].map((row) => row.id));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Real operator names must never appear inside simulated customer text.
const REAL_COMPETITORS =
  /\b(starhub|m1 limited|myrepublic|viewqwest|sptel|telstra|tpg|optus|jio|airtel|vodafone|indosat|telkomsel|xl axiata|ais|true corp|globe|pldt|ntt|softbank|bt group|verizon|at&t)\b/i;

describe('seed data: shape', () => {
  for (const table of SEED_TABLES) {
    const spec = TABLES[table];

    test(`${table}: every row has exactly the documented columns`, () => {
      assert.ok(seed[table].length > 0, `${table} has rows`);
      const expected = [...spec.columns].sort();
      for (const row of seed[table]) {
        assert.deepEqual(Object.keys(row).sort(), expected, `${table} row ${row.id}`);
      }
    });

    test(`${table}: ids are unique UUIDs`, () => {
      const ids = seed[table].map((row) => row.id);
      assert.equal(new Set(ids).size, ids.length);
      for (const id of ids) assert.match(id, UUID);
    });

    test(`${table}: enums, dates and product codes are valid`, () => {
      for (const row of seed[table]) {
        for (const [column, allowed] of Object.entries(spec.enums ?? {})) {
          if (row[column] === null) continue;
          assert.ok(allowed.includes(row[column]), `${table}.${column} = ${row[column]}`);
        }
        for (const column of spec.dates ?? []) {
          if (row[column] !== null) assert.match(row[column], ISO_DATE, `${table}.${column}`);
        }
        for (const column of spec.productArrays ?? []) {
          assert.ok(Array.isArray(row[column]) && row[column].length > 0, `${table}.${column}`);
          for (const code of row[column]) assert.ok(PRODUCT_CODES.includes(code), code);
        }
      }
    });

    test(`${table}: foreign keys resolve`, () => {
      for (const [column, target] of Object.entries(spec.refs ?? {})) {
        const targets = idsOf(target);
        for (const row of seed[table]) {
          if (row[column] === null) continue;
          assert.ok(targets.has(row[column]), `${table}.${column} -> ${target}`);
        }
      }
    });
  }
});

describe('seed data: business rules', () => {
  const accountById = new Map(seed.accounts.map((a) => [a.id, a]));

  test('there are 10 business accounts, all existing enterprise or MNC customers', () => {
    assert.equal(seed.accounts.length, 10);
    for (const account of seed.accounts) {
      assert.equal(account.account_type, 'business');
      assert.equal(account.is_customer, true);
      assert.ok(['enterprise', 'mnc'].includes(account.segment));
    }
  });

  test('the hierarchy has no cycles and parents are business accounts', () => {
    for (const account of seed.accounts) {
      const seen = new Set();
      let cursor = account;
      while (cursor.parent_id) {
        assert.ok(!seen.has(cursor.id), `cycle at ${account.name}`);
        seen.add(cursor.id);
        cursor = accountById.get(cursor.parent_id);
        assert.ok(cursor, `${account.name} parent exists`);
      }
    }
    assert.ok(
      seed.accounts.some((a) => a.parent_id),
      'at least one subsidiary',
    );
  });

  test('money columns pair local currency with SGD at the simulated rate', () => {
    for (const table of SEED_TABLES) {
      for (const [local, sgd] of TABLES[table].money ?? []) {
        for (const row of seed[table]) {
          const accountId = row.account_id ?? row.billing_account_id;
          assert.equal(row.currency, MARKET_BY_CODE[accountById.get(accountId).market].currency);
          const backToSgd = row[local] * FX_TO_SGD[row.currency];
          assert.ok(Math.abs(backToSgd - row[sgd]) <= 0.05, `${table}.${local} ${row.id}`);
        }
      }
    }
  });

  test('every account has twelve monthly bills whose product lines add up', () => {
    for (const account of seed.accounts) {
      const bills = seed.bills.filter((b) => b.billing_account_id === account.id);
      assert.equal(bills.length, 12, account.name);
      for (const bill of bills) {
        const lines = bill.product_lines.reduce((sum, line) => sum + line.amount_sgd, 0);
        assert.ok(Math.abs(lines - bill.amount_sgd) < 0.01, bill.bill_number);
        for (const line of bill.product_lines) assert.ok(PRODUCT_CODES.includes(line.product_code));
      }
    }
  });

  test('customer text names competitors only as Competitor A, B or C', () => {
    const texts = [
      ...seed.cases.flatMap((c) => [c.subject, c.description]),
      ...seed.activities.flatMap((a) => [a.subject, a.outcome, a.notes]),
      ...seed.stories.flatMap((s) => [s.title, s.narrative]),
    ];
    for (const text of texts) {
      assert.doesNotMatch(text, REAL_COMPETITORS, text);
      for (const match of text.match(/Competitor [A-Z]\b/g) ?? []) {
        assert.ok(COMPETITOR_ALIASES.includes(match), match);
      }
    }
    for (const c of seed.cases) {
      assert.equal(c.mentions_competitor, c.competitor_alias !== null);
      if (c.competitor_alias) assert.ok(c.description.includes(c.competitor_alias));
    }
  });

  test('contact emails are masked and owners use the demo domain', () => {
    for (const contact of seed.contacts)
      assert.match(contact.email_masked, /^[a-z]\*\*\*@[a-z0-9-]+\.example$/);
    for (const account of seed.accounts) assert.match(account.owner_email, /@singtech\.example$/);
  });
});

describe('seed data: scripted stories', () => {
  test('ten stories: five at risk or watch, five healthy look-alikes', () => {
    assert.equal(seed.stories.length, 10);
    const healthy = seed.stories.filter((s) => s.expected.band === 'healthy');
    assert.equal(healthy.length, 5);
    assert.equal(seed.stories.length - healthy.length, 5);
    assert.equal(new Set(seed.stories.map((s) => s.account_id)).size, 10);
  });

  test('every expected outcome uses valid codes and never a discount', () => {
    const accountIds = idsOf('accounts');
    for (const story of seed.stories) {
      const { band, top_reason, gap_product, next_action } = story.expected;
      assert.ok(accountIds.has(story.account_id), story.story_key);
      assert.ok(HEALTH_BAND_BY_CODE[band], `${story.story_key} band`);
      assert.ok(ACTION_BY_CODE[next_action], `${story.story_key} action`);
      if (band === 'healthy') {
        assert.equal(top_reason, null);
        assert.equal(
          ACTION_BY_CODE[next_action].kind,
          'grow',
          `${story.story_key} healthy goes to growth`,
        );
      } else {
        assert.ok(RISK_REASONS.includes(top_reason), `${story.story_key} reason`);
      }
      if (gap_product !== null) {
        assert.ok(PRODUCT_CODES.includes(gap_product));
        const owned = seed.assets.some(
          (a) =>
            a.account_id === story.account_id &&
            a.product_code === gap_product &&
            a.status !== 'cancelled',
        );
        assert.equal(owned, false, `${story.story_key} gap product is not already owned`);
      }
    }
  });

  test('the price perception story routes to a value case, not a discount', () => {
    const story = seed.stories.find((s) => s.expected.top_reason === 'price_perception');
    assert.equal(story.expected.next_action, 'renewal_value_case');
  });
});

test('committed seed JSON matches generate.js output', () => {
  const generated = buildSeed();
  for (const name of [...SEED_TABLES, 'stories']) {
    assert.deepEqual(seed[name], generated[name], `${name}.json is stale: rerun generate.js`);
  }
});

// ---------------------------------------------------------------------------------------------
// Step 4: data access layer
// ---------------------------------------------------------------------------------------------

describe('data access layer', () => {
  test('getAdapter uses simulated data when Supabase settings are empty', () => {
    assert.equal(hasSupabaseConfig({}), false);
    assert.equal(hasSupabaseConfig({ SUPABASE_URL: ' ', SUPABASE_ANON_KEY: '' }), false);
    const adapter = getAdapter({});
    assert.equal(adapter.source, 'mock');
    assert.equal(getAdapter({}), adapter, 'one shared instance');
  });

  test('getAdapter refuses Supabase settings until the Supabase adapter exists', () => {
    const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'placeholder' };
    assert.equal(hasSupabaseConfig(env), true);
    assert.throws(() => getAdapter(env), { code: 'ADAPTER_UNAVAILABLE' });
  });

  test('the mock adapter implements every interface method', () => {
    const adapter = createMockAdapter();
    for (const method of ADAPTER_METHODS) assert.equal(typeof adapter[method], 'function', method);
  });

  test('listAccounts returns the 10 business accounts and filters by market and segment', async () => {
    const adapter = createMockAdapter();
    assert.equal((await adapter.listAccounts()).length, 10);
    assert.ok((await adapter.listAccounts({ market: 'SG' })).every((a) => a.market === 'SG'));
    assert.equal((await adapter.listAccounts({ segment: 'mnc' })).length, 2);
  });

  test('account tree links the Indonesian subsidiary to its group parent', async () => {
    const adapter = createMockAdapter();
    const [child] = await adapter.listAccounts({ market: 'ID' });
    const tree = await adapter.getAccountTree(child.id);
    assert.equal(tree.parent.name, 'Quayvarra Logistics Group Pte Ltd');
    const parentTree = await adapter.getAccountTree(tree.parent.id);
    assert.deepEqual(
      parentTree.children.map((c) => c.id),
      [child.id],
    );
  });

  test('bills come oldest first and can be limited; rows are copies', async () => {
    const adapter = createMockAdapter();
    const [account] = await adapter.listAccounts({ market: 'IN' });
    const bills = await adapter.getBills(account.id, { months: 6 });
    assert.equal(bills.length, 6);
    assert.ok(bills[0].period_start < bills[5].period_start);
    bills[0].amount_sgd = -1;
    assert.notEqual((await adapter.getBills(account.id, { months: 6 }))[0].amount_sgd, -1);
  });

  test('findRecord resolves evidence ids to their table', async () => {
    const adapter = createMockAdapter();
    const hit = await adapter.findRecord(seed.cases[0].id);
    assert.equal(hit.table, 'cases');
    assert.equal(await adapter.findRecord('00000000-0000-5000-8000-000000000000'), null);
  });

  test('resolveToday uses DEMO_TODAY when valid and the real clock otherwise', () => {
    assert.equal(resolveToday({ DEMO_TODAY: '2026-11-16' }), '2026-11-16');
    const now = new Date('2030-01-02T03:00:00Z');
    assert.match(resolveToday({ DEMO_TODAY: 'not-a-date' }, now), /^2030-01-0[12]$/);
    assert.match(resolveToday({}, now), /^2030-01-0[12]$/);
  });
});

// ---------------------------------------------------------------------------------------------
// Steps 5 and 6: rules
// ---------------------------------------------------------------------------------------------

async function analyse(adapter, accountId, today = TODAY) {
  const account = await adapter.getAccount(accountId);
  const id = account.id;
  const bundle = {
    account,
    sites: await adapter.getSites(id),
    contacts: await adapter.getContacts(id),
    assets: await adapter.getAssets(id),
    contracts: await adapter.getContracts(id),
    cases: await adapter.getCases(id),
    activities: await adapter.getActivities(id),
    bills: await adapter.getBills(id, { months: 12 }),
    opportunities: await adapter.getOpportunities(id),
  };
  return { bundle, result: analyseAccount(bundle, today) };
}

describe('rules: scripted stories', () => {
  const adapter = createMockAdapter();

  for (const story of seed.stories) {
    test(`${story.story_key} ${story.title}: band, reason, gap and action match the story`, async () => {
      const { result } = await analyse(adapter, story.account_id);
      assert.deepEqual(
        {
          band: result.health.band,
          top_reason: result.health.top_reason,
          gap_product: result.whitespace.top_gap,
          next_action: result.next_action.action,
        },
        story.expected,
      );
    });
  }

  test('every reason and change cites records that belong to the account', async () => {
    for (const story of seed.stories) {
      const { result } = await analyse(adapter, story.account_id);
      const ids = [
        ...result.health.reasons.flatMap((r) => r.evidence_ids),
        ...result.changes.events.flatMap((e) => e.evidence_ids),
        ...result.whitespace.lacked.flatMap((l) => l.signals.flatMap((s) => s.evidence_ids)),
      ];
      for (const id of ids) {
        const hit = await adapter.findRecord(id);
        assert.ok(hit, `${story.story_key} evidence ${id} exists`);
        assert.equal(hit.row.account_id ?? hit.row.billing_account_id, story.account_id);
      }
      for (const r of result.health.reasons.filter((x) => x.points < 0)) {
        assert.ok(r.evidence_ids.length > 0, `${story.story_key} ${r.code} has evidence`);
      }
    }
  });

  test('scores stay within 0 to 100 and match their band', async () => {
    const config = loadRulesConfig();
    for (const story of seed.stories) {
      const { result } = await analyse(adapter, story.account_id);
      const { score, band } = result.health;
      assert.ok(score >= 0 && score <= 100);
      const expected =
        score >= config.bands.healthy
          ? 'healthy'
          : score >= config.bands.watch
            ? 'watch'
            : 'at_risk';
      assert.equal(band, expected);
    }
  });

  test('no talking point recommends a discount or prints a missing value', async () => {
    for (const story of seed.stories) {
      const { result } = await analyse(adapter, story.account_id);
      assert.ok(result.next_action.talking_points.length >= 3, story.story_key);
      for (const point of result.next_action.talking_points) {
        assert.doesNotMatch(point, /discount|price cut|% off/i, point);
        assert.doesNotMatch(point, /undefined|null|NaN/, point);
      }
    }
  });

  test('healthy accounts are routed to growth with a named product', async () => {
    for (const story of seed.stories.filter((s) => s.expected.band === 'healthy')) {
      const { result } = await analyse(adapter, story.account_id);
      assert.equal(result.next_action.kind, 'grow', story.story_key);
      assert.ok(result.next_action.product_code, `${story.story_key} names a product`);
    }
  });

  test('revenue at stake ranks at-risk revenue above healthy revenue', async () => {
    const results = [];
    for (const story of seed.stories)
      results.push((await analyse(adapter, story.account_id)).result);
    const stake = (band) =>
      results.filter((r) => r.health.band === band).map((r) => r.revenue.revenue_at_stake_sgd);
    assert.ok(Math.min(...stake('at_risk')) > Math.max(...stake('healthy')));
  });
});

describe('rules: tenure, runway and config', () => {
  test('years and months count completed months only', () => {
    assert.deepEqual(yearsAndMonths('2016-04-01', TODAY), {
      years: 10,
      months: 7,
      total_months: 127,
    });
    assert.deepEqual(yearsAndMonths('2026-10-17', TODAY), { years: 0, months: 0, total_months: 0 });
    assert.deepEqual(yearsAndMonths('2025-11-16', TODAY), {
      years: 1,
      months: 0,
      total_months: 12,
    });
  });

  test('account tenure and contract runway for the price perception story', async () => {
    const adapter = createMockAdapter();
    const story = seed.stories.find((s) => s.story_key === 'R2');
    const account = await adapter.getAccount(story.account_id);
    const tenure = accountTenure(account, await adapter.getAssets(account.id), TODAY);
    assert.equal(tenure.since, '2018-01-15');
    assert.equal(tenure.years, 8);
    const runway = contractRunway(await adapter.getContracts(account.id), TODAY);
    assert.equal(runway.days, 60);
    assert.equal(runway.end_date, '2027-01-15');
  });

  test('industry overrides change only what they name', () => {
    const config = loadRulesConfig();
    const fs = configForIndustry(config, 'Financial services');
    assert.equal(fs.windows.stale_meeting_days, 60);
    assert.equal(fs.windows.change_days, config.windows.change_days);
    assert.equal(configForIndustry(config, 'Retail').windows.stale_meeting_days, 90);
  });

  test('config holds the agreed bands and change window', () => {
    const config = loadRulesConfig();
    assert.deepEqual(config.bands, { healthy: 70, watch: 40 });
    assert.equal(config.windows.change_days, 180);
  });
});

// ---------------------------------------------------------------------------------------------
// Step 7: service and API
// ---------------------------------------------------------------------------------------------

describe('API: /api/account-intelligence', () => {
  let server;
  let base;
  const previousToday = process.env.DEMO_TODAY;

  before(async () => {
    process.env.DEMO_TODAY = TODAY;
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://localhost:${server.address().port}/api/account-intelligence`;
  });

  after(async () => {
    if (previousToday === undefined) delete process.env.DEMO_TODAY;
    else process.env.DEMO_TODAY = previousToday;
    await new Promise((resolve) => server.close(resolve));
  });

  // Signed in as the demo admin (sees every account) unless a test passes another cookie.
  const adminCookie = `${SESSION_COOKIE}=${createSessionToken({ id: 'user-admin' })}`;
  const getJson = async (path, cookie = adminCookie) => {
    const res = await fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} });
    return { status: res.status, body: await res.json() };
  };

  test('GET /meta reports simulated data and the pinned date', async () => {
    const { status, body } = await getJson('/meta');
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.source, 'mock');
    assert.equal(body.data.simulated, true);
    assert.equal(body.data.today, TODAY);
    assert.equal(body.data.products.length, 6);
  });

  test('GET /accounts returns 10 rows sorted by revenue at stake', async () => {
    const { status, body } = await getJson('/accounts');
    assert.equal(status, 200);
    const rows = body.data.rows;
    assert.equal(rows.length, 10);
    for (let i = 1; i < rows.length; i += 1) {
      assert.ok(rows[i - 1].revenue_at_stake_sgd >= rows[i].revenue_at_stake_sgd);
    }
    assert.equal(rows[0].health.band, 'at_risk');
    const child = rows.find((r) => r.market === 'ID');
    assert.equal(child.parent_name, 'Quayvarra Logistics Group Pte Ltd');
  });

  test('GET /accounts filters by band and rejects unknown values', async () => {
    const atRisk = await getJson('/accounts?band=at_risk');
    assert.equal(atRisk.body.data.rows.length, 3);
    assert.ok(atRisk.body.data.rows.every((r) => r.health.band === 'at_risk'));
    const bad = await getJson('/accounts?band=critical');
    assert.equal(bad.status, 400);
    assert.equal(bad.body.ok, false);
    assert.equal(bad.body.error.code, 'BAD_REQUEST');
  });

  test('GET /accounts/:id returns the full Account page bundle', async () => {
    const story = seed.stories.find((s) => s.story_key === 'R4');
    const { status, body } = await getJson(`/accounts/${story.account_id}`);
    assert.equal(status, 200);
    const d = body.data;
    const keys = ['account', 'parent', 'children', 'sites', 'contacts', 'assets', 'contracts'];
    keys.push('cases', 'activities', 'opportunities', 'bills', 'tenure', 'contract_runway');
    keys.push('changes', 'health', 'whitespace', 'next_action', 'revenue');
    for (const key of keys) assert.ok(key in d, key);
    assert.equal(d.simulated, true);
    assert.equal(d.health.top_reason, 'partial_move');
    assert.ok(d.assets.every((a) => a.tenure && typeof a.tenure.years === 'number'));
    assert.equal(d.bills.months.length, 12);
    assert.equal(d.bills.trend.direction, 'down');
  });

  test('unknown or malformed account ids return NOT_FOUND', async () => {
    const missing = await getJson('/accounts/00000000-0000-5000-8000-000000000000');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
    const malformed = await getJson('/accounts/not-an-id');
    assert.equal(malformed.status, 404);
  });

  test('evidence resolves for its own account only', async () => {
    const story = seed.stories.find((s) => s.story_key === 'R1');
    const other = seed.stories.find((s) => s.story_key === 'H1');
    const caseRow = seed.cases.find((c) => c.account_id === story.account_id);
    const own = await getJson(`/accounts/${story.account_id}/evidence/${caseRow.id}`);
    assert.equal(own.status, 200);
    assert.equal(own.body.data.table, 'cases');
    assert.equal(own.body.data.label, `Case ${caseRow.case_number}`);
    const foreign = await getJson(`/accounts/${other.account_id}/evidence/${caseRow.id}`);
    assert.equal(foreign.status, 404);
  });

  test('viewing an account writes an audit row and stores the health score', async () => {
    const adapter = getAdapter({});
    const story = seed.stories.find((s) => s.story_key === 'R3');
    await service.getAccountDetail(story.account_id, { adapter, today: TODAY });
    const audit = adapter._auditLog().at(-1);
    assert.equal(audit.action, 'view_account');
    assert.equal(audit.account_id, story.account_id);
    assert.equal(adapter._latestHealthScore(story.account_id).band, 'watch');
  });
});
