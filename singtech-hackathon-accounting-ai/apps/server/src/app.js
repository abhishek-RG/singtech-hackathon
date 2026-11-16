import express from 'express';
import cors from 'cors';
import { API_PREFIX } from '@singtech/shared';
import healthRouter from './routes/health.js';
import accountIntelligenceRouter from './modules/account-intelligence/account-intelligence.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Any http://localhost:<port> or http://127.0.0.1:<port> origin (Vite dev, preview, etc.).
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: LOCALHOST_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  // Routes — mount new routers here, one line each.
  app.use(`${API_PREFIX}/health`, healthRouter);
  app.use(`${API_PREFIX}/account-intelligence`, accountIntelligenceRouter);

  // Unknown /api/* -> JSON 404, then the central error handler (must be last).
  app.use(API_PREFIX, notFound);
  app.use(errorHandler);

  return app;
}
