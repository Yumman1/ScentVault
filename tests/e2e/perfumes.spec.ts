import { randomUUID } from 'crypto';
import { test, expect, gotoSection, fillLabel, selectLabel } from './fixtures';
import { makeSupplier } from '../helpers/factories';

const PNAME = `TEST_E2E_Perfume_${Date.now()}`;
const PCODE = `TST-${Date.now()}`;

test.describe('perfumes (Admin UI)', () => {
  test('create via UI, verify in Supabase, and block deletion when gate-in exists', async ({
    loggedInPage: page,
    admin,
  }) => {
    // Preconditions: one International supplier (so Price USD input is enabled).
    const supplier = makeSupplier({ type: 'International' as never });
    await admin.from('suppliers').insert({
      id: supplier.id,
      name: supplier.name,
      type: supplier.type,
      contact_person: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
    });
    await page.reload();

    await gotoSection(page, /perfume archive/i);

    await fillLabel(page, 'Perfume Name', PNAME);
    await fillLabel(page, 'Perfume Code', PCODE);
    await selectLabel(page, 'Supplier', supplier.name);
    await fillLabel(page, 'Price (USD)', '199.99');
    await fillLabel(page, 'Price (PKR)', '55999');
    await fillLabel(page, 'Low Stock Alert (KG)', '12');
    await fillLabel(page, 'Dosage (%)', '10');

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /save perfume|add perfume|register perfume|save/i }).first().click();

    // DB round-trip: new row exists with our data.
    await expect.poll(async () => {
      const r = await admin.from('perfumes').select('*').eq('name', PNAME).maybeSingle();
      return r.data?.name ?? null;
    }, { timeout: 15_000 }).toBe(PNAME);

    const db = await admin.from('perfumes').select('*').eq('name', PNAME).single();
    expect(db.data.code).toBe(PCODE);
    expect(db.data.supplier_id).toBe(supplier.id);
    expect(Number(db.data.price_usd)).toBeCloseTo(199.99, 2);
    expect(Number(db.data.low_stock_alert)).toBe(12);

    // Duplicate code -> inline validation error (no alert).
    await fillLabel(page, 'Perfume Name', `${PNAME}_dup`);
    await fillLabel(page, 'Perfume Code', PCODE);
    await selectLabel(page, 'Supplier', supplier.name);
    await page.getByRole('button', { name: /save/i }).first().click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test('deleting a perfume with transaction history is blocked with alert', async ({
    loggedInPage: page,
    admin,
  }) => {
    // Seed a minimal scenario directly so we can trigger the linked-delete block.
    const supplier = makeSupplier({ type: 'International' as never });
    await admin.from('suppliers').insert({
      id: supplier.id,
      name: supplier.name,
      type: supplier.type,
      contact_person: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
    });
    const perfumeId = randomUUID();
    await admin.from('perfumes').insert({
      id: perfumeId,
      name: `${PNAME}_LINKED`,
      code: `LINK-${Date.now()}`,
      supplier_id: supplier.id,
      dosage: 1,
      price_usd: 10,
      price_pkr: 2800,
      low_stock_alert: 0,
      olfactive_notes: [],
      remarks: '',
    });
    const locationId = randomUUID();
    await admin.from('locations').insert({
      id: locationId,
      name: 'TEST_LOC_LINKED',
      type: 'Main Location',
      parent_id: null,
    });
    await admin.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: perfumeId,
      import_reference: 'B-linked',
      packing_type_id: null,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: locationId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });

    await page.reload();
    await gotoSection(page, /perfume archive/i);

    // App pops an alert() when you try to delete a perfume with history.
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });

    const row = page.getByRole('row', { name: new RegExp(`${PNAME}_LINKED`) });
    await row.getByRole('button', { name: /delete/i }).click();
    // Confirm in the ConfirmationModal if it appears.
    const confirmBtn = page.getByRole('button', { name: /delete perfume|delete/i }).last();
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();

    await expect.poll(() => dialogs.join('|'), { timeout: 5_000 }).toMatch(/cannot delete|existing transaction/i);

    const after = await admin.from('perfumes').select('id').eq('id', perfumeId);
    expect(after.data?.length).toBe(1);
  });
});
