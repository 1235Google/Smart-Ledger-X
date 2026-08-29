import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Read Supabase credentials securely from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback dummy values to prevent initialization crash if environment variables are not set yet
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_key';

/**
 * Validates whether Supabase environment variables are properly configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== fallbackUrl &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder-project')
  );
}

/**
 * Reusable Supabase Client singleton
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'x-application-name': 'smart-ledger-x',
      },
    },
  }
);

// Log initialization status
if (isSupabaseConfigured()) {
  console.log('[Supabase] Initialized successfully with project URL:', supabaseUrl);
} else {
  console.info(
    '[Supabase] Supabase client initialized in placeholder mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable live Supabase cloud sync.'
  );
}

/* ==========================================================================
   AUTHENTICATION HELPERS
   ========================================================================== */

/**
 * Sign up a new user with email and password
 */
export async function supabaseSignUp(email: string, password: string, options?: { data?: Record<string, any>; emailRedirectTo?: string }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return await supabase.auth.signUp({
    email,
    password,
    options,
  });
}

/**
 * Sign in existing user with email and password
 */
export async function supabaseSignInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign in using OAuth provider (e.g. google, github)
 */
export async function supabaseSignInWithOAuth(provider: 'google' | 'github' | 'azure' | 'apple', redirectTo?: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined),
    },
  });
}

/**
 * Sign out the currently authenticated user
 */
export async function supabaseSignOut() {
  if (!isSupabaseConfigured()) return { error: null };
  return await supabase.auth.signOut();
}

/**
 * Get current active session
 */
export async function supabaseGetSession(): Promise<{ session: Session | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { session: null, error: null };
  }
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/**
 * Get current authenticated user
 */
export async function supabaseGetUser(): Promise<{ user: User | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: null };
  }
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

/**
 * Send password reset email
 */
export async function supabaseResetPasswordForEmail(email: string, redirectTo?: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined),
  });
}

/**
 * Subscribe to Supabase Auth state changes
 */
export function onSupabaseAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/* ==========================================================================
   DATABASE CRUD HELPERS
   ========================================================================== */

/**
 * Generic fetcher for a Supabase table
 */
export async function supabaseFetchAll<T = any>(
  table: string, 
  options?: { 
    columns?: string; 
    orderBy?: string; 
    ascending?: boolean; 
    limit?: number;
    match?: Record<string, any>;
  }
): Promise<{ data: T[] | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  let query = supabase.from(table).select(options?.columns || '*');

  if (options?.match) {
    query = query.match(options.match);
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  return { data: data as T[] | null, error };
}

/**
 * Insert record(s) into a table
 */
export async function supabaseInsert<T = any>(table: string, records: Record<string, any> | Record<string, any>[]): Promise<{ data: T | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  const { data, error } = await supabase.from(table).insert(records).select();
  return { data: (Array.isArray(records) ? data : data?.[0]) as T | null, error };
}

/**
 * Update a record in a table by column identifier (defaults to 'id')
 */
export async function supabaseUpdate<T = any>(
  table: string, 
  idValue: string | number, 
  values: Record<string, any>, 
  idColumn: string = 'id'
): Promise<{ data: T | null; error: any }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  const { data, error } = await supabase
    .from(table)
    .update(values)
    .eq(idColumn, idValue)
    .select();
  return { data: data?.[0] as T | null, error };
}

/**
 * Delete a record from a table by column identifier
 */
export async function supabaseDelete(
  table: string, 
  idValue: string | number, 
  idColumn: string = 'id'
): Promise<{ error: any }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase is not configured.') };
  }
  const { error } = await supabase.from(table).delete().eq(idColumn, idValue);
  return { error };
}

/* ==========================================================================
   STORAGE BUCKET HELPERS
   ========================================================================== */

/**
 * Upload a file/blob to a Supabase Storage bucket
 */
export async function supabaseUploadFile(
  bucket: string,
  filePath: string,
  fileBody: File | Blob | ArrayBuffer | string,
  options?: {
    contentType?: string;
    upsert?: boolean;
  }
) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileBody, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? true,
  });

  return { data, error };
}

/**
 * Get public URL for a stored file in a public bucket
 */
export function supabaseGetPublicUrl(bucket: string, filePath: string): string {
  if (!isSupabaseConfigured()) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Download a file from a storage bucket
 */
export async function supabaseDownloadFile(bucket: string, filePath: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return await supabase.storage.from(bucket).download(filePath);
}

/**
 * Delete file(s) from a storage bucket
 */
export async function supabaseDeleteFiles(bucket: string, filePaths: string[]) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  return await supabase.storage.from(bucket).remove(filePaths);
}

/**
 * List files inside a bucket path
 */
export async function supabaseListFiles(
  bucket: string, 
  folderPath: string = '', 
  options?: { limit?: number; offset?: number; sortBy?: { column?: string; order?: string } }
) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: new Error('Supabase is not configured.') };
  }
  return await supabase.storage.from(bucket).list(folderPath, options);
}

export default supabase;
