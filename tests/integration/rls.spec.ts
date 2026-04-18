import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  signInAdmin,
  tryOperator,
  tryViewer,
  wipeAll,
} from '../helpers/db';
import { seedMinimal, type SeedIds } from '../helpers/seed';
import { makeSupplier, makeMainLocation } from '../helpers/factories';
import { SupplierType, LocationType } from '../../types';

let admin: SupabaseClient;
let operator: SupabaseClient | null;
let viewer: SupabaseClient | null;
let ids: SeedIds;

beforeAll(async () => {
  admin = (await signInAdmin()).client;
  operator = (await tryOperator())?.client ?? null;
  viewer = (await tryViewer())?.client ?? null;
  await wipeAll(admin);
});

afterAll(async () => {
  await wipeAll(admin);
});

beforeEach(async () => {
  await wipeAll(admin);
  ids = await seedMinimal(admin);
});

const describeIf = (flag: unknown) => (flag ? describe : describe.skip);

// ---------- Admin ----------
describe('RLS: Admin', () => {
  it('can read all master tables', async () => {
    for (const t of ['suppliers', 'customers', 'perfumes', 'locations', 'packing_types']) {
      const r = await admin.from(t).select('id').limit(1);
      expect(r.error, `select on ${t}`).toBeNull();
    }
  });

  it('can insert a supplier', async () => {
    const s = makeSupplier();
    const r = await admin.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: s.type,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    });
    expect(r.error).toBeNull();
  });

  it('can read audit_logs (only Admins are allowed per RLS)', async () => {
    const r = await admin.from('audit_logs').select('id').limit(1);
    expect(r.error).toBeNull();
  });
});

// ---------- Operator ----------
describeIf(process.env.TEST_OPERATOR_EMAIL)('RLS: Operator', () => {
  it('can read master data', async () => {
    const r = await operator!.from('suppliers').select('id').limit(1);
    expect(r.error).toBeNull();
  });

  it('cannot insert suppliers (Admin-only)', async () => {
    const s = makeSupplier({ type: SupplierType.Local });
    const r = await operator!.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: s.type,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    });
    expect(r.error).toBeTruthy();
    const confirm = await admin.from('suppliers').select('id').eq('id', s.id);
    expect(confirm.data?.length ?? 0).toBe(0);
  });

  it('cannot insert perfumes', async () => {
    const r = await operator!.from('perfumes').insert({
      id: randomUUID(),
      name: 'TEST_forbidden',
      code: 'X',
      supplier_id: ids.supplierId,
      dosage: 1,
      price_usd: 0,
      price_pkr: 0,
      low_stock_alert: 0,
      olfactive_notes: [],
      remarks: '',
    });
    expect(r.error).toBeTruthy();
  });

  it('cannot insert locations', async () => {
    const l = makeMainLocation();
    const r = await operator!.from('locations').insert({
      id: l.id,
      name: l.name,
      type: l.type,
      parent_id: null,
    });
    expect(r.error).toBeTruthy();
  });

  it('CAN insert gate_in_logs', async () => {
    const r = await operator!.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: ids.perfumeId,
      import_reference: 'OP-B1',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });
    expect(r.error).toBeNull();
  });

  it('CAN insert gate_out_logs and stock_transfer_logs', async () => {
    // Operator seeds a gate-in first (allowed), then gate-out + transfer.
    await operator!.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: ids.perfumeId,
      import_reference: 'OP-B1',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 100,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });
    const go = await operator!.from('gate_out_logs').insert({
      id: randomUUID(),
      date: '2025-01-02',
      perfume_id: ids.perfumeId,
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      usage: 'Production',
      customer_id: null,
      remarks: '',
      batch_number: 'OP-B1',
    });
    expect(go.error).toBeNull();

    const tx = await operator!.from('stock_transfer_logs').insert({
      id: randomUUID(),
      date: '2025-01-03',
      perfume_id: ids.perfumeId,
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 5,
      from_main_location_id: ids.locAId,
      from_sub_location_id: null,
      to_main_location_id: ids.locBId,
      to_sub_location_id: null,
      remarks: '',
      batch_number: 'OP-B1',
    });
    expect(tx.error).toBeNull();
  });

  it('cannot DELETE gate_in_logs (Admin-only)', async () => {
    const id = randomUUID();
    await admin.from('gate_in_logs').insert({
      id,
      date: '2025-01-01',
      perfume_id: ids.perfumeId,
      import_reference: 'ADMIN-B1',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 10,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });
    // Operator delete is denied by RLS. supabase-js may return no error but 0 rows
    // affected; we verify the row still exists afterwards.
    await operator!.from('gate_in_logs').delete().eq('id', id);
    const after = await admin.from('gate_in_logs').select('id').eq('id', id);
    expect(after.data?.length).toBe(1);
  });
});

// ---------- Viewer ----------
describeIf(process.env.TEST_VIEWER_EMAIL)('RLS: Viewer', () => {
  it('can read master data', async () => {
    const r = await viewer!.from('suppliers').select('id').limit(1);
    expect(r.error).toBeNull();
  });

  it('cannot insert ANY master data', async () => {
    const s = makeSupplier();
    const r = await viewer!.from('suppliers').insert({
      id: s.id,
      name: s.name,
      type: s.type,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
    });
    expect(r.error).toBeTruthy();
  });

  it('cannot insert gate_in_logs', async () => {
    const r = await viewer!.from('gate_in_logs').insert({
      id: randomUUID(),
      date: '2025-01-01',
      perfume_id: ids.perfumeId,
      import_reference: 'V-B1',
      packing_type_id: ids.packingTypeId,
      packing_qty: 1,
      net_weight: 5,
      main_location_id: ids.locAId,
      sub_location_id: null,
      supplier_invoice: '',
      remarks: '',
    });
    expect(r.error).toBeTruthy();
  });

  it('cannot read audit_logs', async () => {
    const r = await viewer!.from('audit_logs').select('id');
    // Policy is "SELECT only if Admin"; non-Admins receive 0 rows silently.
    expect(r.data?.length ?? 0).toBe(0);
  });

  // Acknowledge that Viewer is a placeholder role if not configured.
  it('viewer sign-in ok', () => {
    expect(viewer).toBeTruthy();
  });
});

// Helpful banner when optional roles aren't configured.
if (!process.env.TEST_OPERATOR_EMAIL) {
  // eslint-disable-next-line no-console
  console.log('[rls] TEST_OPERATOR_* not set -> Operator matrix skipped');
}
if (!process.env.TEST_VIEWER_EMAIL) {
  // eslint-disable-next-line no-console
  console.log('[rls] TEST_VIEWER_* not set -> Viewer matrix skipped');
}

// Keep linter happy about unused imports.
void LocationType;
