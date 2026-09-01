import { supabase, isSupabaseConfigured } from './supabase';

export const SUPABASE_BACKUP_BUCKET = 'smart-ledger-backups';

/**
 * Ensures the 'smart-ledger-backups' bucket is available
 */
export async function ensureBackupBucket(): Promise<{ ready: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ready: false, error: 'Supabase is not configured' };
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn('[Supabase Storage] listBuckets notice:', error.message);
      // Even if listBuckets fails due to RLS, bucket upload may still work if created
      return { ready: true };
    }

    const exists = buckets?.some((b) => b.name === SUPABASE_BACKUP_BUCKET || b.id === SUPABASE_BACKUP_BUCKET);
    if (!exists) {
      console.log(`[Supabase Storage] Creating storage bucket: ${SUPABASE_BACKUP_BUCKET}`);
      const { error: createError } = await supabase.storage.createBucket(SUPABASE_BACKUP_BUCKET, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      if (createError) {
        console.warn(`[Supabase Storage] createBucket notice (may already exist in DB):`, createError.message);
      }
    }
    return { ready: true };
  } catch (err: any) {
    console.warn('[Supabase Storage] Bucket check exception:', err?.message);
    return { ready: true }; // Proceed gracefully
  }
}

/**
 * Upload encrypted backup file directly into 'smart-ledger-backups' bucket
 */
export async function uploadBackupToSupabaseStorage(
  userId: string,
  fileName: string,
  fileBody: Blob | ArrayBuffer | Uint8Array,
  metadata?: Record<string, string>
): Promise<{ success: boolean; path: string; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !fileName) {
    return { success: false, path: '', error: 'Supabase not configured or missing parameters' };
  }

  const storagePath = `${userId}/${fileName}`;
  try {
    await ensureBackupBucket();

    console.log(`[Supabase Storage] Uploading ${fileName} to bucket '${SUPABASE_BACKUP_BUCKET}/${storagePath}'...`);
    const { data, error } = await supabase.storage
      .from(SUPABASE_BACKUP_BUCKET)
      .upload(storagePath, fileBody, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.warn('[Supabase Storage] Upload warning:', error.message);
      return { success: false, path: storagePath, error: error.message };
    }

    console.log(`[Supabase Storage] Upload success:`, data?.path || storagePath);
    return { success: true, path: storagePath };
  } catch (err: any) {
    console.error('[Supabase Storage] Upload exception:', err);
    return { success: false, path: storagePath, error: err?.message };
  }
}

/**
 * Download encrypted backup file from 'smart-ledger-backups' bucket
 */
export async function downloadBackupFromSupabaseStorage(
  userId: string,
  fileName: string
): Promise<{ data: Blob | null; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !fileName) {
    return { data: null, error: 'Supabase not configured' };
  }

  const storagePath = `${userId}/${fileName}`;
  try {
    console.log(`[Supabase Storage] Downloading from bucket '${SUPABASE_BACKUP_BUCKET}/${storagePath}'...`);
    const { data, error } = await supabase.storage
      .from(SUPABASE_BACKUP_BUCKET)
      .download(storagePath);

    if (error) {
      console.warn('[Supabase Storage] Download warning:', error.message);
      return { data: null, error: error.message };
    }

    return { data, error: undefined };
  } catch (err: any) {
    console.error('[Supabase Storage] Download exception:', err);
    return { data: null, error: err?.message };
  }
}

/**
 * Delete a backup file from 'smart-ledger-backups' bucket
 */
export async function deleteBackupFromSupabaseStorage(
  userId: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !fileName) return { success: false };

  const storagePath = `${userId}/${fileName}`;
  try {
    const { error } = await supabase.storage
      .from(SUPABASE_BACKUP_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn('[Supabase Storage] Remove file warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * List files in 'smart-ledger-backups' for a user
 */
export async function listBackupsInSupabaseStorage(userId: string) {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BACKUP_BUCKET)
      .list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Get signed temporary download URL for a backup file
 */
export async function getSignedUrlForBackup(
  userId: string,
  fileName: string,
  expiresInSeconds: number = 3600
): Promise<{ signedUrl: string | null; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !fileName) {
    return { signedUrl: null, error: 'Supabase not configured or missing parameters' };
  }
  const storagePath = `${userId}/${fileName}`;
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BACKUP_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { signedUrl: null, error: error?.message || 'Failed to create signed URL' };
    }
    return { signedUrl: data.signedUrl };
  } catch (err: any) {
    return { signedUrl: null, error: err?.message };
  }
}

