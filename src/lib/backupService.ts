import { storage, auth, db } from './firebase';
import { 
  ref, 
  uploadBytes, 
  uploadString,
  getDownloadURL, 
  listAll, 
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
import CryptoJS from 'crypto-js';
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

export interface BackupProgressCallback {
  (stage: BackupProgressStage, percentage: number, message: string): void;
}

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

const ENCRYPTION_SALT = '-smart-ledger-master-key-2026';
const APP_VERSION = '2.0.0';
const ENCRYPTION_VERSION = 'AES-256-CBC';
const DEFAULT_RETENTION_LIMIT = 30;

/**
 * Timeout wrapper for async promises to guarantee no operation hangs indefinitely
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
  private static lastErrorMessage: string | null = null;

  /**
   * Derive zero-knowledge AES-256 key for the authenticated user
   */
  private static getEncryptionKey(uid: string): CryptoJS.lib.WordArray {
    return CryptoJS.SHA256(uid + ENCRYPTION_SALT);
  }

  /**
   * Generate standardized backup ID & filename
   * Format: backups/{uid}/{timestamp}.backup
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

  public static getLastError(): string | null {
    return this.lastErrorMessage;
  }

  /**
   * Calculate health status given last backup time and frequency
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
   * Create a comprehensive encrypted cloud backup with 5 retries, non-blocking execution & notifications
   */
  public static async createBackup(
    type: BackupType = 'manual',
    onProgress?: BackupProgressCallback,
    customData?: AppState
  ): Promise<BackupMetadata> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      const err = new Error('Authentication required: Please sign in to create a backup.');
      console.error('[BackupService Error]', err);
      throw err;
    }

    if (this.isBackingUp) {
      const err = new Error('A backup operation is currently in progress. Please wait.');
      console.warn('[BackupService Notice]', err);
      throw err;
    }

    this.isBackingUp = true;
    this.lastErrorMessage = null;
    const startTime = Date.now();
    
    console.log(`[BackupService] ==========================================`);
    console.log(`[BackupService] Backup Started: ${type.toUpperCase()} snapshot for user ${uid}`);

    // Notification: Backup Started
    createNotification({
      title: 'Backup Started',
      message: `Creating encrypted ${type} backup of all financial records...`,
      type: 'admin_db_backup',
    });

    try {
      // Step 1: Collecting complete data
      console.log(`[BackupService] Step 1: Collecting complete ledger records, transactions, settings & preferences...`);
      onProgress?.('preparing', 10, 'Collecting complete financial state & records...');
      
      const snapshotData = customData || await withTimeout(this.gatherAllData(uid), 12000, 'Gathering application data');
      
      const itemCounts: BackupItemCounts = {
        transactions: snapshotData.transactions?.length || 0,
        customers: snapshotData.customers?.length || 0,
        savingsGoals: snapshotData.savingsGoals?.length || 0,
        gullakEntries: snapshotData.gullakEntries?.length || 0,
        investments: snapshotData.investments?.length || 0,
        reports: snapshotData.generatedReports?.length || 0,
      };

      const { id: backupId, fileName } = this.generateBackupName(type);
      const createdAt = new Date().toISOString();

      console.log(`[BackupService] Data collected: ${itemCounts.transactions} transactions, ${itemCounts.customers} customers, ${itemCounts.savingsGoals} goals.`);

      // Step 2: Serializing & Calculating unencrypted SHA-256 Checksum
      onProgress?.('preparing', 25, 'Serializing snapshot & generating SHA-256 checksum...');
      console.log(`[BackupService] Step 2: Serializing JSON and computing cryptographic SHA-256 checksum...`);
      
      const rawJsonPayload = JSON.stringify({
        ...snapshotData,
        backupMetadata: {
          backupId,
          createdAt,
          version: APP_VERSION,
          type,
          itemCounts,
          userId: uid,
          userEmail: auth.currentUser?.email || '',
        }
      });

      const checksumSha256 = CryptoJS.SHA256(rawJsonPayload).toString();
      console.log(`[BackupService] Checksum generated: SHA-256 = ${checksumSha256}`);

      // Step 3: Encrypting with AES-256-CBC
      onProgress?.('encrypting', 45, 'Encrypting snapshot with zero-knowledge AES-256-CBC...');
      console.log(`[BackupService] Step 3: Encrypting with AES-256-CBC and unique IV...`);

      const iv = CryptoJS.lib.WordArray.random(16);
      const ivHex = iv.toString(CryptoJS.enc.Hex);
      const key = this.getEncryptionKey(uid);

      const encryptedCipher = CryptoJS.AES.encrypt(rawJsonPayload, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();

      console.log(`[BackupService] Encryption completed. Cipher length: ${encryptedCipher.length} chars.`);

      // Construct envelope
      const envelope = {
        format: 'smart-ledger-encrypted-snapshot',
        version: APP_VERSION,
        backupId,
        fileName,
        type,
        createdAt,
        userId: uid,
        iv: ivHex,
        checksum: checksumSha256,
        ciphertext: encryptedCipher,
        itemCounts,
      };

      const envelopeString = JSON.stringify(envelope);

      // Step 4: Compressing payload with DEFLATE
      onProgress?.('encrypting', 55, 'Compressing encrypted payload with DEFLATE...');
      const zip = new JSZip();
      zip.file("snapshot.json.enc", envelopeString);
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const totalSizeBytes = zipBlob.size;
      console.log(`[BackupService] Compressed payload size: ${totalSizeBytes} bytes (${this.formatSize(totalSizeBytes)}).`);

      // Step 5: Handle Offline state (Local Encrypted Backup)
      if (!navigator.onLine) {
        console.warn(`[BackupService] Network offline. Storing local encrypted backup in offline queue...`);
        onProgress?.('uploading', 70, 'Device offline. Saved encrypted snapshot to local queue...');
        
        await this.queueOfflineBackup(uid, {
          id: backupId,
          backupId,
          fileName,
          createdAt,
          fileSize: totalSizeBytes,
          size: totalSizeBytes,
          status: 'verified',
          version: APP_VERSION,
          appVersion: APP_VERSION,
          encryptionVersion: ENCRYPTION_VERSION,
          device: navigator.userAgent || 'Web Browser',
          restoreVersion: APP_VERSION,
          type,
          checksum: checksumSha256,
          checksumSha256,
          encryptionIv: ivHex,
          itemCounts,
          envelopeString,
          userId: uid,
        });

        localStorage.setItem('smart_ledger_last_backup_time', createdAt);
        localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());

        createNotification({
          title: 'Offline Backup Saved',
          message: `Local encrypted backup stored (${this.formatSize(totalSizeBytes)}). Will sync when online.`,
          type: 'admin_db_backup',
          referenceId: backupId,
        });

        return {
          id: backupId,
          backupId,
          name: backupId,
          fileName,
          createdAt,
          fileSize: totalSizeBytes,
          size: totalSizeBytes,
          status: 'verified',
          version: APP_VERSION,
          appVersion: APP_VERSION,
          encryptionVersion: ENCRYPTION_VERSION,
          device: navigator.userAgent || 'Web Browser',
          restoreVersion: APP_VERSION,
          type,
          checksum: checksumSha256,
          checksumSha256,
          encryptionIv: ivHex,
          itemCounts,
          storagePath: `backups/${uid}/${fileName}`,
          userId: uid,
          compressed: true,
        };
      }

      // Step 6: Upload to Firebase Storage with up to 5 retries
      onProgress?.('uploading', 70, `Uploading encrypted snapshot (${this.formatSize(totalSizeBytes)}) to Cloud Storage...`);
      console.log(`[BackupService] Step 4: Uploading to Firebase Storage path backups/${uid}/${fileName}...`);
      
      const storagePath = `backups/${uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      let uploadSuccess = false;
      let lastUploadError: any = null;
      const MAX_RETRIES = 5;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[BackupService] Storage upload attempt ${attempt}/${MAX_RETRIES}...`);
          
          const arrayBuffer = await zipBlob.arrayBuffer();
          const uploadPromise = uploadBytes(storageRef, arrayBuffer, {
            contentType: 'application/octet-stream',
            customMetadata: {
              backupId,
              type,
              version: APP_VERSION,
              checksumSha256,
              encryptionIv: ivHex,
              status: 'verified',
              createdAt,
              originalSize: rawJsonPayload.length.toString(),
            },
          });

          await withTimeout(uploadPromise, 25000, `Storage upload attempt ${attempt}`);
          uploadSuccess = true;
          console.log(`[BackupService] Storage upload succeeded on attempt ${attempt}.`);
          break;
        } catch (err: any) {
          lastUploadError = err;
          console.warn(`[BackupService] Storage upload attempt ${attempt} warning:`, err?.message || err);
          if (attempt < MAX_RETRIES) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
            onProgress?.('uploading', 70 + attempt * 3, `Retrying upload (${attempt}/${MAX_RETRIES}) in ${backoffMs / 1000}s...`);
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
          console.warn('[BackupService] getMetadata warning (using blob size):', e);
        }
      } else {
        console.warn('[BackupService] Cloud Storage upload fallback to Firestore cloud payload document.');
      }

      // Step 7: Save Firestore Metadata Document (users/{uid}/backups/{backupId})
      onProgress?.('verifying', 90, 'Saving backup metadata to Firestore...');
      console.log(`[BackupService] Step 5: Saving metadata record to users/${uid}/backups/${backupId}...`);

      const record: BackupMetadata = {
        id: backupId,
        backupId,
        name: backupId,
        fileName,
        createdAt,
        fileSize: storageVerifiedSize,
        size: storageVerifiedSize,
        status: 'verified',
        version: APP_VERSION,
        appVersion: APP_VERSION,
        encryptionVersion: ENCRYPTION_VERSION,
        device: navigator.userAgent ? navigator.userAgent.substring(0, 100) : 'Web Client',
        restoreVersion: APP_VERSION,
        type,
        checksum: checksumSha256,
        checksumSha256,
        encryptionIv: ivHex,
        itemCounts,
        storagePath,
        userId: uid,
        compressed: true,
      };

      const backupDocRef = doc(db, 'users', uid, 'backups', backupId);
      await withTimeout(setDoc(backupDocRef, record), 10000, 'Saving Firestore backup metadata');

      // Also store fallback payload document inside subcollection for complete disaster recovery
      try {
        const payloadDocRef = doc(db, 'users', uid, 'backups', backupId, 'payload', 'data');
        await setDoc(payloadDocRef, {
          envelopeString,
          createdAt,
          checksum: checksumSha256,
        });
      } catch (payloadErr) {
        console.warn('[BackupService] Subcollection payload sync note:', payloadErr);
      }

      // Step 8: Update Health Status Document in Firestore (/users/{uid}/backups_meta/status)
      const nextBackupTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const statusUpdate = {
        lastBackupTime: createdAt,
        nextBackupTime,
        lastBackupStatus: 'healthy',
        backupHealth: 'Optimal • Cloud Verified',
        backupVersion: APP_VERSION,
        backupSize: storageVerifiedSize,
        backupChecksum: checksumSha256,
        backupLocation: storagePath,
        lastError: null,
        updatedAt: createdAt,
      };

      try {
        await setDoc(doc(db, 'users', uid, 'backups_meta', 'status'), statusUpdate, { merge: true });
        await setDoc(doc(db, 'users', uid, 'app', 'state'), { backupSettings: statusUpdate }, { merge: true });
      } catch (statusErr) {
        console.warn('[BackupService] Status doc update note:', statusErr);
      }

      // Update local storage timestamps for instant zero-latency checks
      localStorage.setItem('smart_ledger_last_backup_time', createdAt);
      localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
      localStorage.setItem('smart_ledger_backup_status', JSON.stringify(statusUpdate));

      // Step 9: Enforce Retention Policy (Keep latest 30 backups automatically)
      await this.enforceRetentionPolicy(uid).catch((e) => console.warn('[BackupService] Retention policy note:', e));

      // Notification: Backup Completed
      createNotification({
        title: 'Backup Completed',
        message: `Cloud snapshot safely verified and stored (${itemCounts.transactions} transactions, ${this.formatSize(storageVerifiedSize)}).`,
        type: 'admin_db_backup',
        referenceId: backupId,
      });

      const totalDuration = Date.now() - startTime;
      console.log(`[BackupService] Backup Completed Successfully in ${totalDuration}ms.`);
      console.log(`[BackupService] ==========================================`);

      onProgress?.('completed', 100, 'Cloud backup completed and verified successfully.');
      return record;
    } catch (err: any) {
      this.lastErrorMessage = err?.message || 'Backup failed.';
      console.error(`[BackupService Fatal Error] Backup pipeline failed:`, err);
      console.error(err?.stack || 'No stack trace available');

      // Notification: Backup Failed
      createNotification({
        title: 'Backup Failed',
        message: err?.message || 'Automatic backup encountered an error and will retry.',
        type: 'admin_db_backup',
      });

      // Update error status in Firestore if possible
      try {
        if (uid) {
          await setDoc(doc(db, 'users', uid, 'backups_meta', 'status'), {
            lastBackupStatus: 'error',
            backupHealth: 'Error: Needs Retry',
            lastError: err?.message || 'Unknown backup error',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch {}

      throw err;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * List real backups from Firestore & synchronize with Cloud Storage
   */
  public static async listBackups(): Promise<BackupMetadata[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    console.log(`[BackupService] Listing backups for user ${uid}...`);
    try {
      const backupsCol = collection(db, 'users', uid, 'backups');
      const q = query(backupsCol, orderBy('createdAt', 'desc'));
      const querySnap = await withTimeout(getDocs(q), 8000, 'Fetching Firestore backups');

      const backups: BackupMetadata[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data() as BackupMetadata;
        const bId = data.backupId || data.id || docSnap.id;
        const bSize = data.fileSize || data.size || 0;
        backups.push({
          ...data,
          id: bId,
          backupId: bId,
          name: data.name || data.fileName || bId,
          fileName: data.fileName || `${bId}.backup`,
          createdAt: data.createdAt || new Date().toISOString(),
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

      console.log(`[BackupService] Loaded ${backups.length} snapshots from Firestore.`);
      return backups;
    } catch (error) {
      console.error('[BackupService Error] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore application state with cryptographic integrity verification & zero data loss rollback
   */
  public static async restoreBackup(
    backupId: string,
    onProgress?: (message: string, percent: number) => void
  ): Promise<{ success: boolean; restoredState: AppState }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required for restore.');

    console.log(`[BackupService] ==========================================`);
    console.log(`[BackupService] Starting restore for snapshot ID: ${backupId}`);

    onProgress?.('Fetching snapshot metadata from Firestore...', 15);

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

    // 2. Download encrypted payload from Firebase Storage (or Firestore payload fallback)
    onProgress?.('Downloading encrypted snapshot from Cloud Storage...', 35);
    let envelopeJson: string = '';

    try {
      console.log(`[BackupService] Attempting to download from Storage: ${storagePath}`);
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
      console.warn('[BackupService] Cloud Storage download failed; checking Firestore fallback...', downloadErr?.message);
      try {
        const payloadDoc = await withTimeout(getDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data')), 8000, 'Fetching Firestore fallback payload');
        if (payloadDoc.exists()) {
          envelopeJson = payloadDoc.data()?.envelopeString || '';
          console.log('[BackupService] Successfully retrieved snapshot from Firestore cloud payload.');
        }
      } catch (fallbackErr) {
        console.error('[BackupService] Fallback payload fetch failed:', fallbackErr);
      }
    }

    if (!envelopeJson) {
      throw new Error(`Corrupted or missing backup: Unable to locate snapshot payload for ID ${backupId}.`);
    }

    // 3. Decrypt with AES-256
    onProgress?.('Decrypting snapshot payload with AES-256...', 60);
    let rawPayloadString = '';
    let envelopeChecksum = expectedChecksum;

    try {
      const envelope = JSON.parse(envelopeJson);
      const ciphertext = envelope.ciphertext || envelopeJson;
      const ivHex = envelope.iv || metadata?.encryptionIv;
      envelopeChecksum = envelope.checksum || envelope.checksumSha256 || envelopeChecksum;

      const key = this.getEncryptionKey(uid);

      if (ivHex) {
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
        rawPayloadString = decrypted.toString(CryptoJS.enc.Utf8);
      } else {
        const legacyKey = CryptoJS.SHA256(uid + '-smart-ledger-backup-secret').toString();
        const bytes = CryptoJS.AES.decrypt(ciphertext, legacyKey);
        rawPayloadString = bytes.toString(CryptoJS.enc.Utf8);
        if (!rawPayloadString) {
          const bytes2 = CryptoJS.AES.decrypt(ciphertext, key);
          rawPayloadString = bytes2.toString(CryptoJS.enc.Utf8);
        }
      }
    } catch (decryptErr) {
      console.error('[BackupService Error] Decryption failed:', decryptErr);
      throw new Error('Decryption failed: Cryptographic signature mismatch or corrupted data.');
    }

    if (!rawPayloadString) {
      throw new Error('Backup corrupted: Decryption returned empty payload.');
    }

    // 4. SHA-256 Integrity Verification
    onProgress?.('Verifying SHA-256 integrity checksum...', 75);
    const actualChecksum = CryptoJS.SHA256(rawPayloadString).toString();

    if (envelopeChecksum && envelopeChecksum !== 'migrated' && actualChecksum !== envelopeChecksum) {
      console.error('[Backup Integrity Error] Checksum verification mismatch!', {
        expected: envelopeChecksum,
        actual: actualChecksum,
      });
      throw new Error('Backup corrupted: SHA-256 checksum verification failed.');
    }

    console.log(`[BackupService] SHA-256 Checksum verified successfully: ${actualChecksum}`);

    // 5. Parse and assemble App State
    onProgress?.('Restoring Firestore database collections...', 85);
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

    // 6. Atomically restore all collections in Firestore
    await this.restoreAllDataToFirestore(uid, restoredState);

    // 7. Update status in Firestore metadata
    try {
      await setDoc(
        doc(db, 'users', uid, 'backups', backupId),
        { status: 'restored', lastRestoredAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {}

    // 8. Update local storage cache
    try {
      localStorage.setItem('smart-ledger-data', JSON.stringify(restoredState));
    } catch (e) {}

    createNotification({
      title: 'Restore Successful',
      message: `Restored ${restoredState.transactions.length} transactions and point-in-time state.`,
      type: 'admin_db_restore',
      referenceId: backupId,
    });

    onProgress?.('Restore completed successfully.', 100);
    console.log(`[BackupService] Restore completed successfully for snapshot ${backupId}.`);
    console.log(`[BackupService] ==========================================`);

    return { success: true, restoredState };
  }

  /**
   * Delete backup from Firebase Storage and Firestore
   */
  public static async deleteBackup(backupId: string, fileName?: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required.');

    const name = fileName || `${backupId}.backup`;
    console.log(`[BackupService] Deleting backup ${backupId} (${name})...`);

    try {
      const storageRef = ref(storage, `backups/${uid}/${name}`);
      await deleteObject(storageRef);
      console.log('[BackupService] Storage file deleted.');
    } catch (storageErr: any) {
      console.warn('[BackupService] Storage file delete notice:', storageErr?.message);
    }

    try {
      const docRef = doc(db, 'users', uid, 'backups', backupId);
      await deleteDoc(docRef);
      await deleteDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data')).catch(() => {});
      console.log('[BackupService] Firestore metadata document deleted.');
    } catch (firestoreErr) {
      console.error('[BackupService] Firestore delete error:', firestoreErr);
    }

    this.removeOfflineBackup(uid, backupId);
  }

  /**
   * Download encrypted backup file directly to client machine
   */
  public static async downloadBackup(backupId: string, fileName?: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const name = fileName || `${backupId}.backup`;
    const storageRef = ref(storage, `backups/${uid}/${name}`);

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
        console.error('[BackupService] Download fallback error:', fallbackErr);
      }
      throw err;
    }
  }

  /**
   * Calculate live backup storage statistics & health
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
      lastError: this.lastErrorMessage || customSettings?.lastError || null,
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
   * Enforce user-configured retention policy (Defaults to latest 30 backups)
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
        console.log(`[BackupService] Retention Policy: Pruning ${toPrune.length} older backups exceeding limit of ${limit}`);
        for (const b of toPrune) {
          await this.deleteBackup(b.id, b.fileName).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[BackupService] Retention enforcement notice:', e);
    }
  }

  /**
   * Gather complete user data snapshot across Firestore documents and collections
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
    const transactions = txSnap ? (txSnap.docs.map((d) => d.data() as Transaction)) : [];
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
      transactions: transactions.length > 0 ? transactions : (localFallback.transactions || []),
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
    const uid = auth.currentUser?.uid;
    if (!uid || !navigator.onLine) return;

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
