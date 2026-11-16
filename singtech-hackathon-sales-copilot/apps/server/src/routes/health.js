import { Router } from 'express';
import { SERVICE_NAME } from '@telsing/shared';

const router = Router();

// GET /api/health -> { ok: true, service: "telsing-api", time }
router.get('/', (_req, res) => {
  res.json({ ok: true, service: SERVICE_NAME, time: new Date().toISOString() });
});

export default router;
