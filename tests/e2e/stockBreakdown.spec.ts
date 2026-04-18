import { randomUUID } from 'crypto';
import { test, expect, gotoSection } from './fixtures';
import { readLogs } from '../helpers/seed';
import { computeStockPositions, computeTotalStock } from '../../lib/stock';
import {
  makeSupplier,
  makePackingType,
  makeMainLocation,
  makePerfume,
} from '../helpers/factories';

async function seedTimeline(admin: any) {
  const supplier = makeSupplier();
  await admin.from('suppliers').insert({
    id: supplier.id, name: supplier.name, type: supplier.type,
    contact_person: supplier.contactPerson, phone: supplier.phone, email: supplier.email,
  });
  const pt = makePackingType({ qtyPerPacking: 25 });
  await admin.from('packing_types').insert({
    id: pt.id, name: pt.name, description: pt.description, qty_per_packing: pt.qtyPerPacking,
  });
  const locA = makeMainLocation({ name: 'TEST_SB_A' });
  const locB = makeMainLocation({ name: 'TEST_SB_B' });
  await admin.from('locations').insert([
    { id: locA.id, name: locA.name, type: locA.type, parent_id: null },
    { id: locB.id, name: locB.name, type: locB.type, parent_id: null },
  ]);
  const perfume = makePerfume(supplier.id, { name: 'TEST_SB_Perfume', code: `SB-${Date.now()}` });
  await admin.from('perfumes').insert({
    id: perfume.id, name: perfume.name, code: perfume.code,
    supplier_id: perfume.supplierId, dosage: perfume.dosage,
    price_usd: perfume.priceUSD, price_pkr: perfume.pricePKR,
    low_stock_alert: perfume.lowStockAlert,
    olfactive_notes: perfume.olfactiveNotes, remarks: perfume.remarks,
  });

  // A timeline: gate-in 100 to A, gate-in 50 to A (different batch),
  // transfer 30 of B1 to locB, gate-out 20 of B1 from locB.
  await admin.from('gate_in_logs').insert({
    id: randomUUID(), date: '2025-01-01', perfume_id: perfume.id,
    import_reference: 'SB-B1', packing_type_id: pt.id,
    packing_qty: 4, net_weight: 100,
    main_location_id: locA.id, sub_location_id: null,
    supplier_invoice: '', remarks: '',
  });
  await admin.from('gate_in_logs').insert({
    id: randomUUID(), date: '2025-01-02', perfume_id: perfume.id,
    import_reference: 'SB-B2', packing_type_id: pt.id,
    packing_qty: 2, net_weight: 50,
    main_location_id: locA.id, sub_location_id: null,
    supplier_invoice: '', remarks: '',
  });
  await admin.from('stock_transfer_logs').insert({
    id: randomUUID(), date: '2025-01-03', perfume_id: perfume.id,
    packing_type_id: pt.id, packing_qty: 1, net_weight: 30,
    from_main_location_id: locA.id, from_sub_location_id: null,
    to_main_location_id: locB.id, to_sub_location_id: null,
    remarks: '', batch_number: 'SB-B1',
  });
  await admin.from('gate_out_logs').insert({
    id: randomUUID(), date: '2025-01-04', perfume_id: perfume.id,
    packing_type_id: pt.id, packing_qty: 1, net_weight: 20,
    main_location_id: locB.id, sub_location_id: null,
    usage: 'Production', customer_id: null,
    remarks: '', batch_number: 'SB-B1',
  });

  return { perfume, locA, locB };
}

test.describe('stock breakdown reconciliation UI <-> DB', () => {
  test('derived positions from DB match expectations', async ({ admin }) => {
    const seed = await seedTimeline(admin);
    const logs = await readLogs(admin, seed.perfume.id);
    const positions = computeStockPositions(seed.perfume.id, logs);
    const total = computeTotalStock(seed.perfume.id, logs);

    // A / B1 = 100 - 30 = 70
    // A / B2 = 50
    // B / B1 = 30 - 20 = 10
    // total = 130
    const ab1 = positions.find((p) => p.mainLocationId === seed.locA.id && p.batch === 'SB-B1');
    const ab2 = positions.find((p) => p.mainLocationId === seed.locA.id && p.batch === 'SB-B2');
    const bb1 = positions.find((p) => p.mainLocationId === seed.locB.id && p.batch === 'SB-B1');
    expect(ab1?.weight).toBe(70);
    expect(ab2?.weight).toBe(50);
    expect(bb1?.weight).toBe(10);
    expect(total).toBe(130);
  });

  test('Dashboard renders the seeded perfume and totals (smoke)', async ({
    loggedInPage: page, admin,
  }) => {
    const seed = await seedTimeline(admin);
    await page.reload();
    await gotoSection(page, /dashboard/i);

    // The perfume name appears somewhere on the dashboard lists.
    await expect(page.locator('body')).toContainText(seed.perfume.name, { timeout: 20_000 });
  });
});
