import React, { useEffect, useRef } from 'react';
import { BackupService } from '../lib/backupService';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

export default function AutomaticBackupRunner() {
  const { isAuthenticated, currentUser, backupSettings, updateBackupSettings } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const isRunningRef = useRef(false);
  const loginBackupTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const getFrequencyMs = (freq?: string) => {
      switch (freq) {
        case '12h': return 12 * 60 * 60 * 1000;
        case '7d': return 7 * 24 * 60 * 60 * 1000;
        case '24h':
        default:
          return 24 * 60 * 60 * 1000;
      }
    };

    const runAutoBackup = async (reason: 'schedule' | 'login') => {
      if (isRunningRef.current || BackupService.isOperationActive()) return;
      if (!navigator.onLine) {
        console.log('[AutomaticBackupRunner] Device is offline. Skipping automatic backup cycle.');
        return;
      }

      isRunningRef.current = true;
      try {
        console.log(`[AutomaticBackupRunner] Initiating ${reason} automatic backup...`);
        const result = await BackupService.createBackup('automatic');
        const nowIso = new Date().toISOString();
        
        updateBackupSettings({ lastAutoBackupTime: nowIso });
        localStorage.setItem('smart_ledger_last_auto_backup', Date.now().toString());
        
        showSuccess(
          'Automatic Backup Complete',
          `Cloud snapshot (${BackupService.formatSize(result.size)}) safely encrypted & stored.`
        );
      } catch (err: any) {
        console.error('[AutomaticBackupRunner] Auto backup cycle notice:', err);
      } finally {
        isRunningRef.current = false;
      }
    };

    const checkAndRunBackup = async () => {
      const isEnabled = backupSettings?.autoBackupEnabled ?? true;
      if (!isEnabled) return;

      const lastBackupStr = localStorage.getItem('smart_ledger_last_auto_backup');
      const now = Date.now();
      const intervalMs = getFrequencyMs(backupSettings?.frequency);

      if (!lastBackupStr || now - parseInt(lastBackupStr, 10) >= intervalMs) {
        await runAutoBackup('schedule');
      }
    };

    // 1. Process any pending offline backups when coming online
    const handleOnline = () => {
      console.log('[AutomaticBackupRunner] Online detected. Processing offline queue...');
      BackupService.processOfflineQueue();
      checkAndRunBackup();
    };
    window.addEventListener('online', handleOnline);

    // Initial check on mount
    BackupService.processOfflineQueue();

    // 2. Check Backup on Login
    if (backupSettings?.backupOnLogin && !loginBackupTriggeredRef.current) {
      loginBackupTriggeredRef.current = true;
      setTimeout(() => {
        runAutoBackup('login');
      }, 5000);
    }

    // 3. Periodic timer check every 5 minutes while user has app open
    const initialTimer = setTimeout(checkAndRunBackup, 10000);
    const intervalTimer = setInterval(checkAndRunBackup, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [isAuthenticated, currentUser?.uid, backupSettings?.autoBackupEnabled, backupSettings?.frequency, backupSettings?.backupOnLogin]);

  return null;
}
