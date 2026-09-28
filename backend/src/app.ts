import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createSnailPayRouter, type SnailPayRouterDeps } from './modules/snailpay/snailpay.router.js';

export interface CreateAppOptions {
  /** Permite inyectar dependencias de SnailPay en pruebas (reloj, retardo, almacén). */
  snailPay?: Partial<Omit<SnailPayRouterDeps, 'config' | 'rateLimitPerMinute'>>;
}

export function createApp(config: AppConfig, options: CreateAppOptions = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Idempotency-Key'],
      exposedHeaders: ['Idempotent-Replayed'],
    }),
  );

  if (config.nodeEnv !== 'test') {
    app.use(requestLogger);
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(
    '/api/snailpay',
    createSnailPayRouter({
      config: config.snailPay,
      rateLimitPerMinute: config.rateLimitPerMinute,
      ...options.snailPay,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
