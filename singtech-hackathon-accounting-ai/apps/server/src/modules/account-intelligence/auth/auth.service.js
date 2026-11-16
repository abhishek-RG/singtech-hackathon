// Demo sign-in for SingTech AI Account Intelligence. Not production auth: two dummy users live in
// data/seed/demo-users.json with scrypt password hashes (plain passwords are documented in
// docs/account-intelligence/DEMO-LOGIN.md). Supabase Auth with RLS replaces this in the pilot.
//
// Sessions are a signed token in an httpOnly cookie: base64url(payload).HMAC-SHA256(payload).
// Built on node:crypto only, no dependencies.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SESSION_COOKIE = 'st_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const DEV_SECRET = 'singtech-ai-dev-only-session-secret';

const USERS = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/seed/demo-users.json', import.meta.url)), 'utf8'),
);

// Used to spend the same time on unknown emails as on wrong passwords.
const DUMMY_HASH = hashPassword('not-a-real-password', '00000000000000000000000000000000');

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = scryptSync(String(password), salt, expected.length);
  return timingSafeEqual(expected, actual);
}

function sessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET?.trim();
  if (secret) return secret;
  if (env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set in production');
  return DEV_SECRET;
}

export function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, title: user.title };
}

/** Returns the public user for valid credentials, otherwise null. */
export function authenticate(email, password) {
  const user = USERS.find((u) => u.email === String(email).trim().toLowerCase());
  if (!user) {
    verifyPassword(password, DUMMY_HASH);
    return null;
  }
  return verifyPassword(password, user.password_hash) ? publicUser(user) : null;
}

/** Emails and roles for the sign-in screen. Never passwords. */
export function demoAccounts() {
  return USERS.map((u) => ({ email: u.email, name: u.name, role: u.role, title: u.title }));
}

const b64url = (value) => Buffer.from(value).toString('base64url');
const sign = (body, env) =>
  createHmac('sha256', sessionSecret(env)).update(body).digest('base64url');

export function createSessionToken(user, { now = Date.now(), env } = {}) {
  const body = b64url(
    JSON.stringify({ sub: user.id, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS }),
  );
  return `${body}.${sign(body, env)}`;
}

/** Returns the public user for a valid, unexpired token, otherwise null. */
export function readSessionToken(token, { now = Date.now(), env } = {}) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = Buffer.from(sign(body, env));
  const given = Buffer.from(signature ?? '');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 <= now) return null;
  const user = USERS.find((u) => u.id === payload.sub);
  return user ? publicUser(user) : null;
}

export function parseCookies(header = '') {
  const cookies = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // ignore malformed cookie values
    }
  }
  return cookies;
}

export function sessionCookie(token, env = process.env) {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Admins see every account. Account managers see the accounts they own. */
export function canView(viewer, account) {
  if (!viewer) return true;
  return viewer.role === 'admin' || account.owner_email === viewer.email;
}
