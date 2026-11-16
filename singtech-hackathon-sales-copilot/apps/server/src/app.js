import express from 'express';
import cors from 'cors';
import { API_PREFIX } from '@telsing/shared';
import healthRouter from './routes/health.js';
import authRouter from './modules/auth/auth.routes.js';
import accountsRouter from './modules/accounts/accounts.routes.js';
import ragRouter from './modules/rag/rag.routes.js';
import storageRouter from './modules/storage/storage.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Any http://localhost:<port> or http://127.0.0.1:<port> origin (Vite dev, preview, etc.).
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: LOCALHOST_ORIGIN }));
  app.use(express.json({ limit: '6mb' }));

  // Routes — mount new routers here, one line each.
  app.use(`${API_PREFIX}/health`, healthRouter);
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/accounts`, accountsRouter);
  app.use(`${API_PREFIX}/accounts`, ragRouter);
  app.use(`${API_PREFIX}/storage`, storageRouter);

  // Unknown /api/* -> JSON 404, then the central error handler (must be last).
  app.use(API_PREFIX, notFound);
  app.use(errorHandler);

  return app;
}
