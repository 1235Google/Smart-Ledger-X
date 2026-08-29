import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  supabaseSignInWithPassword,
  supabaseSignUp,
  supabaseSignOut,
  supabaseGetSession,
  supabaseGetUser,
  onSupabaseAuthStateChange,
  supabaseFetchAll,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
  supabaseUploadFile,
  supabaseGetPublicUrl,
} from '../lib/supabase';

export interface UseSupabaseReturn {
  supabase: typeof supabase;
  isConfigured: boolean;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: typeof supabaseSignInWithPassword;
  signUp: typeof supabaseSignUp;
  signOut: typeof supabaseSignOut;
  fetchTable: typeof supabaseFetchAll;
  insertRecord: typeof supabaseInsert;
  updateRecord: typeof supabaseUpdate;
  deleteRecord: typeof supabaseDelete;
  uploadFile: typeof supabaseUploadFile;
  getPublicUrl: typeof supabaseGetPublicUrl;
  refreshSession: () => Promise<void>;
}

/**
 * Custom React Hook for Supabase integrations (Auth, DB, Storage)
 */
export function useSupabase(): UseSupabaseReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  const refreshSession = useCallback(async () => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }
    try {
      const { session: currentSession } = await supabaseGetSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch (err) {
      console.warn('[useSupabase] Failed to retrieve session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    refreshSession();

    if (!isConfigured) return;

    const { data: authSubscription } = onSupabaseAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      authSubscription?.subscription?.unsubscribe();
    };
  }, [isConfigured, refreshSession]);

  return {
    supabase,
    isConfigured,
    user,
    session,
    isLoading,
    signIn: supabaseSignInWithPassword,
    signUp: supabaseSignUp,
    signOut: supabaseSignOut,
    fetchTable: supabaseFetchAll,
    insertRecord: supabaseInsert,
    updateRecord: supabaseUpdate,
    deleteRecord: supabaseDelete,
    uploadFile: supabaseUploadFile,
    getPublicUrl: supabaseGetPublicUrl,
    refreshSession,
  };
}

export default useSupabase;
