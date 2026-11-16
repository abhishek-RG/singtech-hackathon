// Tests for demo sign-in, per-user visibility and the rules-based Ask SingTech AI preview.
// The demo passwords below are the dummy values documented in docs/account-intelligence/DEMO-LOGIN.md.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../app.js';
import { createMockAdapter } from './data/mock.adapter.js';
import { answerQuestion, detectIntent, matchAccount } from './assistant.service.js';
import {
  SESSION_COOKIE,
  canView,
  createSessionToken,
  hashPassword,
  readSessionToken,
  verifyPassword,
} from './auth/auth.service.js';

const TODAY = '2026-11-16';
const ADMIN = { email: 'admin@singtech.example', password: 'SingTech-Admin-2026' };
const MANAGER = { email: 'aisha.rahman@singtech.example', password: 'SingTech-Demo-2026' };
const stories = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/seed/stories.json', import.meta.url)), 'utf8'),
);
const story = (key) => stories.find((s) => s.story_key === key);

describe('auth: passwords and sessions', () => {
  test('passwords are hashed with a salt and verified in constant time', () => {
    const stored = hashPassword('example-password');
    assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    assert.notEqual(stored, hashPassword('example-password'), 'salt differs per hash');
    assert.equal(verifyPassword('example-password', stored), true);
    assert.equal(verifyPassword('wrong', stored), false);
  });

  test('demo users store hashes only, never plain passwords', () => {
    const raw = readFileSync(
      fileURLToPath(new URL('./data/seed/demo-users.json', import.meta.url)),
      'utf8',
    );
    assert.doesNotMatch(raw, /SingTech-(Admin|Demo)-2026/);
    for (const user of JSON.parse(raw)) assert.match(user.password_hash, /^scrypt\$/);
  });

  test('session tokens round-trip, and tampered or expired tokens are rejected', () => {
    const token = createSessionToken({ id: 'user-admin' });
    assert.equal(readSessionToken(token).role, 'admin');
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'user-admin', exp: 9999999999 })).toString(
      'base64url',
    );
    assert.equal(readSessionToken(`${forged}.${sig}`), null, 'payload change breaks the signature');
    assert.equal(readSessionToken(`${body}.x${sig.slice(1)}`), null);
    const old = createSessionToken({ id: 'user-admin' }, { now: Date.now() - 9 * 3600 * 1000 });
    assert.equal(readSessionToken(old), null, 'expired after 8 hours');
    assert.equal(readSessionToken('garbage'), null);
  });

  test('admins see every account; account managers see only their own', () => {
    const admin = { role: 'admin', email: ADMIN.email };
    const manager = { role: 'account_manager', email: MANAGER.email };
    assert.equal(canView(admin, { owner_email: 'someone@singtech.example' }), true);
    assert.equal(canView(manager, { owner_email: MANAGER.email }), true);
    assert.equal(canView(manager, { owner_email: 'someone@singtech.example' }), false);
  });
});

