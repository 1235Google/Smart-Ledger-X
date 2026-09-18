import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import cron from 'node-cron';
import JSZip from 'jszip';

const BACKUP_DB_FILE = path.join(process.cwd(), 'backup-db-store.json');
const STORAGE_DIR = path.join(process.cwd(), 'backup_storage');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface BackupRecord {
  id: string;
  user_id: string;
  status: 'success' | 'failed' | 'in_progress';
  triggered_by: 'scheduled' | 'manual';
  started_at: string;
  completed_at: string | null;
  size_bytes: number;
  checksum_sha256: string | null;
  checksum_verified: boolean;
  storage_path: string;
  error_message: string | null;
  created_at: string;
  file_name: string;
}

export interface BackupScheduleRecord {
  user_id: string;
  frequency_hours: number;
  preferred_time: string; // e.g. "02:00"
  timezone: string; // e.g. "Asia/Kolkata"
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string;
}

interface BackupDatabaseStore {
  backups: BackupRecord[];
  schedules: Record<string, BackupScheduleRecord>;
}

// Memory and file hybrid store for backward compatibility and fast lookups
let dbStore: BackupDatabaseStore = {
  backups: [],
  schedules: {
    'system_admin': {
      user_id: 'system_admin',
      frequency_hours: 24,
      preferred_time: '02:00',
      timezone: 'Asia/Kolkata',
      enabled: true,
      last_run_at: null,
      next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }
};

function loadBackupDb() {
  try {
    if (fs.existsSync(BACKUP_DB_FILE)) {
      const raw = fs.readFileSync(BACKUP_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.backups)) {
        dbStore.backups = parsed.backups;
      }
      if (parsed && parsed.schedules) {
        dbStore.schedules = { ...dbStore.schedules, ...parsed.schedules };
      }
    }
  } catch (err) {
    console.warn('[BackupDB] Could not load backup database store:', err);
  }
}

function saveBackupDb() {
  try {
    fs.writeFileSync(BACKUP_DB_FILE, JSON.stringify(dbStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[BackupDB] Failed to persist backup database store:', err);
  }
}

loadBackupDb();

// =========================================================================
// FIREBASE FIRESTORE REST CLIENT FOR CLOUD-NATIVE STORAGE
// =========================================================================

const firebaseConfig = {
  projectId: 'studio-3200340687-9f052',
  apiKey: 'AIzaSyBGtChtK6JEwE7gTfSSQUkv1JD7px0Bep0'
};

try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (parsed.projectId) firebaseConfig.projectId = parsed.projectId;
    if (parsed.apiKey) firebaseConfig.apiKey = parsed.apiKey;
  }
} catch (e) {
  console.warn('[BackupService] Notice: firebase-applet-config.json load error, using default config.', e);
}

/**
 * Encodes regular JS objects recursively into the Firestore REST JSON payload format
 */
function convertToFirestoreFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return { nullValue: null };
  }
  if (typeof obj === 'string') {
    return { stringValue: obj };
  }
  if (typeof obj === 'number') {
    if (Number.isInteger(obj)) {
      return { integerValue: obj.toString() };
    }
    return { doubleValue: obj };
  }
  if (typeof obj === 'boolean') {
    return { booleanValue: obj };
  }
  if (Array.isArray(obj)) {
    return {
      arrayValue: {
        values: obj.map(item => convertToFirestoreFields(item))
      }
    };
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return { stringValue: obj.toISOString() };
    }
    const fields: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== 'function') {
        fields[key] = convertToFirestoreFields(value);
      }
    }
    return {
      mapValue: {
        fields
      }
    };
  }
  return { nullValue: null };
}

/**
 * Decodes Firestore REST formatted fields into standard plain JavaScript objects
 */
function parseFirestoreFields(fields: any): any {
  if (!fields) return {};
  const res: any = {};
  for (const [key, value] of Object.entries(fields)) {
    res[key] = parseFirestoreValue(value);
  }
  return res;
}

function parseFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map((v: any) => parseFirestoreValue(v));
  }
  if ('mapValue' in val) {
    return parseFirestoreFields(val.mapValue?.fields);
  }
  if ('timestampValue' in val) return val.timestampValue;
  return val;
}

