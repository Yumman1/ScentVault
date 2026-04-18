import type { SupabaseClient } from '@supabase/supabase-js';
import {
  makeSupplier,
  makeCustomer,
  makePackingType,
  makeMainLocation,
  makePerfume,
} from './factories';
import { SupplierType } from '../../types';

export interface SeedIds {
  supplierId: string;
  customerId: string;
  packingTypeId: string;
  locAId: string;
  locBId: string;
  perfumeId: string;
}

/**
 * Create a minimal scenario to anchor transaction tests:
 *   - 1 supplier
 *   - 1 customer
 *   - 1 packing type
 *   - 2 main locations (A, B)
 *   - 1 perfume linked to the supplier
 */
export async function seedMinimal(client: SupabaseClient): Promise<SeedIds> {
  const supplier = makeSupplier({ type: SupplierType.International });
  const s = await client.from('suppliers').insert({
    id: supplier.id,
    name: supplier.name,
    type: supplier.type,
    contact_person: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
  });
  if (s.error) throw new Error(`seed supplier: ${s.error.message}`);

  const customer = makeCustomer();
  const c = await client.from('customers').insert({
    id: customer.id,
    name: customer.name,
    address: customer.address,
    phone: customer.phone,
    email: customer.email,
  });
  if (c.error) throw new Error(`seed customer: ${c.error.message}`);

  const packingType = makePackingType();
  const pt = await client.from('packing_types').insert({
    id: packingType.id,
    name: packingType.name,
    description: packingType.description,
    qty_per_packing: packingType.qtyPerPacking,
  });
  if (pt.error) throw new Error(`seed packing_type: ${pt.error.message}`);

  const locA = makeMainLocation({ name: 'TEST_LocA' });
  const locB = makeMainLocation({ name: 'TEST_LocB' });
  const locs = await client.from('locations').insert([
    { id: locA.id, name: locA.name, type: locA.type, parent_id: null },
    { id: locB.id, name: locB.name, type: locB.type, parent_id: null },
  ]);
  if (locs.error) throw new Error(`seed locations: ${locs.error.message}`);

  const perfume = makePerfume(supplier.id);
  const p = await client.from('perfumes').insert({
    id: perfume.id,
    name: perfume.name,
    code: perfume.code,
    supplier_id: perfume.supplierId,
    dosage: perfume.dosage,
    price_usd: perfume.priceUSD,
    price_pkr: perfume.pricePKR,
    low_stock_alert: perfume.lowStockAlert,
    olfactive_notes: perfume.olfactiveNotes,
    remarks: perfume.remarks,
  });
  if (p.error) throw new Error(`seed perfume: ${p.error.message}`);

  return {
    supplierId: supplier.id,
    customerId: customer.id,
    packingTypeId: packingType.id,
    locAId: locA.id,
    locBId: locB.id,
    perfumeId: perfume.id,
  };
}

/**
 * Read all logs for a perfume from the DB into the shape expected by
 * computeStockPositions. Converts snake_case -> camelCase exactly like
 * the app's services do.
 */
export async function readLogs(client: SupabaseClient, perfumeId: string) {
  const [gi, go, tx] = await Promise.all([
    client.from('gate_in_logs').select('*').eq('perfume_id', perfumeId),
    client.from('gate_out_logs').select('*').eq('perfume_id', perfumeId),
    client.from('stock_transfer_logs').select('*').eq('perfume_id', perfumeId),
  ]);
  if (gi.error) throw gi.error;
  if (go.error) throw go.error;
  if (tx.error) throw tx.error;

  return {
    gateIn: (gi.data || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      perfumeId: r.perfume_id,
      importReference: r.import_reference || '',
      packingTypeId: r.packing_type_id,
      packingQty: Number(r.packing_qty) || 0,
      netWeight: Number(r.net_weight) || 0,
      mainLocationId: r.main_location_id,
      subLocationId: r.sub_location_id || undefined,
      supplierInvoice: r.supplier_invoice || '',
      remarks: r.remarks || '',
      priceUSD: r.price_usd != null ? Number(r.price_usd) : undefined,
      pricePKR: r.price_pkr != null ? Number(r.price_pkr) : undefined,
    })),
    gateOut: (go.data || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      perfumeId: r.perfume_id,
      packingTypeId: r.packing_type_id,
      packingQty: Number(r.packing_qty) || 0,
      netWeight: Number(r.net_weight) || 0,
      mainLocationId: r.main_location_id,
      subLocationId: r.sub_location_id || undefined,
      usage: r.usage,
      customerId: r.customer_id || undefined,
      remarks: r.remarks || '',
      batchNumber: r.batch_number || '',
    })),
    transfer: (tx.data || []).map((r: any) => ({
      id: r.id,
      date: r.date,
      perfumeId: r.perfume_id,
      packingTypeId: r.packing_type_id,
      packingQty: Number(r.packing_qty) || 0,
      netWeight: Number(r.net_weight) || 0,
      fromMainLocationId: r.from_main_location_id,
      fromSubLocationId: r.from_sub_location_id || undefined,
      toMainLocationId: r.to_main_location_id,
      toSubLocationId: r.to_sub_location_id || undefined,
      remarks: r.remarks || '',
      batchNumber: r.batch_number || '',
    })),
  };
}
