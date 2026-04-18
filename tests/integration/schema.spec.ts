import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInAdmin, wipeAll } from '../helpers/db';
import { seedMinimal, type SeedIds } from '../helpers/seed';

let admin: SupabaseClient;
let ids: SeedIds;

beforeAll(async () => {
  admin = (await signInAdmin()).client;
  await wipeAll(admin);
});

afterAll(async () => {
  await wipeAll(admin);
});

beforeEach(async () => {
  await wipeAll(admin);
  ids = await seedMinimal(admin);
});

describe('schema: orphan scan', () => {
  it('every gate_in_logs.perfume_id exists in perfumes', async () => {
    await admin.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: ids.perfumeId,
      import_reference: 'B-orphans',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });

    const logs = await admin.from('gate_in_logs').select('perfume_id');
    expect(logs.error).toBeNull();
    const perfumeIds = new Set((logs.data || []).map((r: any) => r.perfume_id));

    const perfumes = await admin
      .from('perfumes')
      .select('id')
      .in('id', Array.from(perfumeIds));
    expect(perfumes.error).toBeNull();
    const existing = new Set((perfumes.data || []).map((r: any) => r.id));
    for (const pid of perfumeIds) {
      expect(existing.has(pid), `orphan perfume_id=${pid}`).toBe(true);
    }
  });

  it('every gate_out_logs.perfume_id exists in perfumes', async () => {
    await admin.from('gate_in_logs').insert({
      id: randomUUID(), date: '2025-01-01', perfume_id: ids.perfumeId,
      import_reference: 'B', packing_type_id: ids.packingTypeId,
      packing_qty: 1, net_weight: 100, main_location_id: ids.locAId,
      sub_location_id: null, supplier_invoice: '', remarks: '',
    });
    await admin.from('gate_out_logs').insert({
      id: randomUUID(), date: '2025-01-02', perfume_id: ids.perfumeId,
      packing_type_id: ids.packingTypeId, packing_qty: 1, net_weight: 5,
      main_location_id: ids.locAId, sub_location_id: null,
      usage: 'Production', customer_id: null, remarks: '', batch_number: 'B',
    });
    const logs = await admin.from('gate_out_logs').select('perfume_id');
    const perfumeIds = new Set((logs.data || []).map((r: any) => r.perfume_id));
    const perfumes = await admin.from('perfumes').select('id').in('id', Array.from(perfumeIds));
    const existing = new Set((perfumes.data || []).map((r: any) => r.id));
    for (const pid of perfumeIds) expect(existing.has(pid)).toBe(true);
  });
});

describe('schema: CHECK constraints', () => {
  it('rejects invalid profile role', async () => {
    const r = await admin.from('profiles').insert({
      id: randomUUID(),
      name: 'TEST_role',
      role: 'SuperUser' as never,
    });
    expect(r.error).toBeTruthy();
  });

  it('rejects invalid supplier type', async () => {
    const r = await admin.from('suppliers').insert({
      id: randomUUID(),
      name: 'TEST_s',
      type: 'Alien' as never,
      contact_person: '',
      phone: '',
      email: '',
    });
    expect(r.error).toBeTruthy();
  });

  it('rejects invalid location type', async () => {
    const r = await admin.from('locations').insert({
      id: randomUUID(),
      name: 'TEST_loc',
      type: 'Bin' as never,
      parent_id: null,
    });
    expect(r.error).toBeTruthy();
  });

  it('rejects invalid gate_out usage', async () => {
    const r = await admin.from('gate_out_logs').insert({
      id: randomUUID(),
      date: '2025-01-02',
      perfume_id: ids.perfumeId,
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 1,
      main_location_id: ids.locAId,
      sub_location_id: null,
      usage: 'Giveaway' as never,
      customer_id: null,
      remarks: '',
      batch_number: 'X',
    });
    expect(r.error).toBeTruthy();
  });

  it('rejects invalid audit action', async () => {
    const r = await admin.from('audit_logs').insert({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      user_id: null,
      user_name: 'TEST',
      action: 'Explode' as never,
      entity: 'SUPPLIER',
      entity_id: randomUUID(),
      details: '',
    });
    expect(r.error).toBeTruthy();
  });
});

describe('schema: ON DELETE behaviour', () => {
  it('RESTRICT on perfume when gate_in_logs reference it', async () => {
    await admin.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: ids.perfumeId,
      import_reference: 'B',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });
    const del = await admin.from('perfumes').delete().eq('id', ids.perfumeId);
    expect(del.error).toBeTruthy();
  });

  it('SET NULL on packing_type when referenced by logs', async () => {
    const goId = randomUUID();
    await admin.from('gate_out_logs').insert({
      id: goId,
      date: '2025-01-02',
      perfume_id: ids.perfumeId,
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 1,
      main_location_id: ids.locAId,
      sub_location_id: null,
      usage: 'Production',
      customer_id: null,
      remarks: '',
      batch_number: 'B',
    });
    const del = await admin.from('packing_types').delete().eq('id', ids.packingTypeId);
    expect(del.error).toBeNull();
    const after = await admin.from('gate_out_logs').select('packing_type_id').eq('id', goId).single();
    expect(after.data.packing_type_id).toBeNull();
  });
});
