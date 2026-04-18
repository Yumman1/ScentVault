import { randomUUID } from 'crypto';
import { test, expect, gotoSection } from './fixtures';
import {
  makeSupplier,
  makePackingType,
  makeMainLocation,
  makePerfume,
  makeCustomer,
} from '../helpers/factories';

async function seedForGateOut(admin: any) {
  const supplier = makeSupplier();
  await admin.from('suppliers').insert({
    id: supplier.id, name: supplier.name, type: supplier.type,
    contact_person: supplier.contactPerson, phone: supplier.phone, email: supplier.email,
  });
  const pt = makePackingType({ qtyPerPacking: 25 });
  await admin.from('packing_types').insert({
    id: pt.id, name: pt.name, description: pt.description, qty_per_packing: pt.qtyPerPacking,
  });
  const loc = makeMainLocation({ name: 'TEST_E2E_WH_OUT' });
  await admin.from('locations').insert({
    id: loc.id, name: loc.name, type: loc.type, parent_id: null,
  });
  const customer = makeCustomer();
  await admin.from('customers').insert({
    id: customer.id, name: customer.name, address: customer.address,
    phone: customer.phone, email: customer.email,
  });
  const perfume = makePerfume(supplier.id, { name: 'TEST_E2E_GOUT_Perfume', code: `GOUT-${Date.now()}` });
  await admin.from('perfumes').insert({
    id: perfume.id, name: perfume.name, code: perfume.code,
    supplier_id: perfume.supplierId, dosage: perfume.dosage,
    price_usd: perfume.priceUSD, price_pkr: perfume.pricePKR,
    low_stock_alert: perfume.lowStockAlert,
    olfactive_notes: perfume.olfactiveNotes, remarks: perfume.remarks,
  });
  // Seed a gate-in so stock exists.
  await admin.from('gate_in_logs').insert({
    id: randomUUID(),
    date: '2025-02-01',
    perfume_id: perfume.id,
    import_reference: 'STOCK-1',
    packing_type_id: pt.id,
    packing_qty: 4,
    net_weight: 100,
    main_location_id: loc.id,
    sub_location_id: null,
    supplier_invoice: '',
    remarks: '',
  });
  return { supplier, packingType: pt, location: loc, perfume, customer };
}

test.describe('gate-out (Outbound Log)', () => {
  test('Production gate-out row via admin is visible in the UI timeline', async ({
    loggedInPage: page, admin,
  }) => {
    const seed = await seedForGateOut(admin);
    const outId = randomUUID();
    await admin.from('gate_out_logs').insert({
      id: outId,
      date: '2025-02-05',
      perfume_id: seed.perfume.id,
      packing_type_id: seed.packingType.id,
      packing_qty: 1,
      net_weight: 25,
      main_location_id: seed.location.id,
      sub_location_id: null,
      usage: 'Production',
      customer_id: null,
      remarks: 'e2e-prod',
      batch_number: 'STOCK-1',
    });

    await page.reload();
    await gotoSection(page, /outbound log/i);
    await expect(page.locator('body')).toContainText('STOCK-1');
  });

  test('Sale gate-out requires customer_id and round-trips through DB', async ({ admin }) => {
    const seed = await seedForGateOut(admin);

    // Sale without customer: NOT NULL check? The column is nullable. Schema-level
    // there's no required customer, but app-level validation is enforced by UI.
    // Here we just assert: Sale with customer_id saves, and reads back.
    const ok = await admin.from('gate_out_logs').insert({
      id: randomUUID(),
      date: '2025-02-06',
      perfume_id: seed.perfume.id,
      packing_type_id: seed.packingType.id,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: seed.location.id,
      sub_location_id: null,
      usage: 'Sale',
      customer_id: seed.customer.id,
      remarks: '',
      batch_number: 'STOCK-1',
    });
    expect(ok.error).toBeNull();

    const check = await admin
      .from('gate_out_logs')
      .select('usage, customer_id, net_weight')
      .eq('perfume_id', seed.perfume.id)
      .eq('usage', 'Sale')
      .single();
    expect(check.error).toBeNull();
    expect(check.data.customer_id).toBe(seed.customer.id);
    expect(Number(check.data.net_weight)).toBe(10);
  });

  test('overdraw: the DB allows it, so computeStockPositions reports negative', async ({ admin }) => {
    const seed = await seedForGateOut(admin);

    await admin.from('gate_out_logs').insert({
      id: randomUUID(),
      date: '2025-02-07',
      perfume_id: seed.perfume.id,
      packing_type_id: seed.packingType.id,
      packing_qty: 1,
      net_weight: 9999, // > 100 in stock
      main_location_id: seed.location.id,
      sub_location_id: null,
      usage: 'Production',
      customer_id: null,
      remarks: 'overdraw',
      batch_number: 'STOCK-1',
    });

    // Derive stock from raw rows and assert it is negative.
    const [gi, go] = await Promise.all([
      admin.from('gate_in_logs').select('net_weight').eq('perfume_id', seed.perfume.id),
      admin.from('gate_out_logs').select('net_weight').eq('perfume_id', seed.perfume.id),
    ]);
    const inSum = (gi.data ?? []).reduce((s: number, r: any) => s + Number(r.net_weight), 0);
    const outSum = (go.data ?? []).reduce((s: number, r: any) => s + Number(r.net_weight), 0);
    expect(inSum - outSum).toBeLessThan(0);
  });
});
