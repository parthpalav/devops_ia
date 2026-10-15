import { expect, test } from '../fixtures/test';
import { loginAsDemoUser } from '../helpers/auth';
import { SEED_TICKET_COUNT, expectTicketCount, openTicketsPage } from '../helpers/tickets';

test.describe('Validation', () => {
  test('E2E-11 required fields block ticket creation', async ({ page }) => {
    await loginAsDemoUser(page);
    await openTicketsPage(page);

    await page.getByRole('button', { name: 'New ticket' }).click();
    const dialog = page.getByRole('dialog', { name: 'New ticket' });
    const createButton = dialog.getByRole('button', { name: 'Create ticket' });

    // Completely empty form.
    await createButton.click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Title is required' })).toBeVisible();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Description is required' })).toBeVisible();
    await expect(dialog.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog).toBeVisible();

    // Title provided, description only whitespace: still blocked.
    await dialog.getByLabel('Title').fill('Ticket without a description');
    await dialog.getByLabel('Description').fill('   ');
    await createButton.click();
    await expect(dialog.getByText('Title is required')).toHaveCount(0);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Description is required' })).toBeVisible();
    await expect(dialog).toBeVisible();

    // Nothing was created.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expectTicketCount(page, SEED_TICKET_COUNT);
  });
});
