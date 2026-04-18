import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

// Convert between camelCase (frontend) and snake_case (database)
const toDb = (s: Supplier) => ({
  id: s.id,
  name: s.name,
  type: s.type,
  contact_person: s.contactPerson,
  phone: s.phone,
  email: s.email,
});

const fromDb = (row: any): Supplier => ({
  id: row.id,
  name: row.name,
  type: row.type,
  contactPerson: row.contact_person,
  phone: row.phone,
  email: row.email,
});

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(supplier: Supplier): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(toDb(supplier))
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async update(id: string, supplier: Supplier): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(toDb(supplier))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
