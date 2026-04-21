import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when env vars were missing at build time (common on Vercel if not set before deploy). */
export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === 'string' &&
    supabaseUrl.trim() !== '' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim() !== ''
);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. .env.local locally, Vercel Env Vars + redeploy for production).'
  );
}

export const supabase = createClient(
  (isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co') as string,
  (isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key') as string,
  {
    auth: {
      autoRefreshToken: true,
      // Session only in memory — each full page load starts at the login screen (no auto-login from storage).
      persistSession: false,
      detectSessionInUrl: true,
    },
  }
);

export default supabase;
