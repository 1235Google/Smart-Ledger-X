import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Power,
  Trash2,
  Edit2,
  Copy,
  Settings2,
  X,
  Plus,
  Ban,
  Activity,
  Download,
  AlertCircle
} from 'lucide-react';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3TextField } from '../../components/admin/material3/M3TextField';
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
  toggleJobState,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  cancelRunningJob,
  fetchSchedulerSettings,
  saveSchedulerSettings
} from '../../lib/scheduledJobsService';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { CronExpressionParser } from 'cron-parser';

// Helper for relative time countdown or delay formatting
function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return 'Invalid date';

    if (diffMs < 0) {
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
    return dateString || '';
  }
}

export default function AdminScheduledJobs() {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';
  const { showSuccess, showError, showInfo } = useToast();

  // Primary state
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [summary, setSummary] = useState<ScheduledJobsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & query parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'RUNNING' | 'DELAYED' | 'FAILED' | 'DISABLED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Selected Job for Profile Drawer
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<ScheduledJobRun[]>([]);
  const [isDrawerHistoryLoading, setIsDrawerHistoryLoading] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsData, setSettingsData] = useState({
    timezone: 'Asia/Kolkata',
    maxConcurrentJobs: 5,
    maxRetries: 3,
    retryDelay: 60,
    jobTimeout: 300,
    logRetentionDays: 30,
    autoCleanup: true,
    notificationsEnabled: true
  });
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  // Create & Edit modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobModalMode, setJobModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [jobFormData, setJobModalData] = useState({
    jobId: '',
    jobName: '',
    description: '',
    category: 'Maintenance',
    scheduleCron: '0 0 * * *',
    scheduleHuman: 'Every day at 12:00 AM',
    estimatedDurationMs: 3000,
    timeout: 300,
    safeToRetry: true,
    safeToRunManually: true,
    iconType: 'broom' as ScheduledJob['iconType']
  });
  const [isJobSaving, setIsJobSaving] = useState(false);
  const [jobSaveError, setJobSaveError] = useState('');

  // Real-time Cron Validation state
  const [cronError, setCronError] = useState('');

  // Validate Cron expression in real-time
  const handleCronChange = (val: string) => {
    setJobModalData(prev => ({ ...prev, scheduleCron: val }));
    if (!val.trim()) {
      setCronError('Run Schedule (Cron) is required.');
      return;
    }
    try {
      CronExpressionParser.parse(val);
      setCronError('');
    } catch (err: any) {
      setCronError(err.message || 'Invalid cron expression pattern.');
    }
  };

  // Preset schedules list
  const PRESETS = [
    { label: 'Every 5 min', cron: '*/5 * * * *', human: 'Every 5 minutes' },
    { label: 'Every 15 min', cron: '*/15 * * * *', human: 'Every 15 minutes' },
    { label: 'Hourly', cron: '0 * * * *', human: 'Every hour' },
    { label: 'Daily at midnight', cron: '0 0 * * *', human: 'Every day at 12:00 AM' },
    { label: 'Weekly', cron: '0 0 * * 0', human: 'Every Sunday at 12:00 AM' }
  ];

  const handleSelectPreset = (presetLabel: string) => {
    const selected = PRESETS.find(p => p.label === presetLabel);
    if (selected) {
      setJobModalData(prev => ({
        ...prev,
        scheduleCron: selected.cron,
        scheduleHuman: selected.human
      }));
      setCronError('');
    }
  };

  // Auto-generate Job ID on Job Name Blur if empty or still custom default
  const handleJobNameBlur = () => {
    if (jobModalMode === 'CREATE' && (!jobFormData.jobId || jobFormData.jobId.startsWith('custom_'))) {
      const sanitizedName = jobFormData.jobName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (sanitizedName) {
        setJobModalData(prev => ({
          ...prev,
          jobId: `${sanitizedName}_${Date.now()}`
        }));
      }
    }
  };

  // Real-time Timeout vs Expected Run Time validation warning
  const timeoutWarning = useMemo(() => {
    const runTimeSec = jobFormData.estimatedDurationMs / 1000;
    if (jobFormData.timeout <= runTimeSec) {
      return `Warning: Max Time Before Timeout (${jobFormData.timeout}s) should be greater than Expected Run Time (${runTimeSec}s).`;
    }
    return '';
  }, [jobFormData.timeout, jobFormData.estimatedDurationMs]);

  // Action loaders per job row
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  // Refresh interval setup
  const loadJobsData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const data = await fetchScheduledJobs();
      setJobs(data.jobs);
      setSummary(data.summary);
      
      // Update selected drawer target if currently open
      if (selectedJob) {
        const fresh = data.jobs.find(j => j.jobId === selectedJob.jobId);
        if (fresh) setSelectedJob(fresh);
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setErrorMsg(err.message || 'Failed to sync with job scheduling backend.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    loadJobsData();
    const timer = setInterval(() => loadJobsData(false), 12000);
    return () => clearInterval(timer);
  }, [loadJobsData]);

  // Load selected drawer history
  const loadSelectedJobHistory = useCallback(async (jobId: string) => {
    setIsDrawerHistoryLoading(true);
    try {
      const runs = await fetchJobHistory(jobId, 40);
      setDrawerHistory(runs);
    } catch (err) {
      console.error('Failed to load history for job:', jobId);
    } finally {
      setIsDrawerHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJob) {
      loadSelectedJobHistory(selectedJob.jobId);
    } else {
      setDrawerHistory([]);
    }
  }, [selectedJob, loadSelectedJobHistory]);

  // Fetch Scheduler Settings
  const handleOpenSettings = async () => {
    setShowSettingsModal(true);
    try {
      const res = await fetchSchedulerSettings();
      if (res.success && res.settings) {
        setSettingsData(res.settings);
      }
    } catch (e: any) {
      showError('Load Failed', 'Could not load scheduler configuration.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingsSaving(true);
    try {
      await saveSchedulerSettings(settingsData);
      showSuccess('Settings Applied', 'Scheduler parameters immediately synchronized.');
      setShowSettingsModal(false);
      await loadJobsData(false);
    } catch (err: any) {
      showError('Save Failed', err.message || 'Error occurred while saving settings.');
    } finally {
      setIsSettingsSaving(false);
    }
  };

  // Run Job Immediately
  const handleRunNow = async (job: ScheduledJob) => {
    setRunningJobId(job.jobId);
    try {
      const result = await runJobNow(job.jobId);
      if (result.success) {
        showSuccess('Job Started', `'${job.jobName}' initiated successfully. Status: ${result.run.status}.`);
        await loadJobsData(false);
        if (selectedJob?.jobId === job.jobId) {
          loadSelectedJobHistory(job.jobId);
        }
      }
    } catch (err: any) {
      showError('Trigger Failed', err.message || 'Execution request failed.');
    } finally {
      setRunningJobId(null);
    }
  };

  // Toggle Job State (Pause / Resume)
  const handleToggleState = async (job: ScheduledJob) => {
    setTogglingJobId(job.jobId);
    const nextState = !job.enabled;
    try {
      await toggleJobState(job.jobId, nextState);
      showSuccess('Status Changed', `'${job.jobName}' schedule ${nextState ? 'resumed' : 'paused'} successfully.`);
      await loadJobsData(false);
    } catch (err: any) {
      showError('Failed Toggle', err.message || 'Operation failed.');
    } finally {
      setTogglingJobId(null);
    }
  };

  // Cancel Running Job Thread
  const handleCancelRunning = async (job: ScheduledJob) => {
    if (!window.confirm(`Are you sure you want to terminate the executing background thread for '${job.jobName}'?`)) return;
    setIsJobSaving(true);
    try {
      const res = await cancelRunningJob(job.jobId);
      if (res.success) {
        showSuccess('Execution Terminated', `Active worker thread cancelled successfully.`);
        await loadJobsData(false);
        if (selectedJob?.jobId === job.jobId) {
          loadSelectedJobHistory(job.jobId);
        }
      }
    } catch (err: any) {
      showError('Cancellation Failed', err.message || 'Termination signal failed to deliver.');
    } finally {
      setIsJobSaving(false);
    }
  };

  // Retry Failed Job
  const handleRetryJob = async (job: ScheduledJob) => {
    setRunningJobId(job.jobId);
    try {
      const res = await retryJobNow(job.jobId);
      if (res.success) {
        showSuccess('Retry Success', `'${job.jobName}' completed retry attempt: ${res.run.status}`);
        await loadJobsData(false);
        if (selectedJob?.jobId === job.jobId) {
          loadSelectedJobHistory(job.jobId);
        }
      }
    } catch (err: any) {
      showError('Retry Failed', err.message || 'Failed to retry job execution.');
    } finally {
      setRunningJobId(null);
    }
  };

  // Create or Update Job Submit
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobSaveError('');

    // Require Job Description Summary
    if (!jobFormData.description || !jobFormData.description.trim()) {
      setJobSaveError('What does this job do? (Job Description Summary) is a required field.');
      return;
    }

    // Require valid cron expression
    if (cronError) {
      setJobSaveError('Please resolve the invalid Cron Expression error first.');
      return;
    }

    setIsJobSaving(true);

    try {
      // Auto-generate Job ID if empty
      let finalJobId = jobFormData.jobId.trim();
      if (!finalJobId) {
        const sanitizedName = jobFormData.jobName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        finalJobId = sanitizedName ? `${sanitizedName}_${Date.now()}` : `custom_${Date.now()}`;
      }

      const payload = {
        ...jobFormData,
        jobId: finalJobId
      };

      if (jobModalMode === 'CREATE') {
        await createScheduledJob(payload);
        showSuccess('Job Created', `Background worker '${jobFormData.jobName}' registered successfully.`);
      } else {
        await updateScheduledJob(jobFormData.jobId, payload);
        showSuccess('Job Configured', `Parameters updated successfully for '${jobFormData.jobName}'.`);
      }
      setShowJobModal(false);
      await loadJobsData(false);
    } catch (err: any) {
      setJobSaveError(err.message || 'Database validation error.');
    } finally {
      setIsJobSaving(false);
    }
  };

  // Duplicate Job Config
  const handleDuplicateJob = async (job: ScheduledJob) => {
    const copyId = `${job.jobId}_copy_${Math.floor(Math.random() * 1000)}`;
    const copyData = {
      jobId: copyId,
      jobName: `${job.jobName} (Copy)`,
      description: job.description,
      category: jobs.find(j => j.jobId === job.jobId)?.scheduleCron ? 'Custom' : 'Custom',
      scheduleCron: job.scheduleCron,
      scheduleHuman: `Copy of ${job.scheduleHuman}`,
      estimatedDurationMs: job.estimatedDurationMs,
      timeout: 300,
      safeToRetry: job.safeToRetry,
      safeToRunManually: job.safeToRunManually,
      iconType: job.iconType
    };

    try {
      await createScheduledJob(copyData);
      showSuccess('Job Duplicated', `'${job.jobName}' configuration cloned successfully.`);
      await loadJobsData(false);
    } catch (err: any) {
      showError('Clone Failed', 'Could not duplicate target job.');
    }
  };

  // Delete Job Config
  const handleDeleteJob = async (job: ScheduledJob) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete background operation '${job.jobName}'? This clears scheduler references and config.`)) return;
    try {
      await deleteScheduledJob(job.jobId);
      showSuccess('Job Purged', `Successfully deleted background scheduled task.`);
      setSelectedJob(null);
      await loadJobsData(false);
    } catch (err: any) {
      showError('Delete Failed', 'Failed to delete target job config.');
    }
  };

  const handleOpenEdit = (job: ScheduledJob) => {
    setJobModalMode('EDIT');
    setJobModalData({
      jobId: job.jobId,
      jobName: job.jobName,
      description: job.description,
      category: 'Maintenance',
      scheduleCron: job.scheduleCron,
      scheduleHuman: job.scheduleHuman,
      estimatedDurationMs: job.estimatedDurationMs,
      timeout: 300,
      safeToRetry: job.safeToRetry,
      safeToRunManually: job.safeToRunManually,
      iconType: job.iconType
    });
    setJobSaveError('');
    setCronError('');
    setShowJobModal(true);
  };

  const handleOpenCreate = () => {
    setJobModalMode('CREATE');
    setJobModalData({
      jobId: `custom_${Date.now()}`,
      jobName: '',
      description: '',
      category: 'Custom',
      scheduleCron: '*/15 * * * *',
      scheduleHuman: 'Every 15 minutes',
      estimatedDurationMs: 3000,
      timeout: 300,
      safeToRetry: true,
      safeToRunManually: true,
      iconType: 'broom'
    });
    setJobSaveError('');
    setCronError('');
    setShowJobModal(true);
  };

  // Export logs helper
  const handleExportRuns = (jobId: string, jobName: string) => {
    if (drawerHistory.length === 0) {
      showInfo('No Logs', 'No active execution records registered to compile.');
      return;
    }

    const reportHeaders = ['Execution ID', 'Run ID', 'Job ID', 'Job Name', 'Started At', 'Completed At', 'Status', 'Duration (ms)', 'Trigger Type', 'Executed By', 'Error Details'];
    const reportRows = drawerHistory.map(r => [
      r.executionId,
      r.runId,
      r.jobId,
      r.jobName,
      r.startedAt,
      r.completedAt || '',
      r.status,
      r.durationMs,
      r.triggerType,
      r.executedBy || 'SYSTEM',
      r.errorSummary || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [reportHeaders.join(','), ...reportRows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${jobId}_execution_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Export Succeeded', 'Operational CSV logs generated successfully.');
  };

  // Category and Search Filtering log
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Search Query Box
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (job.jobName || '').toLowerCase();
        const desc = (job.description || '').toLowerCase();
        const jId = (job.jobId || '').toLowerCase();
        
        if (!name.includes(q) && !desc.includes(q) && !jId.includes(q)) return false;
      }

      // 2. Status Select Filter
      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;

      // 3. Category Filter
      if (categoryFilter !== 'ALL') {
        const detailsCategory = job.scheduleHuman; // fallback category mappings if undefined
        if (categoryFilter === 'Reporting' && !job.jobName.includes('Report')) return false;
        if (categoryFilter === 'Backup' && !job.jobName.includes('Backup')) return false;
        if (categoryFilter === 'Security' && !job.jobName.includes('Security') && !job.jobName.includes('Purge')) return false;
      }

      return true;
    });
  }, [jobs, searchQuery, statusFilter, categoryFilter]);

  // Drawer History filtering based on Search Query
  const filteredDrawerHistory = useMemo(() => {
    if (!logSearchQuery.trim()) return drawerHistory;
    const q = logSearchQuery.toLowerCase().trim();
    return drawerHistory.filter(run => {
      const eId = (run.executionId || '').toLowerCase();
      const trigger = (run.triggerType || '').toLowerCase();
      const status = (run.status || '').toLowerCase();
      const error = (run.errorSummary || '').toLowerCase();
      return eId.includes(q) || trigger.includes(q) || status.includes(q) || error.includes(q);
    });
  }, [drawerHistory, logSearchQuery]);

  const getJobIcon = (iconType: ScheduledJob['iconType']) => {
    switch (iconType) {
      case 'backup': return Cloud;
      case 'bell': return Bell;
      case 'calculator': return Calculator;
      case 'camera': return Camera;
      case 'broom': return Sparkles;
      case 'shield': return ShieldCheck;
      case 'report': return FileText;
      default: return Cpu;
    }
  };

  const getStatusBadge = (status: ScheduledJobStatus) => {
    switch (status) {
      case 'HEALTHY':
        return {
          label: 'Healthy',
          icon: CheckCircle2,
          containerClass: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotClass: 'bg-emerald-400'
        };
      case 'RUNNING':
        return {
          label: 'Running...',
          icon: RefreshCw,
          containerClass: isDark ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200',
          dotClass: 'bg-sky-400 animate-spin'
        };
      case 'DELAYED':
        return {
          label: 'Delayed',
          icon: Clock,
          containerClass: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
          dotClass: 'bg-amber-400'
        };
      case 'FAILED':
        return {
          label: 'Failed',
          icon: XCircle,
          containerClass: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200',
          dotClass: 'bg-rose-500'
        };
      default:
        return {
          label: 'Paused',
          icon: MinusCircle,
          containerClass: isDark ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-50 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-500'
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 relative animate-fade-in">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Enterprise Scheduled Jobs Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure dynamic, Firestore-backed automatic schedules, audit logs, and operational tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <M3Button
            variant="tonal"
            icon={Settings2}
            onClick={handleOpenSettings}
          >
            Scheduler Config
          </M3Button>
          <M3Button
            variant="filled"
            icon={Plus}
            onClick={handleOpenCreate}
          >
            Create Custom Job
          </M3Button>
        </div>
      </div>

      {/* Telemetry Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 leading-none">Total Jobs</p>
          <p className="text-xl font-mono font-extrabold text-white">{summary?.totalJobs || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-sky-500/20 backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-1 leading-none">Active Workers</p>
          <p className="text-xl font-mono font-extrabold text-sky-400 animate-pulse">{summary?.runningCount || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-emerald-500/20 backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 leading-none">Healthy Threads</p>
          <p className="text-xl font-mono font-extrabold text-emerald-400">{summary?.healthyCount || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 leading-none">Paused</p>
          <p className="text-xl font-mono font-extrabold text-slate-300">{summary?.disabledCount || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-rose-500/20 backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 leading-none">Overdue Tasks</p>
          <p className="text-xl font-mono font-extrabold text-rose-400">{summary?.delayedCount || 0}</p>
        </div>
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-rose-500/20 backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 leading-none">Failures Today</p>
          <p className="text-xl font-mono font-extrabold text-rose-500">{summary?.failedCount || 0}</p>
        </div>
      </div>

      {/* Advanced Search & Filtering Box */}
      <M3Card variant="elevated" padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Job Name, ID, category..."
              className="w-full text-xs bg-slate-900 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 shrink-0">Status:</span>
            {(['ALL', 'HEALTHY', 'RUNNING', 'DELAYED', 'FAILED', 'DISABLED'] as const).map((s) => (
              <M3Chip
                key={s}
                selected={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={s === 'ALL' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/[0.05] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Task Group/Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Backup">Backups & Recovery</option>
              <option value="Reporting">Analytics & Reports</option>
              <option value="Security">Database & Session Security</option>
              <option value="Maintenance">Maintenance Cleanups</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium ml-auto">
            <Server size={12} />
            <span>Active Scheduler Timezone: <strong className="text-slate-300 font-mono font-bold">{settingsData.timezone}</strong></span>
          </div>
        </div>
      </M3Card>

      {/* Main Jobs Table Container */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500 text-xs flex items-center justify-center gap-2">
          <Activity className="animate-spin text-indigo-400" size={16} />
          <span>Synchronizing with Firestore background schedules...</span>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="overflow-x-auto rounded-3xl border border-white/[0.06] bg-slate-950">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Scheduled Job Name</th>
                <th className="py-4 px-4">Cron Expression</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Last Attempt Run</th>
                <th className="py-4 px-4">Next Expected Trigger</th>
                <th className="py-4 px-4 text-right">Avg Duration</th>
                <th className="py-4 px-6 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredJobs.map((job) => {
                const Icon = getJobIcon(job.iconType);
                const badge = getStatusBadge(job.status);
                const isJobRunning = job.status === 'RUNNING';
                return (
                  <tr
                    key={job.jobId}
                    onClick={() => setSelectedJob(job)}
                    className="text-xs hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {/* Job metadata details */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-white tracking-tight leading-none">{job.jobName}</p>
                          <p className="text-[11px] text-slate-500 mt-1.5 font-normal truncate max-w-sm">{job.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-slate-400">
                      {job.scheduleCron}
                    </td>

                    {/* Computed status */}
                    <td className="py-4 px-4">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1.5', badge.containerClass)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', badge.dotClass)} />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* Timestamps */}
                    <td className="py-4 px-4 font-mono text-[11px] text-slate-400">
                      {job.lastRun ? formatRelativeTime(job.lastRun.startedAt) : 'Never Run'}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-[#a8c7fa] font-bold">
                      {job.enabled ? formatRelativeTime(job.nextExpectedRun) : 'Paused'}
                    </td>

                    <td className="py-4 px-4 text-right font-mono text-slate-400">
                      {job.lastRun ? `${(job.lastRun.durationMs / 1000).toFixed(1)}s` : `${(job.estimatedDurationMs / 1000).toFixed(1)}s`}
                    </td>

                    {/* Operational Action triggers */}
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 ml-auto">
                        {isJobRunning ? (
                          <button
                            onClick={() => handleCancelRunning(job)}
                            title="Abort manual thread"
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Ban size={15} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRunNow(job)}
                              disabled={runningJobId === job.jobId}
                              title="Force immediately execution"
                              className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                            >
                              <Play size={15} className={cn(runningJobId === job.jobId && 'animate-spin')} />
                            </button>
                            {job.status === 'FAILED' && (
                              <button
                                onClick={() => handleRetryJob(job)}
                                title="Retry failure"
                                className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-colors"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleToggleState(job)}
                          disabled={togglingJobId === job.jobId}
                          title={job.enabled ? 'Pause schedule' : 'Resume schedule'}
                          className={cn(
                            'p-2 rounded-xl transition-colors',
                            job.enabled ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-400 hover:bg-slate-400/10'
                          )}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(job)}
                          title="Configure Parameters"
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDuplicateJob(job)}
                          title="Clone Job configuration"
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job)}
                          title="Delete scheduled job"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-3xl border border-white/[0.05] bg-white/[0.01]">
          <p className="text-slate-400 font-bold text-sm">No scheduled jobs registered</p>
          <p className="text-slate-500 text-xs mt-1">Configure parameters or click "Create Custom Job" above to whitelist execution.</p>
        </div>
      )}

      {/* JOB PROFILE SIDE DRAWER (Deep audit trails logs) */}
      <AnimatePresence>
        {selectedJob && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slide Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className={cn(
                'fixed top-0 right-0 bottom-0 w-full sm:max-w-2xl z-50 overflow-y-auto flex flex-col border-l shadow-[0_0_40px_rgba(0,0,0,0.5)]',
                isDark ? 'bg-[#181824] border-white/[0.08]' : 'bg-white border-[#e1e3e1]'
              )}
            >
              {/* Drawer Title Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#181824]/95 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    {React.createElement(getJobIcon(selectedJob.iconType), { size: 20 })}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white tracking-tight leading-none">{selectedJob.jobName}</h2>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-mono">{selectedJob.jobId}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer content */}
              <div className="p-6 space-y-6 flex-1">
                {/* Info Card */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Info size={13} className="text-blue-400" /> Operational Information
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{selectedJob.description}</p>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Cron Schedule Expression</p>
                      <p className="text-white font-mono">{selectedJob.scheduleCron}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Human Schedule</p>
                      <p className="text-white font-medium">{selectedJob.scheduleHuman}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Last Completion Run</p>
                      <p className="text-slate-300 font-mono">{selectedJob.lastRun ? formatExactDateTime(selectedJob.lastRun.startedAt) : 'Never Run'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Next Execution Countdown</p>
                      <p className="text-[#a8c7fa] font-bold font-mono">{selectedJob.enabled ? formatRelativeTime(selectedJob.nextExpectedRun) : 'Schedule Paused'}</p>
                    </div>
                  </div>
                </M3Card>

                {/* Statistics panel */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <History size={13} className="text-indigo-400" /> Execution Statistics
                  </h3>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Total Runs</p>
                      <p className="text-lg font-mono font-extrabold text-white mt-1">
                        {drawerHistory.length}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase">Success</p>
                      <p className="text-lg font-mono font-extrabold text-emerald-400 mt-1">
                        {drawerHistory.filter(r => r.status === 'SUCCESS').length}
                      </p>
                    </div>
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                      <p className="text-[10px] text-rose-400 font-bold uppercase">Failures</p>
                      <p className="text-lg font-mono font-extrabold text-rose-400 mt-1">
                        {drawerHistory.filter(r => r.status === 'FAILED').length}
                      </p>
                    </div>
                  </div>
                </M3Card>

                {/* Active control center triggers */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Activity size={13} className="text-amber-400" /> Administrator Controls
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {selectedJob.status === 'RUNNING' ? (
                      <M3Button
                        variant="filled"
                        size="sm"
                        icon={Ban}
                        onClick={() => handleCancelRunning(selectedJob)}
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        Cancel Running Job
                      </M3Button>
                    ) : (
                      <M3Button
                        variant="tonal"
                        size="sm"
                        icon={Play}
                        onClick={() => handleRunNow(selectedJob)}
                      >
                        Run Immediately
                      </M3Button>
                    )}

                    <M3Button
                      variant={selectedJob.enabled ? 'outlined' : 'filled'}
                      size="sm"
                      icon={Power}
                      onClick={() => handleToggleState(selectedJob)}
                    >
                      {selectedJob.enabled ? 'Pause Scheduler' : 'Resume Scheduler'}
                    </M3Button>

                    <M3Button
                      variant="outlined"
                      size="sm"
                      icon={Download}
                      onClick={() => handleExportRuns(selectedJob.jobId, selectedJob.jobName)}
                    >
                      Export Logs (.csv)
                    </M3Button>
                  </div>
                </M3Card>

                {/* Audit execution log history */}
                <M3Card variant="outlined" padding="lg" className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText size={13} className="text-cyan-400" /> Complete Execution History & Logs
                    </h3>
                    
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Search logs by Execution ID or Trigger..."
                        className="w-full text-[10px] bg-slate-900 border border-white/10 rounded-full pl-8 pr-4 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  {isDrawerHistoryLoading ? (
                    <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Activity size={13} className="animate-spin text-indigo-400" />
                      <span>Reading log entries...</span>
                    </div>
                  ) : filteredDrawerHistory.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {filteredDrawerHistory.map((run) => (
                        <div key={run.runId} className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-2xl text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-slate-400 truncate max-w-[200px]" title={run.executionId}>{run.executionId}</span>
                            <span className={cn('px-2 py-0.2 rounded font-bold uppercase', run.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-400/5' : 'text-rose-400 bg-rose-400/5')}>
                              {run.status}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-slate-300">
                            Triggered by: <span className="text-indigo-300 font-semibold">{run.triggerType} ({run.executedBy || 'SYSTEM'})</span>
                          </div>

                          {run.errorSummary && (
                            <p className="text-[10px] text-rose-400 leading-normal p-2 rounded bg-rose-500/5 border border-rose-500/10 font-mono">
                              Error: {run.errorSummary}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span>Duration: {(run.durationMs / 1000).toFixed(1)}s</span>
                            <span>{new Date(run.startedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center">No logs matching search query filters.</p>
                  )}
                </M3Card>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DIALOG 1: Scheduler settings manager */}
      <M3Dialog
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Scheduler settings"
        subtitle="Configure global execution and telemetry rules"
        icon={Settings2}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isSettingsSaving} onClick={handleSaveSettings}>
              Apply Settings
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSaveSettings} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">System Timezone</label>
              <select
                value={settingsData.timezone}
                onChange={(e) => setSettingsData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full h-12 px-3 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white focus:border-[#a8c7fa] outline-none"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC (Universal)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Max Concurrent Threads</label>
              <input
                type="number"
                value={settingsData.maxConcurrentJobs}
                onChange={(e) => setSettingsData(prev => ({ ...prev, maxConcurrentJobs: parseInt(e.target.value, 10) }))}
                className="w-full h-12 px-3 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Maximum Retries on Failure</label>
              <input
                type="number"
                value={settingsData.maxRetries}
                onChange={(e) => setSettingsData(prev => ({ ...prev, maxRetries: parseInt(e.target.value, 10) }))}
                className="w-full h-12 px-3 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Retry Delay (seconds)</label>
              <input
                type="number"
                value={settingsData.retryDelay}
                onChange={(e) => setSettingsData(prev => ({ ...prev, retryDelay: parseInt(e.target.value, 10) }))}
                className="w-full h-12 px-3 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Job Timeout Threshold (sec)</label>
              <input
                type="number"
                value={settingsData.jobTimeout}
                onChange={(e) => setSettingsData(prev => ({ ...prev, jobTimeout: parseInt(e.target.value, 10) }))}
                className="w-full h-12 px-3 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Log Retention (days)</label>
              <input
                type="number"
                value={settingsData.logRetentionDays}
                onChange={(e) => setSettingsData(prev => ({ ...prev, logRetentionDays: parseInt(e.target.value, 10) }))}
                className="w-full h-12 px-3 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white outline-none"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={settingsData.autoCleanup}
                onChange={(e) => setSettingsData(prev => ({ ...prev, autoCleanup: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900"
              />
              <span>Enable Automatic Logs Purge after retention period</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={settingsData.notificationsEnabled}
                onChange={(e) => setSettingsData(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900"
              />
              <span>Dispatch real-time alerts to Administrative Alert Center</span>
            </label>
          </div>
        </form>
      </M3Dialog>

      {/* DIALOG 2: Create / Edit Custom job config */}
      <M3Dialog
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        title={jobModalMode === 'CREATE' ? 'Create Scheduled Job' : 'Edit Job configuration'}
        subtitle={jobModalMode === 'CREATE' ? 'Register a custom background worker in node-cron' : `Configure parameters for job ${jobFormData.jobId}`}
        icon={Clock}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowJobModal(false)} disabled={isJobSaving}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isJobSaving} disabled={isJobSaving || Boolean(cronError)} onClick={handleJobSubmit}>
              {jobModalMode === 'CREATE' ? 'Create Job' : 'Save Parameters'}
            </M3Button>
          </>
        }
      >
        <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4 pt-2 text-xs">
          {/* Preset Dropdown Selection (Helpful helper) */}
          <div className="space-y-1 bg-[#1e1f20]/30 border border-white/5 p-3.5 rounded-2xl">
            <label className="text-[11px] font-bold text-indigo-400 block uppercase tracking-wider mb-1">Schedule Presets (Optional Autofill)</label>
            <select
              onChange={(e) => handleSelectPreset(e.target.value)}
              value=""
              className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-white/10 text-white outline-none cursor-pointer focus:border-indigo-500"
            >
              <option value="" disabled>Select a Preset Schedule...</option>
              {PRESETS.map((preset, idx) => (
                <option key={idx} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1 font-normal">Select a predefined schedule to automatically fill the cron and descriptive fields below.</p>
          </div>

          <form onSubmit={handleJobSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <M3TextField
                  label="Job ID"
                  value={jobFormData.jobId}
                  disabled={jobModalMode === 'EDIT'}
                  onChange={(e) => setJobModalData(prev => ({ ...prev, jobId: e.target.value }))}
                  placeholder="e.g. daily_snapshot_purge"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-help select-none pr-1 mt-[2px]" title="Unique alphanumeric identifier used internally by node-cron scheduler.">
                  ⓘ
                </span>
              </div>
              <M3TextField
                label="Job Name"
                value={jobFormData.jobName}
                onChange={(e) => setJobModalData(prev => ({ ...prev, jobName: e.target.value }))}
                onBlur={handleJobNameBlur}
                placeholder="e.g. Daily Snapshots Purge"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <M3TextField
                  label="Run Schedule (Cron)"
                  value={jobFormData.scheduleCron}
                  onChange={(e) => handleCronChange(e.target.value)}
                  placeholder="e.g. 0 1 * * *"
                  error={cronError}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-help select-none pr-1 mt-[2px]" title="5-field UNIX standard cron notation (minute hour day-of-month month day-of-week).">
                  ⓘ
                </span>
              </div>
              <M3TextField
                label="How Often"
                value={jobFormData.scheduleHuman}
                onChange={(e) => setJobModalData(prev => ({ ...prev, scheduleHuman: e.target.value }))}
                placeholder="e.g. Every 15 minutes"
                required
              />
            </div>

            <M3TextField
              label="What does this job do?"
              value={jobFormData.description}
              onChange={(e) => setJobModalData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what backend task this job executes automatically..."
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Expected Run Time (ms)</label>
                <input
                  type="number"
                  value={jobFormData.estimatedDurationMs}
                  onChange={(e) => setJobModalData(prev => ({ ...prev, estimatedDurationMs: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full h-12 px-3.5 rounded-2xl bg-[#1e1f20] border border-[#3c4043] text-white outline-none focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20 transition-all font-mono"
                  required
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <span>Max Time Before Timeout (sec)</span>
                  <span className="text-slate-500 hover:text-white cursor-help select-none" title="Hard limit threshold after which the active execution thread is automatically aborted.">
                    ⓘ
                  </span>
                </label>
                <input
                  type="number"
                  value={jobFormData.timeout}
                  onChange={(e) => setJobModalData(prev => ({ ...prev, timeout: parseInt(e.target.value, 10) || 0 }))}
                  className={cn(
                    "w-full h-12 px-3.5 rounded-2xl bg-[#1e1f20] border text-white outline-none focus:ring-2 transition-all font-mono",
                    timeoutWarning ? "border-amber-500 focus:border-amber-400 focus:ring-amber-500/20" : "border-[#3c4043] focus:border-[#a8c7fa] focus:ring-[#a8c7fa]/20"
                  )}
                  required
                />
              </div>
            </div>

            {/* Warning block for Job timeout threshold comparison */}
            {timeoutWarning && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span className="font-semibold leading-normal text-[11px]">{timeoutWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={jobFormData.safeToRetry}
                  onChange={(e) => setJobModalData(prev => ({ ...prev, safeToRetry: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 cursor-pointer"
                />
                <span className="font-semibold">Allow Retry on Failure</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={jobFormData.safeToRunManually}
                  onChange={(e) => setJobModalData(prev => ({ ...prev, safeToRunManually: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 cursor-pointer"
                />
                <span className="font-semibold">Allow Manual Immediate Run</span>
              </label>
            </div>

            {jobSaveError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-semibold leading-normal">{jobSaveError}</span>
              </div>
            )}
          </form>
        </div>
      </M3Dialog>
    </div>
  );
}
