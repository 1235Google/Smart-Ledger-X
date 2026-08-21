import React, { useEffect, useRef, useCallback } from 'react';
import { BackupService } from '../lib/backupService';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AutomaticBackupRunner() {
  const { 
    isAuthenticated, 
    currentUser, 
    backupSettings, 
    updateBackupSettings,
    transactions,
    customers,
  } = useStore();
  const { showSuccess, showError, showInfo } = useToast();

  const isRunningRef = useRef(false);
  const loginBackupTriggeredRef = useRef(false);
  const lastCheckedTimeRef = useRef<number>(0);

  const getFrequencyMs = useCallback((freq?: string) => {
    switch (freq) {
      case '12h': return 12 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '24h':
      default:
        return 24 * 60 * 60 * 1000; // 24 Hours Default
    }
  }, []);

  const runAutoBackup = useCallback(async (reason: 'startup' | 'schedule' | 'login' | 'visibility' | 'mutation') => {
    if (isRunningRef.current || BackupService.isOperationActive()) {
      console.log(`[AutomaticBackupRunner] Backup skipped: Another operation is in progress.`);
      return;
    }
    
    if (!currentUser?.uid) return;

    if (!navigator.onLine) {
      console.log(`[AutomaticBackupRunner] Device is offline. Deferring ${reason} automatic backup.`);
      return;
    }

    isRunningRef.current = true;
    console.log(`[AutomaticBackupRunner] Triggering automatic 24-hour cloud backup (Reason: ${reason})...`);

    try {
      const result = await BackupService.createBackup('automatic');
      const nowIso = new Date().toISOString();
      
      updateBackupSettings({ 
        lastAutoBackupTime: nowIso,
        lastBackupTime: nowIso,
        lastBackupStatus: 'healthy',
        backupHealth: 'Optimal • Cloud Verified',
        nextBackupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastBackupSize: result.size,
        lastBackupChecksum: result.checksumSha256,
        lastBackupLocation: result.storagePath,
        lastError: null,
      });

      localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
      localStorage.setItem('smart_ledger_last_backup_time', nowIso);

      showSuccess(
        'Automatic Backup Complete',
        `24-Hour automatic snapshot (${BackupService.formatSize(result.size)}) encrypted & saved to Cloud.`
      );
    } catch (err: any) {
      console.error('[AutomaticBackupRunner] Automatic backup error:', err);
      updateBackupSettings({
        lastBackupStatus: 'error',
        backupHealth: 'Error: Needs Retry',
        lastError: err?.message || 'Automatic backup failed',
      });
    } finally {
      isRunningRef.current = false;
    }
  }, [currentUser?.uid, updateBackupSettings, showSuccess]);

  /**
   * Determine if 24 hours have elapsed since the last successful backup
   */
  const checkAndRunBackup = useCallback(async (reason: 'startup' | 'schedule' | 'login' | 'visibility' | 'mutation' = 'schedule') => {
    if (!isAuthenticated || !currentUser?.uid) return;

    const isEnabled = backupSettings?.autoBackupEnabled !== false;
    if (!isEnabled) {
      console.log('[AutomaticBackupRunner] Automatic backups are disabled in settings.');
      return;
    }

    // Rate-limit checks to once every 10 seconds
    const now = Date.now();
    if (now - lastCheckedTimeRef.current < 10000) return;
    lastCheckedTimeRef.current = now;

    const intervalMs = getFrequencyMs(backupSettings?.frequency);

    // 1. Check local storage timestamp
    let lastBackupTimeMs = 0;
    const localLastTimeStr = localStorage.getItem('smart_ledger_last_backup_time') || localStorage.getItem('smart_ledger_last_auto_backup');
    if (localLastTimeStr) {
      const parsed = isNaN(Number(localLastTimeStr)) ? new Date(localLastTimeStr).getTime() : Number(localLastTimeStr);
      if (!isNaN(parsed)) lastBackupTimeMs = parsed;
    }

    // 2. Check store context setting timestamp
    if (backupSettings?.lastBackupTime || backupSettings?.lastAutoBackupTime) {
      const storeTimeStr = backupSettings.lastBackupTime || backupSettings.lastAutoBackupTime;
      if (storeTimeStr) {
        const parsed = new Date(storeTimeStr).getTime();
        if (!isNaN(parsed) && parsed > lastBackupTimeMs) {
          lastBackupTimeMs = parsed;
        }
      }
    }

    // 3. If no local timestamp found, check Firestore status doc
    if (lastBackupTimeMs === 0) {
      try {
        const statusDoc = await getDoc(doc(db, 'users', currentUser.uid, 'backups_meta', 'status'));
        if (statusDoc.exists()) {
          const data = statusDoc.data();
          if (data.lastBackupTime) {
            const parsed = new Date(data.lastBackupTime).getTime();
            if (!isNaN(parsed)) {
              lastBackupTimeMs = parsed;
              localStorage.setItem('smart_ledger_last_backup_time', data.lastBackupTime);
            }
          }
        }
      } catch (e) {
        console.warn('[AutomaticBackupRunner] Status doc check notice:', e);
      }
    }

    const elapsedMs = now - lastBackupTimeMs;
    const isOverdue = lastBackupTimeMs === 0 || elapsedMs >= intervalMs;

    console.log(`[AutomaticBackupRunner] Evaluated 24h backup check:`, {
      reason,
      lastBackup: lastBackupTimeMs ? new Date(lastBackupTimeMs).toLocaleString() : 'Never',
      elapsedHours: (elapsedMs / (1000 * 60 * 60)).toFixed(1),
      intervalHours: (intervalMs / (1000 * 60 * 60)).toFixed(1),
      isOverdue,
    });

    if (isOverdue) {
      await runAutoBackup(reason);
    }
  }, [isAuthenticated, currentUser?.uid, backupSettings, getFrequencyMs, runAutoBackup]);

  // Main Lifecycle Effects
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.uid) return;

    // 1. Process any pending offline backups when coming online
    const handleOnline = () => {
      console.log('[AutomaticBackupRunner] Internet connection restored. Processing offline queue...');
      BackupService.processOfflineQueue();
      checkAndRunBackup('startup');
    };
    window.addEventListener('online', handleOnline);

    // Initial check on mount / startup
    BackupService.processOfflineQueue();
    
    // Immediate startup evaluation (0-second delay for instant 24h verification)
    const startupTimer = setTimeout(() => {
      checkAndRunBackup('startup');
    }, 1200);

    // 2. Check Backup on Login if enabled
    if (backupSettings?.backupOnLogin && !loginBackupTriggeredRef.current) {
      loginBackupTriggeredRef.current = true;
      setTimeout(() => {
        runAutoBackup('login');
      }, 4000);
    }

    // 3. Tab Visibility Change: Check when tab becomes active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[AutomaticBackupRunner] Tab became visible. Checking 24h backup threshold...');
        checkAndRunBackup('visibility');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Window Focus Listener
    const handleFocus = () => {
      checkAndRunBackup('visibility');
    };
    window.addEventListener('focus', handleFocus);

    // 5. Periodic Background Interval while tab is open (runs every 5 minutes)
    const intervalTimer = setInterval(() => {
      checkAndRunBackup('schedule');
    }, 5 * 60 * 1000);

    // 6. Progressive Service Worker Periodic Background Sync (PWA Enhancement)
    if ('serviceWorker' in navigator && 'periodicSync' in (navigator as any).serviceWorker) {
      navigator.serviceWorker.ready.then((registration: any) => {
        if (registration.periodicSync) {
          registration.periodicSync.register('smart-ledger-backup-check', {
            minInterval: 24 * 60 * 60 * 1000,
          }).catch((err: any) => {
            console.log('[AutomaticBackupRunner] Periodic sync registration info:', err?.message);
          });
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(startupTimer);
      clearInterval(intervalTimer);
    };
  }, [isAuthenticated, currentUser?.uid, backupSettings?.autoBackupEnabled, backupSettings?.frequency, backupSettings?.backupOnLogin, checkAndRunBackup, runAutoBackup]);

  // Trigger check on important mutations if > 24 hours have elapsed
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.uid) return;
    if (transactions.length === 0 && customers.length === 0) return;

    const mutationTimer = setTimeout(() => {
      checkAndRunBackup('mutation');
    }, 5000);

    return () => clearTimeout(mutationTimer);
  }, [transactions.length, customers.length, isAuthenticated, currentUser?.uid, checkAndRunBackup]);

  return null;
}
