import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBackup } from '../hooks/useBackup';
import BackupAuthGuard from '../components/backup/BackupAuthGuard';
import BackupStatusHeader from '../components/backup/BackupStatusHeader';
import BackupMetricCards from '../components/backup/BackupMetricCards';
import BackupLiveProgressRing from '../components/backup/BackupLiveProgressRing';
import BackupErrorBanner from '../components/backup/BackupErrorBanner';
import BackupHistoryList from '../components/backup/BackupHistoryList';
import BackupRestoreModal from '../components/backup/BackupRestoreModal';
import BackupDeleteModal from '../components/backup/BackupDeleteModal';
import BackupDetailsModal from '../components/backup/BackupDetailsModal';
import BackupSettingsModal from '../components/backup/BackupSettingsModal';
import { BackupMetadata } from '../types';

export default function BackupDashboard() {
  const {
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
    refreshBackups,
    handleGoogleSignIn,
    clearError,
  } = useBackup();

  // Modals state
  const [restoreTarget, setRestoreTarget] = useState<BackupMetadata | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressMsg, setRestoreProgressMsg] = useState('');
  const [restoreProgressPercent, setRestoreProgressPercent] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<BackupMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [inspectTarget, setInspectTarget] = useState<BackupMetadata | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleRunBackup = async () => {
    try {
      await runBackup('manual');
    } catch (e) {
      // Error handled in hook & banner
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    setRestoreProgressMsg('Preparing point-in-time restore...');
    setRestoreProgressPercent(10);

    try {
      await restoreBackup(restoreTarget.id, (msg, pct) => {
        setRestoreProgressMsg(msg);
        setRestoreProgressPercent(pct);
      });

      setTimeout(() => {
        setIsRestoring(false);
        setRestoreTarget(null);
      }, 1000);
    } catch (e) {
      setIsRestoring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBackup(deleteTarget.id, deleteTarget.fileName);
      setDeleteTarget(null);
    } catch (e) {
      // Error handled in hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen text-slate-100">
      <BackupAuthGuard authStatus={authStatus} onSignIn={handleGoogleSignIn}>
        {/* Header with quick system indicators & Run Backup button */}
        <BackupStatusHeader
          user={authUser}
          isOnline={isOnline}
          isCreating={isCreating}
          isRefreshing={isRefreshing}
          autoBackupEnabled={true}
          onRefresh={refreshBackups}
          onOpenSettings={() => setShowSettingsModal(true)}
          onRunBackup={handleRunBackup}
        />

        {/* Dynamic Error Banner with contextual retry */}
        <AnimatePresence>
          {errorInfo && (
            <BackupErrorBanner
              error={errorInfo}
              onRetry={handleRunBackup}
              onDismiss={clearError}
            />
          )}
        </AnimatePresence>

        {/* Live Progress Ring during active backup operation */}
        <AnimatePresence>
          {isCreating && (
            <BackupLiveProgressRing progress={progressInfo} />
          )}
        </AnimatePresence>

        {/* Metrics Grid Cards */}
        <BackupMetricCards stats={stats} />

        {/* Snapshot History Vault */}
        <div className="pt-2">
          <BackupHistoryList
            backups={backups}
            isLoading={isLoadingBackups}
            onRestore={(b) => setRestoreTarget(b)}
            onDelete={(b) => setDeleteTarget(b)}
            onDownload={(b) => downloadBackup(b.id, b.fileName)}
            onInspect={(b) => setInspectTarget(b)}
          />
        </div>

        {/* Modals */}
        <AnimatePresence>
          {restoreTarget && (
            <BackupRestoreModal
              backup={restoreTarget}
              isRestoring={isRestoring}
              progressMsg={restoreProgressMsg}
              progressPercent={restoreProgressPercent}
              onConfirm={handleConfirmRestore}
              onClose={() => !isRestoring && setRestoreTarget(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteTarget && (
            <BackupDeleteModal
              backup={deleteTarget}
              isDeleting={isDeleting}
              onConfirm={handleConfirmDelete}
              onClose={() => !isDeleting && setDeleteTarget(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {inspectTarget && (
            <BackupDetailsModal
              backup={inspectTarget}
              onClose={() => setInspectTarget(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettingsModal && (
            <BackupSettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
            />
          )}
        </AnimatePresence>
      </BackupAuthGuard>
    </div>
  );
}
