import { Router } from 'express';
import type { TicketService } from '../services/ticketService.js';

/**
 * TEST-ONLY routes. Mounted by app.ts only when ENABLE_TEST_ENDPOINTS=true;
 * otherwise the path does not exist and returns 404. Never enable in production.
 */
export function testSupportRouter(tickets: TicketService): Router {
  const router = Router();

  // POST /api/test/reset - restore the deterministic seed so every E2E test starts from the same state.
  router.post('/reset', async (_req, res) => {
    const seeded = await tickets.resetToSeed();
    console.log(`[backend] test data reset (${seeded} seed tickets)`);
    res.json({ status: 'reset', tickets: seeded });
  });

  return router;
}
