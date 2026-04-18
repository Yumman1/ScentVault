import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_ENV, assertWipeAllowed } from '../env';

export interface SignedInClient {
  client: SupabaseClient;
  userId: string;
  email: string;
}

/**
 * Create a fresh Supabase client (isolated auth storage) and sign it in.
 * Each call returns an independent session so several roles can be
 * represented simultaneously (needed for RLS matrix tests).
 */
export async function signInAs(
  email: string,
  password: string,
): Promise<SignedInClient> {
  const client = createClient(TEST_ENV.supabaseUrl, TEST_ENV.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `scentvault-test-${email}-${Math.random()}`,
    },
  });
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const { data, error } = await client.auth.signInWithPassword({
    email: trimmedEmail,
    password: trimmedPassword,
  });
  if (error || !data.user) {
    const msg = error?.message ?? 'no user returned';
    const hints =
      /invalid login credentials|invalid/i.test(msg)
        ? '\n  Common fixes: wrong TEST_ADMIN_PASSWORD; user not in this Supabase project; email not confirmed (Dashboard → Authentication → turn off "Confirm email" or confirm the user); stray spaces or quotes in .env.test.'
        : '';
    throw new Error(`Sign-in failed for ${trimmedEmail}: ${msg}.${hints}`);
  }
  return { client, userId: data.user.id, email };
}

export async function signInAdmin(): Promise<SignedInClient> {
  return signInAs(TEST_ENV.adminEmail, TEST_ENV.adminPassword);
}

export async function tryOperator(): Promise<SignedInClient | null> {
  if (!TEST_ENV.operatorEmail || !TEST_ENV.operatorPassword) return null;
  return signInAs(TEST_ENV.operatorEmail, TEST_ENV.operatorPassword);
}

export async function tryViewer(): Promise<SignedInClient | null> {
  if (!TEST_ENV.viewerEmail || !TEST_ENV.viewerPassword) return null;
  return signInAs(TEST_ENV.viewerEmail, TEST_ENV.viewerPassword);
}

/**
 * Tables in FK-safe delete order.
 * The app's auth users and `profiles` table are NOT touched.
 */
export const WIPE_ORDER = [
  'audit_logs',
  'gate_in_logs',
  'gate_out_logs',
  'stock_transfer_logs',
  'perfumes',
  'olfactive_notes',
  'packing_types',
  // locations wiped in two passes (sub first, then main) via parent_id filter.
  'locations',
  'customers',
  'suppliers',
] as const;

/**
 * Delete every row from every app-managed table.
 *
 * Safety:
 *  - Requires TESTS_ALLOW_WIPE=1 in .env.test.
 *  - Uses the Admin session; RLS policies restrict this to authenticated Admin.
 *  - Does NOT touch `auth.users` or `public.profiles`.
 */
export async function wipeAll(client?: SupabaseClient): Promise<void> {
  assertWipeAllowed();
  const c = client ?? (await signInAdmin()).client;

  for (const table of WIPE_ORDER) {
    if (table === 'locations') {
      // Sub locations first (have parent_id), then main locations.
      const sub = await c.from('locations').delete().not('parent_id', 'is', null);
      if (sub.error) {
        throw new Error(`Wipe failed on locations (sub): ${sub.error.message}`);
      }
      const main = await c.from('locations').delete().is('parent_id', null);
      if (main.error) {
        throw new Error(`Wipe failed on locations (main): ${main.error.message}`);
      }
      continue;
    }

    // `delete()` in supabase-js requires a filter; use "not impossible id".
    const res = await c
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (res.error) {
      // olfactive_notes use name as key, not id, in some flows - still OK.
      throw new Error(`Wipe failed on ${table}: ${res.error.message}`);
    }
  }
}

export interface RowCounts {
  [table: string]: number;
}

export async function countAllRows(client: SupabaseClient): Promise<RowCounts> {
  const counts: RowCounts = {};
  for (const table of WIPE_ORDER) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(`count(${table}) failed: ${error.message}`);
    counts[table] = count ?? 0;
  }
  return counts;
}
