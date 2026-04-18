import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInAdmin, wipeAll } from '../helpers/db';
import {
  makeSupplier,
  makeCustomer,
  makePackingType,
  makeMainLocation,
  makeSubLocation,
  makePerfume,
} from '../helpers/factories';
import { SupplierType, LocationType } from '../../types';

let admin: SupabaseClient;

beforeAll(async () => {
  admin = (await signInAdmin()).client;
  await wipeAll(admin);
});

afterAll(async () => {
  await wipeAll(admin);
});

beforeEach(async () => {
  await wipeAll(admin);
});

describe('suppliers round-trip', () => {
  it('create -> select -> update -> delete with field fidelity', async () => {
    const s = makeSupplier({ type: SupplierType.International });
    const ins = await admin.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: s.type,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    }).select().single();
    expect(ins.error).toBeNull();

    const sel = await admin.from('suppliers').select('*').eq('id', s.id).single();
    expect(sel.error).toBeNull();
    expect(sel.data.name).toBe(s.name);
    expect(sel.data.type).toBe('International');
    expect(sel.data.contact_person).toBe(s.contactPerson);
    expect(sel.data.phone).toBe(s.phone);
    expect(sel.data.email).toBe(s.email);

    const upd = await admin
      .from('suppliers')
      .update({ contact_person: 'Updated Person' })
      .eq('id', s.id)
      .select()
      .single();
    expect(upd.error).toBeNull();
    expect(upd.data.contact_person).toBe('Updated Person');

    const del = await admin.from('suppliers').delete().eq('id', s.id);
    expect(del.error).toBeNull();

    const after = await admin.from('suppliers').select('id').eq('id', s.id);
    expect(after.data?.length ?? 0).toBe(0);
  });

  it('rejects invalid supplier type via CHECK constraint', async () => {
    const s = makeSupplier();
    const ins = await admin.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: 'Galactic' as never,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    });
    expect(ins.error).toBeTruthy();
  });
});

describe('customers round-trip', () => {
  it('create, update, delete works end-to-end', async () => {
    const c = makeCustomer();
    const ins = await admin.from('customers').insert({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      email: c.email,
    }).select().single();
    expect(ins.error).toBeNull();
    expect(ins.data.name).toBe(c.name);
    expect(ins.data.address).toBe(c.address);
  });
});

describe('packing types round-trip', () => {
  it('qtyPerPacking survives DB round-trip as numeric', async () => {
    const p = makePackingType({ qtyPerPacking: 12.5 });
    const ins = await admin.from('packing_types').insert({
      id: p.id,
      name: p.name,
      description: p.description,
      qty_per_packing: p.qtyPerPacking,
    }).select().single();
    expect(ins.error).toBeNull();
    expect(Number(ins.data.qty_per_packing)).toBe(12.5);
  });
});

describe('locations round-trip', () => {
  it('main and sub locations with parent_id link', async () => {
    const main = makeMainLocation();
    const mainIns = await admin.from('locations').insert({
      id: main.id,
      name: main.name,
      type: main.type,
      parent_id: null,
    }).select().single();
    expect(mainIns.error).toBeNull();

    const sub = makeSubLocation(main.id);
    const subIns = await admin.from('locations').insert({
      id: sub.id,
      name: sub.name,
      type: sub.type,
      parent_id: sub.parentId,
    }).select().single();
    expect(subIns.error).toBeNull();
    expect(subIns.data.parent_id).toBe(main.id);
  });

  it('rejects invalid location type via CHECK constraint', async () => {
    const l = makeMainLocation();
    const ins = await admin.from('locations').insert({
      id: l.id,
      name: l.name,
      type: 'Warehouse Zone' as never,
      parent_id: null,
    });
    expect(ins.error).toBeTruthy();
  });

  it('deleting a main location with sub-locations nullifies parent_id (ON DELETE SET NULL)', async () => {
    const main = makeMainLocation();
    await admin.from('locations').insert({
      id: main.id,
      name: main.name,
      type: main.type,
      parent_id: null,
    });
    const sub = makeSubLocation(main.id);
    await admin.from('locations').insert({
      id: sub.id,
      name: sub.name,
      type: LocationType.Sub,
      parent_id: sub.parentId,
    });

    const del = await admin.from('locations').delete().eq('id', main.id);
    expect(del.error).toBeNull();

    const after = await admin.from('locations').select('*').eq('id', sub.id).single();
    expect(after.error).toBeNull();
    expect(after.data.parent_id).toBeNull();
  });
});

describe('olfactive notes round-trip', () => {
  it('unique constraint on name is enforced', async () => {
    const a = await admin.from('olfactive_notes').insert({ name: 'TEST_Musk' });
    expect(a.error).toBeNull();
    const b = await admin.from('olfactive_notes').insert({ name: 'TEST_Musk' });
    expect(b.error).toBeTruthy();
  });
});

describe('perfumes round-trip', () => {
  it('olfactive_notes TEXT[] and nullable supplier_id round-trip', async () => {
    const s = makeSupplier();
    await admin.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: s.type,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    });

    const p = makePerfume(s.id, {
      olfactiveNotes: ['Musk', 'Amber'],
      priceUSD: 199.99,
      pricePKR: 55999,
      lowStockAlert: 12,
    });
    const ins = await admin.from('perfumes').insert({
      id: p.id,
      name: p.name,
      code: p.code,
      supplier_id: p.supplierId,
      dosage: p.dosage,
      price_usd: p.priceUSD,
      price_pkr: p.pricePKR,
      low_stock_alert: p.lowStockAlert,
      olfactive_notes: p.olfactiveNotes,
      remarks: p.remarks,
    }).select().single();
    expect(ins.error).toBeNull();
    expect(ins.data.olfactive_notes).toEqual(['Musk', 'Amber']);
    expect(Number(ins.data.price_usd)).toBe(199.99);
    expect(Number(ins.data.low_stock_alert)).toBe(12);
  });

  it('supplier_id is set to null when supplier is deleted (ON DELETE SET NULL)', async () => {
    const s = makeSupplier();
    await admin.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: s.type,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    });
    const p = makePerfume(s.id);
    await admin.from('perfumes').insert({
      id: p.id,
      name: p.name,
      code: p.code,
      supplier_id: p.supplierId,
      dosage: p.dosage,
      price_usd: p.priceUSD,
      price_pkr: p.pricePKR,
      low_stock_alert: p.lowStockAlert,
      olfactive_notes: p.olfactiveNotes,
      remarks: p.remarks,
    });

    const del = await admin.from('suppliers').delete().eq('id', s.id);
    expect(del.error).toBeNull();

    const after = await admin.from('perfumes').select('supplier_id').eq('id', p.id).single();
    expect(after.error).toBeNull();
    expect(after.data.supplier_id).toBeNull();
  });
});
