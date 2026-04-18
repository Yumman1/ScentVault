import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

const toDbUpdates = (u: Partial<User>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (u.name !== undefined) db.name = u.name;
  if (u.role !== undefined) db.role = u.role;
  if (u.permissions?.canViewPrices !== undefined) db.can_view_prices = u.permissions.canViewPrices;
  if (u.permissions?.allowedLocationIds !== undefined) db.allowed_location_ids = u.permissions.allowedLocationIds;
  return db;
};

const fromDb = (row: Record<string, unknown>): User => ({
  id: row.id as string,
  name: row.name as string,
  role: row.role as UserRole,
  permissions: {
    canViewPrices: (row.can_view_prices as boolean) ?? false,
    allowedLocationIds: (row.allowed_location_ids as string[]) ?? [],
  },
});

export const profileService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*').order('name');
    if (error) throw error;
    return (data || []).map((row) => fromDb(row as Record<string, unknown>));
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const dbUpdates = toDbUpdates(updates);
    if (Object.keys(dbUpdates).length === 0) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return fromDb(data as Record<string, unknown>);
    }
    const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return fromDb(data as Record<string, unknown>);
  },
};
