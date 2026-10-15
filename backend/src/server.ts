import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { connectWithRetry, createPool } from './db/pool.js';

async function main() {
  const config = loadConfig();
  const db = createPool(config.databaseUrl);

  await connectWithRetry(db);
  console.log('[backend] connected to database');

  const server = createApp(config, db).listen(config.port, () => {
    console.log(`[backend] listening on port ${config.port}`);
    console.log(`[backend] test endpoints: ${config.enableTestEndpoints ? 'ENABLED (POST /api/test/reset)' : 'disabled'}`);
    if (config.faultInjectionMode === 'none') {
      console.log('[backend] fault injection mode: none');
    } else {
      console.warn('[backend] ==================================================');
      console.warn('[backend] WARNING: DEMO FAULT INJECTION ACTIVE');
      console.warn(`[backend] mode: ${config.faultInjectionMode}`);
      console.warn('[backend] New tickets will be acknowledged but NOT saved.');
      console.warn('[backend] ==================================================');
    }
  });

  // `docker compose down` sends SIGTERM; close cleanly so shutdown is fast and quiet.
  const shutdown = (signal: string) => {
    console.log(`[backend] ${signal} received, shutting down`);
    server.close(() => {
      void db.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[backend] failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
