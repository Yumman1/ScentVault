import { supabase } from '../lib/supabase';
import { AuditEntry, AuditAction, AuditEntity } from '../types';

const toDb = (entry: AuditEntry) => ({
  id: entry.id,
  timestamp: entry.timestamp,
  user_id: entry.userId === 'system' ? null : entry.userId,
  user_name: entry.userName,
  action: entry.action,
  entity: entry.entity,
  entity_id: entry.entityId,
  details: entry.details,
  previous_state: entry.previousState ? JSON.parse(entry.previousState) : null,
});

const fromDb = (row: any): AuditEntry => ({
  id: row.id,
  timestamp: row.timestamp,
  userId: row.user_id || 'system',
  userName: row.user_name || 'System',
  action: row.action as AuditAction,
  entity: row.entity as AuditEntity,
  entityId: row.entity_id || '',
  details: row.details || '',
  previousState: row.previous_state ? JSON.stringify(row.previous_state) : undefined,
});

export const auditService = {
  async getAll(limit: number = 500): Promise<AuditEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  async create(entry: AuditEntry): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert(toDb(entry));
    if (error) {
      // Non-blocking: audit failures should not break the app
      console.error('Audit log failed:', error);
    }
  },

  async clear(): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) throw error;
  },
};
