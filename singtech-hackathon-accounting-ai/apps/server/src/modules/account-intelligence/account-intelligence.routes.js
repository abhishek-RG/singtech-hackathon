// SingTech AI Account Intelligence API, mounted at /api/account-intelligence.
// /auth/* is public (demo sign-in). Everything else needs a signed-in session, and each user only
// sees the accounts they may see. Handlers validate input, call a service and respond.

import { Router } from 'express';
import { HEALTH_BANDS, INDUSTRIES, MARKETS, SEGMENTS } from '@singtech/shared';
import { HttpError } from '../../middleware/errorHandler.js';
import * as service from './account-intelligence.service.js';
import { INTENTS, answerQuestion } from './assistant.service.js';
import authRouter, { requireSession } from './auth/auth.routes.js';

const router = Router();

const ALLOWED = {
  band: HEALTH_BANDS.map((b) => b.code),
  market: MARKETS.map((m) => m.code),
  segment: SEGMENTS.map((s) => s.code),
  industry: [...INDUSTRIES],
};
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseFilters(query) {
  const filters = {};
  for (const [key, allowed] of Object.entries(ALLOWED)) {
    const value = query[key];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || !allowed.includes(value)) {
      throw new HttpError(400, 'BAD_REQUEST', `Unknown ${key}: use one of ${allowed.join(', ')}`);
    }
    filters[key] = value;
  }
  return filters;
}

function requireId(value, what) {
  if (typeof value !== 'string' || !ID.test(value))
    throw new HttpError(404, 'NOT_FOUND', `${what} not found`);
  return value.toLowerCase();
}

router.use('/auth', authRouter);
router.use(requireSession);

// GET /meta -> data source, rules version, today, product catalog
router.get('/meta', async (req, res) => {
  res.json({ ok: true, data: await service.getMeta({ viewer: req.viewer }) });
});

// GET /accounts?market=&segment=&industry=&band=
router.get('/accounts', async (req, res) => {
  res.json({
    ok: true,
    data: await service.listAccountBook(parseFilters(req.query), { viewer: req.viewer }),
  });
});

// GET /accounts/:id -> the full Account page bundle
router.get('/accounts/:id', async (req, res) => {
  const detail = await service.getAccountDetail(requireId(req.params.id, 'Account'), {
    viewer: req.viewer,
  });
  if (!detail) throw new HttpError(404, 'NOT_FOUND', 'Account not found');
  res.json({ ok: true, data: detail });
});

// GET /accounts/:id/evidence/:evidenceId -> one source record
router.get('/accounts/:id/evidence/:evidenceId', async (req, res) => {
  const evidence = await service.getEvidence(
    requireId(req.params.id, 'Account'),
    requireId(req.params.evidenceId, 'Evidence'),
    { viewer: req.viewer },
  );
  if (!evidence) throw new HttpError(404, 'NOT_FOUND', 'Evidence not found for this account');
  res.json({ ok: true, data: evidence });
});

// POST /assistant { account_id?, intent?, message? } -> rules-based answer with citations
router.post('/assistant', async (req, res) => {
  const { account_id: accountId, intent, message } = req.body ?? {};
  if (intent !== undefined && !INTENTS.some((i) => i.code === intent)) {
    throw new HttpError(
      400,
      'BAD_REQUEST',
      `Unknown intent: use one of ${INTENTS.map((i) => i.code).join(', ')}`,
    );
  }
  if (message !== undefined && typeof message !== 'string') {
    throw new HttpError(400, 'BAD_REQUEST', 'message must be text');
  }
  if (intent === undefined && !message?.trim())
    throw new HttpError(400, 'BAD_REQUEST', 'Ask a question');
  const answer = await answerQuestion(
    { account_id: accountId ? requireId(accountId, 'Account') : undefined, intent, message },
    { viewer: req.viewer },
  );
  if (!answer) throw new HttpError(404, 'NOT_FOUND', 'Account not found');
  res.json({ ok: true, data: answer });
});

export default router;
