import { expect, test } from '../fixtures/test';
import { AUTH_STORAGE_KEY, DEMO_USER, loginAsDemoUser, submitLogin } from '../helpers/auth';

test.describe('Authentication', () => {
  test('E2E-01 valid login shows the dashboard with ticket metrics', async ({ page }) => {
    await loginAsDemoUser(page);

    await expect(page).toHaveURL(/\/$/);
    // Seed data: 6 tickets = 3 OPEN, 2 IN_PROGRESS, 1 RESOLVED.
    await expect(page.getByRole('region', { name: 'Total tickets' })).toContainText('6');
    await expect(page.getByRole('region', { name: 'Open' })).toContainText('3');
    await expect(page.getByRole('region', { name: 'In progress' })).toContainText('2');
    await expect(page.getByRole('region', { name: 'Resolved' })).toContainText('1');
    await expect(page.getByRole('heading', { name: 'Recent tickets' })).toBeVisible();
    await expect(page.getByText(`Signed in as ${DEMO_USER.email}`)).toBeVisible();
  });

  test('E2E-02 invalid password shows an error and stays on the login page', async ({ page }) => {
    await page.goto('/login');
    await submitLogin(page, DEMO_USER.email, 'definitely-the-wrong-password');

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), AUTH_STORAGE_KEY)).toBeNull();
  });

  test('E2E-03 protected route redirects unauthenticated users to login', async ({ page }) => {
    // A fresh browser context has no stored session; clear explicitly to make the intent obvious.
    await page.context().clearCookies();
    await page.goto('/tickets');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tickets' })).toHaveCount(0);

    // After signing in, the user is returned to the page they originally asked for.
    await submitLogin(page, DEMO_USER.email, DEMO_USER.password);
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(page.getByRole('heading', { name: 'Tickets', level: 1 })).toBeVisible();
  });
});
