// Demo sign-in routes, mounted at /api/account-intelligence/auth.

import { Router } from 'express';
import { HttpError } from '../../../middleware/errorHandler.js';
import {
  SESSION_COOKIE,
  authenticate,
  clearSessionCookie,
  createSessionToken,
  demoAccounts,
  parseCookies,
  readSessionToken,
  sessionCookie,
} from './auth.service.js';

const router = Router();

// Simple in-memory throttle: 5 failed attempts per email in 5 minutes.
const FAILURE_LIMIT = 5;
const FAILURE_WINDOW_MS = 5 * 60 * 1000;
const failures = new Map();

function tooManyFailures(email, now = Date.now()) {
  const recent = (failures.get(email) ?? []).filter((t) => now - t < FAILURE_WINDOW_MS);
  failures.set(email, recent);
  return recent.length >= FAILURE_LIMIT;
}

/** Express middleware: attaches req.viewer or answers 401. */
export function requireSession(req, _res, next) {
  const viewer = readSessionToken(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (!viewer) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  req.viewer = viewer;
  next();
}

// POST /auth/login { email, password }
router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'BAD_REQUEST', 'Enter your email and password');
  }
  const key = email.trim().toLowerCase();
  if (tooManyFailures(key)) {
    throw new HttpError(
      429,
      'TOO_MANY_ATTEMPTS',
      'Too many attempts. Wait five minutes and try again',
    );
  }
  const user = authenticate(key, password);
  if (!user) {
    failures.get(key).push(Date.now());
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  failures.delete(key);
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken(user)));
  res.json({ ok: true, data: { user } });
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ ok: true, data: { signed_out: true } });
});

// GET /auth/me
router.get('/me', requireSession, (req, res) => {
  res.json({ ok: true, data: { user: req.viewer } });
});

// GET /auth/demo-accounts -> emails and roles for the sign-in screen (never passwords)
router.get('/demo-accounts', (_req, res) => {
  if (process.env.NODE_ENV === 'production') throw new HttpError(404, 'NOT_FOUND', 'Not found');
  res.json({ ok: true, data: { accounts: demoAccounts() } });
});

export default router;
