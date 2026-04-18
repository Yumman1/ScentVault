import { test, expect, gotoSection, fillLabel, selectLabel } from './fixtures';

const NAME = `TEST_E2E_Supplier_${Date.now()}`;

test.describe('suppliers (Admin UI)', () => {
  test('create, edit, delete flow writes to Supabase and to the UI', async ({ loggedInPage: page, admin }) => {
    await gotoSection(page, /suppliers/i);

    await fillLabel(page, 'Name', NAME);
    await fillLabel(page, 'Contact Person', 'E2E Contact');
    await selectLabel(page, 'Supplier Type', 'International');
    await fillLabel(page, 'Phone', '+1 555 9999');
    await fillLabel(page, 'Email', 'e2e@supplier.test');

    // The app uses a plain window.alert() after save - accept it.
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /save supplier/i }).click();

    await expect(page.getByRole('cell', { name: NAME })).toBeVisible();

    // DB cross-check via admin client.
    const db = await admin.from('suppliers').select('*').eq('name', NAME).single();
    expect(db.error).toBeNull();
    expect(db.data.type).toBe('International');
    expect(db.data.contact_person).toBe('E2E Contact');

    // Edit
    await page.getByRole('row', { name: new RegExp(NAME) }).getByRole('button', { name: /edit/i }).click();
    await fillLabel(page, 'Contact Person', 'Updated Contact');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /update supplier/i }).click();

    await expect(page.getByRole('cell', { name: 'Updated Contact' })).toBeVisible();

    const updated = await admin.from('suppliers').select('contact_person').eq('name', NAME).single();
    expect(updated.data.contact_person).toBe('Updated Contact');

    // Delete via confirmation modal
    await page.getByRole('row', { name: new RegExp(NAME) }).getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /delete supplier/i }).click();

    await expect(page.getByRole('cell', { name: NAME })).not.toBeVisible();

    const afterDelete = await admin.from('suppliers').select('id').eq('name', NAME);
    expect(afterDelete.data?.length ?? 0).toBe(0);
  });

  test('validation: empty name blocks submit (required)', async ({ loggedInPage: page }) => {
    await gotoSection(page, /suppliers/i);
    await fillLabel(page, 'Contact Person', 'No name given');
    await page.getByRole('button', { name: /save supplier/i }).click();
    // The Name input has `required`; browser blocks the submit, URL unchanged,
    // no alert triggered. Assert we are still on the suppliers route.
    await expect(page).toHaveURL(/\/suppliers$/);
  });
});
