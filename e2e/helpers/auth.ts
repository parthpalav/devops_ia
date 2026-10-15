import { expect, type Page } from '@playwright/test';

// Non-secret demo credentials (documented in the README); overridable via environment.
export const DEMO_USER = {
  email: process.env.DEMO_USER_EMAIL ?? 'demo@example.com',
  password: process.env.DEMO_USER_PASSWORD ?? 'Demo123!',
};

export const AUTH_STORAGE_KEY = 'opsdesk.auth';

export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Signs in through the real login form, exactly like a user would. */
export async function loginAsDemoUser(page: Page) {
  await page.goto('/login');
  await submitLogin(page, DEMO_USER.email, DEMO_USER.password);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}
