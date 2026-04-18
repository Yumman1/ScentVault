import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInAdmin, wipeAll } from '../helpers/db';
import { seedMinimal, readLogs, type SeedIds } from '../helpers/seed';
import { computeStockPositions, computeTotalStock } from '../../lib/stock';
import { GateOutUsage } from '../../types';

let admin: SupabaseClient;
let ids: SeedIds;

const BATCH1 = 'B1';
const BATCH2 = 'B2';

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

async function insertGateIn(
  netWeight: number,
  locationId: string,
  importReference: string,
): Promise<string> {
  const id = randomUUID();
  const res = await admin.from('gate_in_logs').insert({
    id,
    date: '2025-01-01',
    perfume_id: ids.perfumeId,
    import_reference: importReference,
    packing_type_id: ids.packingTypeId,
    packing_qty: 1,
    net_weight: netWeight,
    main_location_id: locationId,
    sub_location_id: null,
    supplier_invoice: 'INV-1',
    remarks: '',
    price_usd: 99,
    price_pkr: 28000,
  });
  if (res.error) throw res.error;
  return id;
}

async function insertGateOut(
  netWeight: number,
  locationId: string,
  batch: string,
  usage: GateOutUsage = GateOutUsage.Production,
  customerId?: string,
): Promise<string> {
  const id = randomUUID();
  const res = await admin.from('gate_out_logs').insert({
    id,
    date: '2025-01-02',
    perfume_id: ids.perfumeId,
    packing_type_id: ids.packingTypeId,
    packing_qty: 1,
    net_weight: netWeight,
    main_location_id: locationId,
    sub_location_id: null,
    usage,
    customer_id: customerId ?? null,
    remarks: '',
    batch_number: batch,
  });
  if (res.error) throw res.error;
  return id;
}

async function insertTransfer(
  netWeight: number,
  fromId: string,
  toId: string,
  batch: string,
): Promise<string> {
  const id = randomUUID();
  const res = await admin.from('stock_transfer_logs').insert({
    id,
    date: '2025-01-03',
    perfume_id: ids.perfumeId,
    packing_type_id: ids.packingTypeId,
    packing_qty: 1,
    net_weight: netWeight,
    from_main_location_id: fromId,
    from_sub_location_id: null,
    to_main_location_id: toId,
    to_sub_location_id: null,
    remarks: '',
    batch_number: batch,
  });
  if (res.error) throw res.error;
  return id;
}

async function currentPositions() {
  const logs = await readLogs(admin, ids.perfumeId);
  return computeStockPositions(ids.perfumeId, logs);
}

async function currentTotal() {
  const logs = await readLogs(admin, ids.perfumeId);
  return computeTotalStock(ids.perfumeId, logs);
}

describe('transactions timeline - derived stock stays consistent with DB', () => {
  it('step 1: gate-in 100 to A/B1 -> position A/B1=100', async () => {
    await insertGateIn(100, ids.locAId, BATCH1);
    const positions = await currentPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].mainLocationId).toBe(ids.locAId);
    expect(positions[0].batch).toBe(BATCH1);
    expect(positions[0].weight).toBe(100);
    expect(await currentTotal()).toBe(100);
  });

  it('step 2: gate-in 50 to A/B2 -> totals 150, two positions', async () => {
    await insertGateIn(100, ids.locAId, BATCH1);
    await insertGateIn(50, ids.locAId, BATCH2);
    const positions = await currentPositions();
    expect(positions).toHaveLength(2);
    expect(await currentTotal()).toBe(150);
  });

  it('step 3: transfer 30 of B1 A->B -> A/B1=70, B/B1=30, total unchanged', async () => {
    await insertGateIn(100, ids.locAId, BATCH1);
    await insertGateIn(50, ids.locAId, BATCH2);
    await insertTransfer(30, ids.locAId, ids.locBId, BATCH1);
    const positions = await currentPositions();
    const ab1 = positions.find((p) => p.mainLocationId === ids.locAId && p.batch === BATCH1);
    const bb1 = positions.find((p) => p.mainLocationId === ids.locBId && p.batch === BATCH1);
    expect(ab1?.weight).toBe(70);
    expect(bb1?.weight).toBe(30);
    expect(await currentTotal()).toBe(150);
  });

  it('step 4: gate-out 20 of B1 from B (Sale + customer) -> B/B1=10, total=130', async () => {
    await insertGateIn(100, ids.locAId, BATCH1);
    await insertGateIn(50, ids.locAId, BATCH2);
    await insertTransfer(30, ids.locAId, ids.locBId, BATCH1);
    await insertGateOut(20, ids.locBId, BATCH1, GateOutUsage.Sale, ids.customerId);
    const positions = await currentPositions();
    const bb1 = positions.find((p) => p.mainLocationId === ids.locBId && p.batch === BATCH1);
    expect(bb1?.weight).toBe(10);
    expect(await currentTotal()).toBe(130);
  });

  it('step 5: update gate-out to 25 -> B/B1=5, total=125', async () => {
    await insertGateIn(100, ids.locAId, BATCH1);
    await insertTransfer(30, ids.locAId, ids.locBId, BATCH1);
    const goId = await insertGateOut(20, ids.locBId, BATCH1);

    const upd = await admin
      .from('gate_out_logs')
      .update({ net_weight: 25 })
      .eq('id', goId);
    expect(upd.error).toBeNull();

    const positions = await currentPositions();
    const bb1 = positions.find((p) => p.mainLocationId === ids.locBId && p.batch === BATCH1);
    expect(bb1?.weight).toBe(5);
    expect(await currentTotal()).toBe(75);
  });

  it('step 6: delete the transfer -> A/B1=100, no B/B1', async () => {
    await insertGateIn(100, ids.locAId, BATCH1);
    const txId = await insertTransfer(30, ids.locAId, ids.locBId, BATCH1);

    const del = await admin.from('stock_transfer_logs').delete().eq('id', txId);
    expect(del.error).toBeNull();

    const positions = await currentPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].mainLocationId).toBe(ids.locAId);
    expect(positions[0].weight).toBe(100);
  });

  it('overdraw: gate-out exceeding gate-in produces negative derived stock (documents behaviour)', async () => {
    await insertGateIn(10, ids.locAId, BATCH1);
    await insertGateOut(9999, ids.locAId, BATCH1);
    const positions = await currentPositions();
    expect(positions[0].weight).toBe(-9989);
    expect(await currentTotal()).toBe(-9989);
  });

  it('FK: gate-in with bogus perfume_id is rejected', async () => {
    const res = await admin.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: '00000000-0000-0000-0000-000000000099',
      import_reference: 'B-bogus',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });
    expect(res.error).toBeTruthy();
  });

  it('ON DELETE RESTRICT: deleting a perfume with any log fails', async () => {
    await insertGateIn(10, ids.locAId, BATCH1);
    const del = await admin.from('perfumes').delete().eq('id', ids.perfumeId);
    expect(del.error).toBeTruthy();
  });

  it('CHECK: gate_out_logs.usage rejects values outside Production/Sale', async () => {
    const res = await admin.from('gate_out_logs').insert({
      id: randomUUID(),
      date: '2025-01-02',
      perfume_id: ids.perfumeId,
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      usage: 'GiveAway' as never,
      customer_id: null,
      remarks: '',
      batch_number: BATCH1,
    });
    expect(res.error).toBeTruthy();
  });
});
