import React, { useEffect } from 'react';
import { BackupService } from '../lib/backupService';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

export default function AutomaticBackupRunner() {
  const { currentBalance } = useStore(); // Just to subscribe to store loaded state
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const checkAndRunBackup = async () => {
      try {
        const lastBackupStr = localStorage.getItem('smart_ledger_last_auto_backup');
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (!lastBackupStr || now - parseInt(lastBackupStr, 10) > TWENTY_FOUR_HOURS) {
          // Time to run auto backup
          console.log('[BackupRunner] Triggering daily automatic backup...');
          await BackupService.createBackup('daily');
          localStorage.setItem('smart_ledger_last_auto_backup', now.toString());
          console.log('[BackupRunner] Automatic backup completed successfully.');
          showSuccess('Backup Complete', 'Your data was automatically backed up to the cloud.');
        }
      } catch (error) {
        console.error('[BackupRunner] Failed to run automatic backup:', error);
      }
    };

    // Delay the check slightly so it doesn't block initial render
    const timeout = setTimeout(checkAndRunBackup, 15000);
    return () => clearTimeout(timeout);
  }, [currentBalance]);

  return null;
}
