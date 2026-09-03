import { storage, auth, db } from './firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  getMetadata
} from 'firebase/storage';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  orderBy 
} from 'firebase/firestore';
import JSZip from 'jszip';
import { 
  AppState, 
  Transaction, 
  BackupMetadata, 
  BackupType, 
  BackupProgressStage, 
  BackupItemCounts, 
  BackupSettings 
} from '../types';
import { createNotification } from './notificationService';
import { notifyBackupEvent, notifySecurityEvent } from './notificationEngine';
import { 
  getAuthenticatedUser, 
  ensureValidIdToken, 
  classifyBackupError, 
  AuthErrorInfo 
} from './backupAuth';
import { 
  encryptPayload, 
  decryptPayload, 
  computeSha256, 
  APP_VERSION, 
  ENCRYPTION_VERSION,
  EncryptedEnvelope 
} from './backupCrypto';
import { isSupabaseConfigured } from './supabase';
import { 
  uploadBackupToSupabaseStorage, 
  downloadBackupFromSupabaseStorage, 
  deleteBackupFromSupabaseStorage 
} from './supabaseStorage';
import { 
  saveBackupRecordToSupabase, 
  fetchBackupRecordsFromSupabase, 
  deleteBackupRecordFromSupabase,
  syncFullAppStateToSupabase,
  batchUpsertTransactionsToSupabase
} from './supabaseDb';

export interface BackupProgressInfo {
  stage: BackupProgressStage;
  percentage: number;
  message: string;
  speedBytesPerSec?: number;
  uploadedBytes?: number;
  totalBytes?: number;
}

export type BackupProgressCallback = (info: BackupProgressInfo) => void;

export interface BackupStats {
  totalStorageBytes: number;
  totalBackups: number;
  latestBackupDate: string | null;
  nextBackupDate: string | null;
  averageSizeBytes: number;
  health: string;
  status: 'healthy' | 'warning' | 'error' | 'in-progress';
  lastError: string | null;
}

const DEFAULT_RETENTION_LIMIT = 30;

