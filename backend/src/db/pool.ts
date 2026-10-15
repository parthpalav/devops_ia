import pg from 'pg';

export type Db = pg.Pool;

export function createPool(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on('error', (error) => {
    console.error('[backend] unexpected idle database client error:', error.message);
  });
  return pool;
}

/**
 * Confirms the database accepts queries. Compose already waits for the db health check,
 * so this normally succeeds first time; the bounded retry only covers brief restarts
 * (e.g. when the backend is run outside Compose).
 */
export async function connectWithRetry(pool: Db, attempts = 10, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      // Connection-refused errors arrive as an AggregateError with an empty message but a `code`.
      const reason = (error as { code?: string }).code ?? (error instanceof Error ? error.message : String(error));
      console.warn(`[backend] database not reachable (attempt ${attempt}/${attempts}): ${reason}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
