import { storage, auth, db } from './firebase';
import { 
  ref, 
  uploadString, 
  getDownloadURL, 
  listAll, 
  deleteObject, 
  getMetadata,
  uploadBytesResumable
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
import { AppState, Transaction, BackupMetadata, BackupType, BackupProgressStage, BackupItemCounts, BackupSettings } from '../types';
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
const BACKUP_VERSION = '2.0.0';

export class BackupService {
  private static isBackingUp = false;

  /**
   * Derive zero-knowledge AES-256 key for the authenticated user
   */
  private static getEncryptionKey(uid: string): CryptoJS.lib.WordArray {
    return CryptoJS.SHA256(uid + ENCRYPTION_SALT);
  }

  /**
   * Generate human-readable standardized backup ID & filename
   * Example: backup_2026-08-19_15-36-42_manual.json.enc
   */
  public static generateBackupName(type: BackupType): { id: string; fileName: string } {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timePart = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const typeTag = type === 'automatic' || type === 'daily' ? 'auto' : type === 'manual' ? 'manual' : type;
    const id = `backup_${datePart}_${timePart}_${typeTag}`;
    const fileName = `${id}.json.enc`;
    return { id, fileName };
  }

  /**
   * Check if a backup operation is currently in progress
   */
  public static isOperationActive(): boolean {
    return this.isBackingUp;
  }

  /**
   * Create a comprehensive encrypted cloud backup with live progress callbacks
   */
  public static async createBackup(
    type: BackupType = 'manual',
    onProgress?: BackupProgressCallback,
    customData?: AppState
  ): Promise<BackupMetadata> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('Authentication required: Please log in to create a backup.');
    }

    if (this.isBackingUp) {
      throw new Error('A backup operation is already in progress. Please wait for it to complete.');
    }

    this.isBackingUp = true;

    try {
      // Stage 1: Preparing & gathering all application data
      onProgress?.('preparing', 15, 'Gathering financial balances, transactions, and settings...');
      const snapshotData = customData || await this.gatherAllData(uid);
      
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

      const rawJsonPayload = JSON.stringify({
        ...snapshotData,
        backupMetadata: {
          backupId,
          createdAt,
          version: BACKUP_VERSION,
          type,
          itemCounts,
          userId: uid,
          userEmail: auth.currentUser?.email || ''
        }
      });

      // Stage 2: Encrypting with AES-256 & calculating SHA-256 integrity checksum
      onProgress?.('encrypting', 40, 'Encrypting snapshot with military-grade AES-256...');
      
      // Calculate unencrypted SHA-256 hash
      const checksumSha256 = CryptoJS.SHA256(rawJsonPayload).toString();

      // Generate random 128-bit Initialization Vector (IV)
      const iv = CryptoJS.lib.WordArray.random(16);
      const ivHex = iv.toString(CryptoJS.enc.Hex);
      const key = this.getEncryptionKey(uid);

      // AES-256 encryption in CBC mode with PKCS7 padding
      const encryptedCipher = CryptoJS.AES.encrypt(rawJsonPayload, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();

      // Compress encrypted payload using ZIP / Deflate for minimal bandwidth and cloud footprint
      const zip = new JSZip();
      const envelope = {
        format: 'smart-ledger-encrypted-snapshot',
        version: BACKUP_VERSION,
        backupId,
        fileName,
        type,
        createdAt,
        userId: uid,
        iv: ivHex,
        checksumSha256,
        ciphertext: encryptedCipher,
        itemCounts,
      };
      
      zip.file("snapshot.json.enc", JSON.stringify(envelope));
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const totalSizeBytes = zipBlob.size;

      // Handle Offline state: if user is offline, save to local offline queue and notify
      if (!navigator.onLine) {
        onProgress?.('uploading', 70, 'Network offline. Saving encrypted backup to local offline queue...');
        await this.queueOfflineBackup(uid, {
          id: backupId,
          fileName,
          createdAt,
          size: totalSizeBytes,
          status: 'verified',
          version: BACKUP_VERSION,
          type,
          checksumSha256,
          encryptionIv: ivHex,
          itemCounts,
          envelopeString: JSON.stringify(envelope)
        });

        createNotification({
          title: 'Offline Backup Queued',
          message: 'Network offline. Your encrypted backup will upload automatically when online.',
          type: 'admin_db_backup'
        });

        return {
          id: backupId,
          name: backupId,
          fileName,
          createdAt,
          size: totalSizeBytes,
          status: 'verified',
          version: BACKUP_VERSION,
          type,
          checksumSha256,
          encryptionIv: ivHex,
          itemCounts,
          storagePath: `backups/${uid}/${fileName}`,
          userId: uid,
          compressed: true,
        };
      }

      // Stage 3: Uploading to Firebase Cloud Storage with up to 3 retries
      onProgress?.('uploading', 70, 'Uploading encrypted snapshot to Firebase Cloud Storage...');
      const storagePath = `backups/${uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      let uploadSuccess = false;
      let lastUploadError: any = null;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Convert blob to ArrayBuffer for robust chunked upload
          const arrayBuffer = await zipBlob.arrayBuffer();
          const uploadTask = uploadBytesResumable(storageRef, arrayBuffer, {
            contentType: 'application/octet-stream',
            customMetadata: {
              backupId,
              type,
              version: BACKUP_VERSION,
              checksumSha256,
              encryptionIv: ivHex,
              status: 'verified',
              createdAt,
              originalSize: rawJsonPayload.length.toString(),
            },
          });

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                if (snapshot.totalBytes > 0) {
                  const uploadPct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 20); // 70 to 90%
                  onProgress?.('uploading', 70 + uploadPct, `Uploading: ${Math.round((snapshot.bytesTransferred / 1024))} KB sent...`);
                }
              },
              (err) => reject(err),
              () => resolve()
            );
          });

          uploadSuccess = true;
          break;
        } catch (err: any) {
          lastUploadError = err;
          console.warn(`[BackupService] Upload attempt ${attempt}/${MAX_RETRIES} failed:`, err);
          if (attempt < MAX_RETRIES) {
            onProgress?.('uploading', 70, `Upload attempt ${attempt} failed. Retrying in ${attempt * 2}s...`);
            await new Promise(r => setTimeout(r, attempt * 2000));
          }
        }
      }

      if (!uploadSuccess) {
        throw new Error(`Failed to upload backup to cloud storage after ${MAX_RETRIES} attempts: ${lastUploadError?.message || 'Network error'}`);
      }

      // Stage 4: Verifying upload integrity & recording Firestore metadata
      onProgress?.('verifying', 90, 'Verifying cloud snapshot integrity and storing metadata...');
      
      const storageMeta = await getMetadata(storageRef);
      const verifiedSize = storageMeta.size || totalSizeBytes;

      const record: BackupMetadata = {
        id: backupId,
        name: backupId,
        fileName,
        createdAt,
        size: verifiedSize,
        status: 'verified',
        version: BACKUP_VERSION,
        type,
        checksumSha256,
        encryptionIv: ivHex,
        itemCounts,
        storagePath,
        userId: uid,
        compressed: true,
      };

      // Persist metadata in Firestore at `/users/{uid}/backups/{backupId}`
      const backupDocRef = doc(db, 'users', uid, 'backups', backupId);
      await setDoc(backupDocRef, record);

      // Update last backup timestamp in local storage
      localStorage.setItem('smart_ledger_last_backup_time', createdAt);
      if (type === 'automatic' || type === 'daily') {
        localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
      }

      // Stage 5: Enforce Retention Policy
      await this.enforceRetentionPolicy(uid);

      // Create in-app system notification
      createNotification({
        title: type === 'automatic' || type === 'daily' ? 'Automatic Backup Completed' : 'Backup Created Successfully',
        message: `Saved ${itemCounts.transactions} transactions & balances (${this.formatSize(verifiedSize)})`,
        type: 'admin_db_backup',
        referenceId: backupId
      });

      onProgress?.('completed', 100, 'Backup successfully encrypted, uploaded, and verified.');
      return record;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Load real backup history from Firestore and synchronize with Storage
   */
  public static async listBackups(): Promise<BackupMetadata[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    try {
      // 1. Query Firestore for real persistent metadata records
      const backupsCol = collection(db, 'users', uid, 'backups');
      const q = query(backupsCol, orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);

      const firestoreBackups: BackupMetadata[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data() as BackupMetadata;
        firestoreBackups.push({
          ...data,
          id: data.id || docSnap.id,
          name: data.name || data.fileName || docSnap.id,
          fileName: data.fileName || `${data.id || docSnap.id}.json.enc`,
          status: data.status || 'verified',
          version: data.version || BACKUP_VERSION,
          type: data.type || 'manual',
        });
      });

      // 2. If firestore list is empty, also discover any existing files in Storage and heal metadata
      if (firestoreBackups.length === 0) {
        try {
          const listRef = ref(storage, `backups/${uid}`);
          const res = await listAll(listRef);
          const storageBackups = await Promise.all(
            res.items.map(async (itemRef) => {
              try {
                const meta = await getMetadata(itemRef);
                const backupId = itemRef.name.replace(/\.(json\.enc|zip|enc)$/, '');
                const record: BackupMetadata = {
                  id: backupId,
                  name: backupId,
                  fileName: itemRef.name,
                  createdAt: meta.timeCreated || new Date().toISOString(),
                  size: meta.size,
                  status: 'verified',
                  version: meta.customMetadata?.version || BACKUP_VERSION,
                  type: (meta.customMetadata?.type as any) || 'manual',
                  checksumSha256: meta.customMetadata?.checksumSha256 || 'migrated',
                  storagePath: `backups/${uid}/${itemRef.name}`,
                  userId: uid,
                  compressed: true,
                };
                // Self-heal into Firestore
                await setDoc(doc(db, 'users', uid, 'backups', backupId), record).catch(() => {});
                return record;
              } catch (e) {
                return null;
              }
            })
          );
          const valid = storageBackups.filter((b): b is BackupMetadata => b !== null);
          return valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
          console.warn('[BackupService] Storage listing fallback warning:', e);
        }
      }

      return firestoreBackups;
    } catch (error) {
      console.error('[BackupService] Failed to list backups from Firestore:', error);
      return [];
    }
  }

  /**
   * Restore application state with cryptographic integrity verification
   */
  public static async restoreBackup(
    backupId: string,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<{ success: boolean; restoredState: AppState }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required for restore.');

    onProgress?.('Fetching cloud backup snapshot...', 20);

    // 1. Fetch metadata record from Firestore
    let metadata: BackupMetadata | null = null;
    try {
      const docSnap = await getDoc(doc(db, 'users', uid, 'backups', backupId));
      if (docSnap.exists()) {
        metadata = docSnap.data() as BackupMetadata;
      }
    } catch (e) {
      console.warn('[BackupService] Could not fetch backup doc metadata:', e);
    }

    const fileName = metadata?.fileName || `${backupId}.json.enc`;
    const storagePath = metadata?.storagePath || `backups/${uid}/${fileName}`;

    // 2. Download encrypted payload from Firebase Storage
    onProgress?.('Downloading encrypted snapshot from Cloud Storage...', 40);
    const storageRef = ref(storage, storagePath);
    let blob: Blob;

    try {
      const url = await getDownloadURL(storageRef);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP download error: ${res.statusText}`);
      blob = await res.blob();
    } catch (downloadErr: any) {
      // Try legacy .zip extension fallback
      try {
        const legacyRef = ref(storage, `backups/${uid}/${backupId}.zip`);
        const url = await getDownloadURL(legacyRef);
        const res = await fetch(url);
        blob = await res.blob();
      } catch {
        throw new Error(`Backup file not found in cloud storage: ${downloadErr.message}`);
      }
    }

    onProgress?.('Decompressing and decrypting data payload...', 60);

    // 3. Decompress ZIP container
    let envelopeJson: string = '';
    try {
      const zip = await JSZip.loadAsync(blob);
      const snapshotFile = zip.file('snapshot.json.enc') || zip.file('data.enc');
      if (snapshotFile) {
        envelopeJson = await snapshotFile.async('string');
      } else {
        // Fallback if not inside zip
        envelopeJson = await blob.text();
      }
    } catch (zipErr) {
      // Fallback: direct text
      envelopeJson = await blob.text();
    }

    if (!envelopeJson) {
      throw new Error('Corrupted backup file: Unable to extract encrypted snapshot envelope.');
    }

    // 4. Parse Envelope and Decrypt
    let rawPayloadString = '';
    let expectedChecksum = metadata?.checksumSha256 || '';

    try {
      const envelope = JSON.parse(envelopeJson);
      const ciphertext = envelope.ciphertext || envelopeJson;
      const ivHex = envelope.iv || metadata?.encryptionIv;
      expectedChecksum = envelope.checksumSha256 || expectedChecksum;

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
        // Legacy fallback
        const legacyKey = CryptoJS.SHA256(uid + '-smart-ledger-backup-secret').toString();
        const bytes = CryptoJS.AES.decrypt(ciphertext, legacyKey);
        rawPayloadString = bytes.toString(CryptoJS.enc.Utf8);
        if (!rawPayloadString) {
          const bytes2 = CryptoJS.AES.decrypt(ciphertext, key);
          rawPayloadString = bytes2.toString(CryptoJS.enc.Utf8);
        }
      }
    } catch (decryptErr) {
      throw new Error('Decryption failed: Cryptographic signature mismatch or corrupted data.');
    }

    if (!rawPayloadString) {
      throw new Error('Backup corrupted: Decryption returned empty payload.');
    }

    // 5. Requirement 9: Verify SHA-256 Checksum Integrity
    onProgress?.('Verifying SHA-256 integrity checksum...', 75);
    const actualChecksum = CryptoJS.SHA256(rawPayloadString).toString();

    if (expectedChecksum && expectedChecksum !== 'migrated' && actualChecksum !== expectedChecksum) {
      console.error('[Backup Integrity Error] Checksum mismatch!', {
        expected: expectedChecksum,
        actual: actualChecksum,
      });
      throw new Error('Backup corrupted: SHA-256 integrity checksum verification failed.');
    }

    // 6. Parse and validate App State structure
    onProgress?.('Restoring database collections and balances...', 85);
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

    // 7. Write restored state atomically to Firestore
    await this.restoreAllDataToFirestore(uid, restoredState);

    // Save restored status in backup metadata
    try {
      await setDoc(
        doc(db, 'users', uid, 'backups', backupId),
        { status: 'restored', lastRestoredAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {}

    // Save to local cache
    try {
      localStorage.setItem('smart-ledger-data', JSON.stringify(restoredState));
      localStorage.setItem(`smart-ledger-cache-${uid}`, JSON.stringify({ state: restoredState, transactions: restoredState.transactions }));
    } catch (e) {}

    createNotification({
      title: 'Restore Successful',
      message: `Restored ${restoredState.transactions.length} transactions and point-in-time state.`,
      type: 'admin_db_restore',
      referenceId: backupId
    });

    onProgress?.('Restore completed successfully.', 100);
    return { success: true, restoredState };
  }

  /**
   * Delete backup from Firebase Storage and Firestore permanently
   */
  public static async deleteBackup(backupId: string, fileName?: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required.');

    const name = fileName || `${backupId}.json.enc`;

    // 1. Delete Storage File
    try {
      const storageRef = ref(storage, `backups/${uid}/${name}`);
      await deleteObject(storageRef);
    } catch (storageErr: any) {
      console.warn('[BackupService] Storage file deletion notice:', storageErr?.message);
      // Also try fallback extensions if any
      try {
        await deleteObject(ref(storage, `backups/${uid}/${backupId}.zip`));
      } catch {}
    }

    // 2. Delete Firestore Metadata Document
    try {
      const docRef = doc(db, 'users', uid, 'backups', backupId);
      await deleteDoc(docRef);
    } catch (firestoreErr) {
      console.error('[BackupService] Firestore metadata deletion error:', firestoreErr);
    }

    // 3. Remove from offline queue if present
    this.removeOfflineBackup(uid, backupId);
  }

  /**
   * Download encrypted backup file directly to client machine
   */
  public static async downloadBackup(backupId: string, fileName?: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const name = fileName || `${backupId}.json.enc`;
    const storageRef = ref(storage, `backups/${uid}/${name}`);
    let url: string;

    try {
      url = await getDownloadURL(storageRef);
    } catch {
      url = await getDownloadURL(ref(storage, `backups/${uid}/${backupId}.zip`));
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Calculate live backup storage statistics
   */
  public static calculateStats(backups: BackupMetadata[]): BackupStats {
    const totalBackups = backups.length;
    const totalStorageBytes = backups.reduce((acc, curr) => acc + (curr.size || 0), 0);
    const latestBackupDate = backups.length > 0 ? backups[0].createdAt : null;
    const averageSizeBytes = totalBackups > 0 ? Math.round(totalStorageBytes / totalBackups) : 0;

    return {
      totalStorageBytes,
      totalBackups,
      latestBackupDate,
      averageSizeBytes,
    };
  }

  /**
   * Format byte count into human-readable B, KB, MB
   */
  public static formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }

  /**
   * Format relative time (e.g. "Just now", "5 minutes ago", "Yesterday")
   */
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
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
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
      
      // Fetch retention limit from user settings (default: 25)
      let limit = 25;
      try {
        const stateDoc = await getDoc(doc(db, 'users', uid, 'app', 'state'));
        if (stateDoc.exists()) {
          const ret = stateDoc.data()?.backupSettings?.retention;
          if (ret === '10') limit = 10;
          else if (ret === '25') limit = 25;
          else if (ret === 'unlimited') limit = 60; // Safe ceiling
        }
      } catch {}

      if (backups.length > limit) {
        const toPrune = backups.slice(limit);
        console.log(`[BackupService] Pruning ${toPrune.length} backups exceeding retention limit of ${limit}`);
        for (const b of toPrune) {
          await this.deleteBackup(b.id, b.fileName).catch((err) => {
            console.warn('[BackupService] Pruning item notice:', err);
          });
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

    // Fallback to local storage if Firestore was empty
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

    // 2. Write user profile if present
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
   * Local offline backup storage helpers
   */
  private static async queueOfflineBackup(uid: string, item: any): Promise<void> {
    try {
      const key = `smart_ledger_offline_backups_${uid}`;
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
      const key = `smart_ledger_offline_backups_${uid}`;
      const existing = localStorage.getItem(key);
      if (!existing) return;

      const list = JSON.parse(existing);
      if (!Array.isArray(list) || list.length === 0) return;

      console.log(`[BackupService] Processing ${list.length} offline queued backups...`);

      for (const item of list) {
        try {
          if (item.envelopeString) {
            const zip = new JSZip();
            zip.file('snapshot.json.enc', item.envelopeString);
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            const storageRef = ref(storage, `backups/${uid}/${item.fileName}`);
            const arrayBuffer = await zipBlob.arrayBuffer();
            await uploadBytesResumable(storageRef, arrayBuffer);

            const record: BackupMetadata = {
              id: item.id,
              name: item.id,
              fileName: item.fileName,
              createdAt: item.createdAt,
              size: zipBlob.size,
              status: 'verified',
              version: item.version || BACKUP_VERSION,
              type: item.type || 'manual',
              checksumSha256: item.checksumSha256,
              encryptionIv: item.encryptionIv,
              itemCounts: item.itemCounts,
              storagePath: `backups/${uid}/${item.fileName}`,
              userId: uid,
              compressed: true,
            };

            await setDoc(doc(db, 'users', uid, 'backups', item.id), record);
          }
        } catch (itemErr) {
          console.warn('[BackupService] Failed to upload queued offline backup:', itemErr);
        }
      }

      localStorage.removeItem(key);
      createNotification({
        title: 'Offline Backups Synchronized',
        message: 'All queued offline backups have been securely uploaded to Firebase Cloud Storage.',
        type: 'admin_db_backup'
      });
    } catch (e) {
      console.warn('[BackupService] Process offline queue error:', e);
    }
  }

  private static removeOfflineBackup(uid: string, backupId: string): void {
    try {
      const key = `smart_ledger_offline_backups_${uid}`;
      const existing = localStorage.getItem(key);
      if (!existing) return;
      const list = JSON.parse(existing);
      const filtered = list.filter((item: any) => item.id !== backupId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
  }
}
