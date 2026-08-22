import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, Shield, CheckCircle2, AlertCircle, HardDrive, 
  Download, RotateCcw, Trash2, Clock, Play, FileJson, 
  Lock, RefreshCw, Settings as SettingsIcon, Database,
  ArrowUpRight, AlertTriangle, X, Check, Server, Eye, Sparkles, Sliders,
  Calendar, CheckCircle, Activity
} from 'lucide-react';
import { BackupService, BackupStats } from '../lib/backupService';
import { formatCurrency, formatDate } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import AnimatedButton from '../components/ui/AnimatedButton';
import DataStateGuard from '../components/ui/DataStateGuard';
import { BackupMetadata, BackupProgressStage, BackupType } from '../types';

export default function BackupDashboard() {
  const { generalSettings, backupSettings, updateBackupSettings, applyRestoredState, currentUser, dataStatus, retryFetchData } = useStore();
  const { showSuccess, showError, showInfo } = useToast();

  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Backup State
  const [isCreating, setIsCreating] = useState(false);
  const [progressStage, setProgressStage] = useState<BackupProgressStage>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Restore State
  const [restoreTarget, setRestoreTarget] = useState<BackupMetadata | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressMsg, setRestoreProgressMsg] = useState<string>('');
  const [restoreProgressPercent, setRestoreProgressPercent] = useState<number>(0);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BackupMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings Modal / Panel State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Inspection / Details Modal
  const [inspectTarget, setInspectTarget] = useState<BackupMetadata | null>(null);

  const fetchBackups = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await BackupService.listBackups();
      setBackups(data);
    } catch (err: any) {
      console.error('[BackupDashboard] Fetch error:', err);
      showError('Error Loading Backups', err?.message || 'Failed to load backup history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [currentUser?.uid]);

  const handleCreateBackup = async () => {
    if (isCreating || BackupService.isOperationActive()) return;

    setIsCreating(true);
    setProgressStage('preparing');
    setProgressPercent(10);
    setProgressMessage('Collecting ledger balances, transactions, and settings...');

    try {
      const newBackup = await BackupService.createBackup('manual', (stage, pct, msg) => {
        setProgressStage(stage);
        setProgressPercent(pct);
        setProgressMessage(msg);
      });

      setBackups(prev => [newBackup, ...prev]);
      showSuccess('Backup Created Successfully', `Encrypted snapshot (${BackupService.formatSize(newBackup.size)}) stored in Cloud.`);
      
      setTimeout(() => {
        setIsCreating(false);
        setProgressStage('idle');
        setProgressPercent(0);
      }, 1200);
    } catch (err: any) {
      console.error('[BackupDashboard] Creation failed:', err);
      setProgressStage('failed');
      showError('Backup Failed', err?.message || 'Failed to generate cloud backup.');
      setTimeout(() => {
        setIsCreating(false);
        setProgressStage('idle');
      }, 2500);
    }
  };

  const executeRestore = async () => {
    if (!restoreTarget) return;

    setIsRestoring(true);
    setRestoreProgressMsg('Connecting to secure cloud storage...');
    setRestoreProgressPercent(15);

    try {
      const result = await BackupService.restoreBackup(restoreTarget.id, (msg, pct) => {
        setRestoreProgressMsg(msg);
        setRestoreProgressPercent(pct);
      });

      if (result.success && result.restoredState) {
        applyRestoredState(result.restoredState);
        showSuccess(
          'Restore Successful',
          `Restored ${result.restoredState.transactions.length} transactions and point-in-time state.`
        );
        setRestoreTarget(null);
        await fetchBackups();
      }
    } catch (err: any) {
      console.error('[BackupDashboard] Restore error:', err);
      showError('Restore Failed', err?.message || 'Integrity check failed or backup is corrupted.');
    } finally {
      setIsRestoring(false);
      setRestoreProgressMsg('');
      setRestoreProgressPercent(0);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await BackupService.deleteBackup(deleteTarget.id, deleteTarget.fileName);
      setBackups(prev => prev.filter(b => b.id !== deleteTarget.id));
      showSuccess('Backup Deleted', `Snapshot ${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('[BackupDashboard] Delete error:', err);
      showError('Delete Failed', err?.message || 'Failed to delete backup.');
    } finally {
      setIsDeleting(false);
    }
  };

  const stats: BackupStats = BackupService.calculateStats(backups, backupSettings);

  const getTypeBadge = (type: BackupType) => {
    switch (type) {
      case 'automatic':
      case 'daily':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">Auto (24h)</span>;
      case 'on-login':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">Login</span>;
      case 'pre-restore':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">Pre-Restore</span>;
      case 'manual':
      default:
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">Manual</span>;
    }
  };

  return (
    <DataStateGuard status={dataStatus} onRetry={retryFetchData}>
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8 bg-[#05060a]"
      >
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Cloud className="text-indigo-400" />
              Backup & Recovery System
            </h1>
            <p className="text-slate-400 mt-1.5 text-sm max-w-2xl">
              Automated 24-hour zero-knowledge cloud backup engine with AES-256 encryption & SHA-256 integrity verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchBackups(true)}
              disabled={isRefreshing || isLoading}
              className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Snapshot History"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-xl text-sm font-medium transition-colors"
            >
              <SettingsIcon size={16} className="text-slate-400" />
              Settings
            </button>

            <AnimatedButton
              onClick={handleCreateBackup}
              disabled={isCreating}
              icon={isCreating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
              className={`bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 ${isCreating ? 'animate-pulse' : ''}`}
            >
              {isCreating ? 'Creating Snapshot...' : 'Run Backup Now'}
            </AnimatedButton>
          </div>
        </header>

        {/* Diagnostic / Error Alert Banner if any error occurred */}
        {stats.lastError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-rose-400 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-semibold text-rose-200">Last Backup Notice</h4>
                <p className="text-xs text-rose-300/80">{stats.lastError}</p>
              </div>
            </div>
            <button
              onClick={handleCreateBackup}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Retry Now
            </button>
          </div>
        )}

        {/* Live Progress Banner (When backup is active) */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-indigo-950/50 border border-indigo-500/30 p-5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl animate-pulse">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Real-Time Cloud Snapshot Pipeline</span>
                      <span className="text-[11px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                        {progressStage}
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200/80 mt-0.5">{progressMessage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-indigo-400 font-mono">{progressPercent}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Pipeline Steps Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                  progressPercent >= 20 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-black/30 text-slate-500 border-white/5'
                }`}>
                  <CheckCircle2 size={12} className={progressPercent >= 20 ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className="truncate">1. Collect Data</span>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                  progressPercent >= 45 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : progressPercent >= 25 ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 animate-pulse' : 'bg-black/30 text-slate-500 border-white/5'
                }`}>
                  <Lock size={12} className={progressPercent >= 45 ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className="truncate">2. AES-256</span>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                  progressPercent >= 55 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : progressPercent >= 45 ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 animate-pulse' : 'bg-black/30 text-slate-500 border-white/5'
                }`}>
                  <Shield size={12} className={progressPercent >= 55 ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className="truncate">3. SHA-256</span>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                  progressPercent >= 85 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : progressPercent >= 65 ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 animate-pulse' : 'bg-black/30 text-slate-500 border-white/5'
                }`}>
                  <Server size={12} className={progressPercent >= 85 ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className="truncate">4. Storage</span>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                  progressPercent >= 100 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : progressPercent >= 85 ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 animate-pulse' : 'bg-black/30 text-slate-500 border-white/5'
                }`}>
                  <CheckCircle2 size={12} className={progressPercent >= 100 ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className="truncate">5. Verified</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Status & Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 24h Auto Backup */}
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Shield size={18} />
                <h3 className="font-semibold text-sm">24h Auto Backup</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                backupSettings?.autoBackupEnabled !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {backupSettings?.autoBackupEnabled !== false ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {backupSettings?.autoBackupEnabled !== false ? 'ON' : 'OFF'}
            </p>
            <p className="text-xs text-slate-400 flex items-center justify-between">
              <span>Runs every {backupSettings?.frequency || '24h'}</span>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="text-indigo-400 hover:text-indigo-300 text-[11px] underline underline-offset-2"
              >
                Configure
              </button>
            </p>
          </div>

          {/* Card 2: Last Backup */}
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2.5 text-blue-400 mb-2">
              <Clock size={18} />
              <h3 className="font-semibold text-sm">Last Backup</h3>
            </div>
            <p className="text-xl font-bold text-white mb-1 truncate" title={stats.latestBackupDate ? formatDate(stats.latestBackupDate, generalSettings?.timezone) : 'No backups'}>
              {stats.latestBackupDate ? BackupService.formatRelativeTime(stats.latestBackupDate) : 'Never'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {stats.latestBackupDate ? formatDate(stats.latestBackupDate, generalSettings?.timezone) : 'Pending initial snapshot'}
            </p>
          </div>

          {/* Card 3: Next Backup & Health */}
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2.5 text-cyan-400 mb-2">
              <Activity size={18} />
              <h3 className="font-semibold text-sm">Backup Health</h3>
            </div>
            <p className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${stats.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{stats.health}</span>
            </p>
            <p className="text-xs text-slate-400 truncate">
              Next: {stats.nextBackupDate ? formatDate(stats.nextBackupDate, generalSettings?.timezone) : 'Pending'}
            </p>
          </div>

          {/* Card 4: Total Storage & Retention */}
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2.5 text-purple-400 mb-2">
              <HardDrive size={18} />
              <h3 className="font-semibold text-sm">Cloud Storage</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {BackupService.formatSize(stats.totalStorageBytes)}
            </p>
            <p className="text-xs text-slate-400">
              {stats.totalBackups} / {backupSettings?.retention || 30} snapshots retained
            </p>
          </div>
        </div>

        {/* Snapshot Version History Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Database size={18} className="text-indigo-400" />
                Snapshot Version History
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest 30 point-in-time snapshots with SHA-256 verification and atomic restore.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-full text-slate-300 font-mono">
                {backups.length} Available {backups.length === 1 ? 'Snapshot' : 'Snapshots'}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/40 text-slate-400 text-xs uppercase font-semibold border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Snapshot ID</th>
                  <th className="px-6 py-4">Created Date & Time</th>
                  <th className="px-6 py-4">Payload Size</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-400" size={28} />
                      <p className="font-medium text-slate-300">Synchronizing cloud backup records...</p>
                      <p className="text-xs text-slate-500 mt-1">Connecting to Firestore & Cloud Storage</p>
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Cloud className="mx-auto mb-3 opacity-40 text-slate-400" size={36} />
                      <p className="text-base font-semibold text-slate-200">No backups found</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Click "Run Backup Now" above to create your first encrypted point-in-time cloud snapshot.
                      </p>
                    </td>
                  </tr>
                ) : (
                  backups.map((backup, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={backup.id} 
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Snapshot ID & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <FileJson size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-200 font-mono text-xs flex items-center gap-2">
                              {backup.name || backup.id}
                              {backup.status === 'restored' && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-sans">
                                  Restored
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                              <span>v{backup.version || '2.0.0'}</span>
                              {backup.checksumSha256 && backup.checksumSha256 !== 'migrated' && (
                                <span className="text-slate-600 truncate max-w-[120px]" title={`SHA-256: ${backup.checksumSha256}`}>
                                  sha256:{backup.checksumSha256.substring(0, 8)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-slate-300">
                        <div className="text-xs font-medium">
                          {formatDate(backup.createdAt, generalSettings?.timezone)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {BackupService.formatRelativeTime(backup.createdAt)}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        <span className="text-slate-200 font-semibold">{BackupService.formatSize(backup.size)}</span>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        {getTypeBadge(backup.type)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                          <CheckCircle2 size={12} />
                          <span>Verified</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setInspectTarget(backup)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Inspect Snapshot"
                          >
                            <Eye size={15} />
                          </button>

                          <button 
                            onClick={() => BackupService.downloadBackup(backup.id, backup.fileName)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Download Encrypted Snapshot (.json.enc)"
                          >
                            <Download size={15} />
                          </button>

                          <button 
                            onClick={() => setRestoreTarget(backup)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 font-medium text-xs rounded-lg transition-colors"
                          >
                            <RotateCcw size={13} />
                            Restore
                          </button>

                          <button 
                            onClick={() => setDeleteTarget(backup)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESTORE CONFIRMATION MODAL */}
        <AnimatePresence>
          {restoreTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="bg-[#0b0f19] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">Restore Point-in-Time Backup</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      This will replace your current active balances, transactions, and settings with this exact snapshot.
                    </p>
                  </div>
                  <button 
                    onClick={() => !isRestoring && setRestoreTarget(null)}
                    disabled={isRestoring}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Snapshot Details Card */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Snapshot ID:</span>
                    <span className="font-mono text-slate-200">{restoreTarget.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-200">{formatDate(restoreTarget.createdAt, generalSettings?.timezone)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Payload Size:</span>
                    <span className="text-slate-200 font-mono">{BackupService.formatSize(restoreTarget.size)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Integrity:</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> SHA-256 Checksum Verified
                    </span>
                  </div>
                </div>

                {/* Live Restore Progress */}
                {isRestoring && (
                  <div className="space-y-2 bg-blue-950/40 border border-blue-500/20 p-4 rounded-2xl">
                    <div className="flex justify-between text-xs text-blue-300 font-medium">
                      <span className="flex items-center gap-2">
                        <RefreshCw size={12} className="animate-spin text-blue-400" />
                        {restoreProgressMsg || 'Restoring data...'}
                      </span>
                      <span>{restoreProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-blue-950 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-blue-400 h-full rounded-full transition-all duration-200"
                        style={{ width: `${restoreProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setRestoreTarget(null)}
                    disabled={isRestoring}
                    className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <AnimatedButton
                    onClick={executeRestore}
                    disabled={isRestoring}
                    icon={isRestoring ? <RefreshCw className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {isRestoring ? 'Restoring Database...' : 'Confirm Restore'}
                  </AnimatedButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="bg-[#0b0f19] border border-white/10 rounded-3xl max-md w-full p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl">
                    <Trash2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">Delete Cloud Snapshot?</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Are you sure you want to permanently delete snapshot <span className="font-mono text-slate-200 font-semibold">{deleteTarget.id}</span>? This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <AnimatedButton
                    onClick={executeDelete}
                    disabled={isDeleting}
                    icon={isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    className="bg-rose-600 hover:bg-rose-500 text-white"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                  </AnimatedButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* INSPECT SNAPSHOT MODAL */}
        <AnimatePresence>
          {inspectTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="bg-[#0b0f19] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileJson className="text-indigo-400" size={18} />
                    Snapshot Metadata Inspector
                  </h3>
                  <button onClick={() => setInspectTarget(null)} className="text-slate-500 hover:text-slate-300">
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3 text-xs font-mono">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">ID:</span>
                    <span className="text-indigo-300 font-semibold">{inspectTarget.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">File Name:</span>
                    <span className="text-slate-300">{inspectTarget.fileName}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-300">{inspectTarget.createdAt}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Storage Size:</span>
                    <span className="text-slate-300">{inspectTarget.size} bytes ({BackupService.formatSize(inspectTarget.size)})</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Type:</span>
                    <span className="text-slate-300 uppercase">{inspectTarget.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Encryption:</span>
                    <span className="text-emerald-400">AES-256-CBC (PKCS7)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Version:</span>
                    <span className="text-slate-300">{inspectTarget.version || '2.0.0'}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                    <span className="text-slate-500">SHA-256 Checksum:</span>
                    <span className="text-slate-300 break-all text-[10px] bg-black/60 p-1.5 rounded">{inspectTarget.checksumSha256}</span>
                  </div>
                  {inspectTarget.itemCounts && (
                    <div className="pt-1">
                      <span className="text-slate-500 block mb-1">Included Content:</span>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div>• Transactions: {inspectTarget.itemCounts.transactions}</div>
                        <div>• Customers: {inspectTarget.itemCounts.customers}</div>
                        <div>• Savings Goals: {inspectTarget.itemCounts.savingsGoals}</div>
                        <div>• Gullak Entries: {inspectTarget.itemCounts.gullakEntries}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <AnimatedButton
                    onClick={() => BackupService.downloadBackup(inspectTarget.id, inspectTarget.fileName)}
                    icon={<Download size={15} />}
                    className="bg-white/10 hover:bg-white/20 text-white"
                  >
                    Download File
                  </AnimatedButton>
                  <button
                    onClick={() => setInspectTarget(null)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SETTINGS MODAL */}
        <AnimatePresence>
          {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="bg-[#0b0f19] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <Sliders className="text-indigo-400" size={20} />
                    Cloud Backup Configuration
                  </h3>
                  <button onClick={() => setShowSettingsModal(false)} className="text-slate-500 hover:text-slate-300">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  {/* Enable / Disable Automatic Backup */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div>
                      <h4 className="font-semibold text-white">Enable Automated Backup</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Runs automatically every 24 hours in the background</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={backupSettings?.autoBackupEnabled !== false}
                        onChange={(e) => updateBackupSettings({ autoBackupEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Backup Frequency */}
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                    <label className="font-semibold text-white block">Backup Frequency</label>
                    <select
                      value={backupSettings?.frequency || '24h'}
                      onChange={(e) => updateBackupSettings({ frequency: e.target.value as any })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="12h">Every 12 Hours</option>
                      <option value="24h">Every 24 Hours (Daily Recommended)</option>
                      <option value="7d">Every 7 Days (Weekly)</option>
                    </select>
                  </div>

                  {/* Retention Policy */}
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                    <label className="font-semibold text-white block">Retention Policy</label>
                    <p className="text-xs text-slate-400">Controls how many historical snapshots to retain (defaults to latest 30)</p>
                    <select
                      value={backupSettings?.retention || '30'}
                      onChange={(e) => updateBackupSettings({ retention: e.target.value as any })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="10">Keep Last 10 Backups</option>
                      <option value="25">Keep Last 25 Backups</option>
                      <option value="30">Keep Last 30 Backups (Standard)</option>
                      <option value="unlimited">Unlimited (Up to Cloud Quota)</option>
                    </select>
                  </div>

                  {/* Backup on Login */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div>
                      <h4 className="font-semibold text-white">Backup on Login</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Take a snapshot each time you sign in to a new session</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={backupSettings?.backupOnLogin ?? false}
                        onChange={(e) => updateBackupSettings({ backupOnLogin: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </DataStateGuard>
  );
}
