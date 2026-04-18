import { test, expect, gotoSection, fillLabel, selectLabel } from './fixtures';
import { randomUUID } from 'crypto';
import {
  makeSupplier,
  makePackingType,
  makeMainLocation,
  makePerfume,
} from '../helpers/factories';

async function seedForGateIn(admin: any) {
  const supplier = makeSupplier();
  await admin.from('suppliers').insert({
    id: supplier.id,
    name: supplier.name,
    type: supplier.type,
    contact_person: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
  });
  const pt = makePackingType({ qtyPerPacking: 25 });
  await admin.from('packing_types').insert({
    id: pt.id,
    name: pt.name,
    description: pt.description,
    qty_per_packing: pt.qtyPerPacking,
  });
  const loc = makeMainLocation({ name: 'TEST_E2E_WH1' });
  await admin.from('locations').insert({
    id: loc.id,
    name: loc.name,
    type: loc.type,
    parent_id: null,
  });
  const perf = makePerfume(supplier.id, { name: 'TEST_E2E_GIN_Perfume', code: `GIN-${Date.now()}` });
  await admin.from('perfumes').insert({
    id: perf.id,
    name: perf.name,
    code: perf.code,
    supplier_id: perf.supplierId,
    dosage: perf.dosage,
    price_usd: perf.priceUSD,
    price_pkr: perf.pricePKR,
    low_stock_alert: perf.lowStockAlert,
    olfactive_notes: perf.olfactiveNotes,
    remarks: perf.remarks,
  });
  return { supplier, packingType: pt, location: loc, perfume: perf };
}

test.describe('gate-in (Inbound Log)', () => {
  test('fast-log submission creates a row in gate_in_logs', async ({
    loggedInPage: page,
    admin,
  }) => {
    const seed = await seedForGateIn(admin);
    await page.reload();
    await gotoSection(page, /inbound log/i);

    // Enable Fast Log mode so all inputs are visible in one panel.
    const fastBtn = page.getByTitle(/toggle fast log mode/i);
    if (await fastBtn.isVisible()) await fastBtn.click();

    // SearchableSelect for Perfume: find its control by label and type to search.
    const perfumeLabel = page.getByText('Perfume', { exact: true }).first();
    await perfumeLabel.scrollIntoViewIfNeeded();
    // Click input near the label. SearchableSelect exposes a text input.
    await page.getByPlaceholder(/search|select|perfume/i).first().click();
    await page.keyboard.type(seed.perfume.name);
    await page.keyboard.press('Enter');
    // Fallback click option if visible:
    const opt = page.getByRole('option', { name: new RegExp(seed.perfume.code) });
    if (await opt.isVisible().catch(() => false)) await opt.click();

    await fillLabel(page, 'Batch Reference', 'E2E-B1');
    await selectLabel(page, 'Inbound Packing', seed.packingType.name);
    await selectLabel(page, 'Target Warehouse', seed.location.name);
    await fillLabel(page, 'Units (Drums/Boxes)', '4');
    // Weight auto-fills to qty * qtyPerPacking = 4 * 25 = 100; but make sure:
    await fillLabel(page, 'Total Net Weight (KG)', '100');
    await fillLabel(page, 'Supplier Invoice Reference', 'INV-E2E-1');

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /log logistics receipt/i }).click();

    await expect.poll(async () => {
      const r = await admin.from('gate_in_logs').select('*').eq('perfume_id', seed.perfume.id);
      return r.data?.length ?? 0;
    }, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

    const row = await admin.from('gate_in_logs').select('*').eq('perfume_id', seed.perfume.id).single();
    expect(row.data.import_reference).toBe('E2E-B1');
    expect(Number(row.data.net_weight)).toBe(100);
    expect(Number(row.data.packing_qty)).toBe(4);
    expect(row.data.main_location_id).toBe(seed.location.id);
  });

  test('UI reads back a seeded gate-in row', async ({ loggedInPage: page, admin }) => {
    const seed = await seedForGateIn(admin);
    await admin.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-02-02',
      perfume_id: seed.perfume.id,
      import_reference: 'SEED-SHOW',
      packing_type_id: seed.packingType.id,
      packing_qty: 1,
      net_weight: 42,
      main_location_id: seed.location.id,
      sub_location_id: null,
      supplier_invoice: 'INV-seed',
      remarks: '',
      price_usd: 1,
      price_pkr: 1,
    });

    await page.reload();
    await gotoSection(page, /inbound log/i);

    await expect(page.getByText('SEED-SHOW', { exact: false })).toBeVisible({ timeout: 15_000 });
  });
});
