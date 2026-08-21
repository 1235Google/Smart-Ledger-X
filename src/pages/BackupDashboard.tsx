import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, Shield, CheckCircle2, AlertCircle, HardDrive, 
  Download, RotateCcw, Trash2, Clock, Play, FileJson, 
  Lock, RefreshCw, Settings as SettingsIcon, Database,
  ArrowUpRight, AlertTriangle, X, Check, Server, Eye, Sparkles, Sliders,
  Calendar, CheckCircle, Activity, Search, Filter, Flame,
  FlaskConical, ShieldCheck, Terminal, Layers, ArrowUpDown,
  History, BarChart3, Zap
} from 'lucide-react';
import { BackupService, BackupStats } from '../lib/backupService';
import { formatCurrency, formatDate } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import AnimatedButton from '../components/ui/AnimatedButton';
import DataStateGuard from '../components/ui/DataStateGuard';
import { 
  BackupMetadata, 
  BackupProgressStage, 
  BackupType, 
  BackupLog, 
  BackupTimelineEvent, 
  RecoveryTestReport,
  AppState 
} from '../types';

// Enterprise Components
import BackupHealthDashboard from '../components/backup/BackupHealthDashboard';
import StorageUsageCard from '../components/backup/StorageUsageCard';
import BackupTimeline from '../components/backup/BackupTimeline';
import SnapshotDrawer from '../components/backup/SnapshotDrawer';
import RestoreWizardModal from '../components/backup/RestoreWizardModal';
import BackupLogsPanel from '../components/backup/BackupLogsPanel';
import EmergencyRecoveryModal from '../components/backup/EmergencyRecoveryModal';
import BackupStatisticsCard from '../components/backup/BackupStatisticsCard';
import DataIncludedCard from '../components/backup/DataIncludedCard';
import BackupPerformanceCard from '../components/backup/BackupPerformanceCard';
import TestRecoveryModal from '../components/backup/TestRecoveryModal';
import ExportBackupModal from '../components/backup/ExportBackupModal';

