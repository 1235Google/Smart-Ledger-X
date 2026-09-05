import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SystemMode, SystemConfig, SystemSafetyReport } from '../types';
import { getRunningJobs, triggerJobExecution } from './scheduled-jobs-service';

const CONFIG_FILE = path.join(process.cwd(), 'system-config.json');
const AUDIT_LOG_FILE = path.join(process.cwd(), 'audit-security-events.json');

// Default initial state: Normal Mode
const DEFAULT_CONFIG: SystemConfig = {
  mode: 'normal',
  reason: '',
  changedAt: new Date().toISOString(),
  changedBy: 'System Bootstrap',
  expectedEndAt: null,
  autoRestore: false,
  previousMode: 'normal'
};

let currentConfig: SystemConfig = { ...DEFAULT_CONFIG };

// Load persisted configuration from disk on server startup
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && ['normal', 'readonly', 'maintenance'].includes(parsed.mode)) {
      currentConfig = {
        mode: parsed.mode,
        reason: parsed.reason || '',
        changedAt: parsed.changedAt || new Date().toISOString(),
        changedBy: parsed.changedBy || 'Admin',
        expectedEndAt: parsed.expectedEndAt || null,
        autoRestore: !!parsed.autoRestore,
        previousMode: parsed.previousMode || 'normal'
      };
      console.log(`[SystemMode] Initialized with Mode: ${currentConfig.mode.toUpperCase()}`);
    }
  } else {
    saveConfigToDisk(currentConfig);
  }
} catch (e) {
  console.warn('[SystemMode] Could not read system config file, using default:', e);
}

function saveConfigToDisk(config: SystemConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SystemMode] Failed to persist system config to disk:', err);
  }
}

/**
 * Record a system mode audit event to server authoritative security log
 */
