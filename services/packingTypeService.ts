import { supabase } from '../lib/supabase';
import { PackingType } from '../types';

const toDb = (p: PackingType) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  qty_per_packing: p.qtyPerPacking,
});

const fromDb = (row: any): PackingType => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  qtyPerPacking: Number(row.qty_per_packing) || 0,
});

export const packingTypeService = {
  async getAll(): Promise<PackingType[]> {
    const { data, error } = await supabase
      .from('packing_types')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(packingType: PackingType): Promise<PackingType> {
    const { data, error } = await supabase
      .from('packing_types')
      .insert(toDb(packingType))
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async update(id: string, packingType: PackingType): Promise<PackingType> {
    const { data, error } = await supabase
      .from('packing_types')
      .update(toDb(packingType))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('packing_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
