import { supabase } from '../lib/supabase';
import { Location } from '../types';

const toDb = (l: Location) => ({
  id: l.id,
  name: l.name,
  type: l.type,
  parent_id: l.parentId || null,
});

const fromDb = (row: any): Location => ({
  id: row.id,
  name: row.name,
  type: row.type,
  parentId: row.parent_id || undefined,
});

export const locationService = {
  async getAll(): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(location: Location): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .insert(toDb(location))
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async update(id: string, location: Location): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .update(toDb(location))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
