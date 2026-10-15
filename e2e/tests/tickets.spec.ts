import { expect, test } from '../fixtures/test';
import { loginAsDemoUser } from '../helpers/auth';
import {
  SEED,
  SEED_TICKET_COUNT,
  expectTicketCount,
  notifications,
  openTicket,
  openTicketsPage,
  ticketRow,
  ticketRows,
  uniqueTitle,
} from '../helpers/tickets';

test.describe('Ticket lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  /**
   * The quality-gate test for the demo regression.
   * With FAULT_INJECTION_MODE=drop_ticket_write the API still answers "201 Created" and the UI
   * still shows a success message - but the ticket is never stored, so the final step fails.
   */
  test('E2E-04 create ticket and find it again after reload', async ({ page }) => {
    const title = uniqueTitle('create-ticket');

    await test.step('Create a ticket through the "New ticket" dialog', async () => {
      await openTicketsPage(page);
      await page.getByRole('button', { name: 'New ticket' }).click();
      const dialog = page.getByRole('dialog', { name: 'New ticket' });
      await dialog.getByLabel('Title').fill(title);
      await dialog.getByLabel('Description').fill('Created by Playwright to verify that new tickets are persisted.');
      await dialog.getByLabel('Priority').selectOption('HIGH');
      await dialog.getByRole('button', { name: 'Create ticket' }).click();

      await expect(dialog).toBeHidden();
      await expect(notifications(page)).toContainText(/Ticket #\d+ created/);
    });

    await test.step('Reload the page and search for the new ticket by title', async () => {
      // Reloading discards all client-side state: what we see next must come from the database.
      await page.reload();
      await page.getByLabel('Search tickets').fill(title);
      await expect(page).toHaveURL(/search=/);
    });

    await test.step('Verify the ticket was persisted', async () => {
      const row = ticketRow(page, title);
      await expect(row, `Ticket "${title}" should be listed after reload - was it really saved?`).toBeVisible();
      await expectTicketCount(page, 1);
      await expect(row.getByText('HIGH', { exact: true })).toBeVisible();
      await expect(row.getByText('OPEN', { exact: true })).toBeVisible();
    });
  });

  test('E2E-05 edit ticket title and description', async ({ page }) => {
    const newTitle = 'Update onboarding documentation for the new VPN';
    const newDescription = 'Replace the legacy VPN instructions with the WireGuard setup guide.';

    await openTicket(page, SEED.onboardingDocs);
    await page.getByLabel('Title').fill(newTitle);
    await page.getByLabel('Description').fill(newDescription);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(notifications(page)).toContainText('Ticket #2 updated');
    await expect(page.getByRole('heading', { name: newTitle, level: 1 })).toBeVisible();

    // The change survives a reload (it came from the database, not component state).
    await page.reload();
    await expect(page.getByRole('heading', { name: newTitle, level: 1 })).toBeVisible();
    await expect(page.getByLabel('Description')).toHaveValue(newDescription);

    await openTicketsPage(page);
    await expect(ticketRow(page, newTitle)).toBeVisible();
    await expect(ticketRow(page, SEED.onboardingDocs)).toHaveCount(0);
  });

  test('E2E-06 change ticket status from OPEN to IN_PROGRESS', async ({ page }) => {
    await openTicket(page, SEED.databaseTimeout);
    const currentState = page.getByRole('group', { name: 'Current state' });
    await expect(currentState.getByText('OPEN', { exact: true })).toBeVisible();

    await page.getByLabel('Status').selectOption('IN_PROGRESS');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(notifications(page)).toContainText('Ticket #1 updated');
    await expect(currentState.getByText('IN_PROGRESS', { exact: true })).toBeVisible();

    await openTicketsPage(page);
    await expect(ticketRow(page, SEED.databaseTimeout).getByText('IN_PROGRESS', { exact: true })).toBeVisible();
  });

  test('E2E-07 search tickets by title', async ({ page }) => {
    await openTicketsPage(page);

    // Case-insensitive partial match on the title.
    await page.getByLabel('Search tickets').fill('database');
    await expectTicketCount(page, 1);
    await expect(ticketRow(page, SEED.databaseTimeout)).toBeVisible();
    await expect(ticketRow(page, SEED.onboardingDocs)).toHaveCount(0);

    await page.getByLabel('Search tickets').fill('no-such-ticket-xyz');
    await expect(page.getByText('No tickets match your filters.')).toBeVisible();
    await expect(ticketRows(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expectTicketCount(page, SEED_TICKET_COUNT);
  });

  test('E2E-08 filter tickets by status', async ({ page }) => {
    await openTicketsPage(page);

    await page.getByLabel('Filter by status').selectOption('RESOLVED');
    await expectTicketCount(page, 1);
    await expect(ticketRow(page, SEED.dashboardAlignment)).toBeVisible();

    await page.getByLabel('Filter by status').selectOption('IN_PROGRESS');
    await expectTicketCount(page, 2);
    for (const row of await ticketRows(page).all()) {
      await expect(row.getByText('IN_PROGRESS', { exact: true })).toBeVisible();
    }
    await expect(ticketRow(page, SEED.onboardingDocs)).toBeVisible();
    await expect(ticketRow(page, SEED.passwordResetEmail)).toBeVisible();
  });

  test('E2E-09 filter tickets by priority', async ({ page }) => {
    await openTicketsPage(page);

    await page.getByLabel('Filter by priority').selectOption('HIGH');
    await expectTicketCount(page, 2);
    for (const row of await ticketRows(page).all()) {
      await expect(row.getByText('HIGH', { exact: true })).toBeVisible();
    }
    await expect(ticketRow(page, SEED.databaseTimeout)).toBeVisible();
    await expect(ticketRow(page, SEED.passwordResetEmail)).toBeVisible();

    // Filters combine: HIGH + OPEN leaves only one ticket.
    await page.getByLabel('Filter by status').selectOption('OPEN');
    await expectTicketCount(page, 1);
    await expect(ticketRow(page, SEED.databaseTimeout)).toBeVisible();
  });

  test('E2E-10 delete ticket after confirmation', async ({ page }) => {
    await openTicket(page, SEED.dashboardAlignment);
    await page.getByRole('button', { name: 'Delete ticket' }).click();

    const confirm = page.getByRole('dialog', { name: 'Delete ticket?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/tickets$/);
    await expect(notifications(page)).toContainText('Ticket #3 deleted');
    await expectTicketCount(page, SEED_TICKET_COUNT - 1);
    await expect(ticketRow(page, SEED.dashboardAlignment)).toHaveCount(0);

    await page.getByLabel('Search tickets').fill(SEED.dashboardAlignment);
    await expect(page.getByText('No tickets match your filters.')).toBeVisible();
  });
});
