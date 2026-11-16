import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { requireSession } from '../auth/auth.service.js';
import {
  addOrganization,
  addEmailInteraction,
  addManualInteraction,
  addScreenshotInteraction,
  addTranscriptInteraction,
  getCustomerWorkspace,
  getScreenshotFile,
  listAccounts,
} from './accounts.service.js';

const router = Router();

router.post('/', requireSession, (req, res) => {
  const account = addOrganization(req.body);
  res.status(201).json({ ok: true, data: { account } });
});

router.get('/', requireSession, (_req, res) => {
  res.json({ ok: true, data: { accounts: listAccounts() } });
});

router.get('/:accountId/workspace', requireSession, (req, res) => {
  res.json({ ok: true, data: getCustomerWorkspace(req.params.accountId) });
});

router.post('/:accountId/interactions/email', requireSession, (req, res) => {
  const interaction = addEmailInteraction(req.params.accountId, req.body);
  res.status(201).json({ ok: true, data: { interaction } });
});

router.post('/:accountId/interactions/manual', requireSession, (req, res) => {
  const interaction = addManualInteraction(req.params.accountId, req.body);
  res.status(201).json({ ok: true, data: { interaction } });
});

router.post('/:accountId/interactions/screenshot', requireSession, async (req, res) => {
  const interaction = await addScreenshotInteraction(req.params.accountId, req.body);
  res.status(201).json({ ok: true, data: { interaction } });
});

router.post('/:accountId/interactions/transcript', requireSession, async (req, res) => {
  const interaction = await addTranscriptInteraction(req.params.accountId, req.body);
  res.status(201).json({ ok: true, data: { interaction } });
});

router.get('/:accountId/interactions/:interactionId/image', requireSession, (req, res) => {
  const image = getScreenshotFile(req.params.accountId, req.params.interactionId);
  res.set('Cache-Control', 'private, no-store');
  res.type(image.mimeType).send(readFileSync(image.path));
});

export default router;
