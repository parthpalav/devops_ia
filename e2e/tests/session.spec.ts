import { expect, test } from '../fixtures/test';
import { AUTH_STORAGE_KEY, loginAsDemoUser } from '../helpers/auth';

test.describe('Session', () => {
  test('E2E-12 logout clears the session and protects content again', async ({ page }) => {
    await loginAsDemoUser(page);
    expect(await page.evaluate((key) => localStorage.getItem(key), AUTH_STORAGE_KEY)).not.toBeNull();

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), AUTH_STORAGE_KEY)).toBeNull();

    // Protected pages are no longer reachable, even by direct URL.
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
  });
});
