import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  RefreshCw, 
  Play, 
  RotateCcw, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MinusCircle, 
  HelpCircle, 
  Cloud, 
  Bell, 
  Calculator, 
  Camera, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Search, 
  Filter, 
  Server, 
  Database, 
  ShieldAlert, 
  Cpu, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Power
} from 'lucide-react';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { 
  ScheduledJob, 
  ScheduledJobRun, 
  ScheduledJobsSummary, 
  ScheduledJobStatus 
} from '../../types';
import { 
  fetchScheduledJobs, 
  fetchJobHistory, 
  runJobNow, 
  retryJobNow, 
  toggleJobState 
} from '../../lib/scheduledJobsService';
import { cn } from '../../lib/utils';

// Helper for relative time
function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return 'Invalid date';

    if (diffMs < 0) {
      // Future
      const absSec = Math.floor(Math.abs(diffMs) / 1000);
      if (absSec < 60) return `in ${absSec}s`;
      const absMin = Math.floor(absSec / 60);
      if (absMin < 60) return `in ${absMin}m`;
      const absHours = Math.floor(absMin / 60);
      if (absHours < 24) return `in ${absHours}h`;
      const absDays = Math.floor(absHours / 24);
      return `in ${absDays}d`;
    }

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Unknown';
  }
}

function formatExactDateTime(dateString?: string | null): string {
  if (!dateString) return 'None recorded';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
}

