import React, { useState, useEffect } from 'react';
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
import { useStore } from '../context/StoreContext';
import { Server, Clock, CheckCircle2, AlertTriangle, Play, Shield, Cpu, RefreshCcw } from 'lucide-react';

export default function BackupDashboard() {
  const { backupSettings } = useStore();
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

  const formatIST = (dateStr?: string, defaultText = 'Scheduled daily at 6:00 AM IST') => {
    if (!dateStr) return defaultText;
    try {
      return new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return new Date(dateStr).toLocaleString();
    }
  };

  const handleRunBackup = async () => {
    try {
      await runBackup('manual');
    } catch (e) {
      // Error handled in hook & banner
    }
  };

  // Server-side backup cron status
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [isSimulatingCron, setIsSimulatingCron] = useState(false);
  const [cronSimulationResult, setCronSimulationResult] = useState<any>(null);

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      if (data.success) {
        setServerStatus(data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateCron = async () => {
    setIsSimulatingCron(true);
    setCronSimulationResult(null);
    try {
      const res = await fetch('/api/cron/backup', { method: 'POST' });
      const data = await res.json();
      setCronSimulationResult(data);
      fetchServerStatus();
    } catch (e: any) {
      setCronSimulationResult({ success: false, error: e.message });
    } finally {
      setIsSimulatingCron(false);
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
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 text-slate-100">
      <BackupAuthGuard authStatus={authStatus} onSignIn={handleGoogleSignIn}>
        {/* Header with quick system indicators & Run Backup button */}
        <BackupStatusHeader
          user={authUser}
          isOnline={isOnline}
          isCreating={isCreating}
          isRefreshing={isRefreshing}
          autoBackupEnabled={backupSettings?.autoBackupEnabled !== false}
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

        {/* TRUE Server-Side 24h Automatic Backup Status Card */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
                <Server size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Automated Daily Cloud Backup</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    Active & Cloud Protected
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Your ledger is securely backed up in the cloud every 24 hours—even when your app is closed or your device is turned off.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSimulateCron}
              disabled={isSimulatingCron}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSimulatingCron ? <RefreshCcw size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{isSimulatingCron ? 'Running Backup Test...' : 'Run Test Backup Now'}</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Clock size={13} className="text-indigo-400" /> Last Cloud Backup (IST)
              </span>
              <p className="text-white font-semibold text-sm">
                {formatIST(serverStatus?.lastCronExecution, 'Scheduled daily at 2:00 AM IST')}
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Clock size={13} className="text-emerald-400" /> Next Automatic Backup (IST)
              </span>
              <p className="text-emerald-300 font-semibold text-sm">
                {formatIST(serverStatus?.nextScheduledExecution, 'Within 24 Hours (IST)')}
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={13} className="text-emerald-400" /> Successful Backups (7d)
              </span>
              <p className="text-white font-semibold text-sm">
                {serverStatus?.successCount7Days ?? 0} Automatic Backups
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Shield size={13} className="text-indigo-400" /> Security & Integrity
              </span>
              <p className="text-white font-semibold text-sm">
                Securely Encrypted & Verified
              </p>
            </div>
          </div>

          {cronSimulationResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                cronSimulationResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  {cronSimulationResult.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{cronSimulationResult.message || 'Simulation Result'}</span>
                </span>
                <span className="text-[10px] opacity-80">Attempts: {cronSimulationResult.attempts}</span>
              </div>
              {cronSimulationResult.details && (
                <div className="font-mono bg-black/30 p-2.5 rounded-xl space-y-1 text-[11px] overflow-x-auto">
                  <p><span className="text-slate-400">ID:</span> {cronSimulationResult.details.id}</p>
                  <p><span className="text-slate-400">Type:</span> {cronSimulationResult.details.type} (Automatic)</p>
                  <p><span className="text-slate-400">Timestamp:</span> {cronSimulationResult.details.timestamp}</p>
                  <p><span className="text-slate-400">Size:</span> {cronSimulationResult.details.size} bytes</p>
                  <p><span className="text-slate-400">SHA-256 Checksum:</span> {cronSimulationResult.details.checksum}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

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
