import cors from 'cors';
import express from 'express';
import type { AppConfig } from './config/env.js';
import type { Db } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { testSupportRouter } from './routes/testSupport.js';
import { ticketsRouter } from './routes/tickets.js';
import { AuthService } from './services/authService.js';
import { TicketService } from './services/ticketService.js';

export function createApp(config: AppConfig, db: Db) {
  const auth = new AuthService(db, config.jwtSecret, config.jwtExpiresIn);
  const tickets = new TicketService(db);

  const app = express();
  app.disable('x-powered-by');
  // In Docker the browser talks to Nginx (same origin), so CORS only matters for local Vite development.
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  app.use(healthRouter(db));
  app.use('/api/auth', authRouter(auth));
  app.use('/api/tickets', requireAuth(auth), ticketsRouter(tickets, config.faultInjectionMode));
  if (config.enableTestEndpoints) {
    app.use('/api/test', testSupportRouter(tickets));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
