import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInAdmin, wipeAll } from '../helpers/db';

let admin: SupabaseClient;

beforeAll(async () => {
  admin = (await signInAdmin()).client;
  await wipeAll(admin);
});

afterAll(async () => {
  await wipeAll(admin);
});

beforeEach(async () => {
  await wipeAll(admin);
});

/**
 * `audit_logs` is populated by the app as a best-effort side-channel (fire-and-
 * forget). These tests assert that the schema accepts the entries the app
 * produces, and reject entries the schema disallows. They do NOT depend on the
 * app making the insert itself (that's covered by the E2E suite).
 */
describe('audit_logs schema', () => {
  it('accepts a valid CREATE entry for a SUPPLIER', async () => {
    const r = await admin.from('audit_logs').insert({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      user_id: null,
      user_name: 'TEST_user',
      action: 'CREATE',
      entity: 'SUPPLIER',
      entity_id: randomUUID(),
      details: 'created TEST supplier',
      previous_state: null,
    });
    expect(r.error).toBeNull();
  });

  it('round-trips previous_state JSONB', async () => {
    const id = randomUUID();
    await admin.from('audit_logs').insert({
      id,
      timestamp: new Date().toISOString(),
      user_id: null,
      user_name: 'TEST_user',
      action: 'UPDATE',
      entity: 'PERFUME',
      entity_id: randomUUID(),
      details: 'changed name',
      previous_state: { name: 'Old', price: 1 },
    });
    const sel = await admin.from('audit_logs').select('previous_state').eq('id', id).single();
    expect(sel.error).toBeNull();
    expect(sel.data.previous_state).toEqual({ name: 'Old', price: 1 });
  });

  it('CHECK constraint rejects unknown actions', async () => {
    const r = await admin.from('audit_logs').insert({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      user_id: null,
      user_name: 'TEST',
      action: 'TELEPORT' as never,
      entity: 'SUPPLIER',
      entity_id: randomUUID(),
      details: '',
      previous_state: null,
    });
    expect(r.error).toBeTruthy();
  });

  it('CHECK constraint rejects unknown entities', async () => {
    const r = await admin.from('audit_logs').insert({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      user_id: null,
      user_name: 'TEST',
      action: 'CREATE',
      entity: 'GALAXY' as never,
      entity_id: randomUUID(),
      details: '',
      previous_state: null,
    });
    expect(r.error).toBeTruthy();
  });

  it('covers all action/entity combos the app emits', async () => {
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'UNDO'];
    const entities = [
      'SUPPLIER', 'CUSTOMER', 'PERFUME', 'LOCATION', 'PACKING_TYPE',
      'GATE_IN', 'GATE_OUT', 'TRANSFER', 'USER', 'OLFACTIVE_NOTE',
    ];
    for (const action of actions) {
      for (const entity of entities) {
        const r = await admin.from('audit_logs').insert({
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          user_id: null,
          user_name: 'TEST',
          action,
          entity,
          entity_id: randomUUID(),
          details: `${action}/${entity}`,
          previous_state: null,
        });
        expect(r.error, `${action}/${entity}`).toBeNull();
      }
    }
  });
});