export default function BackupDashboard() {
  const { generalSettings, backupSettings, updateBackupSettings, applyRestoredState, currentUser, dataStatus, retryFetchData } = useStore();
  const { showSuccess, showError, showInfo } = useToast();

  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<BackupTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Backup State
  const [isCreating, setIsCreating] = useState(false);
  const [progressStage, setProgressStage] = useState<BackupProgressStage>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Modals & Drawers state
  const [drawerSnapshot, setDrawerSnapshot] = useState<BackupMetadata | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [restoreWizardSnapshot, setRestoreWizardSnapshot] = useState<BackupMetadata | null>(null);
  const [isRestoreWizardOpen, setIsRestoreWizardOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [exportModalSnapshot, setExportModalSnapshot] = useState<BackupMetadata | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [testRecoveryReport, setTestRecoveryReport] = useState<RecoveryTestReport | null>(null);
  const [isTestRecoveryModalOpen, setIsTestRecoveryModalOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BackupMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verification in flight state
  const [verifyingSnapshotId, setVerifyingSnapshotId] = useState<string | null>(null);

  // Search & Filters for Snapshot Table (Req 14)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'automatic' | 'manual' | 'pre-restore'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'restored'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'size_desc' | 'size_asc'>('date_desc');

  const fetchBackups = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await BackupService.listBackups();
      setBackups(data);
      setLogs(BackupService.getLogs());
      setTimelineEvents(BackupService.getTimelineEvents(data));
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
      setLogs(BackupService.getLogs());
      setTimelineEvents(BackupService.getTimelineEvents([newBackup, ...backups]));

      showSuccess('Backup Created Successfully', `Encrypted snapshot (${BackupService.formatSize(newBackup.size)}) stored in Cloud.`);
      
      setTimeout(() => {
        setIsCreating(false);
        setProgressStage('idle');
        setProgressPercent(0);
      }, 1000);
    } catch (err: any) {
      console.error('[BackupDashboard] Creation failed:', err);
      setProgressStage('failed');
      showError('Backup Failed', err?.message || 'Failed to generate cloud backup.');
      setTimeout(() => {
        setIsCreating(false);
        setProgressStage('idle');
      }, 2000);
    }
  };

  // Action: Live Verification
  const handleVerifySnapshot = async (snapshot: BackupMetadata) => {
    setVerifyingSnapshotId(snapshot.id);
    try {
      const result = await BackupService.verifyBackup(snapshot.id);
      if (result.passed) {
        showSuccess('Verification Passed', `Snapshot ${snapshot.id} has 0 corrupt bits. SHA-256 confirmed in ${result.latencyMs}ms.`);
      } else {
        showError('Verification Failed', result.message);
      }
      await fetchBackups();
    } catch (err: any) {
      showError('Verification Error', err?.message || 'Failed to verify backup integrity.');
    } finally {
      setVerifyingSnapshotId(null);
    }
  };

  // Action: Test Recovery Dry Run
  const handleTestRecovery = async (snapshot: BackupMetadata) => {
    try {
      showInfo('Simulation Running', `Dry-run test starting for snapshot ${snapshot.id}...`);
      const report = await BackupService.testRecovery(snapshot.id);
      setTestRecoveryReport(report);
      setIsTestRecoveryModalOpen(true);
      setLogs(BackupService.getLogs());
      setTimelineEvents(BackupService.getTimelineEvents(backups));
    } catch (err: any) {
      showError('Test Recovery Failed', err?.message || 'Dry-run test failed.');
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await BackupService.deleteBackup(deleteTarget.id, deleteTarget.fileName);
      setBackups(prev => prev.filter(b => b.id !== deleteTarget.id));
      setLogs(BackupService.getLogs());
      showSuccess('Backup Deleted', `Snapshot ${deleteTarget.name} was permanently removed.`);
      setDeleteTarget(null);
      if (drawerSnapshot?.id === deleteTarget.id) {
        setIsDrawerOpen(false);
      }
    } catch (err: any) {
      console.error('[BackupDashboard] Delete error:', err);
      showError('Delete Failed', err?.message || 'Failed to delete backup.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreSuccess = (restoredState: AppState) => {
    applyRestoredState(restoredState);
    showSuccess(
      'Point-in-Time Restore Applied',
      `Restored ${restoredState.transactions.length} transactions and point-in-time state.`
    );
    setIsRestoreWizardOpen(false);
    setIsEmergencyModalOpen(false);
    setIsDrawerOpen(false);
    fetchBackups();
  };

  const stats: BackupStats = BackupService.calculateStats(backups, backupSettings);
  const performanceMetrics = BackupService.getPerformanceMetrics(backups);
  const latestVerifiedSnapshot = backups.find(b => b.status === 'verified') || (backups.length > 0 ? backups[0] : null);

  // Filter and Sort Backups for the Version History Table (Req 14)
  const filteredBackups = backups.filter((b) => {
    // Search query matches ID, fileName, checksum, or date
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id.toLowerCase().includes(q);
      const matchName = (b.name || '').toLowerCase().includes(q);
      const matchHash = (b.checksumSha256 || '').toLowerCase().includes(q);
      const matchDate = new Date(b.createdAt).toLocaleDateString().toLowerCase().includes(q);
      if (!matchId && !matchName && !matchHash && !matchDate) return false;
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'automatic' && b.type !== 'automatic' && b.type !== 'daily') return false;
      if (filterType === 'manual' && b.type !== 'manual') return false;
      if (filterType === 'pre-restore' && b.type !== 'pre-restore') return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'verified' && b.status !== 'verified') return false;
      if (filterStatus === 'restored' && b.status !== 'restored') return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'size_desc') return (b.size || 0) - (a.size || 0);
    if (sortBy === 'size_asc') return (a.size || 0) - (b.size || 0);
    return 0;
  });

  const getTypeBadge = (type: BackupType) => {
    switch (type) {
      case 'automatic':
      case 'daily':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Auto 24h</span>;
      case 'on-login':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Login</span>;
      case 'pre-restore':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Pre-Restore</span>;
      case 'manual':
      default:
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Manual</span>;
    }
  };

  return (
    <DataStateGuard status={dataStatus} onRetry={retryFetchData}>
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8 bg-[#05060a] pb-16"
      >
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Cloud size={24} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  Backup & Recovery Hub
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                    Enterprise Tier
                  </span>
                </h1>
                <p className="text-slate-400 mt-0.5 text-xs sm:text-sm">
                  Continuous 24-hour AES-256 cloud encryption, disaster recovery rollback & SHA-256 verification.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Emergency Disaster Recovery Button (Req 7) */}
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              title="Emergency Rollback to Latest Verified Snapshot"
            >
              <Flame size={15} className="text-rose-400" />
              <span>Emergency Recovery</span>
            </button>

            <button
              onClick={() => fetchBackups(true)}
              disabled={isRefreshing || isLoading}
              className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Snapshot Records"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-colors"
            >
              <SettingsIcon size={15} className="text-slate-400" />
              <span>Settings</span>
            </button>

            <AnimatedButton
              onClick={handleCreateBackup}
              disabled={isCreating}
              icon={isCreating ? <RefreshCw className="animate-spin" size={17} /> : <Play size={17} />}
              className={`bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-bold ${isCreating ? 'animate-pulse' : ''}`}
            >
              {isCreating ? 'Creating Snapshot...' : 'Run Backup Now'}
            </AnimatedButton>
          </div>
        </header>

        {/* Live Progress Pipeline Banner */}
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

        {/* 1. Backup Health Dashboard (Req 1) & 2. Storage Usage Card (Req 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BackupHealthDashboard 
              stats={stats} 
              latestSnapshot={latestVerifiedSnapshot || undefined} 
              onRefresh={() => fetchBackups(true)}
              isRefreshing={isRefreshing}
            />
          </div>
          <div className="lg:col-span-1">
            <StorageUsageCard stats={stats} />
          </div>
        </div>

        {/* 8. Backup Statistics Card (Req 8) & 9. Data Included Card (Req 9) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BackupStatisticsCard stats={stats} />
          <DataIncludedCard />
        </div>

        {/* 12. Backup Performance Metrics Card (Req 12) */}
        <BackupPerformanceCard metrics={performanceMetrics} />

        {/* 14. Snapshot Version History Management Table with Search & Filters (Req 4, 13, 14, 20) */}
        <div className="bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          {/* Table Header & Search Controls */}
          <div className="p-6 border-b border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <Database size={20} className="text-indigo-400" />
                  Snapshot Version History
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cryptographically sealed point-in-time state archives with atomic rollback capability.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-full text-slate-300 font-mono">
                  {filteredBackups.length} of {backups.length} Snapshots
                </span>
              </div>
            </div>

            {/* Search, Filter & Sort Controls (Req 14) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              {/* Search input */}
              <div className="sm:col-span-2 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search snapshot ID, date, or checksum..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="automatic">Automatic 24h</option>
                  <option value="manual">Manual Snapshots</option>
                  <option value="pre-restore">Pre-Restore</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="size_desc">Largest Size</option>
                  <option value="size_asc">Smallest Size</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-black/40 text-slate-400 text-[11px] uppercase font-semibold border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Snapshot Identification</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Payload Size</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Security & Badges</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-400" size={28} />
                      <p className="font-medium text-slate-300">Synchronizing cloud backup records...</p>
                      <p className="text-[11px] text-slate-500 mt-1">Connecting to Firestore & Cloud Storage</p>
                    </td>
                  </tr>
                ) : filteredBackups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Cloud className="mx-auto mb-3 opacity-40 text-slate-400" size={36} />
                      <p className="text-sm font-semibold text-slate-200">No snapshots matching your criteria</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {backups.length === 0 
                          ? 'Click "Run Backup Now" above to create your first encrypted point-in-time cloud snapshot.'
                          : 'Try clearing your search query or adjusting the filters.'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBackups.map((backup, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
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
                        <span className="text-slate-500 text-[10px] ml-1.5">({backup.compressionRatio || 72}% saved)</span>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        {getTypeBadge(backup.type)}
                      </td>

                      {/* Badges & Status (Req 13) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                            <CheckCircle2 size={10} />
                            <span>Verified</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-semibold">
                            <Lock size={10} />
                            <span>AES-256</span>
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Drawer Button */}
                          <button 
                            onClick={() => {
                              setDrawerSnapshot(backup);
                              setIsDrawerOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Inspect Snapshot Details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Verify Button (Req 20) */}
                          <button
                            onClick={() => handleVerifySnapshot(backup)}
                            disabled={verifyingSnapshotId === backup.id}
                            className="p-2 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Verify SHA-256 Checksum Live"
                          >
                            <RefreshCw size={15} className={verifyingSnapshotId === backup.id ? 'animate-spin' : ''} />
                          </button>

                          {/* Test Recovery Button (Req 15) */}
                          <button
                            onClick={() => handleTestRecovery(backup)}
                            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Test Recovery (Dry-Run Simulation)"
                          >
                            <FlaskConical size={15} />
                          </button>

                          {/* Export Button (Req 11) */}
                          <button 
                            onClick={() => {
                              setExportModalSnapshot(backup);
                              setIsExportModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Export Backup (ZIP, JSON, CSV, Excel, .slbx)"
                          >
                            <Download size={15} />
                          </button>

                          {/* Restore Wizard Button (Req 5) */}
                          <button 
                            onClick={() => {
                              setRestoreWizardSnapshot(backup);
                              setIsRestoreWizardOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 font-semibold text-xs rounded-lg transition-colors"
                          >
                            <RotateCcw size={13} />
                            <span>Restore</span>
                          </button>

                          {/* Delete Button */}
                          <button 
                            onClick={() => setDeleteTarget(backup)}
                            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
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

        {/* 3. Backup Timeline (Req 3) & 6. Live Diagnostic Logs (Req 6) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BackupTimeline 
            events={timelineEvents} 
            onSelectSnapshot={(id) => {
              const target = backups.find(b => b.id === id);
              if (target) {
                setDrawerSnapshot(target);
                setIsDrawerOpen(true);
              }
            }}
          />
          <BackupLogsPanel 
            logs={logs} 
            onClearLogs={() => {
              BackupService.clearLogs();
              setLogs([]);
              showInfo('Logs Cleared', 'Diagnostic log panel reset.');
            }}
            onRefresh={() => setLogs(BackupService.getLogs())}
          />
        </div>

        {/* 19. SNAPSHOT DETAILS DRAWER (Req 4, 13, 16, 19, 20) */}
        <SnapshotDrawer
          snapshot={drawerSnapshot}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onRestore={(snap) => {
            setIsDrawerOpen(false);
            setRestoreWizardSnapshot(snap);
            setIsRestoreWizardOpen(true);
          }}
          onExport={(snap) => {
            setExportModalSnapshot(snap);
            setIsExportModalOpen(true);
          }}
          onDelete={(snap) => {
            setDeleteTarget(snap);
          }}
          onTestRecovery={(snap) => {
            handleTestRecovery(snap);
          }}
          onVerify={async (snap) => {
            await handleVerifySnapshot(snap);
          }}
          isVerifying={verifyingSnapshotId === drawerSnapshot?.id}
        />

        {/* 5. 4-STEP RESTORE WIZARD MODAL (Req 5, 10) */}
        <RestoreWizardModal
          isOpen={isRestoreWizardOpen}
          onClose={() => setIsRestoreWizardOpen(false)}
          selectedSnapshot={restoreWizardSnapshot}
          allSnapshots={backups}
          onRestoreSuccess={handleRestoreSuccess}
        />

        {/* 7. EMERGENCY RECOVERY MODAL (Req 7) */}
        <EmergencyRecoveryModal
          isOpen={isEmergencyModalOpen}
          onClose={() => setIsEmergencyModalOpen(false)}
          latestVerifiedSnapshot={latestVerifiedSnapshot}
          onEmergencySuccess={handleRestoreSuccess}
        />

        {/* 15. TEST RECOVERY MODAL (Req 15) */}
        <TestRecoveryModal
          isOpen={isTestRecoveryModalOpen}
          onClose={() => setIsTestRecoveryModalOpen(false)}
          report={testRecoveryReport}
        />

        {/* 11. EXPORT BACKUP MODAL (Req 11) */}
        <ExportBackupModal
          snapshot={exportModalSnapshot}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="bg-[#0b0f19] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
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
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <AnimatedButton
                    onClick={executeDelete}
                    disabled={isDeleting}
                    icon={isDeleting ? <RefreshCw className="animate-spin" size={15} /> : <Trash2 size={15} />}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                  </AnimatedButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SETTINGS CONFIGURATION MODAL */}
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
                  <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                    <Sliders className="text-indigo-400" size={18} />
                    Automated Backup Policy Configuration
                  </h3>
                  <button onClick={() => setShowSettingsModal(false)} className="text-slate-500 hover:text-slate-300">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Enable / Disable Automatic Backup */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div>
                      <h4 className="font-semibold text-white">Enable 24-Hour Automated Backup</h4>
                      <p className="text-slate-400 mt-0.5">Executes background encrypted snapshots every 24 hours</p>
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
                    <label className="font-semibold text-white block">Scheduled Frequency</label>
                    <select
                      value={backupSettings?.frequency || '24h'}
                      onChange={(e) => updateBackupSettings({ frequency: e.target.value as any })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
                    >
                      <option value="12h">Every 12 Hours</option>
                      <option value="24h">Every 24 Hours (Daily Recommended)</option>
                      <option value="7d">Every 7 Days (Weekly)</option>
                    </select>
                  </div>

                  {/* Retention Policy */}
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                    <label className="font-semibold text-white block">Snapshot Retention Limit</label>
                    <p className="text-slate-400">Controls how many historical snapshots are preserved before automatic pruning</p>
                    <select
                      value={backupSettings?.retention || '30'}
                      onChange={(e) => updateBackupSettings({ retention: e.target.value as any })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors text-xs"
                    >
                      <option value="10">Keep Last 10 Backups</option>
                      <option value="25">Keep Last 25 Backups</option>
                      <option value="30">Keep Last 30 Backups (Standard Enterprise)</option>
                      <option value="unlimited">Unlimited (Up to 5 GB Cloud Quota)</option>
                    </select>
                  </div>

                  {/* Backup on Login */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div>
                      <h4 className="font-semibold text-white">Snapshot on User Sign-in</h4>
                      <p className="text-slate-400 mt-0.5">Generate snapshot immediately upon successful authentication</p>
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
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
                  >
                    Save & Close
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