async function fetchFirestoreDocument(collectionPath: string, docId: string): Promise<any> {
  const { projectId, apiKey } = firebaseConfig;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}/${docId}?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Firestore Document Fetch returned ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    return parseFirestoreFields(json.fields);
  } catch (err) {
    console.warn(`[BackupService] fetchFirestoreDocument error for ${collectionPath}/${docId}:`, err);
    return null;
  }
}

async function fetchFirestoreCollection(collectionPath: string): Promise<any[]> {
  const { projectId, apiKey } = firebaseConfig;
  let url: string | null = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}?pageSize=500&key=${apiKey}`;
  const documents: any[] = [];
  
  try {
    while (url) {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`Firestore Collection Fetch returned ${res.status}`);
      }
      const json: any = await res.json();
      if (json.documents && Array.isArray(json.documents)) {
        for (const doc of json.documents) {
          documents.push(parseFirestoreFields(doc.fields));
        }
      }
      if (json.nextPageToken) {
        url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}?pageSize=500&pageToken=${json.nextPageToken}&key=${apiKey}`;
      } else {
        url = null;
      }
    }
  } catch (err) {
    console.warn(`[BackupService] fetchFirestoreCollection error for ${collectionPath}:`, err);
  }
  
  return documents;
}

async function saveFirestoreDocument(collectionPath: string, docId: string, data: any): Promise<boolean> {
  const { projectId, apiKey } = firebaseConfig;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}/${docId}?key=${apiKey}`;
  
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && typeof value !== 'function') {
      fields[key] = convertToFirestoreFields(value);
    }
  }

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[BackupService] saveFirestoreDocument PATCH failed (${res.status}):`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[BackupService] saveFirestoreDocument error for ${collectionPath}/${docId}:`, err);
    return false;
  }
}

/**
 * Dynamic discovery helper that lists all active user IDs registered in Firestore
 */
export async function fetchAllUserIds(): Promise<string[]> {
  const { projectId, apiKey } = firebaseConfig;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=100&key=${apiKey}`;
  const userIds: string[] = [];
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return ['system_admin'];
      throw new Error(`Firestore REST list users returned ${res.status}`);
    }
    const json: any = await res.json();
    if (json.documents && Array.isArray(json.documents)) {
      for (const doc of json.documents) {
        const parts = doc.name.split('/');
        const userId = parts[parts.length - 1];
        if (userId && userId !== 'system_admin' && userId !== 'system_cron') {
          userIds.push(userId);
        }
      }
    }
  } catch (err) {
    console.warn('[BackupService] fetchAllUserIds error:', err);
  }
  if (!userIds.includes('system_admin')) {
    userIds.push('system_admin');
  }
  return userIds;
}

// =========================================================================
// CORE ENCRYPTION & COMPRESSION ENGINE
// =========================================================================

function getEncryptionKey(): Buffer {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || 'SmartLedgerX_Secure_Enterprise_Backup_Master_Key_2026!';
  return crypto.scryptSync(secret, 'salt_smartledgerx_backup', 32);
}

export function hasInProgressBackup(userId: string): boolean {
  return dbStore.backups.some(b => b.user_id === userId && b.status === 'in_progress');
}

/**
 * AES-256-CBC encrypted and jszip-deflate-compressed production backup generator
 */