export function recordSystemModeAudit(
  event: 'ENABLE_MAINTENANCE' | 'ENABLE_READONLY' | 'RESTORE_NORMAL' | 'AUTO_RESTORE_NORMAL',
  previousMode: SystemMode,
  newMode: SystemMode,
  reason: string,
  changedBy: string,
  expectedEndAt?: string | null
): void {
  const modeLabels: Record<SystemMode, string> = {
    normal: 'NORMAL',
    readonly: 'READ-ONLY',
    maintenance: 'MAINTENANCE'
  };

  const actionText = 
    newMode === 'maintenance' ? '🔴 Maintenance Mode Enabled' :
    newMode === 'readonly' ? '🟡 Read-Only Mode Enabled' :
    previousMode === 'maintenance' ? '🟢 Normal Mode Restored (Maintenance Completed)' :
    '🟢 Normal Mode Restored (Read-Only Lifted)';

  const auditEntry = {
    id: `audit_mode_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    uid: changedBy,
    email: changedBy.includes('@') ? changedBy : 'admin@smartledgerx.io',
    eventType: 'ADMIN_SECURITY_ACTION',
    action: actionText,
    previousMode: modeLabels[previousMode],
    newMode: modeLabels[newMode],
    reason: reason || 'Routine system administration',
    expectedEndAt: expectedEndAt || null,
    timestamp: new Date().toISOString(),
    serverTimestampMs: Date.now(),
    details: `System Mode changed from ${modeLabels[previousMode]} to ${modeLabels[newMode]}. Reason: ${reason || 'N/A'}${expectedEndAt ? ` (Expected completion: ${expectedEndAt})` : ''}`
  };

  try {
    let existingLogs: any[] = [];
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      try {
        existingLogs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
      } catch {
        existingLogs = [];
      }
    }
    existingLogs.unshift(auditEntry);
    if (existingLogs.length > 500) existingLogs = existingLogs.slice(0, 500);
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(existingLogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SystemMode] Error recording mode audit log:', err);
  }

  console.log(`[SystemMode Audit] ${actionText} by ${changedBy}. Reason: ${reason}`);
}

/**
 * Get current system configuration
 */
export function getSystemConfig(): SystemConfig {
  return { ...currentConfig };
}

/**
 * Update system mode
 */
export function setSystemConfig(
  mode: SystemMode,
  reason: string,
  changedBy: string,
  expectedEndAt: string | null = null,
  autoRestore: boolean = false
): { success: boolean; config: SystemConfig; message: string } {
  const previousMode = currentConfig.mode;

  if (previousMode === mode) {
    // Mode is already identical, just update metadata if changed
    currentConfig.reason = reason;
    currentConfig.expectedEndAt = expectedEndAt;
    currentConfig.autoRestore = autoRestore;
    saveConfigToDisk(currentConfig);
    return {
      success: true,
      config: { ...currentConfig },
      message: `System mode confirmed as ${mode.toUpperCase()}.`
    };
  }

  currentConfig = {
    mode,
    reason: reason || (mode === 'normal' ? 'Restored to normal operations' : 'System maintenance'),
    changedAt: new Date().toISOString(),
    changedBy,
    expectedEndAt,
    autoRestore: mode === 'normal' ? false : autoRestore,
    previousMode
  };

  saveConfigToDisk(currentConfig);

  const eventType = 
    mode === 'maintenance' ? 'ENABLE_MAINTENANCE' :
    mode === 'readonly' ? 'ENABLE_READONLY' :
    'RESTORE_NORMAL';

  recordSystemModeAudit(eventType, previousMode, mode, reason, changedBy, expectedEndAt);

  return {
    success: true,
    config: { ...currentConfig },
    message: `Successfully transitioned system to ${mode.toUpperCase()} mode.`
  };
}

/**
 * Perform Pre-flight Safety Inspection before enabling Maintenance Mode
 */
export function inspectSystemSafety(): SystemSafetyReport {
  const warnings: string[] = [];
  let databaseConnected = true;
  const startPing = Date.now();
  
  // Database check: verify file system & state paths
  try {
    fs.accessSync(CONFIG_FILE, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    databaseConnected = false;
    warnings.push('Local configuration store is not writable.');
  }
  const latencyMs = Math.max(1, Date.now() - startPing);

  // Check running critical operations
  const activeJobs = getRunningJobs();
  const activeCriticalOperations = activeJobs.length;
  if (activeCriticalOperations > 0) {
    warnings.push(`Warning: ${activeCriticalOperations} background task(s) currently executing: ${activeJobs.join(', ')}.`);
  }

  // Check backup status
  let lastBackupTimestamp: string | null = null;
  let lastBackupHoursAgo: number | null = null;
  let hasRecentBackup = false;
  let backupStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'WARNING';
  let backupMessage = 'No recent backup records discovered.';

  const RUNS_STORE_PATH = path.join(process.cwd(), 'scheduled-job-runs.json');
  try {
    if (fs.existsSync(RUNS_STORE_PATH)) {
      const runs = JSON.parse(fs.readFileSync(RUNS_STORE_PATH, 'utf-8'));
      const backupRuns = runs.filter((r: any) => r.jobId === 'auto_backup' && r.status === 'SUCCESS');
      if (backupRuns.length > 0) {
        backupRuns.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        lastBackupTimestamp = backupRuns[0].startedAt;
        const diffHours = (Date.now() - new Date(lastBackupTimestamp!).getTime()) / (1000 * 60 * 60);
        lastBackupHoursAgo = Math.round(diffHours * 10) / 10;
        if (diffHours <= 24) {
          hasRecentBackup = true;
          backupStatus = 'HEALTHY';
          backupMessage = `Verified disaster-recovery snapshot created ${lastBackupHoursAgo} hours ago.`;
        } else {
          hasRecentBackup = false;
          backupStatus = 'WARNING';
          backupMessage = `Last backup was created ${lastBackupHoursAgo} hours ago (exceeds recommended 24-hour threshold).`;
          warnings.push('Latest backup is older than 24 hours. A fresh safety backup is strongly recommended.');
        }
      } else {
        backupStatus = 'CRITICAL';
        backupMessage = 'No verified automatic backup records found on server.';
        warnings.push('No recent backup found. It is highly advised to create a safety backup first.');
      }
    }
  } catch (e) {
    backupMessage = 'Could not inspect backup history file.';
    warnings.push('Unable to read backup execution logs.');
  }

  return {
    databaseConnected,
    databaseLatencyMs: latencyMs,
    activeCriticalOperations,
    activeJobs,
    backupStatus: {
      hasRecentBackup,
      lastBackupTimestamp,
      lastBackupHoursAgo,
      status: backupStatus,
      message: backupMessage
    },
    safeToProceed: true, // Non-blocking: warning presented to admin, not blocking repair
    warnings
  };
}

/**
 * Immediate Safety Backup Trigger
 */
export async function createImmediateSafetyBackup(adminEmail: string) {
  console.log(`[SystemMode] Creating immediate pre-maintenance safety backup requested by ${adminEmail}...`);
  return await triggerJobExecution('auto_backup', 'MANUAL_ADMIN', adminEmail);
}

/**
 * Server-Side Auto-Restore Background Monitor
 * Evaluates system mode every 15 seconds. If autoRestore is enabled and expectedEndAt has arrived,
 * automatically restores NORMAL mode server-side with no browser or client required!
 */
let autoRestoreInterval: NodeJS.Timeout | null = null;

export function startAutoRestoreMonitor(): void {
  if (autoRestoreInterval) clearInterval(autoRestoreInterval);

  autoRestoreInterval = setInterval(() => {
    try {
      if (currentConfig.mode === 'normal' || !currentConfig.autoRestore || !currentConfig.expectedEndAt) {
        return;
      }

      const expectedTimeMs = new Date(currentConfig.expectedEndAt).getTime();
      if (isNaN(expectedTimeMs)) return;

      const now = Date.now();
      if (now >= expectedTimeMs) {
        const prevMode = currentConfig.mode;
        console.log(`[SystemMode Auto-Restore] Scheduled completion reached (${currentConfig.expectedEndAt}). Automatically restoring NORMAL mode on server...`);

        currentConfig = {
          mode: 'normal',
          reason: `Automatic scheduled recovery reached at ${new Date().toLocaleTimeString()} (Server Cron)`,
          changedAt: new Date().toISOString(),
          changedBy: 'Server Auto-Restore Scheduler',
          expectedEndAt: null,
          autoRestore: false,
          previousMode: prevMode
        };

        saveConfigToDisk(currentConfig);

        recordSystemModeAudit(
          'AUTO_RESTORE_NORMAL',
          prevMode,
          'normal',
          `Server-side auto-restore triggered upon reaching completion time (${currentConfig.reason})`,
          'Server Auto-Restore Scheduler'
        );

        console.log('[SystemMode Auto-Restore] Application successfully returned to 🟢 NORMAL mode.');
      }
    } catch (err) {
      console.error('[SystemMode Auto-Restore] Error in monitor loop:', err);
    }
  }, 15000); // Check every 15 seconds

  console.log('[SystemMode] Server-side Auto-Restore Monitor started (15s interval).');
}

/**
 * Checks if a specific background job is allowed to execute during maintenance
 * - Backups (`auto_backup`) → KEEP RUNNING
 * - Security logging (`security_notifications_scan`) → KEEP RUNNING
 * - Ledger integrity checks (`ledger_integrity_check`) → KEEP RUNNING
 * - Customer notification tasks (`payment_reminders`, `monthly_financial_report`) → DEFERRED during maintenance
 */
export function isJobPermittedDuringMaintenance(jobId: string): { permitted: boolean; reason?: string } {
  if (currentConfig.mode !== 'maintenance') {
    return { permitted: true };
  }

  const ESSENTIAL_MAINTENANCE_JOBS = [
    'auto_backup',
    'security_notifications_scan',
    'ledger_integrity_check',
    'system_cleanup_maintenance'
  ];

  if (ESSENTIAL_MAINTENANCE_JOBS.includes(jobId)) {
    return { permitted: true };
  }

  return {
    permitted: false,
    reason: `Job '${jobId}' is deferred because SmartLedger is currently in Maintenance Mode.`
  };
}
