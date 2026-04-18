import { supabase } from '../lib/supabase';
import { GateInLog, GateOutLog, StockTransferLog } from '../types';

async function authUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// GATE IN
// ============================================
const gateInToDb = (l: GateInLog) => ({
  id: l.id,
  date: l.date,
  perfume_id: l.perfumeId,
  import_reference: l.importReference,
  packing_type_id: l.packingTypeId,
  packing_qty: l.packingQty,
  net_weight: l.netWeight,
  main_location_id: l.mainLocationId,
  sub_location_id: l.subLocationId || null,
  supplier_invoice: l.supplierInvoice,
  remarks: l.remarks,
  price_usd: l.priceUSD ?? null,
  price_pkr: l.pricePKR ?? null,
});

const gateInFromDb = (row: any): GateInLog => ({
  id: row.id,
  date: row.date,
  perfumeId: row.perfume_id,
  importReference: row.import_reference || '',
  packingTypeId: row.packing_type_id,
  packingQty: Number(row.packing_qty) || 0,
  netWeight: Number(row.net_weight) || 0,
  mainLocationId: row.main_location_id,
  subLocationId: row.sub_location_id || undefined,
  supplierInvoice: row.supplier_invoice || '',
  remarks: row.remarks || '',
  priceUSD: row.price_usd != null ? Number(row.price_usd) : undefined,
  pricePKR: row.price_pkr != null ? Number(row.price_pkr) : undefined,
});

// ============================================
// GATE OUT
// ============================================
const gateOutToDb = (l: GateOutLog) => ({
  id: l.id,
  date: l.date,
  perfume_id: l.perfumeId,
  packing_type_id: l.packingTypeId,
  packing_qty: l.packingQty,
  net_weight: l.netWeight,
  main_location_id: l.mainLocationId,
  sub_location_id: l.subLocationId || null,
  usage: l.usage,
  customer_id: l.customerId || null,
  remarks: l.remarks,
  batch_number: l.batchNumber,
});

const gateOutFromDb = (row: any): GateOutLog => ({
  id: row.id,
  date: row.date,
  perfumeId: row.perfume_id,
  packingTypeId: row.packing_type_id,
  packingQty: Number(row.packing_qty) || 0,
  netWeight: Number(row.net_weight) || 0,
  mainLocationId: row.main_location_id,
  subLocationId: row.sub_location_id || undefined,
  usage: row.usage,
  customerId: row.customer_id || undefined,
  remarks: row.remarks || '',
  batchNumber: row.batch_number || '',
});

// ============================================
// STOCK TRANSFER
// ============================================
const transferToDb = (l: StockTransferLog) => ({
  id: l.id,
  date: l.date,
  perfume_id: l.perfumeId,
  packing_type_id: l.packingTypeId,
  packing_qty: l.packingQty,
  net_weight: l.netWeight,
  from_main_location_id: l.fromMainLocationId,
  from_sub_location_id: l.fromSubLocationId || null,
  to_main_location_id: l.toMainLocationId,
  to_sub_location_id: l.toSubLocationId || null,
  remarks: l.remarks,
  batch_number: l.batchNumber,
});

const transferFromDb = (row: any): StockTransferLog => ({
  id: row.id,
  date: row.date,
  perfumeId: row.perfume_id,
  packingTypeId: row.packing_type_id,
  packingQty: Number(row.packing_qty) || 0,
  netWeight: Number(row.net_weight) || 0,
  fromMainLocationId: row.from_main_location_id,
  fromSubLocationId: row.from_sub_location_id || undefined,
  toMainLocationId: row.to_main_location_id,
  toSubLocationId: row.to_sub_location_id || undefined,
  remarks: row.remarks || '',
  batchNumber: row.batch_number || '',
});

export const transactionService = {
  // ── Gate In ──────────────────────────────
  async getAllGateIn(): Promise<GateInLog[]> {
    const { data, error } = await supabase
      .from('gate_in_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(gateInFromDb);
  },

  async createGateIn(log: GateInLog): Promise<GateInLog> {
    const createdBy = await authUserId();
    const { data, error } = await supabase
      .from('gate_in_logs')
      .insert({ ...gateInToDb(log), created_by: createdBy })
      .select()
      .single();
    if (error) throw error;
    return gateInFromDb(data);
  },

  async updateGateIn(id: string, log: GateInLog): Promise<GateInLog> {
    const { data, error } = await supabase
      .from('gate_in_logs')
      .update(gateInToDb(log))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return gateInFromDb(data);
  },

  async deleteGateIn(id: string): Promise<void> {
    const { error } = await supabase
      .from('gate_in_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Gate Out ─────────────────────────────
  async getAllGateOut(): Promise<GateOutLog[]> {
    const { data, error } = await supabase
      .from('gate_out_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(gateOutFromDb);
  },

  async createGateOut(log: GateOutLog): Promise<GateOutLog> {
    const createdBy = await authUserId();
    const { data, error } = await supabase
      .from('gate_out_logs')
      .insert({ ...gateOutToDb(log), created_by: createdBy })
      .select()
      .single();
    if (error) throw error;
    return gateOutFromDb(data);
  },

  async updateGateOut(id: string, log: GateOutLog): Promise<GateOutLog> {
    const { data, error } = await supabase
      .from('gate_out_logs')
      .update(gateOutToDb(log))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return gateOutFromDb(data);
  },

  async deleteGateOut(id: string): Promise<void> {
    const { error } = await supabase
      .from('gate_out_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ── Stock Transfer ───────────────────────
  async getAllTransfers(): Promise<StockTransferLog[]> {
    const { data, error } = await supabase
      .from('stock_transfer_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(transferFromDb);
  },

  async createTransfer(log: StockTransferLog): Promise<StockTransferLog> {
    const createdBy = await authUserId();
    const { data, error } = await supabase
      .from('stock_transfer_logs')
      .insert({ ...transferToDb(log), created_by: createdBy })
      .select()
      .single();
    if (error) throw error;
    return transferFromDb(data);
  },

  async updateTransfer(id: string, log: StockTransferLog): Promise<StockTransferLog> {
    const { data, error } = await supabase
      .from('stock_transfer_logs')
      .update(transferToDb(log))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return transferFromDb(data);
  },

  async deleteTransfer(id: string): Promise<void> {
    const { error } = await supabase
      .from('stock_transfer_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
