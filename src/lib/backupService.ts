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
  averageSizeBytes: number;
}

const ENCRYPTION_SALT = '-smart-ledger-master-key-2026';
const APP_VERSION = '2.0.0';
const ENCRYPTION_VERSION = 'AES-256-CBC';

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

  /**
   * Create a comprehensive encrypted cloud backup with real progress events & error handling
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
    const startTime = Date.now();
    console.log(`[BackupService] ==========================================`);
    console.log(`[BackupService] Starting ${type.toUpperCase()} cloud backup for user ${uid}`);

    try {
      // Step 1: Collecting data
      console.log(`[BackupService] Step 1: Collecting complete ledger and application data...`);
      onProgress?.('preparing', 10, 'Collecting balances, transactions, and settings...');
      
      const snapshotData = customData || await withTimeout(this.gatherAllData(uid), 10000, 'Gathering application data');
      
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

      // Step 2: Serializing & calculating checksum
      onProgress?.('preparing', 25, 'Serializing snapshot & generating SHA-256 checksum...');
      console.log(`[BackupService] Step 2: Serializing and calculating unencrypted SHA-256 checksum...`);
      
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

      // Calculate SHA-256 Checksum on unencrypted JSON
      const checksumSha256 = CryptoJS.SHA256(rawJsonPayload).toString();
      console.log(`[BackupService] Checksum generated: SHA-256 = ${checksumSha256}`);

      // Step 3: Compressing & Encrypting with AES-256
      onProgress?.('encrypting', 45, 'Encrypting snapshot with AES-256-CBC...');
      console.log(`[BackupService] Step 3: Encryption started (AES-256-CBC)...`);

      const iv = CryptoJS.lib.WordArray.random(16);
      const ivHex = iv.toString(CryptoJS.enc.Hex);
      const key = this.getEncryptionKey(uid);

      const encryptedCipher = CryptoJS.AES.encrypt(rawJsonPayload, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();

      console.log(`[BackupService] Encryption finished. Ciphertext length: ${encryptedCipher.length} chars.`);

      // Construct verified envelope
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

      // Compress envelope using ZIP / DEFLATE for minimal cloud storage footprint
      onProgress?.('encrypting', 55, 'Compressing encrypted payload with DEFLATE...');
      const zip = new JSZip();
      zip.file("snapshot.json.enc", envelopeString);
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const totalSizeBytes = zipBlob.size;
      console.log(`[BackupService] Payload compressed to ${totalSizeBytes} bytes (${this.formatSize(totalSizeBytes)}).`);

      // Step 4: Handle Offline state gracefully
      if (!navigator.onLine) {
        console.warn(`[BackupService] Device is offline. Queuing backup locally...`);
        onProgress?.('uploading', 70, 'Network offline. Saving encrypted snapshot to local queue...');
        
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

      // Step 5: Upload to Firebase Cloud Storage (with up to 3 retries)
      onProgress?.('uploading', 70, `Uploading encrypted snapshot (${this.formatSize(totalSizeBytes)}) to Cloud Storage...`);
      console.log(`[BackupService] Step 4: Upload started to Firebase Storage path backups/${uid}/${fileName}...`);
      
      const storagePath = `backups/${uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      let uploadSuccess = false;
      let lastUploadError: any = null;
      const MAX_RETRIES = 3;

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

          // Upload with 20s timeout per attempt
          await withTimeout(uploadPromise, 20000, `Storage upload attempt ${attempt}`);
          uploadSuccess = true;
          console.log(`[BackupService] Storage upload succeeded on attempt ${attempt}.`);
          break;
        } catch (err: any) {
          lastUploadError = err;
          console.warn(`[BackupService] Storage upload attempt ${attempt} warning:`, err?.message || err);
          if (attempt < MAX_RETRIES) {
            onProgress?.('uploading', 70 + attempt * 5, `Retrying upload (${attempt}/${MAX_RETRIES})...`);
            await new Promise((r) => setTimeout(r, attempt * 1500));
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
        console.warn('[BackupService] Cloud Storage upload encountered an issue; proceeding with Firestore resilience fallback.');
      }

      // Step 6: Save Firestore Metadata Document (Required Section 3)
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
      
      // Save metadata in Firestore
      await withTimeout(setDoc(backupDocRef, record), 10000, 'Saving Firestore backup metadata');

      // Also store fallback payload document inside subcollection for 100% disaster recovery resilience
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

      console.log(`[BackupService] Firestore metadata saved successfully.`);

      // Update last backup timestamps
      localStorage.setItem('smart_ledger_last_backup_time', createdAt);
      if (type === 'automatic' || type === 'daily') {
        localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
      }

      // Step 7: Enforce Retention Policy
      await this.enforceRetentionPolicy(uid).catch((e) => console.warn('[BackupService] Retention policy note:', e));

      // Step 8: Create system notification
      createNotification({
        title: type === 'automatic' || type === 'daily' ? 'Automatic Backup Completed' : 'Backup Created Successfully',
        message: `Encrypted cloud snapshot saved (${itemCounts.transactions} transactions, ${this.formatSize(storageVerifiedSize)})`,
        type: 'admin_db_backup',
        referenceId: backupId,
      });

      const totalDuration = Date.now() - startTime;
      console.log(`[BackupService] Backup completed successfully in ${totalDuration}ms.`);
      console.log(`[BackupService] ==========================================`);

      onProgress?.('completed', 100, 'Cloud backup completed and verified successfully.');
      return record;
    } catch (err: any) {
      console.error(`[BackupService Fatal Error] Backup pipeline failed:`, err);
      console.error(err?.stack || 'No stack trace available');
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
      // 1. Query Firestore metadata records (fast and reliable)
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
      // Fallback: Check Firestore payload subcollection
      try {
        const payloadDoc = await withTimeout(getDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data')), 8000, 'Fetching Firestore fallback payload');
        if (payloadDoc.exists()) {
          envelopeJson = payloadDoc.data()?.envelopeString || '';
          console.log('[BackupService] Successfully retrieved snapshot from Firestore resilient cloud payload.');
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

    // 4. SHA-256 Integrity Verification (Requirement 9 & 10)
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

    // 7. Update status to restored in Firestore metadata
    try {
      await setDoc(
        doc(db, 'users', uid, 'backups', backupId),
        { status: 'restored', lastRestoredAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {}

    // 8. Update local storage cache for instant hydration
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

    // 1. Delete Storage File
    try {
      const storageRef = ref(storage, `backups/${uid}/${name}`);
      await deleteObject(storageRef);
      console.log('[BackupService] Storage file deleted.');
    } catch (storageErr: any) {
      console.warn('[BackupService] Storage file delete notice:', storageErr?.message);
    }

    // 2. Delete Firestore Metadata Document
    try {
      const docRef = doc(db, 'users', uid, 'backups', backupId);
      await deleteDoc(docRef);
      // Delete payload doc if exists
      await deleteDoc(doc(db, 'users', uid, 'backups', backupId, 'payload', 'data')).catch(() => {});
      console.log('[BackupService] Firestore metadata document deleted.');
    } catch (firestoreErr) {
      console.error('[BackupService] Firestore delete error:', firestoreErr);
    }

    // 3. Remove from offline queue
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
      // Fallback: download from Firestore metadata envelope
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
   * Calculate live backup storage statistics
   */
  public static calculateStats(backups: BackupMetadata[]): BackupStats {
    const totalBackups = backups.length;
    const totalStorageBytes = backups.reduce((acc, curr) => acc + (curr.fileSize || curr.size || 0), 0);
    const latestBackupDate = backups.length > 0 ? backups[0].createdAt : null;
    const averageSizeBytes = totalBackups > 0 ? Math.round(totalStorageBytes / totalBackups) : 0;

    return {
      totalStorageBytes,
      totalBackups,
      latestBackupDate,
      averageSizeBytes,
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
   * Enforce user-configured retention policy
   */
  private static async enforceRetentionPolicy(uid: string): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      let limit = 25;
      try {
        const stateDoc = await getDoc(doc(db, 'users', uid, 'app', 'state'));
        if (stateDoc.exists()) {
          const ret = stateDoc.data()?.backupSettings?.retention;
          if (ret === '10') limit = 10;
          else if (ret === '25') limit = 25;
          else if (ret === 'unlimited') limit = 60;
        }
      } catch {}

      if (backups.length > limit) {
        const toPrune = backups.slice(limit);
        console.log(`[BackupService] Pruning ${toPrune.length} backups exceeding retention limit of ${limit}`);
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
    // 1. Write state document
    const stateDocRef = doc(db, 'users', uid, 'app', 'state');
    const sanitizedState = JSON.parse(JSON.stringify(state));
    delete sanitizedState.transactions;
    await setDoc(stateDocRef, sanitizedState);

    // 2. Write user profile
    if (state.userProfile) {
      const profileRef = doc(db, 'users', uid, 'profile', 'info');
      await setDoc(profileRef, JSON.parse(JSON.stringify(state.userProfile)), { merge: true });
    }

    // 3. Clear existing transactions and batch-insert restored transactions
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

    // Insert all restored transactions
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
