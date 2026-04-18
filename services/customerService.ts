import { supabase } from '../lib/supabase';
import { Customer } from '../types';

const toDb = (c: Customer) => ({
  id: c.id,
  name: c.name,
  address: c.address,
  phone: c.phone,
  email: c.email,
});

const fromDb = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  address: row.address || '',
  phone: row.phone || '',
  email: row.email || '',
});

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(customer: Customer): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(toDb(customer))
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async update(id: string, customer: Customer): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(toDb(customer))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
