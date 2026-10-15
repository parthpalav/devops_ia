import { test as base, expect } from '@playwright/test';

/**
 * Every test starts from the same deterministic seed data.
 *
 * `resetDatabase` is an automatic fixture: before each test it calls the backend's
 * test-only endpoint POST /api/test/reset (through the frontend's /api proxy).
 * Tests therefore never depend on each other or on execution order.
 */
export const test = base.extend<{ resetDatabase: void }>({
  resetDatabase: [
    async ({ request }, use) => {
      const response = await request.post('/api/test/reset');
      expect(
        response.ok(),
        `POST /api/test/reset returned ${response.status()} - is ENABLE_TEST_ENDPOINTS=true for the backend?`,
      ).toBeTruthy();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
