import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../../middleware/errorHandler.js';

const SESSION_COOKIE = 'telsing_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function sessionCookie(req) {
  const entry = (req.headers.cookie || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
  return entry ? entry.slice(SESSION_COOKIE.length + 1) : null;
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Session signing is not configured');
  }
  return 'local-development-only-change-before-deployment';
}

function signature(value) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function serializeSession(email) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
  ).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function readSession(req) {
  const token = sessionCookie(req);
  if (!token) return null;

  const [payload, providedSignature] = token.split('.');
  if (!payload || !providedSignature || !safeEqual(signature(payload), providedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.email || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return { email: session.email, name: 'Enterprise Sales Advisor' };
  } catch {
    return null;
  }
}

export function createSession(req, res) {
  const expectedEmail = process.env.DEMO_USER_EMAIL || 'advisor@telsing.demo';
  const expectedPassword = process.env.DEMO_USER_PASSWORD;
  if (!expectedPassword && process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Demo login is not configured');
  }

  const { email, password } = req.body ?? {};
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !safeEqual(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase()) ||
    !safeEqual(password, expectedPassword || 'change-this-demo-password')
  ) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  res.cookie(SESSION_COOKIE, serializeSession(expectedEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });

  return { email: expectedEmail, name: 'Enterprise Sales Advisor' };
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export function requireSession(req, _res, next) {
  const user = readSession(req);
  if (!user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue'));
  req.user = user;
  next();
}
