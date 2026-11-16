import { Router } from 'express';
import { clearSession, createSession, readSession } from './auth.service.js';

const router = Router();

router.get('/session', (req, res) => {
  const user = readSession(req);
  res.json({ ok: true, data: { user } });
});

router.post('/login', (req, res) => {
  const user = createSession(req, res);
  res.json({ ok: true, data: { user } });
});

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true, data: { signedOut: true } });
});

export default router;