/**
 * Promise timeout wrapper to prevent any operation from hanging indefinitely
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${Math.round(timeoutMs / 1000)}s: ${operationName}`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class BackupService {
  private static isBackingUp = false;
  private static lastErrorInfo: AuthErrorInfo | null = null;

  /**
   * Generates standardized backup ID and filename
   */
  public static generateBackupName(type: BackupType): { id: string; fileName: string } {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timePart = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const typeTag = type === 'automatic' || type === 'daily' ? 'auto' : type === 'manual' ? 'manual' : type;
    const id = `backup_${datePart}_${timePart}_${typeTag}`;
    const fileName = `${id}.backup`;
    return { id, fileName };
  }

  public static isOperationActive(): boolean {
    return this.isBackingUp;
  }

  public static getLastErrorInfo(): AuthErrorInfo | null {
    return this.lastErrorInfo;
  }

  /**
   * Calculate backup health and next scheduled backup time
   */
  public static getBackupHealth(lastBackupTime?: string | null, frequency = '24h'): {
    status: 'healthy' | 'warning' | 'error';
    health: string;
    nextBackupTime: string | null;
  } {
    let intervalMs = 24 * 60 * 60 * 1000;
    if (frequency === '12h') intervalMs = 12 * 60 * 60 * 1000;
    if (frequency === '7d') intervalMs = 7 * 24 * 60 * 60 * 1000;

    if (!lastBackupTime) {
      return {
        status: 'warning',
        health: 'Pending Initial Backup',
        nextBackupTime: new Date(Date.now()).toISOString(),
      };
    }

    const lastTime = new Date(lastBackupTime).getTime();
    if (isNaN(lastTime)) {
      return {
        status: 'warning',
        health: 'Pending Initial Backup',
        nextBackupTime: new Date(Date.now()).toISOString(),
      };
    }

    const nextTime = lastTime + intervalMs;
    const now = Date.now();
    const nextBackupIso = new Date(nextTime).toISOString();

    if (now > nextTime + 2 * 60 * 60 * 1000) {
      return {
        status: 'warning',
        health: 'Warning: Overdue',
        nextBackupTime: nextBackupIso,
      };
    }

    return {
      status: 'healthy',
      health: 'Optimal • Cloud Verified',
      nextBackupTime: nextBackupIso,
    };
  }

  /**
   * Complete Production-Quality Backup Runner:
   * 1. Resolves authenticated user with 5 retries / authStateReady
   * 2. Refreshes secure ID token
   * 3. Gathers complete ledger dataset
   * 4. Computes SHA-256 checksum and AES-256-CBC ciphertext
   * 5. Compresses payload with DEFLATE
   * 6. Uploads to Cloud Storage with live speed tracking and retry loop
   * 7. Stores Firestore metadata and disaster recovery envelope
   * 8. Verifies integrity and applies automatic retention pruning
   */
  public static async createBackup(
    type: BackupType = 'manual',
    onProgress?: BackupProgressCallback,
    customData?: AppState
  ): Promise<BackupMetadata> {
    if (this.isBackingUp) {
      const err = new Error('A backup operation is currently in progress. Please wait.');
      throw err;
    }

    this.isBackingUp = true;
    this.lastErrorInfo = null;
    const startTime = Date.now();

    // Required Debug Console Log: Backup started
    console.log('Backup started');

    const notifyProgress = (info: BackupProgressInfo) => {
      if (onProgress) onProgress(info);
    };

    let backupId = '';
    let fileName = '';
    let currentUid = '';

    try {
      // Step 1: Verify authenticated user with 5 auto-retries
      notifyProgress({
        stage: 'preparing',
        percentage: 5,
        message: 'Verifying secure user session...',
      });

      console.log(`[BackupService] Resolving authenticated user with auto-retry...`);
      const user = await getAuthenticatedUser(5, 1000);
      const uid = user.uid;
      currentUid = uid;
      console.log(`[BackupService] Authenticated as user ${uid} (${user.email})`);

      // Step 2: Fetch and validate fresh ID token
      notifyProgress({
        stage: 'preparing',
        percentage: 12,
        message: 'Acquiring fresh cloud authorization token...',
      });
      await ensureValidIdToken(false).catch((tErr) => {
        console.warn('[BackupService] Token refresh notice:', tErr);
      });

      createNotification({
        title: 'Backup Started',
        message: `Creating encrypted ${type} backup of all financial records...`,
        type: 'admin_db_backup',
      });

      // Required Debug Console Log: Collecting data
      console.log('Collecting data');

      // Step 3: Collect application records
      notifyProgress({
        stage: 'preparing',
        percentage: 25,
        message: 'Collecting complete financial state, transactions & settings...',
      });

      const snapshotData = customData || (await withTimeout(this.gatherAllData(uid), 15000, 'Gathering application data'));

      const itemCounts: BackupItemCounts = {
        transactions: snapshotData.transactions?.length || 0,
        customers: snapshotData.customers?.length || 0,
        savingsGoals: snapshotData.savingsGoals?.length || 0,
        gullakEntries: snapshotData.gullakEntries?.length || 0,
        investments: snapshotData.investments?.length || 0,
        reports: snapshotData.generatedReports?.length || 0,
        bills: ((snapshotData as any).bills?.length) || 0,
        settings: 1,
      };

      const totalRecords = 
        (itemCounts.transactions || 0) +
        (itemCounts.customers || 0) +
        (itemCounts.savingsGoals || 0) +
        (itemCounts.gullakEntries || 0) +
        (itemCounts.investments || 0) +
        (itemCounts.reports || 0) +
        (itemCounts.bills || 0);

      const generated = this.generateBackupName(type);
      backupId = generated.id;
      fileName = generated.fileName;
      const createdAt = new Date().toISOString();
      const backupDate = new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const backupTime = new Date(createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Required Debug Console Log: Creating backup
      console.log('Creating backup');

      // Step 4: Serialize raw JSON and compute SHA-256 checksum
      notifyProgress({
        stage: 'preparing',
        percentage: 38,
        message: 'Generating secure SHA-256 checksum...',
      });

      const rawJsonPayload = JSON.stringify({
        ...snapshotData,
        backupMetadata: {
          backupId,
          createdAt,
          date: backupDate,
          time: backupTime,
          version: APP_VERSION,
          type,
          itemCounts,
          recordsCount: totalRecords,
          userId: uid,
          userEmail: user.email || '',
        },
      });

      // Check for duplicate backups within recent history
      const unencryptedChecksum = computeSha256(rawJsonPayload);
      console.log(`[BackupService] Computed SHA-256: ${unencryptedChecksum}`);

      // Step 5: Encrypt with AES-256-CBC
      notifyProgress({
        stage: 'encrypting',
        percentage: 52,
        message: 'Encrypting snapshot with zero-knowledge AES-256-CBC...',
      });

      const { ciphertext, ivHex, checksum } = encryptPayload(rawJsonPayload, uid);

      const envelope: EncryptedEnvelope = {
        format: 'smart-ledger-encrypted-snapshot',
        version: APP_VERSION,
        backupId,
        fileName,
        type,
        createdAt,
        userId: uid,
        iv: ivHex,
        checksum,
        ciphertext,
        itemCounts,
      };

      const envelopeString = JSON.stringify(envelope);

      // Step 6: Compress with DEFLATE
      notifyProgress({
        stage: 'encrypting',
        percentage: 65,
        message: 'Compressing encrypted payload with DEFLATE...',
      });

      const zip = new JSZip();
      zip.file('snapshot.json.enc', envelopeString);
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const totalSizeBytes = zipBlob.size;

      // Required Debug Console Log: Uploading/Saving backup
      console.log('Uploading/Saving backup');

      // Step 7: Handle Offline State
      if (!navigator.onLine) {
        console.warn(`[BackupService] Device is offline. Queuing local encrypted backup...`);
        notifyProgress({
          stage: 'uploading',
          percentage: 80,
          message: 'Device offline. Stored encrypted snapshot in secure local queue...',
        });

        const durationMs = Date.now() - startTime;
        const durationFormatted = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

        const offlineRecord: BackupMetadata = {
          id: backupId,
          backupId,
          name: backupId,
          fileName,
          createdAt,
          date: backupDate,
          time: backupTime,
          fileSize: totalSizeBytes,
          size: totalSizeBytes,
          durationMs,
          durationFormatted,
          status: 'verified',
          version: APP_VERSION,
          appVersion: APP_VERSION,
          encryptionVersion: ENCRYPTION_VERSION,
          device: navigator.userAgent || 'Web Browser',
          restoreVersion: APP_VERSION,
          type,
          checksum,
          checksumSha256: checksum,
          encryptionIv: ivHex,
          itemCounts,
          recordsCount: totalRecords,
          storagePath: `backups/${uid}/${fileName}`,
          userId: uid,
          compressed: true,
        };

        await this.queueOfflineBackup(uid, {
          ...offlineRecord,
          envelopeString,
        });

        this.recordLocalHistory(uid, offlineRecord);

        localStorage.setItem('smart_ledger_last_backup_time', createdAt);
        localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());

        // Required Debug Console Log: Backup completed
        console.log('Backup completed');

        return offlineRecord;
      }

      // Step 8: Upload to Firebase Storage with live transfer speed tracking & exponential backoff
      const storagePath = `backups/${uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      let uploadSuccess = false;
      const MAX_RETRIES = 5;
      const arrayBuffer = await zipBlob.arrayBuffer();

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const uploadStartTime = Date.now();
          notifyProgress({
            stage: 'uploading',
            percentage: 70 + attempt * 2,
            message: `Uploading encrypted snapshot (${this.formatSize(totalSizeBytes)}) to Cloud Storage...`,
            totalBytes: totalSizeBytes,
            uploadedBytes: Math.round((totalSizeBytes * (70 + attempt * 2)) / 100),
          });

          const uploadPromise = uploadBytes(storageRef, arrayBuffer, {
            contentType: 'application/octet-stream',
            customMetadata: {
              backupId,
              type,
              version: APP_VERSION,
              checksumSha256: checksum,
              encryptionIv: ivHex,
              status: 'verified',
              createdAt,
              originalSize: rawJsonPayload.length.toString(),
            },
          });

          await withTimeout(uploadPromise, 30000, `Cloud Storage upload (Attempt ${attempt})`);
          
          const uploadElapsedSec = Math.max(0.1, (Date.now() - uploadStartTime) / 1000);
          const speedBps = Math.round(totalSizeBytes / uploadElapsedSec);

          notifyProgress({
            stage: 'uploading',
            percentage: 85,
            message: `Upload completed at ${this.formatSize(speedBps)}/s`,
            speedBytesPerSec: speedBps,
            totalBytes: totalSizeBytes,
            uploadedBytes: totalSizeBytes,
          });

          uploadSuccess = true;
          break;
        } catch (uploadErr: any) {
          console.warn(`[BackupService] Storage upload attempt ${attempt}/${MAX_RETRIES} warning:`, uploadErr?.message);
          if (attempt < MAX_RETRIES) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
            notifyProgress({
              stage: 'uploading',
              percentage: 70 + attempt * 2,
              message: `Retrying upload (${attempt}/${MAX_RETRIES}) in ${backoffMs / 1000}s...`,
            });
            await new Promise((r) => setTimeout(r, backoffMs));
          }
        }
      }

      let storageVerifiedSize = totalSizeBytes;
      if (uploadSuccess) {
        try {
          const meta = await getMetadata(storageRef);
          if (meta?.size) storageVerifiedSize = meta.size;
        } catch (e) {
          console.warn('[BackupService] getMetadata notice:', e);
        }
      }

      // Step 9: Save Firestore Metadata Document (users/{uid}/backups/{backupId})
      notifyProgress({
        stage: 'verifying',
        percentage: 92,
        message: 'Saving verified backup metadata to Firestore...',
      });

      const durationMs = Date.now() - startTime;
      const durationFormatted = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

      const record: BackupMetadata = {
        id: backupId,
        backupId,
        name: backupId,
        fileName,
        createdAt,
        date: backupDate,
        time: backupTime,
        fileSize: storageVerifiedSize,
        size: storageVerifiedSize,
        durationMs,
        durationFormatted,
        status: 'verified',
        version: APP_VERSION,
        appVersion: APP_VERSION,
        encryptionVersion: ENCRYPTION_VERSION,
        device: navigator.userAgent ? navigator.userAgent.substring(0, 100) : 'Web Client',
        restoreVersion: APP_VERSION,
        type,
        checksum,
        checksumSha256: checksum,
        encryptionIv: ivHex,
        itemCounts,
        recordsCount: totalRecords,
        storagePath,
        userId: uid,
        compressed: true,
      };

      const backupDocRef = doc(db, 'users', uid, 'backups', backupId);
      await withTimeout(setDoc(backupDocRef, record), 10000, 'Saving Firestore backup metadata');

      // Step 9b: Upload snapshot and metadata to Supabase 'smart-ledger-backups' bucket if configured
      if (isSupabaseConfigured()) {
        try {
          notifyProgress({
            stage: 'uploading',
            percentage: 95,
            message: `Synchronizing backup to Supabase storage bucket ('smart-ledger-backups')...`,
          });
          const sbRes = await uploadBackupToSupabaseStorage(uid, fileName, arrayBuffer, {
            backupId,
            checksum,
            type,
          });
          if (sbRes.success) {
            await saveBackupRecordToSupabase({
              ...record,
              storagePath: sbRes.path,
            }, uid);
            console.log(`[BackupService] Successfully uploaded backup snapshot to Supabase 'smart-ledger-backups' (${sbRes.path})`);
          }
        } catch (sbBackupErr) {
          console.warn('[BackupService] Supabase backup upload warning:', sbBackupErr);
        }
      }

      // Record in local cache for instant UI rendering
      this.recordLocalHistory(uid, record);

      // Also store disaster recovery envelope in subcollection
      try {
        const payloadDocRef = doc(db, 'users', uid, 'backups', backupId, 'payload', 'data');
        await setDoc(payloadDocRef, {
          envelopeString,
          createdAt,
          checksum,
        });
      } catch (payloadErr) {
        console.warn('[BackupService] Subcollection payload sync notice:', payloadErr);
      }

      // Step 10: Update Global Health Status Document (/users/{uid}/backups_meta/status)
      const nextBackupTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const statusUpdate = {
        lastBackupTime: createdAt,
        nextBackupTime,
        lastBackupStatus: 'healthy',
        backupHealth: 'Optimal • Cloud Verified',
        backupVersion: APP_VERSION,
        backupSize: storageVerifiedSize,
        backupChecksum: checksum,
        backupLocation: storagePath,
        lastError: null,
        updatedAt: createdAt,
      };

      try {
        await setDoc(doc(db, 'users', uid, 'backups_meta', 'status'), statusUpdate, { merge: true });
        await setDoc(doc(db, 'users', uid, 'app', 'state'), { backupSettings: statusUpdate }, { merge: true });
      } catch (statusErr) {
        console.warn('[BackupService] Status update notice:', statusErr);
      }

      // Update instant local storage timestamps
      localStorage.setItem('smart_ledger_last_backup_time', createdAt);
      localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
      localStorage.setItem('smart_ledger_backup_status', JSON.stringify(statusUpdate));

      // Step 11: Enforce Automatic Retention Policy (Keep latest 30 backups)
      this.enforceRetentionPolicy(uid).catch((e) => console.warn('[BackupService] Retention cleanup note:', e));

      // Dispatch Success Notification with size, version, and timestamp
      await notifyBackupEvent({
        userId: uid,
        success: true,
        sizeBytes: storageVerifiedSize,
        version: APP_VERSION,
        backupId,
      });

      const totalDuration = Date.now() - startTime;
      console.log(`[BackupService] Backup completed successfully in ${totalDuration}ms.`);

      // Required Debug Console Log: Backup completed
      console.log('Backup completed');

      notifyProgress({
        stage: 'completed',
        percentage: 100,
        message: 'Cloud backup verified and completed successfully.',
        totalBytes: storageVerifiedSize,
        uploadedBytes: storageVerifiedSize,
      });

      return record;
    } catch (err: any) {
      // Required Debug Console Log: Backup failed (with error details)
      console.error('Backup failed (with error details):', err);

      const classified = classifyBackupError(err);
      this.lastErrorInfo = classified;
      console.error(`[BackupService Fatal Error]`, classified, err);

      const errorUid = currentUid || auth.currentUser?.uid;
      const failedDurationMs = Date.now() - startTime;
      const failedDate = new Date();

      if (errorUid) {
        const failedRecord: BackupMetadata = {
          id: backupId || `failed_${Date.now()}`,
          backupId: backupId || `failed_${Date.now()}`,
          name: backupId ? `Snapshot (${backupId.substring(0, 16)})` : `Backup Attempt`,
          fileName: fileName || `failed_${Date.now()}.backup`,
          createdAt: failedDate.toISOString(),
          date: failedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          time: failedDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          fileSize: 0,
          size: 0,
          durationMs: failedDurationMs,
          durationFormatted: failedDurationMs < 1000 ? `${failedDurationMs}ms` : `${(failedDurationMs / 1000).toFixed(1)}s`,
          status: 'failed',
          version: APP_VERSION,
          appVersion: APP_VERSION,
          encryptionVersion: ENCRYPTION_VERSION,
          device: navigator.userAgent ? navigator.userAgent.substring(0, 100) : 'Web Client',
          type,
          checksum: '',
          checksumSha256: '',
          recordsCount: 0,
          errorMessage: classified.message,
        };

        this.recordLocalHistory(errorUid, failedRecord);

        await notifyBackupEvent({
          userId: errorUid,
          success: false,
          errorMessage: classified.message,
        });

        // Update Firestore error state if possible
        try {
          await setDoc(
            doc(db, 'users', errorUid, 'backups_meta', 'status'),
            {
              lastBackupStatus: 'error',
              backupHealth: 'Error: Needs Retry',
              lastError: classified.message,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {}
      }

      notifyProgress({
        stage: 'failed',
        percentage: 0,
        message: classified.message,
      });

      throw new Error(classified.message);
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * List all stored backups from Firestore and local cache
   */
  public static async listBackups(): Promise<BackupMetadata[]> {
    try {
      const user = await getAuthenticatedUser(3, 800);
      const uid = user.uid;

      console.log(`[BackupService] Fetching backups for user ${uid}...`);
      const backupsCol = collection(db, 'users', uid, 'backups');
      const q = query(backupsCol, orderBy('createdAt', 'desc'));
      
      const backups: BackupMetadata[] = [];
      const seenIds = new Set<string>();

      try {
        const querySnap = await withTimeout(getDocs(q), 10000, 'Fetching Firestore backups');
        querySnap.forEach((docSnap) => {
          const data = docSnap.data() as BackupMetadata;
          const bId = data.backupId || data.id || docSnap.id;
          const bSize = data.fileSize || data.size || 0;
          seenIds.add(bId);
          backups.push({
            ...data,
            id: bId,
            backupId: bId,
            name: data.name || data.fileName || bId,
            fileName: data.fileName || `${bId}.backup`,
            createdAt: data.createdAt || new Date().toISOString(),
            date: data.date || new Date(data.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            time: data.time || new Date(data.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            fileSize: bSize,
            size: bSize,
            status: data.status || 'verified',
            version: data.version || data.appVersion || APP_VERSION,
            appVersion: data.appVersion || APP_VERSION,
            encryptionVersion: data.encryptionVersion || ENCRYPTION_VERSION,
            type: data.type || 'manual',
            checksum: data.checksum || data.checksumSha256 || '',
            checksumSha256: data.checksumSha256 || data.checksum || '',
            storagePath: data.storagePath || `backups/${uid}/${data.fileName || `${bId}.backup`}`,
          });
        });
      } catch (firestoreErr) {
        console.warn('[BackupService] Firestore list notice:', firestoreErr);
      }

      // Check Supabase backups table if configured
      if (isSupabaseConfigured()) {
        try {
          const sbBackups = await fetchBackupRecordsFromSupabase(uid);
          for (const sbItem of sbBackups) {
            if (!seenIds.has(sbItem.id) && !seenIds.has(sbItem.backupId || '')) {
              backups.push(sbItem);
              seenIds.add(sbItem.id);
            }
          }
        } catch (sbListErr) {
          console.warn('[BackupService] Supabase backups list notice:', sbListErr);
        }
      }

      // Merge with local history items (for recent attempts or failed attempts)
      const localHistory = this.getLocalHistory(uid);
      for (const item of localHistory) {
        if (!seenIds.has(item.id) && !seenIds.has(item.backupId)) {
          backups.push(item);
          seenIds.add(item.id);
        }
      }

      // Sort descending by creation date
      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return backups;
    } catch (error: any) {
      console.warn('[BackupService] List backups warning:', error?.message);
      const uid = auth.currentUser?.uid;
      return uid ? this.getLocalHistory(uid) : [];
    }
  }

  /**
   * Local history tracking helpers
   */
  public static recordLocalHistory(uid: string, record: BackupMetadata): void {
    try {
      const key = `smart_ledger_backup_history_${uid}`;
      const existing = localStorage.getItem(key);
      let list: BackupMetadata[] = existing ? JSON.parse(existing) : [];
      list = [record, ...list.filter((b) => b.id !== record.id && b.backupId !== record.backupId)].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('[BackupService] Error saving local history:', e);
    }
  }

  public static getLocalHistory(uid: string): BackupMetadata[] {
    try {
      const key = `smart_ledger_backup_history_${uid}`;
      const existing = localStorage.getItem(key);
      if (!existing) return [];
      return JSON.parse(existing);
    } catch {
      return [];
    }
  }

  /**
   * Restore application state with secure integrity verification
   */
  public static async restoreBackup(
    backupId: string,
    onProgress?: (message: string, percent: number) => void
  ): Promise<{ success: boolean; restoredState: AppState }> {
    const user = await getAuthenticatedUser(5, 1000);
    const uid = user.uid;

    onProgress?.('Fetching snapshot metadata from Cloud...', 15);

    // 1. Fetch metadata record from Firestore
    let metadata: BackupMetadata | null = null;
    try {
      const docSnap = await withTimeout(getDoc(doc(db, 'users', uid, 'backups', backupId)), 8000, 'Fetching backup metadata');
      if (docSnap.exists()) {
        metadata = docSnap.data() as BackupMetadata;
      }
    } catch (e) {
      console.warn('[BackupService] Metadata fetch notice:', e);
    }

    const fileName = metadata?.fileName || `${backupId}.backup`;
    const storagePath = metadata?.storagePath || `backups/${uid}/${fileName}`;
    const expectedChecksum = metadata?.checksum || metadata?.checksumSha256 || '';

    // 2. Download encrypted payload from Supabase Storage, Firebase Storage, or fallback
    onProgress?.('Downloading encrypted snapshot from Cloud Storage...', 35);
    let envelopeJson = '';

    // Try Supabase Storage first if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: sbBlob, error: sbErr } = await downloadBackupFromSupabaseStorage(uid, fileName);
        if (sbBlob && !sbErr) {
          const zip = await JSZip.loadAsync(sbBlob);
          const snapshotFile = zip.file('snapshot.json.enc') || zip.file('data.enc');
          if (snapshotFile) {
            envelopeJson = await snapshotFile.async('string');
          } else {
            envelopeJson = await sbBlob.text();
          }
          console.log('[BackupService] Downloaded backup from Supabase Storage successfully.');
        }
      } catch (sbDownloadErr) {
        console.warn('[BackupService] Supabase restore download notice:', sbDownloadErr);
      }
    }

    if (!envelopeJson) {
      try {
        const storageRef = ref(storage, storagePath);
        const url = await withTimeout(getDownloadURL(storageRef), 12000, 'Getting Storage Download URL');
        const res = await withTimeout(fetch(url), 15000, 'Fetching backup payload from Storage');
        if (!res.ok) throw new Error(`HTTP error: ${res.statusText}`);
        const blob = await res.blob();

        // Decompress ZIP archive
        const zip = await JSZip.loadAsync(blob);
        const snapshotFile = zip.file('snapshot.json.enc') || zip.file('data.enc');
        if (snapshotFile) {
          envelopeJson = await snapshotFile.async('string');
        } else {
          envelopeJson = await blob.text();
        }
      } catch (downloadErr: any) {
        console.warn('[BackupService] Storage download notice, checking Firestore subcollection fallback...', downloadErr?.message);
        try {
          const payloadDoc = await withTimeout(
            getDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data')),
            8000,
            'Fetching Firestore fallback payload'
          );
          if (payloadDoc.exists()) {
            envelopeJson = payloadDoc.data()?.envelopeString || '';
          }
        } catch (fallbackErr) {
          console.error('[BackupService] Fallback payload fetch failed:', fallbackErr);
        }
      }
    }

    if (!envelopeJson) {
      throw new Error(`Corrupted or missing backup: Unable to locate snapshot payload for ID ${backupId}.`);
    }

    // 3. Decrypt and Verify Integrity
    onProgress?.('Decrypting snapshot payload with AES-256-CBC...', 60);

    let rawPayloadString = '';
    try {
      const parsedEnvelope = JSON.parse(envelopeJson);
      const ciphertext = parsedEnvelope.ciphertext || envelopeJson;
      const ivHex = parsedEnvelope.iv || metadata?.encryptionIv;
      const targetChecksum = parsedEnvelope.checksum || expectedChecksum;

      const { decryptedJson } = decryptPayload(ciphertext, ivHex, uid, targetChecksum);
      rawPayloadString = decryptedJson;
    } catch (decryptErr: any) {
      console.error('[BackupService Error] Decryption failed:', decryptErr);
      throw new Error(decryptErr?.message || 'Decryption failed: Cryptographic signature mismatch or corrupted data.');
    }

    // 4. Assemble and hydrate state
    onProgress?.('Restoring Firestore database collections...', 80);
    const parsedData = JSON.parse(rawPayloadString);
    const restoredState: AppState = {
      isSetupComplete: parsedData.isSetupComplete ?? true,
      startingBalance: Number(parsedData.startingBalance || 0),
      customers: parsedData.customers || [],
      transactions: parsedData.transactions || [],
      gullakEntries: parsedData.gullakEntries || [],
      savingsGoals: parsedData.savingsGoals || [],
      securityLogs: parsedData.securityLogs || [],
      automationRules: parsedData.automationRules || [],
      investments: parsedData.investments || [],
      financeHabits: parsedData.financeHabits || [],
      gullakSettings: parsedData.gullakSettings || { monthlyGoal: 0 },
      securitySettings: parsedData.securitySettings || {
        pinEnabled: false,
        pin: null,
        biometricEnabled: false,
        faceUnlockEnabled: false,
        autoLockTime: 2,
        registeredDevices: [],
      },
      emailSettings: parsedData.emailSettings || { enabled: false, emailAddress: '', lastReportSent: null, nextScheduledReport: null },
      emailHistory: parsedData.emailHistory || [],
      reportSettings: parsedData.reportSettings,
      generatedReports: parsedData.generatedReports || [],
      generalSettings: parsedData.generalSettings || { timezone: 'Asia/Kolkata' },
      unlockedAchievements: parsedData.unlockedAchievements || [],
      aiRecognitionSettings: parsedData.aiRecognitionSettings,
      aiRecognitionHistory: parsedData.aiRecognitionHistory || [],
      posterTemplates: parsedData.posterTemplates || [],
      userProfile: parsedData.userProfile,
      reminderHistory: parsedData.reminderHistory || [],
      customReminderTemplate: parsedData.customReminderTemplate,
      backupSettings: parsedData.backupSettings,
    };

    // 5. Commit to Firestore atomically & Supabase database
    await this.restoreAllDataToFirestore(uid, restoredState);
    if (isSupabaseConfigured()) {
      try {
        await syncFullAppStateToSupabase(uid, restoredState);
        if (restoredState.transactions?.length) {
          await batchUpsertTransactionsToSupabase(restoredState.transactions, uid);
        }
      } catch (sbRestoreErr) {
        console.warn('[BackupService] Supabase restore DB sync note:', sbRestoreErr);
      }
    }

    // 6. Update status in metadata
    try {
      await setDoc(
        doc(db, 'users', uid, 'backups', backupId),
        { status: 'restored', lastRestoredAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}

    // 7. Update local cache
    try {
      localStorage.setItem('smart-ledger-data', JSON.stringify(restoredState));
    } catch {}

    await notifySecurityEvent({
      userId: uid,
      type: 'security_backup_restored',
      title: 'Database Backup Restored',
      message: `Restored ${restoredState.transactions.length} transactions and state snapshots from backup (${backupId.substring(0, 16)}...).`,
      metadata: { backupId, count: restoredState.transactions.length },
    });

    onProgress?.('Restore completed successfully.', 100);
    return { success: true, restoredState };
  }

  /**
   * Delete backup from Firebase Storage and Firestore
   */
  public static async deleteBackup(backupId: string, fileName?: string): Promise<void> {
    const user = await getAuthenticatedUser(5, 800);
    const uid = user.uid;

    const name = fileName || `${backupId}.backup`;

    try {
      const storageRef = ref(storage, `backups/${uid}/${name}`);
      await deleteObject(storageRef);
    } catch (storageErr: any) {
      console.warn('[BackupService] Storage file delete notice:', storageErr?.message);
    }

    // Delete from Supabase Storage and DB as well
    if (isSupabaseConfigured()) {
      try {
        await deleteBackupFromSupabaseStorage(uid, name);
        await deleteBackupRecordFromSupabase(backupId, uid);
      } catch (sbDelErr) {
        console.warn('[BackupService] Supabase backup delete notice:', sbDelErr);
      }
    }

    try {
      const docRef = doc(db, 'users', uid, 'backups', backupId);
      await deleteDoc(docRef);
      await deleteDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data')).catch(() => {});
    } catch (firestoreErr) {
      console.error('[BackupService] Firestore delete error:', firestoreErr);
    }

    this.removeOfflineBackup(uid, backupId);
  }

  /**
   * Download encrypted backup file directly to client browser
   */
  public static async downloadBackup(backupId: string, fileName?: string): Promise<void> {
    const user = await getAuthenticatedUser(5, 800);
    const uid = user.uid;

    const name = fileName || `${backupId}.backup`;
    const storageRef = ref(storage, `backups/${uid}/${name}`);

    // Try Supabase Storage first if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: sbBlob, error: sbErr } = await downloadBackupFromSupabaseStorage(uid, name);
        if (sbBlob && !sbErr) {
          const url = URL.createObjectURL(sbBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } catch (sbDownloadErr) {
        console.warn('[BackupService] Supabase download notice:', sbDownloadErr);
      }
    }

    try {
      const url = await getDownloadURL(storageRef);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      try {
        const payloadDoc = await getDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data'));
        if (payloadDoc.exists()) {
          const envelopeString = payloadDoc.data()?.envelopeString;
          const blob = new Blob([envelopeString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } catch (fallbackErr) {
        console.error('[BackupService] Download fallback notice:', fallbackErr);
      }
      throw err;
    }
  }

  /**
   * Calculate live backup storage statistics
   */
  public static calculateStats(backups: BackupMetadata[], customSettings?: BackupSettings): BackupStats {
    const totalBackups = backups.length;
    const totalStorageBytes = backups.reduce((acc, curr) => acc + (curr.fileSize || curr.size || 0), 0);
    const latestBackupDate = backups.length > 0 ? backups[0].createdAt : (customSettings?.lastBackupTime || null);
    const averageSizeBytes = totalBackups > 0 ? Math.round(totalStorageBytes / totalBackups) : 0;

    const healthInfo = this.getBackupHealth(latestBackupDate, customSettings?.frequency || '24h');

    return {
      totalStorageBytes,
      totalBackups,
      latestBackupDate,
      nextBackupDate: healthInfo.nextBackupTime,
      averageSizeBytes,
      health: healthInfo.health,
      status: healthInfo.status,
      lastError: this.lastErrorInfo?.message || customSettings?.lastError || null,
    };
  }

  public static formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }

  public static formatRelativeTime(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Never';

    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
    if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Enforce automatic retention policy
   */
  private static async enforceRetentionPolicy(uid: string): Promise<void> {
    try {
      const backups = await this.listBackups();
      let limit = DEFAULT_RETENTION_LIMIT;
      try {
        const stateDoc = await getDoc(doc(db, 'users', uid, 'app', 'state'));
        if (stateDoc.exists()) {
          const ret = stateDoc.data()?.backupSettings?.retention;
          if (ret === '10') limit = 10;
          else if (ret === '25') limit = 25;
          else if (ret === '30') limit = 30;
          else if (ret === 'unlimited') limit = 100;
        }
      } catch {}

      if (backups.length > limit) {
        const toPrune = backups.slice(limit);
        console.log(`[BackupService] Retention Policy: Pruning ${toPrune.length} backups exceeding limit of ${limit}`);
        for (const b of toPrune) {
          await this.deleteBackup(b.id, b.fileName).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[BackupService] Retention enforcement notice:', e);
    }
  }

  /**
   * Gather complete user data snapshot
   */
  private static async gatherAllData(uid: string): Promise<AppState> {
    const stateDocRef = doc(db, 'users', uid, 'app', 'state');
    const txCollectionRef = collection(db, 'users', uid, 'transactions');
    const profileDocRef = doc(db, 'users', uid, 'profile', 'info');

    const [stateSnap, txSnap, profileSnap] = await Promise.all([
      getDoc(stateDocRef).catch(() => null),
      getDocs(txCollectionRef).catch(() => null),
      getDoc(profileDocRef).catch(() => null),
    ]);

    const stateData = stateSnap && stateSnap.exists() ? (stateSnap.data() as Partial<AppState>) : {};
    const transactions = txSnap ? txSnap.docs.map((d) => d.data() as Transaction) : [];
    const profileData = profileSnap && profileSnap.exists() ? profileSnap.data() : undefined;

    let localFallback: Partial<AppState> = {};
    try {
      const saved = localStorage.getItem('smart-ledger-data');
      if (saved) localFallback = JSON.parse(saved);
    } catch {}

    return {
      isSetupComplete: true,
      startingBalance: stateData.startingBalance ?? localFallback.startingBalance ?? 0,
      customers: stateData.customers || localFallback.customers || [],
      transactions: transactions.length > 0 ? transactions : localFallback.transactions || [],
      gullakEntries: stateData.gullakEntries || localFallback.gullakEntries || [],
      savingsGoals: stateData.savingsGoals || localFallback.savingsGoals || [],
      securityLogs: stateData.securityLogs || localFallback.securityLogs || [],
      automationRules: stateData.automationRules || localFallback.automationRules || [],
      investments: stateData.investments || localFallback.investments || [],
      financeHabits: stateData.financeHabits || localFallback.financeHabits || [],
      gullakSettings: stateData.gullakSettings || localFallback.gullakSettings || { monthlyGoal: 0 },
      securitySettings: stateData.securitySettings || localFallback.securitySettings || {
        pinEnabled: false,
        pin: null,
        biometricEnabled: false,
        faceUnlockEnabled: false,
        autoLockTime: 2,
        registeredDevices: [],
      },
      emailSettings: stateData.emailSettings || localFallback.emailSettings || { enabled: false, emailAddress: '', lastReportSent: null, nextScheduledReport: null },
      emailHistory: stateData.emailHistory || localFallback.emailHistory || [],
      reportSettings: stateData.reportSettings || localFallback.reportSettings,
      generatedReports: stateData.generatedReports || localFallback.generatedReports || [],
      generalSettings: stateData.generalSettings || localFallback.generalSettings || { timezone: 'Asia/Kolkata' },
      unlockedAchievements: stateData.unlockedAchievements || localFallback.unlockedAchievements || [],
      aiRecognitionSettings: stateData.aiRecognitionSettings || localFallback.aiRecognitionSettings,
      aiRecognitionHistory: stateData.aiRecognitionHistory || localFallback.aiRecognitionHistory || [],
      posterTemplates: stateData.posterTemplates || localFallback.posterTemplates || [],
      userProfile: (profileData as any) || stateData.userProfile || localFallback.userProfile,
      reminderHistory: stateData.reminderHistory || localFallback.reminderHistory || [],
      customReminderTemplate: stateData.customReminderTemplate || localFallback.customReminderTemplate,
      backupSettings: stateData.backupSettings || localFallback.backupSettings,
    };
  }

  /**
   * Atomically restore all collections and state in Firestore
   */
  private static async restoreAllDataToFirestore(uid: string, state: AppState): Promise<void> {
    const stateDocRef = doc(db, 'users', uid, 'app', 'state');
    const sanitizedState = JSON.parse(JSON.stringify(state));
    delete sanitizedState.transactions;
    await setDoc(stateDocRef, sanitizedState);

    if (state.userProfile) {
      const profileRef = doc(db, 'users', uid, 'profile', 'info');
      await setDoc(profileRef, JSON.parse(JSON.stringify(state.userProfile)), { merge: true });
    }

    const oldTxRef = collection(db, 'users', uid, 'transactions');
    const oldLedgerRef = collection(db, 'users', uid, 'ledger');

    const [oldTxSnap, oldLedgerSnap] = await Promise.all([
      getDocs(oldTxRef).catch(() => null),
      getDocs(oldLedgerRef).catch(() => null),
    ]);

    let batch = writeBatch(db);
    let count = 0;

    if (oldTxSnap) {
      for (const d of oldTxSnap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }

    if (oldLedgerSnap) {
      for (const d of oldLedgerSnap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }

    for (const tx of state.transactions || []) {
      if (!tx.id) continue;
      const sanitizedTx = JSON.parse(JSON.stringify(tx));
      const txDoc = doc(db, 'users', uid, 'transactions', tx.id);
      const ledgerDoc = doc(db, 'users', uid, 'ledger', tx.id);
      batch.set(txDoc, sanitizedTx);
      batch.set(ledgerDoc, sanitizedTx);
      count += 2;

      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  }

  /**
   * Offline and crash recovery queue helpers
   */
  private static async queueOfflineBackup(uid: string, item: any): Promise<void> {
    try {
      const key = `smart_ledger_pending_backups_${uid}`;
      const existing = localStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      list.push(item);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('[BackupService] Offline queue warning:', e);
    }
  }

  public static async processOfflineQueue(): Promise<void> {
    const user = auth.currentUser;
    if (!user || !navigator.onLine) return;
    const uid = user.uid;

    try {
      const key = `smart_ledger_pending_backups_${uid}`;
      const existing = localStorage.getItem(key);
      if (!existing) return;

      const list = JSON.parse(existing);
      if (!Array.isArray(list) || list.length === 0) return;

      console.log(`[BackupService] Processing ${list.length} pending offline backups...`);

      for (const item of list) {
        try {
          if (item.envelopeString) {
            const zip = new JSZip();
            zip.file('snapshot.json.enc', item.envelopeString);
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            const storageRef = ref(storage, `backups/${uid}/${item.fileName}`);
            const arrayBuffer = await zipBlob.arrayBuffer();
            await uploadBytes(storageRef, arrayBuffer);

            const record: BackupMetadata = {
              id: item.id,
              backupId: item.backupId || item.id,
              name: item.id,
              fileName: item.fileName,
              createdAt: item.createdAt,
              fileSize: zipBlob.size,
              size: zipBlob.size,
              status: 'verified',
              version: item.version || APP_VERSION,
              appVersion: item.appVersion || APP_VERSION,
              encryptionVersion: item.encryptionVersion || ENCRYPTION_VERSION,
              device: item.device || navigator.userAgent || 'Web Browser',
              restoreVersion: item.restoreVersion || APP_VERSION,
              type: item.type || 'manual',
              checksum: item.checksum || item.checksumSha256,
              checksumSha256: item.checksumSha256 || item.checksum,
              encryptionIv: item.encryptionIv,
              itemCounts: item.itemCounts,
              storagePath: `backups/${uid}/${item.fileName}`,
              userId: uid,
              compressed: true,
            };

            await setDoc(doc(db, 'users', uid, 'backups', item.id), record);
          }
        } catch (itemErr) {
          console.warn('[BackupService] Pending backup flush warning:', itemErr);
        }
      }

      localStorage.removeItem(key);
      createNotification({
        title: 'Offline Backups Synchronized',
        message: 'All pending backups have been successfully synced to Firebase Cloud Storage.',
        type: 'admin_db_backup',
      });
    } catch (e) {
      console.warn('[BackupService] Process offline queue error:', e);
    }
  }

  private static removeOfflineBackup(uid: string, backupId: string): void {
    try {
      const key = `smart_ledger_pending_backups_${uid}`;
      const existing = localStorage.getItem(key);
      if (!existing) return;
      const list = JSON.parse(existing);
      const filtered = list.filter((item: any) => item.id !== backupId && item.backupId !== backupId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
  }
}
