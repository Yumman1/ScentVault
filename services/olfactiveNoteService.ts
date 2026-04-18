import { supabase } from '../lib/supabase';

export interface OlfactiveNote {
  id: string;
  name: string;
}

const fromDb = (row: any): string => row.name;

export const olfactiveNoteService = {
  async getAll(): Promise<string[]> {
    const { data, error } = await supabase
      .from('olfactive_notes')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(name: string): Promise<string> {
    const { data, error } = await supabase
      .from('olfactive_notes')
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) throw error;
    return data.name;
  },

  async update(oldName: string, newName: string): Promise<void> {
    const { error } = await supabase.rpc('rename_olfactive_note', {
      old_name: oldName,
      new_name: newName.trim(),
    });
    if (error) throw error;
  },

  async delete(name: string): Promise<void> {
    const { error } = await supabase
      .from('olfactive_notes')
      .delete()
      .eq('name', name);
    if (error) throw error;
  },
};
