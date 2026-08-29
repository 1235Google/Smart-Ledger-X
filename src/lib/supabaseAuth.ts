import { supabase, isSupabaseConfigured } from './supabase';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { upsertUserProfileToSupabase } from './supabaseDb';

export interface SupabaseAuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

/**
 * Sign in using Supabase Email & Password
 */
export async function loginWithSupabaseEmail(email: string, password: string): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured()) {
    return { user: null, session: null, error: 'Supabase is not configured in environment.' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { user: null, session: null, error: error.message };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err?.message || 'Login failed.' };
  }
}

/**
 * Register a new user using Supabase Email & Password
 */
export async function registerWithSupabaseEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured()) {
    return { user: null, session: null, error: 'Supabase is not configured in environment.' };
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          name: fullName || '',
        },
      },
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    if (data.user && fullName) {
      await upsertUserProfileToSupabase({ fullName, email }, data.user.id);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err?.message || 'Registration failed.' };
  }
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function loginWithSupabaseOAuth(
  provider: 'google' | 'github' | 'apple' = 'google',
  redirectTo?: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase is not configured in environment.' };
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined),
      },
    });
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err?.message || 'OAuth sign-in failed.' };
  }
}

/**
 * Sign in using Magic Link / OTP
 */
export async function loginWithSupabaseOtp(email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase is not configured in environment.' };
  }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to send magic link.' };
  }
}

/**
 * Sign out of Supabase session
 */
export async function logoutSupabase(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err?.message || 'Logout failed.' };
  }
}

/**
 * Get current authenticated Supabase user
 */
export async function getSupabaseUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Subscribe to Supabase auth state changes
 */
export function listenToSupabaseAuth(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} };
  const { data } = supabase.auth.onAuthStateChange(callback);
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
