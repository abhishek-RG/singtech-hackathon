import { Router } from 'express';
import { requireSession } from '../auth/auth.service.js';
import { getStorageStatus } from '../../lib/supabase.js';

const router = Router();

router.get('/status', requireSession, async (_req, res) => {
  res.json({ ok: true, data: await getStorageStatus() });
});

export default router;
