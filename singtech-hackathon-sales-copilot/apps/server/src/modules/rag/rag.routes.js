import { Router } from 'express';
import { requireSession } from '../auth/auth.service.js';
import { askCustomer } from './rag.service.js';

const router = Router();

router.post('/:accountId/ask', requireSession, async (req, res) => {
  const result = await askCustomer(req.params.accountId, req.body);
  res.json({ ok: true, data: result });
});

export default router;
