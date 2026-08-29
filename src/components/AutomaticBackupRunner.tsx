import React, { useEffect, useRef, useCallback } from 'react';
import { BackupService } from '../lib/backupService';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes in background

export default function AutomaticBackupRunner() {
  const { 
    isAuthenticated, 
    currentUser, 
    backupSettings, 
    updateBackupSettings,
  } = useStore();
  const { showSuccess, showError } = useToast();

  const isRunningRef = useRef(false);
  const lastCheckEvaluationRef = useRef<number>(0);

  const runAutoBackup = useCallback(async () => {
    if (isRunningRef.current || BackupService.isOperationActive()) {
      console.log('[AutomaticBackupRunner] Backup skipped: Another backup operation is currently active.');
      return;
    }
    
    if (!currentUser?.uid) return;

    if (!navigator.onLine) {
      console.log('[AutomaticBackupRunner] Device is offline. Scheduled 24-hour backup deferred.');
      return;
    }

    isRunningRef.current = true;
    console.log('[AutomaticBackupRunner] Starting scheduled automatic 24-hour backup...');

    try {
      const result = await BackupService.createBackup('automatic');
      const nowIso = new Date().toISOString();
      
      const backupDate = result.date || new Date(result.createdAt).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const backupTime = result.time || new Date(result.createdAt).toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const backupSize = BackupService.formatSize(result.size || result.fileSize);

      updateBackupSettings({ 
        lastAutoBackupTime: nowIso,
        lastBackupTime: nowIso,
        lastBackupStatus: 'healthy',
        backupHealth: 'Optimal • Cloud Verified',
        nextBackupTime: new Date(Date.now() + TWENTY_FOUR_HOURS_MS).toISOString(),
        lastBackupSize: result.size,
        lastBackupChecksum: result.checksumSha256,
        lastBackupLocation: result.storagePath,
        lastError: null,
      });

      localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
      localStorage.setItem('smart_ledger_last_backup_time', nowIso);

      showSuccess(
        '✅ Backup Completed Successfully',
        `Your Smart Ledger data has been safely backed up.\nDate: ${backupDate} • Time: ${backupTime} • Size: ${backupSize}`
      );
    } catch (err: any) {
      console.error('Backup failed (with error details):', err);
      updateBackupSettings({
        lastBackupStatus: 'error',
        backupHealth: 'Error: Needs Retry',
        lastError: err?.message || 'Automatic backup failed',
      });
      showError(
        '❌ Backup Failed',
        'Please check your internet connection and try again.'
      );
    } finally {
      isRunningRef.current = false;
    }
  }, [currentUser?.uid, updateBackupSettings, showSuccess, showError]);

  /**
   * Determine if 24 hours have elapsed since the last successful backup.
   * NEVER runs on initial app launch / startup.
   */
  const checkAndRunBackup = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.uid) return;

    // Check if automatic backup is enabled in settings
    const isEnabled = backupSettings?.autoBackupEnabled !== false;
    if (!isEnabled) {
      console.log('[AutomaticBackupRunner] Automatic backups are disabled in settings.');
      return;
    }

    // Throttle frequent checks to avoid redundant disk/network I/O
    const now = Date.now();
    if (now - lastCheckEvaluationRef.current < 60000) return; // 1 minute throttle
    lastCheckEvaluationRef.current = now;

    console.log('[AutomaticBackupRunner] Checking scheduled 24-hour backup status...');

    // 1. Resolve the last backup timestamp
    let lastBackupTimeMs: number | null = null;
    
    const localLastTimeStr = localStorage.getItem('smart_ledger_last_backup_time');
    if (localLastTimeStr) {
      const parsed = isNaN(Number(localLastTimeStr)) 
        ? new Date(localLastTimeStr).getTime() 
        : Number(localLastTimeStr);
      if (!isNaN(parsed) && parsed > 0) {
        lastBackupTimeMs = parsed;
      }
    }

    if (!lastBackupTimeMs && backupSettings?.lastBackupTime) {
      const parsed = new Date(backupSettings.lastBackupTime).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        lastBackupTimeMs = parsed;
      }
    }

    // If still not found, check Firestore status doc
    if (!lastBackupTimeMs) {
      try {
        const statusDoc = await getDoc(doc(db, 'users', currentUser.uid, 'backups_meta', 'status'));
        if (statusDoc.exists()) {
          const data = statusDoc.data();
          if (data.lastBackupTime) {
            const parsed = new Date(data.lastBackupTime).getTime();
            if (!isNaN(parsed) && parsed > 0) {
              lastBackupTimeMs = parsed;
              localStorage.setItem('smart_ledger_last_backup_time', data.lastBackupTime);
            }
          }
        }
      } catch (e) {
        console.warn('[AutomaticBackupRunner] Status doc query notice:', e);
      }
    }

    // If there is NO prior backup recorded yet (e.g. brand new user session),
    // set the baseline to now so the initial 24h schedule starts counting from now
    // and NEVER triggers on app startup.
    if (!lastBackupTimeMs) {
      const nowIso = new Date(now).toISOString();
      localStorage.setItem('smart_ledger_last_backup_time', nowIso);
      console.log('[AutomaticBackupRunner] Baseline backup timestamp initialized. Next scheduled backup will run in 24 hours.');
      return;
    }

    const elapsedMs = now - lastBackupTimeMs;
    const isOverdue = elapsedMs >= TWENTY_FOUR_HOURS_MS;

    if (isOverdue) {
      console.log(`[AutomaticBackupRunner] 24 hours elapsed (${(elapsedMs / (1000 * 60 * 60)).toFixed(1)}h since last backup). Triggering automatic backup...`);
      await runAutoBackup();
    } else {
      const remainingHours = ((TWENTY_FOUR_HOURS_MS - elapsedMs) / (1000 * 60 * 60)).toFixed(1);
      console.log(`[AutomaticBackupRunner] Scheduled backup skipped: Last backup was at ${new Date(lastBackupTimeMs).toLocaleString()}, ${remainingHours}h remaining until next 24h backup.`);
    }
  }, [isAuthenticated, currentUser?.uid, backupSettings?.autoBackupEnabled, backupSettings?.lastBackupTime, runAutoBackup]);

  // Background Scheduling & Event Listeners
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.uid) return;

    // Process offline queue if connection was restored
    const handleOnline = () => {
      console.log('[AutomaticBackupRunner] Network connected. Checking offline queue...');
      BackupService.processOfflineQueue();
    };
    window.addEventListener('online', handleOnline);

    // Initial check for offline queue items without running backup
    BackupService.processOfflineQueue();

    // 1. Periodic Background Check (runs every 15 minutes while app is active)
    const intervalTimer = setInterval(() => {
      checkAndRunBackup();
    }, CHECK_INTERVAL_MS);

    // 2. Service Worker Message Listener (for background sync triggers)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CHECK_AUTOMATIC_BACKUP') {
        console.log('[AutomaticBackupRunner] Received CHECK_AUTOMATIC_BACKUP message from ServiceWorker.');
        checkAndRunBackup();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 3. Register Periodic Background Sync if supported (PWA)
    if ('serviceWorker' in navigator && 'periodicSync' in (navigator as any).serviceWorker) {
      navigator.serviceWorker.ready.then((registration: any) => {
        if (registration.periodicSync) {
          registration.periodicSync.register('smart-ledger-backup-check', {
            minInterval: TWENTY_FOUR_HOURS_MS,
          }).catch((err: any) => {
            console.log('[AutomaticBackupRunner] Periodic sync registration info:', err?.message);
          });
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalTimer);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [isAuthenticated, currentUser?.uid, checkAndRunBackup]);

  return null;
}