export default function AdminScheduledJobs() {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  // State
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [summary, setSummary] = useState<ScheduledJobsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'DELAYED' | 'FAILED' | 'DISABLED'>('ALL');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    job: ScheduledJob | null;
    mode: 'RUN' | 'RETRY';
    isLoading: boolean;
  }>({
    isOpen: false,
    job: null,
    mode: 'RUN',
    isLoading: false
  });

  // History modal
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    job: ScheduledJob | null;
    runs: ScheduledJobRun[];
    isLoading: boolean;
    selectedRun: ScheduledJobRun | null;
  }>({
    isOpen: false,
    job: null,
    runs: [],
    isLoading: false,
    selectedRun: null
  });

  // Toggling state per job
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null);

  // Live timer for relative countdowns
  const [clockTick, setClockTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch jobs
  const loadJobsData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const data = await fetchScheduledJobs();
      setJobs(data.jobs);
      setSummary(data.summary);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setErrorMsg(err.message || 'Failed to fetch scheduled jobs. Ensure server backend is running.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobsData();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadJobsData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadJobsData]);

  // Execute job (Run or Retry)
  const handleExecuteConfirmed = async () => {
    const { job, mode } = confirmModal;
    if (!job) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      let result;
      if (mode === 'RUN') {
        result = await runJobNow(job.jobId);
      } else {
        result = await retryJobNow(job.jobId);
      }

      setStatusMessage({
        text: `Success: '${job.jobName}' executed (${result.run.status}) in ${(result.run.durationMs / 1000).toFixed(2)}s.`,
        type: result.run.status === 'SUCCESS' ? 'success' : 'error'
      });

      // Reload jobs
      await loadJobsData(false);
      setConfirmModal({ isOpen: false, job: null, mode: 'RUN', isLoading: false });
    } catch (err: any) {
      setStatusMessage({
        text: `Execution failed: ${err.message || 'Server error encountered'}`,
        type: 'error'
      });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Open history modal
  const handleOpenHistory = async (job: ScheduledJob) => {
    setHistoryModal({
      isOpen: true,
      job,
      runs: [],
      isLoading: true,
      selectedRun: null
    });

    try {
      const runs = await fetchJobHistory(job.jobId, 50);
      setHistoryModal(prev => ({
        ...prev,
        runs,
        isLoading: false,
        selectedRun: runs[0] || null
      }));
    } catch (err: any) {
      setHistoryModal(prev => ({
        ...prev,
        isLoading: false
      }));
      setStatusMessage({
        text: `Could not load history for '${job.jobName}': ${err.message}`,
        type: 'error'
      });
    }
  };

  // Toggle enabled state
  const handleToggleState = async (job: ScheduledJob) => {
    setTogglingJobId(job.jobId);
    try {
      const targetState = !job.enabled;
      await toggleJobState(job.jobId, targetState);
      setStatusMessage({
        text: `'${job.jobName}' has been ${targetState ? 'enabled' : 'disabled'}.`,
        type: 'info'
      });
      await loadJobsData(false);
    } catch (err: any) {
      setStatusMessage({
        text: `Toggle failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setTogglingJobId(null);
    }
  };

  // Get icon for job
  const getJobIcon = (iconType: ScheduledJob['iconType']) => {
    switch (iconType) {
      case 'backup':
        return Cloud;
      case 'bell':
        return Bell;
      case 'calculator':
        return Calculator;
      case 'camera':
        return Camera;
      case 'broom':
        return Sparkles;
      case 'shield':
        return ShieldCheck;
      case 'report':
        return FileText;
      default:
        return Cpu;
    }
  };

  // Get status badge properties
  const getStatusBadge = (status: ScheduledJobStatus) => {
    switch (status) {
      case 'HEALTHY':
        return {
          label: 'Healthy',
          icon: CheckCircle2,
          containerClass: isDark ? 'bg-[#0f5223]/30 text-[#85e197] border-[#1d7d3d]/50' : 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
          dotClass: 'bg-emerald-400'
        };
      case 'RUNNING':
        return {
          label: 'Running...',
          icon: RefreshCw,
          containerClass: isDark ? 'bg-[#004a77]/30 text-[#c2e7ff] border-[#0077c2]/50' : 'bg-[#c2e7ff] text-[#004a77] border-[#7fcfff]',
          dotClass: 'bg-sky-400 animate-spin'
        };
      case 'DELAYED':
        return {
          label: 'Delayed',
          icon: Clock,
          containerClass: isDark ? 'bg-[#5c3e00]/30 text-[#fdd663] border-[#916200]/50' : 'bg-[#fef7e0] text-[#b06000] border-[#fde293]',
          dotClass: 'bg-amber-400 animate-pulse'
        };
      case 'CRITICAL_DELAY':
        return {
          label: 'Scheduler Delayed',
          icon: AlertTriangle,
          containerClass: isDark ? 'bg-[#601410]/30 text-[#f28b82] border-[#a52714]/50' : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
          dotClass: 'bg-rose-500 animate-ping'
        };
      case 'FAILED':
        return {
          label: 'Failed',
          icon: XCircle,
          containerClass: isDark ? 'bg-[#601410]/30 text-[#f28b82] border-[#a52714]/50' : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
          dotClass: 'bg-rose-500'
        };
      case 'DISABLED':
        return {
          label: 'Disabled',
          icon: MinusCircle,
          containerClass: isDark ? 'bg-[#303030]/50 text-[#9e9e9e] border-[#424242]' : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]',
          dotClass: 'bg-neutral-400'
        };
      default:
        return {
          label: 'Unknown',
          icon: HelpCircle,
          containerClass: isDark ? 'bg-[#2a2a2a] text-[#aaa]' : 'bg-gray-100 text-gray-700',
          dotClass: 'bg-gray-400'
        };
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    // Status filter
    if (statusFilter === 'HEALTHY' && job.status !== 'HEALTHY') return false;
    if (statusFilter === 'DELAYED' && job.status !== 'DELAYED' && job.status !== 'CRITICAL_DELAY') return false;
    if (statusFilter === 'FAILED' && job.status !== 'FAILED') return false;
    if (statusFilter === 'DISABLED' && job.status !== 'DISABLED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        job.jobName.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.scheduleHuman.toLowerCase().includes(q) ||
        job.scheduleCron.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={cn(
              "text-2xl sm:text-3xl font-bold tracking-tight",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Scheduled Jobs Monitor
            </h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
              isDark 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24/7 Engine Active
            </span>
          </div>
          <p className={cn(
            "text-sm mt-1 max-w-3xl",
            isDark ? "text-neutral-400" : "text-gray-600"
          )}>
            Continuous background job scheduler running on the server. Inspects real execution history, 
            detects schedule delays, and manages automated backups even when user devices are off.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <M3Button
            variant="tonal"
            size="sm"
            onClick={() => loadJobsData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </M3Button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-sm transition-all",
            statusMessage.type === 'success' && (isDark ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60" : "bg-emerald-50 text-emerald-800 border-emerald-200"),
            statusMessage.type === 'error' && (isDark ? "bg-rose-950/40 text-rose-300 border-rose-800/60" : "bg-rose-50 text-rose-800 border-rose-200"),
            statusMessage.type === 'info' && (isDark ? "bg-sky-950/40 text-sky-300 border-sky-800/60" : "bg-sky-50 text-sky-800 border-sky-200")
          )}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {statusMessage.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold hover:underline opacity-80 hover:opacity-100 ml-4"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className={cn(
          "p-4 rounded-xl border flex items-start gap-3",
          isDark ? "bg-rose-950/30 text-rose-300 border-rose-800/50" : "bg-rose-50 text-rose-800 border-rose-200"
        )}>
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Scheduler Connection Error</h4>
            <p className="text-xs mt-0.5 opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <M3Card variant="filled" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium opacity-70">
            <span>Total Registered</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{summary?.totalJobs ?? jobs.length}</div>
          <div className="text-xs text-neutral-400 mt-1">Real background jobs</div>
        </M3Card>

        <M3Card variant="filled" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
            <span>Healthy</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold mt-2 text-emerald-400">{summary?.healthyCount ?? 0}</div>
          <div className="text-xs text-neutral-400 mt-1">On schedule</div>
        </M3Card>

        <M3Card variant="filled" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-amber-400">
            <span>Delayed</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold mt-2 text-amber-400">{summary?.delayedCount ?? 0}</div>
          <div className="text-xs text-neutral-400 mt-1">Execution overdue</div>
        </M3Card>

        <M3Card variant="filled" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-rose-400">
            <span>Failed</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold mt-2 text-rose-400">{summary?.failedCount ?? 0}</div>
          <div className="text-xs text-neutral-400 mt-1">Errors encountered</div>
        </M3Card>

        <M3Card variant="filled" padding="md" className="relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-medium opacity-70">
            <span>Server Clock</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-base font-semibold mt-2.5 font-mono truncate">
            {summary?.serverTime ? new Date(summary.serverTime).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
          </div>
          <div className="text-xs text-neutral-400 mt-1">UTC Server Time</div>
        </M3Card>
      </div>

      {/* Dedicated Automatic Disaster-Recovery Backup Health Card */}
      {summary?.autoBackupSystem && (
        <M3Card 
          variant="elevated" 
          padding="lg"
          className={cn(
            "relative overflow-hidden transition-all",
            summary.autoBackupSystem.status === 'WARNING' && (isDark ? "border-amber-500/40 bg-amber-950/10" : "border-amber-300 bg-amber-50/50"),
            summary.autoBackupSystem.status === 'FAILED' && (isDark ? "border-rose-500/40 bg-rose-950/10" : "border-rose-300 bg-rose-50/50")
          )}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#3c4043]/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl border flex items-center justify-center shrink-0",
                summary.autoBackupSystem.status === 'HEALTHY' && (isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"),
                summary.autoBackupSystem.status === 'WARNING' && (isDark ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"),
                summary.autoBackupSystem.status === 'FAILED' && (isDark ? "bg-rose-500/15 border-rose-500/30 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700")
              )}>
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">Automatic Backup Scheduler</h3>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5",
                    summary.autoBackupSystem.status === 'HEALTHY' && (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200"),
                    summary.autoBackupSystem.status === 'WARNING' && (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-800 border-amber-300"),
                    summary.autoBackupSystem.status === 'FAILED' && (isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-800 border-rose-300"),
                    summary.autoBackupSystem.status === 'DISABLED' && (isDark ? "bg-neutral-500/10 text-neutral-400 border-neutral-500/30" : "bg-gray-100 text-gray-700 border-gray-200")
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      summary.autoBackupSystem.status === 'HEALTHY' ? "bg-emerald-400" : summary.autoBackupSystem.status === 'WARNING' ? "bg-amber-400 animate-pulse" : "bg-rose-400"
                    )} />
                    {summary.autoBackupSystem.status === 'HEALTHY' ? 'Working' : summary.autoBackupSystem.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {summary.autoBackupSystem.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <M3Button
                variant="filled"
                size="sm"
                onClick={() => {
                  const autoBackupJob = jobs.find(j => j.jobId === 'auto_backup');
                  if (autoBackupJob) {
                    setConfirmModal({
                      isOpen: true,
                      job: autoBackupJob,
                      mode: 'RUN',
                      isLoading: false
                    });
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Backup Now</span>
              </M3Button>
            </div>
          </div>

          {/* Proactive Warning Banner if Backup Scheduled ON but No Recent Real Backup */}
          {summary.autoBackupSystem.status === 'WARNING' && (
            <div className={cn(
              "mt-3.5 p-3 rounded-lg border flex items-center gap-2.5 text-xs font-medium",
              isDark ? "bg-amber-950/40 border-amber-800/60 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"
            )}>
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Attention: Automatic backup is configured ON, but no verified cloud archive has been created within the last 24 hours. 
                Use &quot;Run Backup Now&quot; to test immediate server-side snapshot creation.
              </span>
            </div>
          )}

          {/* Backup stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 text-xs">
            <div>
              <span className="text-neutral-400 block">Verified Archives</span>
              <span className="font-semibold text-sm mt-0.5 block">{summary.autoBackupSystem.realBackupsFound} snapshots</span>
            </div>
            <div>
              <span className="text-neutral-400 block">Last Attempt</span>
              <span className="font-semibold text-sm mt-0.5 block">{formatRelativeTime(summary.autoBackupSystem.lastAttempt)}</span>
            </div>
            <div>
              <span className="text-neutral-400 block">Last Successful</span>
              <span className="font-semibold text-sm mt-0.5 block">{formatRelativeTime(summary.autoBackupSystem.lastSuccessfulBackup)}</span>
            </div>
            <div>
              <span className="text-neutral-400 block">Next Scheduled</span>
              <span className="font-semibold text-sm mt-0.5 block">{formatRelativeTime(summary.autoBackupSystem.nextBackup)}</span>
            </div>
            <div>
              <span className="text-neutral-400 block">Last Duration</span>
              <span className="font-semibold text-sm mt-0.5 block">{summary.autoBackupSystem.backupDuration}</span>
            </div>
            <div>
              <span className="text-neutral-400 block">Recent Failures</span>
              <span className={cn(
                "font-semibold text-sm mt-0.5 block",
                summary.autoBackupSystem.failureCount > 0 ? "text-rose-400" : "text-emerald-400"
              )}>
                {summary.autoBackupSystem.failureCount}
              </span>
            </div>
          </div>
        </M3Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by job name, schedule, or purpose..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 text-sm rounded-xl border transition-colors outline-none",
              isDark 
                ? "bg-[#1e1f20] border-[#3c4043] text-white placeholder:text-neutral-500 focus:border-sky-400" 
                : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            )}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'HEALTHY', 'DELAYED', 'FAILED', 'DISABLED'] as const).map(st => (
            <M3Chip
              key={st}
              label={st === 'ALL' ? 'All Jobs' : st.charAt(0) + st.slice(1).toLowerCase()}
              selected={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className="text-xs shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Jobs List Table / Cards */}
      <M3Card variant="filled" padding="none" className="overflow-hidden border border-[#3c4043]/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={cn(
              "text-xs font-semibold uppercase tracking-wider border-b",
              isDark ? "bg-[#171819] text-neutral-400 border-[#2d2f31]" : "bg-gray-50 text-gray-500 border-gray-200"
            )}>
              <tr>
                <th className="py-3.5 px-4">Job Name & Purpose</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Schedule</th>
                <th className="py-3.5 px-3">Last Run</th>
                <th className="py-3.5 px-3">Next Expected</th>
                <th className="py-3.5 px-3">Duration</th>
                <th className="py-3.5 px-3">Failures</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn(
              "divide-y",
              isDark ? "divide-[#2d2f31]" : "divide-gray-100"
            )}>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    <span>Loading real backend jobs status...</span>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <p className="font-medium text-sm">No scheduled jobs match your criteria.</p>
                    <p className="text-xs mt-1">Try changing the search keyword or filter chip.</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => {
                  const Icon = getJobIcon(job.iconType);
                  const statusBadge = getStatusBadge(job.status);
                  const isJobToggling = togglingJobId === job.jobId;

                  return (
                    <tr 
                      key={job.jobId}
                      className={cn(
                        "transition-colors",
                        isDark ? "hover:bg-[#282a2d]/50" : "hover:bg-gray-50/80"
                      )}
                    >
                      {/* Job Name */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg border mt-0.5 shrink-0",
                            isDark ? "bg-[#282a2d] border-[#3c4043] text-sky-400" : "bg-sky-50 border-sky-200 text-sky-600"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-1.5">
                              <span>{job.jobName}</span>
                              {!job.enabled && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-700/50 text-neutral-400 font-normal">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                              {job.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border w-max",
                            statusBadge.containerClass
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusBadge.dotClass)} />
                            {statusBadge.label}
                          </span>
                          {job.isOverdue && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Delayed {Math.round((job.overdueDurationMs || 0) / 60000)}m
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="font-medium block">{job.scheduleHuman}</span>
                          <span className="font-mono text-[11px] text-neutral-400 block mt-0.5">
                            {job.scheduleCron}
                          </span>
                        </div>
                      </td>

                      {/* Last Run */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {job.lastRun ? (
                          <div className="text-xs">
                            <span className="font-medium block">{formatRelativeTime(job.lastRun.startedAt)}</span>
                            <span className={cn(
                              "text-[10px] font-semibold block mt-0.5",
                              job.lastRun.status === 'SUCCESS' ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {job.lastRun.result}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500">None yet</span>
                        )}
                      </td>

                      {/* Next Expected */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="font-medium block">{formatRelativeTime(job.nextExpectedRun)}</span>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            {new Date(job.nextExpectedRun).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-3 whitespace-nowrap text-xs font-mono">
                        {job.lastRun ? `${(job.lastRun.durationMs / 1000).toFixed(1)}s` : '--'}
                      </td>

                      {/* Failures */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {job.recentFailureCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {job.recentFailureCount}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Run Now */}
                          {job.safeToRunManually && (
                            <button
                              title="Execute job now manually"
                              onClick={() => setConfirmModal({
                                isOpen: true,
                                job,
                                mode: 'RUN',
                                isLoading: false
                              })}
                              disabled={job.status === 'RUNNING'}
                              className={cn(
                                "p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                                isDark 
                                  ? "hover:bg-neutral-700/60 text-sky-400" 
                                  : "hover:bg-sky-50 text-sky-600"
                              )}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="hidden xl:inline text-xs">Run</span>
                            </button>
                          )}

                          {/* Retry (if safe & failed/delayed) */}
                          {job.safeToRetry && (job.status === 'FAILED' || job.status === 'DELAYED' || job.status === 'CRITICAL_DELAY') && (
                            <button
                              title="Retry execution now"
                              onClick={() => setConfirmModal({
                                isOpen: true,
                                job,
                                mode: 'RETRY',
                                isLoading: false
                              })}
                              className={cn(
                                "p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                                isDark 
                                  ? "hover:bg-neutral-700/60 text-amber-400" 
                                  : "hover:bg-amber-50 text-amber-600"
                              )}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline text-xs">Retry</span>
                            </button>
                          )}

                          {/* Execution History */}
                          <button
                            title="View authoritative execution runs"
                            onClick={() => handleOpenHistory(job)}
                            className={cn(
                              "p-1.5 rounded-lg text-xs font-medium transition-colors",
                              isDark 
                                ? "hover:bg-neutral-700/60 text-neutral-300" 
                                : "hover:bg-gray-100 text-gray-700"
                            )}
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Toggle Enabled / Disabled */}
                          <button
                            title={job.enabled ? "Disable this job" : "Enable this job"}
                            onClick={() => handleToggleState(job)}
                            disabled={isJobToggling}
                            className={cn(
                              "p-1.5 rounded-lg text-xs font-medium transition-colors",
                              job.enabled ? "text-emerald-400 hover:bg-emerald-500/10" : "text-neutral-500 hover:bg-neutral-500/10"
                            )}
                          >
                            <Power className={cn("w-4 h-4", isJobToggling && "animate-pulse")} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </M3Card>

      {/* Confirmation Dialog for Run / Retry */}
      <M3Dialog
        isOpen={confirmModal.isOpen}
        onClose={() => {
          if (!confirmModal.isLoading) {
            setConfirmModal({ isOpen: false, job: null, mode: 'RUN', isLoading: false });
          }
        }}
        title={confirmModal.mode === 'RUN' ? `Run '${confirmModal.job?.jobName}' Now?` : `Retry '${confirmModal.job?.jobName}'?`}
        subtitle="Authoritative server-side execution"
        icon={confirmModal.mode === 'RUN' ? Play : RotateCcw}
        iconTone={confirmModal.mode === 'RUN' ? 'primary' : 'amber'}
        actions={
          <div className="flex items-center gap-2 justify-end w-full">
            <M3Button
              variant="text"
              onClick={() => setConfirmModal({ isOpen: false, job: null, mode: 'RUN', isLoading: false })}
              disabled={confirmModal.isLoading}
            >
              Cancel
            </M3Button>
            <M3Button
              variant="filled"
              onClick={handleExecuteConfirmed}
              disabled={confirmModal.isLoading}
              className="flex items-center gap-2"
            >
              {confirmModal.isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmModal.mode === 'RUN' ? 'Execute Live Job' : 'Retry Now'}</span>
            </M3Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm text-neutral-300">
          <p>
            You are initiating immediate execution for <strong className="text-white">{confirmModal.job?.jobName}</strong> on the SmartLedger backend server.
          </p>
          <div className={cn(
            "p-3 rounded-lg border text-xs space-y-1.5",
            isDark ? "bg-[#171819] border-[#2d2f31]" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex justify-between">
              <span className="text-neutral-400">Scheduled Frequency:</span>
              <span className="font-semibold text-white">{confirmModal.job?.scheduleHuman}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Trigger Type:</span>
              <span className="font-semibold text-sky-400">MANUAL_ADMIN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Safety Guard:</span>
              <span className="text-emerald-400 font-medium">Safe • Server locks enabled</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            This action is recorded in the security audit logs and will not interrupt regular 24/7 background cron triggers.
          </p>
        </div>
      </M3Dialog>

      {/* Execution History Dialog / Drawer */}
      <M3Dialog
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
        title={historyModal.job ? `${historyModal.job.jobName} — Execution History` : 'Execution History'}
        subtitle="Authoritative server-side run logs and verification records"
        icon={History}
        maxWidth="2xl"
        actions={
          <M3Button
            variant="tonal"
            onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
          >
            Close
          </M3Button>
        }
      >
        <div className="space-y-4 py-2">
          {historyModal.isLoading ? (
            <div className="py-12 text-center text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
              <span>Fetching authoritative job runs from server...</span>
            </div>
          ) : historyModal.runs.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <History className="w-8 h-8 opacity-40 mx-auto mb-2" />
              <p className="font-medium text-sm">No execution history recorded for this job yet.</p>
              <p className="text-xs mt-1">Run the job manually or await next cron schedule trigger.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Runs List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Recorded Executions ({historyModal.runs.length})
                </span>
                {historyModal.runs.map(run => {
                  const isSelected = historyModal.selectedRun?.runId === run.runId;
                  return (
                    <button
                      key={run.runId}
                      onClick={() => setHistoryModal(prev => ({ ...prev, selectedRun: run }))}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between",
                        isSelected 
                          ? (isDark ? "bg-[#282a2d] border-sky-400" : "bg-sky-50 border-sky-400")
                          : (isDark ? "bg-[#1e1f20] border-[#3c4043]/50 hover:border-neutral-500" : "bg-gray-50 border-gray-200 hover:border-gray-300")
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            run.status === 'SUCCESS' ? "bg-emerald-400" : "bg-rose-400"
                          )} />
                          <span className="font-semibold text-xs text-white">
                            {formatExactDateTime(run.startedAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2">
                          <span className="uppercase font-mono text-[10px] px-1 rounded bg-neutral-800">
                            {run.triggerType}
                          </span>
                          <span>•</span>
                          <span>{(run.durationMs / 1000).toFixed(2)}s</span>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        isSelected ? "text-sky-400 translate-x-0.5" : "text-neutral-500"
                      )} />
                    </button>
                  );
                })}
              </div>

              {/* Selected Run Details Inspector */}
              <div className="p-4 rounded-xl border bg-[#171819] border-[#2d2f31] flex flex-col justify-between max-h-96 overflow-y-auto">
                {historyModal.selectedRun ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#2d2f31]">
                      <span className="font-bold text-white text-sm">Run Inspector</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-semibold border",
                        historyModal.selectedRun.status === 'SUCCESS'
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      )}>
                        {historyModal.selectedRun.status}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Run ID</span>
                        <span className="font-mono text-white select-all break-all">{historyModal.selectedRun.runId}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Trigger Source</span>
                        <span className="font-semibold text-sky-400">{historyModal.selectedRun.triggerType}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Initiator</span>
                        <span className="text-white">{historyModal.selectedRun.executedBy || 'SYSTEM_SCHEDULER'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Started At</span>
                          <span className="text-white">{formatExactDateTime(historyModal.selectedRun.startedAt)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[10px]">Duration</span>
                          <span className="font-mono text-white">{(historyModal.selectedRun.durationMs / 1000).toFixed(3)}s</span>
                        </div>
                      </div>
                    </div>

                    {/* Output details / Verification notes */}
                    {historyModal.selectedRun.details && (
                      <div className="pt-2 border-t border-[#2d2f31]">
                        <span className="text-neutral-400 block text-[10px] mb-1">Execution Metrics & Diagnostics</span>
                        <pre className="p-2.5 rounded bg-black/50 text-[11px] font-mono text-neutral-300 overflow-x-auto border border-neutral-800">
                          {JSON.stringify(historyModal.selectedRun.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {historyModal.selectedRun.errorSummary && (
                      <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                        <strong className="block font-semibold">Error Summary:</strong>
                        <span>{historyModal.selectedRun.errorSummary}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-neutral-500 text-xs">
                    Select a run from the list to view its execution audit details.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </M3Dialog>
    </div>
  );
}
