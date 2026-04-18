import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '../types';

/** Local UI testing only — never enable in production. */
const DEV_AUTH_BYPASS = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
const DEV_LOGIN_EMAIL = (import.meta.env.VITE_DEV_LOGIN_EMAIL || 'dev@scentvault.local').toLowerCase().trim();
const DEV_LOGIN_PASSWORD = import.meta.env.VITE_DEV_LOGIN_PASSWORD || 'scentvault123';
const DEV_USER_ID = '00000000-0000-4000-a000-000000000001';
const DEV_ACCESS_TOKEN = 'dev-bypass-token';

const isDevBypassSession = (s: Session | null) => s?.access_token === DEV_ACCESS_TOKEN;

/** Match sign-up and sign-in (Supabase stores emails normalized; avoid stray spaces / casing typos). */
const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

/** If profiles row is missing or fetch fails, derive role from auth metadata so RLS and UI still work. */
const buildFallbackProfile = (authUser: SupabaseUser): User => {
  const raw = authUser.user_metadata?.role;
  const role =
    typeof raw === 'string' && (Object.values(UserRole) as string[]).includes(raw)
      ? (raw as UserRole)
      : UserRole.Admin;
  const metaName = authUser.user_metadata?.name;
  const name =
    typeof metaName === 'string' && metaName.trim() !== ''
      ? metaName
      : authUser.email?.split('@')[0] || 'User';
  return {
    id: authUser.id,
    name,
    role,
    permissions: {
      canViewPrices: role === UserRole.Admin,
      allowedLocationIds: [],
    },
  };
};

/** Friendlier copy for common GoTrue responses (messages vary by server version). */
const formatSignInError = (err: { message: string; status?: number; code?: string }): string => {
  const msg = (err.message || '').trim();
  const code = err.code || '';
  const lower = msg.toLowerCase();

  if (code === 'email_not_confirmed' || lower.includes('not confirmed')) {
    return 'Confirm your email first — open the link Supabase sent you, then sign in. (For local dev you can turn off “Confirm email” under Authentication → Providers → Email.)';
  }
  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return 'Invalid email or password. If you just signed up, confirm your email from the inbox link before signing in.';
  }
  if (lower.includes('email') && lower.includes('not found')) {
    return 'No login found for this email yet, or the account is not active. Confirm your email if you just registered, or check Authentication → Users in Supabase.';
  }
  return msg;
};

const buildDevSession = (email: string): Session => {
  const user = {
    id: DEV_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { name: 'Dev Admin' },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  } as SupabaseUser;

  return {
    access_token: DEV_ACCESS_TOKEN,
    refresh_token: 'dev-bypass-refresh',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: 'bearer',
    user,
  };
};

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(!DEV_AUTH_BYPASS);

  // Fetch user profile from our profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching profile:', error);
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user;
        if (u?.id === userId) {
          const fallback = buildFallbackProfile(u);
          setProfile(fallback);
          return fallback;
        }
        return null;
      }

      const userProfile: User = {
        id: data.id,
        name: data.name,
        role: data.role as UserRole,
        permissions: {
          canViewPrices: data.can_view_prices ?? false,
          allowedLocationIds: data.allowed_location_ids ?? [],
        },
      };

      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Profile fetch failed:', err);
      const { data: authData } = await supabase.auth.getUser();
      const u = authData.user;
      if (u?.id === userId) {
        const fallback = buildFallbackProfile(u);
        setProfile(fallback);
        return fallback;
      }
      return null;
    }
  }, []);

  // Initialize auth state (skip Supabase when using local dev bypass)
  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      return;
    }

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      // Drop any persisted session from storage (older builds used persistSession: true).
      // With persistSession: false, each full reload must show the login page.
      await supabase.auth.signOut({ scope: 'local' });
      if (cancelled) return;

      // Never await Supabase REST calls inside onAuthStateChange — it can deadlock the auth
      // mutex and leave getSession's profile fetch hanging, so isLoading never clears.
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const uid = newSession.user.id;
          setTimeout(() => {
            void fetchProfile(uid);
          }, 0);
        } else {
          setProfile(null);
        }
      });
      if (cancelled) {
        sub.unsubscribe();
        return;
      }
      subscription = sub;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id).finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('getSession failed:', err);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (DEV_AUTH_BYPASS) {
      const e = normalizeAuthEmail(email);
      if (e === DEV_LOGIN_EMAIL && password === DEV_LOGIN_PASSWORD) {
        const sess = buildDevSession(DEV_LOGIN_EMAIL);
        setSession(sess);
        setUser(sess.user);
        setProfile({
          id: DEV_USER_ID,
          name: 'Dev Admin',
          role: UserRole.Admin,
          permissions: { canViewPrices: true, allowedLocationIds: [] },
        });
        return { error: null };
      }
      return { error: 'Invalid email or password' };
    }

    const normalizedEmail = normalizeAuthEmail(email);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) return { error: formatSignInError(error) };
    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole = UserRole.Admin) => {
    if (DEV_AUTH_BYPASS) {
      return {
        error: 'Sign up is disabled while dev bypass is on. Use the test account from the banner above.',
      };
    }

    const normalizedEmail = normalizeAuthEmail(email);
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        data: { name, role },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    if (isDevBypassSession(session)) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    if (isDevBypassSession(session)) {
      setProfile((prev) => {
        if (!prev) return null;
        const next: User = { ...prev, ...updates };
        if (updates.permissions) {
          next.permissions = {
            canViewPrices: updates.permissions.canViewPrices ?? prev.permissions?.canViewPrices ?? false,
            allowedLocationIds:
              updates.permissions.allowedLocationIds ?? prev.permissions?.allowedLocationIds ?? [],
          };
        }
        return next;
      });
      return;
    }

    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.permissions?.canViewPrices !== undefined) dbUpdates.can_view_prices = updates.permissions.canViewPrices;
    if (updates.permissions?.allowedLocationIds !== undefined) dbUpdates.allowed_location_ids = updates.permissions.allowedLocationIds;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) throw error;
    await fetchProfile(user.id);
  };

  const refreshProfile = useCallback(async () => {
    if (isDevBypassSession(session)) return;
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile, session]);

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
