import { Router } from 'express';
import type { Db } from '../db/pool.js';

/** GET /health - used by the Docker health check. Healthy means the process is up AND PostgreSQL answers. */
export function healthRouter(db: Db): Router {
  const router = Router();
  router.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });
  return router;
}
