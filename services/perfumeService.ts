import { supabase } from '../lib/supabase';
import { Perfume } from '../types';

const toDb = (p: Perfume) => ({
  id: p.id,
  name: p.name,
  code: p.code,
  supplier_id: p.supplierId && p.supplierId.trim() !== '' ? p.supplierId : null,
  dosage: p.dosage,
  price_usd: p.priceUSD,
  price_pkr: p.pricePKR,
  low_stock_alert: p.lowStockAlert,
  olfactive_notes: p.olfactiveNotes || [],
  remarks: p.remarks,
});

const fromDb = (row: any): Perfume => ({
  id: row.id,
  name: row.name,
  code: row.code || '',
  supplierId: row.supplier_id ?? '',
  dosage: Number(row.dosage) || 0,
  priceUSD: Number(row.price_usd) || 0,
  pricePKR: Number(row.price_pkr) || 0,
  lowStockAlert: Number(row.low_stock_alert) || 0,
  olfactiveNotes: row.olfactive_notes || [],
  remarks: row.remarks || '',
});

export const perfumeService = {
  async getAll(): Promise<Perfume[]> {
    const { data, error } = await supabase
      .from('perfumes')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(perfume: Perfume): Promise<Perfume> {
    const { data, error } = await supabase
      .from('perfumes')
      .insert(toDb(perfume))
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async update(id: string, perfume: Perfume): Promise<Perfume> {
    const { data, error } = await supabase
      .from('perfumes')
      .update(toDb(perfume))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('perfumes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