describe('auth: HTTP flow', () => {
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

  const call = async (path, { method = 'GET', body, cookie } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json(), setCookie: res.headers.get('set-cookie') };
  };
  const login = async (who) => {
    const res = await call('/auth/login', { method: 'POST', body: who });
    assert.equal(res.status, 200, `${who.email} signs in`);
    return res.setCookie.split(';')[0];
  };

  test('every data route needs a session', async () => {
    for (const path of ['/meta', '/accounts', `/accounts/${story('R1').account_id}`]) {
      const res = await call(path);
      assert.equal(res.status, 401, path);
      assert.equal(res.body.error.code, 'UNAUTHENTICATED');
    }
  });

  test('wrong passwords are refused without saying which part was wrong', async () => {
    const wrong = await call('/auth/login', {
      method: 'POST',
      body: { email: ADMIN.email, password: 'nope' },
    });
    const unknown = await call('/auth/login', {
      method: 'POST',
      body: { email: 'nobody@singtech.example', password: 'nope' },
    });
    for (const res of [wrong, unknown]) {
      assert.equal(res.status, 401);
      assert.equal(res.body.error.message, 'Email or password is incorrect');
      assert.equal(res.setCookie, null);
    }
    const empty = await call('/auth/login', { method: 'POST', body: {} });
    assert.equal(empty.status, 400);
  });

  test('sign-in sets an httpOnly session cookie and /me returns the user', async () => {
    const res = await call('/auth/login', { method: 'POST', body: ADMIN });
    assert.match(res.setCookie, /^st_session=[^;]+; HttpOnly; SameSite=Lax; Path=\//);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(res.body.data.user.password_hash, undefined);
    const me = await call('/auth/me', { cookie: res.setCookie.split(';')[0] });
    assert.equal(me.body.data.user.email, ADMIN.email);
  });

  test('repeated failures are throttled', async () => {
    const email = 'throttle-test@singtech.example';
    let last;
    for (let i = 0; i < 6; i += 1) {
      last = await call('/auth/login', { method: 'POST', body: { email, password: 'x' } });
    }
    assert.equal(last.status, 429);
  });

  test('the admin sees 10 accounts; the account manager sees only her 4', async () => {
    const admin = await call('/accounts', { cookie: await login(ADMIN) });
    assert.equal(admin.body.data.rows.length, 10);
    const managerCookie = await login(MANAGER);
    const manager = await call('/accounts', { cookie: managerCookie });
    assert.equal(manager.body.data.rows.length, 4);
    assert.ok(manager.body.data.rows.every((r) => r.owner_name === 'Aisha Rahman'));
    const notHers = await call(`/accounts/${story('R1').account_id}`, { cookie: managerCookie });
    assert.equal(notHers.status, 404, 'another owner’s account looks like it does not exist');
  });

  test('demo accounts list emails and roles, never passwords', async () => {
    const res = await call('/auth/demo-accounts');
    assert.equal(res.body.data.accounts.length, 2);
    assert.ok(JSON.stringify(res.body).indexOf('password') === -1);
  });

  test('sign-out clears the cookie', async () => {
    const res = await call('/auth/logout', { method: 'POST' });
    assert.match(res.setCookie, /Max-Age=0/);
  });

  test('POST /assistant answers with citations and a next action', async () => {
    const cookie = await login(ADMIN);
    const res = await call('/assistant', {
      method: 'POST',
      cookie,
      body: { account_id: story('R1').account_id, intent: 'why_at_risk' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.account.name, 'Kestrelwick Precision Pte Ltd');
    assert.ok(res.body.data.citations.length > 0);
    assert.match(res.body.data.blocks.at(-1).text, /^Suggested next action: Service recovery plan/);
    const bad = await call('/assistant', { method: 'POST', cookie, body: { intent: 'gossip' } });
    assert.equal(bad.status, 400);
  });
});

describe('assistant: rules-based preview', () => {
  const adapter = createMockAdapter();
  const ask = (request, viewer = null) =>
    answerQuestion(request, { adapter, today: TODAY, viewer });

  test('intent detection from plain questions', () => {
    assert.equal(detectIntent('Why is this account at risk?'), 'why_at_risk');
    assert.equal(detectIntent('when does the contract renew'), 'renewal_plan');
    assert.equal(detectIntent('what products are they missing'), 'missing');
    assert.equal(detectIntent('give me a summary'), 'summary');
    assert.equal(detectIntent('what should I do next'), 'next_action');
    assert.equal(detectIntent('hello there'), null);
  });

  test('names in the question pick the account', async () => {
    const accounts = await adapter.listAccounts();
    assert.equal(
      matchAccount('why is Kestrelwick at risk', accounts)?.name,
      'Kestrelwick Precision Pte Ltd',
    );
    assert.equal(
      matchAccount('how is Saffronvale doing', accounts)?.name,
      'Saffronvale Retail Pvt Ltd',
    );
    assert.equal(matchAccount('no names here', accounts), null);
  });

  test('every intent answers every story with sources and ends with the next action', async () => {
    for (const s of stories) {
      for (const intent of ['summary', 'why_at_risk', 'renewal_plan', 'missing', 'next_action']) {
        const answer = await ask({ account_id: s.account_id, intent });
        const last = answer.blocks.at(-1);
        assert.equal(last.type, 'action', `${s.story_key} ${intent}`);
        assert.match(last.text, /^Suggested next action: /);
        const text = JSON.stringify(answer.blocks);
        assert.doesNotMatch(text, /undefined|NaN|null\)/, `${s.story_key} ${intent}`);
        assert.doesNotMatch(text, /discount/i);
      }
    }
  });

  test('asking without an account offers an account picker card', async () => {
    const answer = await ask({ intent: 'summary' });
    assert.equal(answer.card.type, 'pick_account');
    assert.equal(answer.card.options.length, 4);
    assert.equal(answer.card.options[0].band, 'at_risk');
  });

  test('a question with no recognised intent explains what the preview can do', async () => {
    const answer = await ask({ message: 'tell a joke' });
    assert.equal(answer.intent, null);
    assert.equal(answer.suggestions.length, 4);
  });

  test('account managers cannot ask about accounts they do not own', async () => {
    const manager = { role: 'account_manager', email: MANAGER.email };
    assert.equal(
      await ask({ account_id: story('R1').account_id, intent: 'summary' }, manager),
      null,
    );
    const own = await ask({ account_id: story('R2').account_id, intent: 'summary' }, manager);
    assert.equal(own.account.name, 'Halvora Wealth Partners Pte Ltd');
    const picker = await ask({ intent: 'summary' }, manager);
    assert.ok(picker.card.options.every((o) => o.name !== 'Kestrelwick Precision Pte Ltd'));
  });
});
