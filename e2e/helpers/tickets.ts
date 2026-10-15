import { expect, type Page } from '@playwright/test';

/** Seed tickets restored before every test (see database/init/002_seed.sql). */
export const SEED = {
  databaseTimeout: 'Database connection timeout', // HIGH   / OPEN
  onboardingDocs: 'Update onboarding documentation', // LOW    / IN_PROGRESS
  dashboardAlignment: 'Fix dashboard alignment', // MEDIUM / RESOLVED
  passwordResetEmail: 'Password reset email not delivered', // HIGH   / IN_PROGRESS
  csvExport: 'Add CSV export for reports', // LOW    / OPEN
  loginPage502: 'Intermittent 502 on login page', // MEDIUM / OPEN
} as const;

export const SEED_TICKET_COUNT = 6;

/** Unique, readable titles for tickets created by a test: PW-<timestamp>-<test-name>. */
export function uniqueTitle(testName: string): string {
  return `PW-${Date.now()}-${testName}`;
}

/** The table of tickets on /tickets (named by its caption). */
export function ticketTable(page: Page) {
  return page.getByRole('table', { name: 'Tickets' });
}

/** Data rows only: header rows contain column headers, not cells. */
export function ticketRows(page: Page) {
  return ticketTable(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

/** The table row whose title link exactly matches `title`. */
export function ticketRow(page: Page, title: string) {
  return ticketRows(page).filter({ has: page.getByRole('link', { name: title, exact: true }) });
}

/** Waits until the list has finished loading and shows exactly `count` tickets. */
export async function expectTicketCount(page: Page, count: number) {
  await expect(page.getByText(`Showing ${count} ${count === 1 ? 'ticket' : 'tickets'}`, { exact: true })).toBeVisible();
  await expect(ticketRows(page)).toHaveCount(count);
}

export async function openTicketsPage(page: Page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Tickets' }).click();
  await expect(page.getByRole('heading', { name: 'Tickets', level: 1 })).toBeVisible();
  await expectTicketCount(page, SEED_TICKET_COUNT);
}

export async function openTicket(page: Page, title: string) {
  await openTicketsPage(page);
  await ticketRow(page, title).getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

export function notifications(page: Page) {
  return page.getByRole('status', { name: 'Notifications' });
}