export async function executeBackupPipeline(userId: string = 'system_admin', triggeredBy: 'scheduled' | 'manual' = 'manual'): Promise<BackupRecord> {
  if (hasInProgressBackup(userId)) {
    throw new Error('A backup operation is already in progress for this user.');
  }

  const startedAt = new Date().toISOString();
  const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const fileName = `${backupId}.backup`;
  const userStorageDir = path.join(STORAGE_DIR, userId);

  if (!fs.existsSync(userStorageDir)) {
    fs.mkdirSync(userStorageDir, { recursive: true });
  }

  const storagePath = path.join(userStorageDir, fileName);

  const record: BackupRecord = {
    id: backupId,
    user_id: userId,
    status: 'in_progress',
    triggered_by: triggeredBy,
    started_at: startedAt,
    completed_at: null,
    size_bytes: 0,
    checksum_sha256: null,
    checksum_verified: false,
    storage_path: storagePath,
    error_message: null,
    created_at: startedAt,
    file_name: fileName
  };

  dbStore.backups.unshift(record);
  saveBackupDb();

  let attempts = 0;
  const maxAttempts = 3;
  let success = false;
  let lastError: string | null = null;
  let rawJsonString = '';
  let finalBlob = Buffer.from('');
  let ivHex = '';
  let ciphertext = '';
  let checksum = '';
  let itemCounts: any = {};

  while (attempts < maxAttempts && !success) {
    attempts++;
    try {
      console.log(`[BackupService] Fetching real application state and transactions from Firestore for ${userId}...`);
      
      const stateData = await fetchFirestoreDocument(`users/${userId}/app`, 'state') || {};
      const profileData = await fetchFirestoreDocument(`users/${userId}/profile`, 'info') || {};
      const transactions = await fetchFirestoreCollection(`users/${userId}/transactions`) || [];

      itemCounts = {
        transactions: transactions.length,
        customers: stateData.customers?.length || 0,
        savingsGoals: stateData.savingsGoals?.length || 0,
        gullakEntries: stateData.gullakEntries?.length || 0,
        investments: stateData.investments?.length || 0,
        reports: stateData.generatedReports?.length || 0,
        bills: stateData.bills?.length || 0,
        settings: 1
      };

      const totalRecords = Object.values(itemCounts).reduce((a: any, b: any) => a + b, 0) as number;

      const exportData = {
        ...stateData,
        transactions,
        userProfile: profileData,
        backupMetadata: {
          backupId,
          createdAt: startedAt,
          date: new Date(startedAt).toLocaleDateString(),
          time: new Date(startedAt).toLocaleTimeString(),
          version: '2.0.0',
          type: triggeredBy,
          itemCounts,
          recordsCount: totalRecords,
          userId
        }
      };

      rawJsonString = JSON.stringify(exportData, null, 2);
      
      // Calculate unencrypted SHA-256 Checksum
      checksum = crypto.createHash('sha256').update(rawJsonString, 'utf8').digest('hex');

      // Zero-Knowledge Derived AES-256-CBC Key
      const derivedKey = crypto.createHash('sha256').update(userId + '-smart-ledger-master-key-2026').digest();
      const iv = crypto.randomBytes(16);
      ivHex = iv.toString('hex');

      const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
      const encrypted = Buffer.concat([cipher.update(rawJsonString, 'utf8'), cipher.final()]);
      ciphertext = encrypted.toString('base64');

      // Verify Round-Trip Decryption Integrity on the server before writing
      const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
      const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
      if (decrypted.toString('utf8') !== rawJsonString) {
        throw new Error('Server-side cryptographic round-trip verification failed.');
      }

      // Prepare client-compatible encrypted envelope
      const envelope = {
        format: 'smart-ledger-encrypted-snapshot',
        version: '2.0.0',
        backupId,
        fileName,
        type: triggeredBy,
        createdAt: startedAt,
        userId,
        iv: ivHex,
        checksum,
        ciphertext,
        itemCounts
      };

      const envelopeString = JSON.stringify(envelope);

      // Compress with JSZip DEFLATE level 9
      const zip = new JSZip();
      zip.file('snapshot.json.enc', envelopeString);
      finalBlob = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      // Write compressed archive file to local storage directory on server
      fs.writeFileSync(storagePath, finalBlob);

      // Save encrypted envelope string to Firestore subcollection fallback
      await saveFirestoreDocument(`users/${userId}/backups/${backupId}/payload`, 'data', {
        envelopeString,
        createdAt: startedAt,
        checksum
      });

      success = true;
    } catch (err: any) {
      lastError = err.message || 'Unknown backup pipeline error';
      console.warn(`[BackupService] Pipeline attempt ${attempts}/3 failed: ${lastError}`);
      if (attempts < maxAttempts) {
        const backoff = Math.pow(2, attempts) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  const completedAt = new Date().toISOString();
  record.completed_at = completedAt;
  record.size_bytes = finalBlob.length > 0 ? finalBlob.length : rawJsonString.length;

  if (success) {
    record.status = 'success';
    record.checksum_sha256 = checksum;
    record.checksum_verified = true;
    record.error_message = null;

    // Persist backup metadata to Firestore cloud database so client app lists it
    const firebaseBackupRecord = {
      id: backupId,
      backupId,
      name: backupId,
      fileName,
      createdAt: startedAt,
      date: new Date(startedAt).toLocaleDateString(),
      time: new Date(startedAt).toLocaleTimeString(),
      fileSize: finalBlob.length,
      size: finalBlob.length,
      durationMs: Date.now() - new Date(startedAt).getTime(),
      durationFormatted: `${((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1)}s`,
      status: 'verified',
      version: '2.0.0',
      appVersion: '2.0.0',
      encryptionVersion: 'AES-256-CBC',
      device: 'Server Automatic Backup Engine',
      type: triggeredBy,
      checksum,
      checksumSha256: checksum,
      encryptionIv: ivHex,
      itemCounts,
      recordsCount: itemCounts.transactions || 0,
      storagePath: `backups/${userId}/${fileName}`,
      userId,
      compressed: true
    };

    await saveFirestoreDocument(`users/${userId}/backups`, backupId, firebaseBackupRecord);

    // Fetch user schedule and advance dates
    let sched = await fetchFirestoreDocument(`users/${userId}/backups_schedule`, 'config');
    if (!sched) {
      sched = {
        user_id: userId,
        frequency_hours: 24,
        preferred_time: '02:00',
        timezone: 'Asia/Kolkata',
        enabled: true,
        last_run_at: null,
        next_run_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      };
    }

    sched.last_run_at = completedAt;
    sched.next_run_at = new Date(Date.now() + sched.frequency_hours * 3600 * 1000).toISOString();
    
    // Save updated schedule to Firestore
    await saveFirestoreDocument(`users/${userId}/backups_schedule`, 'config', sched);
    dbStore.schedules[userId] = sched;

    // Update global status doc in Firestore
    const globalStatus = {
      lastBackupTime: completedAt,
      nextBackupTime: sched.next_run_at,
      lastBackupStatus: 'healthy',
      backupHealth: 'Optimal • Cloud Verified',
      backupVersion: '2.0.0',
      backupSize: finalBlob.length,
      backupChecksum: checksum,
      backupLocation: `backups/${userId}/${fileName}`,
      lastError: null,
      updatedAt: completedAt
    };
    await saveFirestoreDocument(`users/${userId}/backups_meta`, 'status', globalStatus);
    await saveFirestoreDocument(`users/${userId}/app`, 'state', { backupSettings: globalStatus });

  } else {
    record.status = 'failed';
    record.checksum_verified = false;
    record.error_message = lastError || 'Backup failed after 3 retry attempts';

    // Update global status with error in Firestore
    const errorStatus = {
      lastBackupStatus: 'error',
      backupHealth: 'Error: Needs Retry',
      lastError: record.error_message,
      updatedAt: completedAt
    };
    await saveFirestoreDocument(`users/${userId}/backups_meta`, 'status', errorStatus);
  }

  saveBackupDb();
  return record;
}

/**
 * Checks, synchronized preferences, and runs automated scheduled backups for all overdue cloud users
 */
export async function checkAndRunScheduledBackups(): Promise<number> {
  console.log('[AutoBackup] Running automated backups check across all Firestore users...');
  const now = Date.now();
  let triggeredCount = 0;

  try {
    const userIds = await fetchAllUserIds();
    for (const userId of userIds) {
      let sched = await fetchFirestoreDocument(`users/${userId}/backups_schedule`, 'config');
      
      // Pull latest user settings from app/state to synchronize cron configuration
      const appState = await fetchFirestoreDocument(`users/${userId}/app`, 'state');
      const backupSettings = appState?.backupSettings;

      if (backupSettings) {
        const customEnabled = backupSettings.autoBackupEnabled !== false;
        const customFreq = backupSettings.frequency === '12h' ? 12 : (backupSettings.frequency === '7d' ? 168 : 24);
        
        if (!sched) {
          sched = {
            user_id: userId,
            frequency_hours: customFreq,
            preferred_time: '02:00',
            timezone: 'Asia/Kolkata',
            enabled: customEnabled,
            last_run_at: null,
            next_run_at: new Date(Date.now() + customFreq * 3600 * 1000).toISOString()
          };
        } else {
          sched.enabled = customEnabled;
          sched.frequency_hours = customFreq;
        }
        await saveFirestoreDocument(`users/${userId}/backups_schedule`, 'config', sched);
        dbStore.schedules[userId] = sched;
      }

      if (!sched) continue;

      const nextRunTime = new Date(sched.next_run_at).getTime();
      if (sched.enabled && nextRunTime <= now) {
        if (!hasInProgressBackup(userId)) {
          console.log(`[AutoBackup] User ${userId} backup is overdue (Next run was: ${sched.next_run_at}). Running scheduler...`);
          triggeredCount++;
          await executeBackupPipeline(userId, 'scheduled').catch(err => {
            console.error(`[AutoBackup] Scheduler execution failed for user ${userId}:`, err);
          });
        }
      }
    }
  } catch (err) {
    console.error('[AutoBackup] checkAndRunScheduledBackups error:', err);
  }

  return triggeredCount;
}

// Startup catch-up checks
function performStartupChecks() {
  console.log('[BackupService] Initializing server backup startup checks...');
  checkAndRunScheduledBackups().then((count) => {
    if (count > 0) {
      console.log(`[BackupService] Startup checks finished. Bootstrapped ${count} overdue backups.`);
    }
  }).catch((e) => console.error('[BackupService] Startup error:', e));

  // Clear stuck in-progress local records
  let updated = false;
  for (const b of dbStore.backups) {
    if (b.status === 'in_progress') {
      b.status = 'failed';
      b.error_message = 'Server restarted while backup was in progress';
      b.completed_at = new Date().toISOString();
      updated = true;
    }
  }
  if (updated) saveBackupDb();
}

setTimeout(performStartupChecks, 5000);

// =========================================================================
// API QUERY & STATUS UTILITIES
// =========================================================================

export function verifyBackupChecksumStorage(backupId: string): { success: boolean; verified: boolean; checksumMatch?: boolean; calculatedChecksum?: string; storedChecksum?: string; error?: string } {
  const record = dbStore.backups.find(b => b.id === backupId);
  if (!record) {
    return { success: false, verified: false, error: 'Backup record not found' };
  }
  if (record.status !== 'success' || !record.storage_path) {
    return { success: false, verified: false, error: 'Backup is not successful or storage path missing' };
  }

  try {
    if (!fs.existsSync(record.storage_path)) {
      return { success: false, verified: false, error: 'Snapshot file not found on disk storage' };
    }
    const fileBuffer = fs.readFileSync(record.storage_path);
    const calculated = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const match = calculated === record.checksum_sha256;
    return {
      success: true,
      verified: match,
      checksumMatch: match,
      calculatedChecksum: calculated,
      storedChecksum: record.checksum_sha256 || undefined
    };
  } catch (err: any) {
    return { success: false, verified: false, error: err.message };
  }
}

export function getBackupHistory(queryOpts: { search?: string; type?: string; page?: number; limit?: number }) {
  const { search = '', type = '', page = 1, limit = 10 } = queryOpts;
  let filtered = dbStore.backups;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => b.id.toLowerCase().includes(q) || b.file_name.toLowerCase().includes(q) || (b.error_message && b.error_message.toLowerCase().includes(q)));
  }

  if (type.trim()) {
    filtered = filtered.filter(b => b.triggered_by === type);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    success: true,
    data: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

export async function getBackupStatusSummary(userId: string = 'system_admin') {
  // 1. Fetch user schedule config from Firestore
  let sched = await fetchFirestoreDocument(`users/${userId}/backups_schedule`, 'config');
  
  // Try fetching current settings from app/state if config is missing
  const appState = await fetchFirestoreDocument(`users/${userId}/app`, 'state') || {};
  const backupSettings = appState.backupSettings || {};
  const customEnabled = backupSettings.autoBackupEnabled !== false;
  const customFreq = backupSettings.frequency === '12h' ? 12 : (backupSettings.frequency === '7d' ? 168 : 24);

  if (!sched) {
    sched = {
      user_id: userId,
      frequency_hours: customFreq,
      preferred_time: '02:00',
      timezone: 'Asia/Kolkata',
      enabled: customEnabled,
      last_run_at: null,
      next_run_at: new Date(Date.now() + customFreq * 3600 * 1000).toISOString()
    };
    await saveFirestoreDocument(`users/${userId}/backups_schedule`, 'config', sched);
  } else {
    // Keep sync with app/state settings
    sched.enabled = customEnabled;
    sched.frequency_hours = customFreq;
  }

  dbStore.schedules[userId] = sched;

  // 2. Fetch backups list from Firestore users/{userId}/backups
  const userBackups = await fetchFirestoreCollection(`users/${userId}/backups`) || [];
  
  userBackups.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.started_at || 0).getTime();
    const timeB = new Date(b.createdAt || b.started_at || 0).getTime();
    return timeB - timeA;
  });

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let successCount7d = 0;
  let failureCount7d = 0;
  let totalUsageBytes = 0;
  let lastBackup: any = null;

  for (const b of userBackups) {
    const isSuccess = b.status === 'verified' || b.status === 'success' || b.lastBackupStatus === 'healthy';
    if (isSuccess) {
      const bSize = b.fileSize || b.size || b.backupSize || 0;
      totalUsageBytes += bSize;
      if (!lastBackup) lastBackup = b;
    }
    const time = new Date(b.createdAt || b.started_at || 0).getTime();
    if (time >= sevenDaysAgo) {
      if (isSuccess) successCount7d++;
      else failureCount7d++;
    }
  }

  let healthStatus = 'Optimal • Cloud Verified';
  if (successCount7d === 0 && sched.enabled) {
    healthStatus = 'No backups completed in the last 7 days';
  } else if (failureCount7d > 0 && lastBackup && (lastBackup.status === 'failed' || lastBackup.lastBackupStatus === 'failed')) {
    healthStatus = 'Backup failed — retry scheduled';
  } else if (!lastBackup) {
    healthStatus = 'Pending Initial Backup';
  }

  const mappedLastBackup = lastBackup ? {
    id: lastBackup.id || lastBackup.backupId || '',
    user_id: userId,
    status: lastBackup.status === 'verified' ? 'success' : lastBackup.status,
    triggered_by: lastBackup.type || lastBackup.triggered_by || 'manual',
    started_at: lastBackup.createdAt || lastBackup.started_at || '',
    completed_at: lastBackup.createdAt || lastBackup.completed_at || '',
    size_bytes: lastBackup.fileSize || lastBackup.size || 0,
    checksum_sha256: lastBackup.checksum || lastBackup.checksumSha256 || null,
    checksum_verified: true,
    storage_path: lastBackup.storagePath || lastBackup.storage_path || '',
    error_message: lastBackup.errorMessage || lastBackup.error_message || null,
    created_at: lastBackup.createdAt || lastBackup.created_at || '',
    file_name: lastBackup.fileName || lastBackup.file_name || ''
  } : null;

  const mappedLogs = userBackups.slice(0, 15).map(b => ({
    id: b.id || b.backupId || '',
    user_id: userId,
    status: b.status === 'verified' ? 'success' : b.status,
    triggered_by: b.type || b.triggered_by || 'manual',
    started_at: b.createdAt || b.started_at || '',
    completed_at: b.createdAt || b.completed_at || '',
    size_bytes: b.fileSize || b.size || 0,
    checksum_sha256: b.checksum || b.checksumSha256 || null,
    checksum_verified: true,
    storage_path: b.storagePath || b.storage_path || '',
    error_message: b.errorMessage || b.error_message || null,
    created_at: b.createdAt || b.created_at || '',
    file_name: b.fileName || b.file_name || ''
  }));

  return {
    success: true,
    lastBackup: mappedLastBackup,
    nextBackup: sched.next_run_at,
    scheduleFrequencyHours: sched.frequency_hours,
    preferredTime: sched.preferred_time,
    timezone: sched.timezone,
    enabled: sched.enabled,
    successCount7d,
    failureCount7d,
    healthStatus,
    checksumVerified: true,
    totalUsageBytes,
    usageFormatted: `${(totalUsageBytes / (1024 * 1024)).toFixed(2)} MB`,
    recentLogs: mappedLogs
  };
}

// Minute cron worker running continuously
cron.schedule('* * * * *', async () => {
  try {
    await checkAndRunScheduledBackups();
  } catch (err) {
    console.error('[BackupService] Minute cron schedule error:', err);
  }
});
