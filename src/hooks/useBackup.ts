import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  BackupService, 
  BackupStats, 
  BackupProgressInfo 
} from '../lib/backupService';
import { 
  getAuthenticatedUser, 
  classifyBackupError, 
  signInGoogleUser, 
  AuthErrorInfo, 
  AuthStatusState 
} from '../lib/backupAuth';
import { BackupMetadata, BackupType } from '../types';
import { useToast } from '../context/ToastContext';
import { useStore } from '../context/StoreContext';

export function useBackup() {
  const { backupSettings, updateBackupSettings, applyRestoredState } = useStore();
  const { showSuccess, showError, showInfo } = useToast();

  const [authStatus, setAuthStatus] = useState<AuthStatusState>('loading');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active operation states
  const [isCreating, setIsCreating] = useState(false);
  const [progressInfo, setProgressInfo] = useState<BackupProgressInfo>({
    stage: 'idle',
    percentage: 0,
    message: '',
  });

  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const isMountedRef = useRef(true);

  // Monitor Network Status
  useEffect(() => {
    isMountedRef.current = true;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global onAuthStateChanged subscriber to prevent false "unauthenticated" flashes
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!isMountedRef.current) return;
        if (timer) clearTimeout(timer);

        if (user) {
          console.log('[useBackup] Auth state confirmed:', user.email);
          setAuthUser(user);
          setAuthStatus('authenticated');
          setErrorInfo(null);
        } else {
          // Allow 1.2s grace period before marking unauthenticated (eliminates refresh flash)
          timer = setTimeout(() => {
            if (!isMountedRef.current) return;
            if (!auth.currentUser) {
              setAuthUser(null);
              setAuthStatus('unauthenticated');
            }
          }, 1200);
        }
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.error('[useBackup] Auth stream error:', err);
        setAuthStatus('error');
        setErrorInfo(classifyBackupError(err));
      }
    );

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Fetch Backups
  const loadBackups = useCallback(async (isManualRefresh = false) => {
    if (!isMountedRef.current) return;

    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoadingBackups(true);

    try {
      const data = await BackupService.listBackups();
      if (isMountedRef.current) {
        setBackups(data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error('[useBackup] Fetch error:', err);
        const classified = classifyBackupError(err);
        setErrorInfo(classified);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingBackups(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Trigger load when authenticated user changes
  useEffect(() => {
    if (authStatus === 'authenticated' && authUser) {
      loadBackups();
    }
  }, [authStatus, authUser?.uid, loadBackups]);

  // Create Backup
  const runBackup = async (type: BackupType = 'manual'): Promise<BackupMetadata> => {
    if (isCreating || BackupService.isOperationActive()) {
      throw new Error('A backup operation is currently in progress.');
    }

    setIsCreating(true);
    setErrorInfo(null);
    setProgressInfo({
      stage: 'preparing',
      percentage: 5,
      message: 'Initializing zero-knowledge cloud backup pipeline...',
    });

    try {
      const newBackup = await BackupService.createBackup(type, (info) => {
        if (isMountedRef.current) {
          setProgressInfo(info);
        }
      });

      if (isMountedRef.current) {
        setBackups((prev) => [newBackup, ...prev.filter((b) => b.id !== newBackup.id)]);
        
        const backupDate = newBackup.date || new Date(newBackup.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const backupTime = newBackup.time || new Date(newBackup.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const backupSize = BackupService.formatSize(newBackup.size || newBackup.fileSize);
        const totalRecords = newBackup.recordsCount || (
          (newBackup.itemCounts?.transactions || 0) +
          (newBackup.itemCounts?.customers || 0) +
          (newBackup.itemCounts?.savingsGoals || 0) +
          (newBackup.itemCounts?.gullakEntries || 0) +
          (newBackup.itemCounts?.investments || 0) +
          (newBackup.itemCounts?.reports || 0) +
          (newBackup.itemCounts?.bills || 0)
        ) || 1;

        if (updateBackupSettings) {
          updateBackupSettings({
            lastBackupTime: newBackup.createdAt,
            lastBackupStatus: 'healthy',
            backupHealth: 'Optimal • Cloud Verified',
            lastBackupSize: newBackup.size,
            lastBackupChecksum: newBackup.checksumSha256 || newBackup.checksum,
            lastBackupLocation: newBackup.storagePath,
            lastError: null,
          });
        }

        showSuccess(
          '✅ Backup Completed Successfully',
          `Your Smart Ledger data has been safely backed up.\nDate: ${backupDate} • Time: ${backupTime} • Size: ${backupSize}`
        );

        // Keep progress at 100 for a moment before clearing
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsCreating(false);
            setProgressInfo({ stage: 'idle', percentage: 0, message: '' });
          }
        }, 1200);
      }

      return newBackup;
    } catch (err: any) {
      console.error('Backup failed (with error details):', err);
      const classified = classifyBackupError(err);
      if (isMountedRef.current) {
        setErrorInfo(classified);
        setProgressInfo({ stage: 'failed', percentage: 0, message: classified.message });
        showError(
          '❌ Backup Failed',
          'Please check your internet connection and try again.'
        );

        setTimeout(() => {
          if (isMountedRef.current) {
            setIsCreating(false);
            setProgressInfo({ stage: 'idle', percentage: 0, message: '' });
          }
        }, 2500);
      }
      throw err;
    }
  };

  // Restore Backup
  const restoreBackup = async (
    backupId: string,
    onProgress?: (message: string, percent: number) => void
  ) => {
    setErrorInfo(null);
    try {
      const result = await BackupService.restoreBackup(backupId, onProgress);
      if (result.success && result.restoredState) {
        applyRestoredState(result.restoredState);
        showSuccess(
          'Restore Successful',
          `Restored ${result.restoredState.transactions.length} transactions and point-in-time state.`
        );
        await loadBackups(true);
      }
      return result;
    } catch (err: any) {
      const classified = classifyBackupError(err);
      setErrorInfo(classified);
      showError(classified.title, classified.message);
      throw err;
    }
  };

  // Delete Backup
  const deleteBackup = async (backupId: string, fileName?: string) => {
    setErrorInfo(null);
    try {
      await BackupService.deleteBackup(backupId, fileName);
      setBackups((prev) => prev.filter((b) => b.id !== backupId));
      showSuccess('Backup Removed', 'Snapshot permanently deleted from Cloud Storage and database.');
    } catch (err: any) {
      const classified = classifyBackupError(err);
      setErrorInfo(classified);
      showError(classified.title, classified.message);
      throw err;
    }
  };

  // Download Backup
  const downloadBackup = async (backupId: string, fileName?: string) => {
    try {
      await BackupService.downloadBackup(backupId, fileName);
      showInfo('Download Started', 'Encrypted .backup archive saved to your device.');
    } catch (err: any) {
      const classified = classifyBackupError(err);
      showError(classified.title, classified.message);
    }
  };

  // Sign In with Google
  const handleGoogleSignIn = async () => {
    setErrorInfo(null);
    try {
      const user = await signInGoogleUser();
      setAuthUser(user);
      setAuthStatus('authenticated');
      showSuccess('Signed In', `Welcome back, ${user.displayName || user.email}!`);
      await loadBackups(true);
    } catch (err: any) {
      const classified = classifyBackupError(err);
      setErrorInfo(classified);
      showError(classified.title, classified.message);
    }
  };

  const clearError = () => setErrorInfo(null);

  const stats: BackupStats = BackupService.calculateStats(backups, backupSettings);

  return {
    authStatus,
    authUser,
    isOnline,
    backups,
    isLoadingBackups,
    isRefreshing,
    isCreating,
    progressInfo,
    errorInfo,
    stats,
    runBackup,
    restoreBackup,
    deleteBackup,
    downloadBackup,
    refreshBackups: () => loadBackups(true),
    handleGoogleSignIn,
    clearError,
  };
}
