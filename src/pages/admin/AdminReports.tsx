import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  HardDrive, 
  Database, 
  Clock, 
  Activity, 
  Users, 
  Search, 
  Layers, 
  ChevronDown, 
  Eye, 
  Send, 
  Sliders, 
  ExternalLink, 
  Copy, 
  Check, 
  CalendarClock, 
  Plus, 
  Trash2, 
  Mail, 
  Info,
  Server,
  Zap,
  Lock,
  PieChart
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { 
  AdminReportCategory, 
  AdminReportDatePreset, 
  HealthSeverity, 
  BackupMetadata, 
  AdminSecurityLog, 
  ScheduledJob, 
  ScheduledJobRun, 
  ScheduledJobsSummary, 
  ScheduledReportConfig 
} from '../../types';
import { 
  computeDateRange, 
  computeSystemHealthReport, 
  computeBackupReport, 
  computeSecurityReport, 
  computeDataIntegrityReport, 
  computeScheduledJobsReport, 
  computeAdminActivityReport, 
  formatByteSize, 
  DateRangeResult 
} from '../../lib/adminReportsEngine';
import { 
  exportAdminReportToPdf, 
  exportAdminReportToCsv, 
  generateReportFilename 
} from '../../lib/adminReportsExport';
import { BackupService } from '../../lib/backupService';
import { fetchScheduledJobs, fetchJobHistory } from '../../lib/scheduledJobsService';
import { calculateGullakBalance } from '../../lib/gullakAccounting';

export default function AdminReports() {
  const { 
    transactions, 
    customers, 
    gullakEntries, 
    currentBalance, 
    userProfile, 
    adminUser,
    securityLogs: storeSecurityLogs = [] 
  } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  // --- Active Tab & Date Range State ---
  const [activeTab, setActiveTab] = useState<AdminReportCategory>('system_health');
  const [datePreset, setDatePreset] = useState<AdminReportDatePreset>('last_30_days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);

  // --- Remote Server Data & Loading State ---
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [scheduledRuns, setScheduledRuns] = useState<ScheduledJobRun[]>([]);
  const [jobsSummary, setJobsSummary] = useState<ScheduledJobsSummary | undefined>(undefined);
  const [serverSecurityLogs, setServerSecurityLogs] = useState<AdminSecurityLog[]>([]);
  const [serverSafetyReport, setServerSafetyReport] = useState<any>(null);
  const [scheduledReportConfigs, setScheduledReportConfigs] = useState<ScheduledReportConfig[]>([]);
  const [dbLatencyMs, setDbLatencyMs] = useState<number>(42);
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  // --- Dialog & Drilldown State ---
  const [selectedDrilldown, setSelectedDrilldown] = useState<any | null>(null);
  const [drilldownTitle, setDrilldownTitle] = useState<string>('');
  const [showDrilldownModal, setShowDrilldownModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showScheduleConfigModal, setShowScheduleConfigModal] = useState<boolean>(false);
  const [newScheduleData, setNewScheduleData] = useState<Partial<ScheduledReportConfig>>({
    reportType: 'weekly_system',
    frequency: 'weekly',
    dayOfWeek: 1,
    time: '09:00',
    deliveryEmail: 'souvikbbsr811@gmail.com',
    format: 'pdf',
    enabled: true
  });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Current admin email
  const adminEmail = adminUser?.email || 'admin@smartledgerx.io';

  // Compute Active Date Range
  const dateRange: DateRangeResult = useMemo(() => {
    return computeDateRange(datePreset, customStart, customEnd);
  }, [datePreset, customStart, customEnd]);

  // Combined Security Logs (Server authoritative + Client Store)
  const allSecurityLogs: AdminSecurityLog[] = useMemo(() => {
    const mappedStoreLogs: AdminSecurityLog[] = (storeSecurityLogs || []).map((s: any) => ({
      id: s.id,
      timestamp: s.timestamp || new Date().toISOString(),
      action: s.eventType || 'SECURITY_EVENT',
      eventType: s.eventType,
      email: s.userEmail || adminEmail,
      uid: s.uid || 'admin',
      ip: s.ip || '127.0.0.1',
      device: s.deviceInfo || s.device || 'Desktop Browser',
      browser: s.browser || 'Web Browser',
      location: s.location || 'Local Origin',
      details: s.details || `Store security event: ${s.eventType}`
    }));

    const combined = [...serverSecurityLogs, ...mappedStoreLogs];
    const seen = new Set<string>();
    return combined.filter(item => {
      const id = item.id || `${item.timestamp}_${item.action}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [serverSecurityLogs, storeSecurityLogs, adminEmail]);

  // --- Data Fetching Engine ---
  const loadAllReportData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    const startTime = performance.now();

    try {
      // 1. Fetch Backups
      try {
        const bList = await BackupService.listBackups();
        setBackups(bList || []);
      } catch (err) {
        console.warn('Backup fetch fallback:', err);
      }

      // 2. Fetch Server Reports Data (authoritative logs, job runs, safety report)
      try {
        const res = await fetch('/api/admin/reports/server-data', {
          headers: {
            'x-admin-token': sessionStorage.getItem('adminToken') || ''
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setServerSecurityLogs(json.data.securityEvents || []);
            setScheduledRuns(json.data.jobRuns || []);
            setScheduledJobs(json.data.allJobs || []);
            setJobsSummary(json.data.jobsSummary);
            setServerSafetyReport(json.data.safetyCheck);
            setDbConnected(json.data.safetyCheck?.databaseConnected ?? true);
            setDbLatencyMs(Math.round(json.data.safetyCheck?.databaseLatencyMs || (performance.now() - startTime)));
          }
        } else {
          // Fallback to scheduled jobs service
          const jobsResult = await fetchScheduledJobs();
          const runsResult = await fetchJobHistory('all', 50);
          setScheduledJobs(jobsResult.jobs || []);
          setJobsSummary(jobsResult.summary);
          setScheduledRuns(runsResult || []);
          setDbLatencyMs(Math.round(performance.now() - startTime));
        }
      } catch (err) {
        // Local fallback
        const jobsResult = await fetchScheduledJobs();
        const runsResult = await fetchJobHistory('all', 50);
        setScheduledJobs(jobsResult.jobs || []);
        setJobsSummary(jobsResult.summary);
        setScheduledRuns(runsResult || []);
        setDbLatencyMs(Math.round(performance.now() - startTime));
      }

      // 3. Fetch Scheduled Report Subscriptions
      try {
        const schedRes = await fetch('/api/admin/reports/schedules', {
          headers: {
            'x-admin-token': sessionStorage.getItem('adminToken') || ''
          }
        });
        if (schedRes.ok) {
          const schedJson = await schedRes.json();
          if (schedJson.success && Array.isArray(schedJson.schedules)) {
            setScheduledReportConfigs(schedJson.schedules);
          }
        }
      } catch (err) {
        console.warn('Scheduled reports fetch error:', err);
      }
    } catch (err: any) {
      console.error('Error loading admin reports:', err);
      showError('Error Loading Reports', 'Could not refresh report data from server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadAllReportData();
  }, [loadAllReportData]);

  // --- Report Computation Engines (Memoized) ---

  const dataIntegrityReport = useMemo(() => {
    return computeDataIntegrityReport({
      transactions: transactions || [],
      customers: customers || [],
      gullakEntries: gullakEntries || [],
      storedCurrentBalance: currentBalance || 0,
      storedGullakBalance: calculateGullakBalance(gullakEntries || []),
      range: dateRange
    });
  }, [transactions, customers, gullakEntries, currentBalance, dateRange]);

  const systemHealthReport = useMemo(() => {
    return computeSystemHealthReport({
      dbConnected,
      dbLatencyMs,
      backups,
      jobs: scheduledJobs,
      jobsSummary,
      securityLogs: allSecurityLogs,
      integrityReport: dataIntegrityReport,
      activeAdminsCount: 1
    });
  }, [dbConnected, dbLatencyMs, backups, scheduledJobs, jobsSummary, allSecurityLogs, dataIntegrityReport]);

  const backupReport = useMemo(() => {
    return computeBackupReport(backups, dateRange);
  }, [backups, dateRange]);

  const securityReport = useMemo(() => {
    return computeSecurityReport(allSecurityLogs, dateRange);
  }, [allSecurityLogs, dateRange]);

  const scheduledJobsReport = useMemo(() => {
    return computeScheduledJobsReport(scheduledJobs, scheduledRuns, dateRange);
  }, [scheduledJobs, scheduledRuns, dateRange]);

  const adminActivityReport = useMemo(() => {
    return computeAdminActivityReport(allSecurityLogs, scheduledRuns, backups, dateRange);
  }, [allSecurityLogs, scheduledRuns, backups, dateRange]);

  // Helper for current active data
  const currentReportData = useMemo(() => {
    switch (activeTab) {
      case 'system_health': return systemHealthReport;
      case 'backup': return backupReport;
      case 'security': return securityReport;
      case 'data_integrity': return dataIntegrityReport;
      case 'scheduled_jobs': return scheduledJobsReport;
      case 'admin_activity': return adminActivityReport;
      default: return systemHealthReport;
    }
  }, [activeTab, systemHealthReport, backupReport, securityReport, dataIntegrityReport, scheduledJobsReport, adminActivityReport]);

  // --- Export Handlers ---
  const handleExportPdf = () => {
    try {
      exportAdminReportToPdf({
        category: activeTab,
        data: currentReportData,
        dateRange,
        adminEmail
      });
      showSuccess('PDF Exported', `Generated ${generateReportFilename(activeTab, 'pdf')}`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      showError('Export Failed', 'Could not generate PDF report. Please try again.');
    }
  };

  const handleExportCsv = () => {
    try {
      exportAdminReportToCsv({
        category: activeTab,
        data: currentReportData,
        dateRange,
        adminEmail
      });
      showSuccess('CSV Exported', `Generated ${generateReportFilename(activeTab, 'csv')}`);
    } catch (err: any) {
      console.error('CSV export error:', err);
      showError('Export Failed', 'Could not generate CSV export.');
    }
  };

  // --- Scheduled Reports Handlers ---
  const handleSaveScheduledReport = async () => {
    try {
      const res = await fetch('/api/admin/reports/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': sessionStorage.getItem('adminToken') || ''
        },
        body: JSON.stringify(newScheduleData)
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Schedule Configured', 'Automated report delivery has been scheduled.');
        setShowScheduleConfigModal(false);
        loadAllReportData(true);
      } else {
        showError('Schedule Error', data.error || 'Failed to save scheduled report.');
      }
    } catch (err: any) {
      showError('Schedule Error', err.message || 'Network error configuring schedule.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': sessionStorage.getItem('adminToken') || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        showInfo('Schedule Removed', 'The automated delivery configuration was removed.');
        loadAllReportData(true);
      }
    } catch (err) {
      showError('Error', 'Failed to delete schedule.');
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/schedules/${id}/run`, {
        method: 'POST',
        headers: {
          'x-admin-token': sessionStorage.getItem('adminToken') || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Report Dispatched', data.message || 'Report sent to administrator.');
        loadAllReportData(true);
      } else {
        showError('Dispatch Failed', data.message || 'Could not send scheduled report.');
      }
    } catch (err: any) {
      showError('Error', err.message || 'Dispatch error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const openDrilldown = (title: string, data: any) => {
    setDrilldownTitle(title);
    setSelectedDrilldown(data);
    setShowDrilldownModal(true);
  };

  const renderStatusBadge = (status: HealthSeverity) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} /> Healthy
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={12} /> Warning
          </span>
        );
      case 'problem':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle size={12} /> Problem
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* --- TOP HEADER & ACTIONS --- */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                Admin Reports Center
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Authoritative Audit
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                System health, security threat logs, backup SLA, ledger data integrity, and scheduled jobs monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar: Date Filter, Preview, Export, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector Dropdown */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => {
                const val = e.target.value as AdminReportDatePreset;
                if (val === 'custom') {
                  setShowCustomDateModal(true);
                } else {
                  setDatePreset(val);
                }
              }}
              className="appearance-none bg-[#1e1f20] hover:bg-[#282a2d] text-slate-200 text-xs font-medium pl-8 pr-8 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            >
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="prev_month">Previous Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range...</option>
            </select>
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Quick Date Display Badge */}
          <span className="text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800 hidden sm:inline-block">
            {dateRange.label}
          </span>

          {/* Refresh Button */}
          <button
            onClick={() => loadAllReportData(false)}
            disabled={isRefreshing}
            className="p-2 bg-[#1e1f20] hover:bg-[#282a2d] text-slate-300 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Server Audit Data"
          >
            <RefreshCw size={15} className={cn(isRefreshing && 'animate-spin text-indigo-400')} />
          </button>

          {/* Preview Button */}
          <M3Button
            variant="tonal"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            icon={Eye}
          >
            Preview
          </M3Button>

          {/* Export PDF */}
          <M3Button
            variant="filled"
            size="sm"
            onClick={handleExportPdf}
            icon={Download}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Export PDF
          </M3Button>

          {/* Export CSV */}
          <M3Button
            variant="outlined"
            size="sm"
            onClick={handleExportCsv}
            icon={FileText}
          >
            Export CSV
          </M3Button>

          {/* Automated Scheduled Delivery Button */}
          <M3Button
            variant="tonal"
            size="sm"
            onClick={() => setShowScheduleConfigModal(true)}
            icon={CalendarClock}
          >
            Scheduled Delivery
          </M3Button>
        </div>
      </div>

      {/* --- REPORT CATEGORY TABS --- */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 p-1.5 bg-[#1e1f20] rounded-2xl border border-slate-800">
        {[
          { id: 'system_health', label: 'System Health', icon: Zap, count: systemHealthReport.warningsCount + systemHealthReport.criticalIssuesCount },
          { id: 'backup', label: 'Backups & DR', icon: HardDrive, count: backupReport.failedBackups },
          { id: 'security', label: 'Security Activity', icon: Lock, count: securityReport.unauthorizedAdminAttempts },
          { id: 'data_integrity', label: 'Data Integrity', icon: Database, count: dataIntegrityReport.totalDiscrepancies },
          { id: 'scheduled_jobs', label: 'Scheduled Jobs', icon: Clock, count: scheduledJobsReport.failedExecutionsCount },
          { id: 'admin_activity', label: 'Admin Activity', icon: Activity, count: adminActivityReport.totalActions }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasIssues = tab.count > 0 && tab.id !== 'admin_activity';

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminReportCategory)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {hasIssues ? (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                )}>
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SYSTEM HEALTH REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'system_health' && (
        <div className="space-y-6">
          {/* Deterministic Health Score Banner */}
          <M3Card 
            variant="elevated" 
            className="p-6 bg-gradient-to-r from-slate-900 via-[#181a20] to-slate-900 border border-slate-800"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className={cn(
                  'w-20 h-20 rounded-3xl flex flex-col items-center justify-center font-bold border',
                  systemHealthReport.score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  systemHealthReport.score >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/30'
                )}>
                  <span className="text-3xl tracking-tighter leading-none">{systemHealthReport.score}</span>
                  <span className="text-[11px] opacity-70">/ 100</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">Deterministic System Health Index</h2>
                    {renderStatusBadge(systemHealthReport.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                    {systemHealthReport.formulaDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                <div className="text-center px-3 border-r border-slate-800">
                  <div className="text-lg font-bold text-emerald-400">{systemHealthReport.score >= 90 ? 'High' : 'Normal'}</div>
                  <div className="text-[11px] text-slate-400">Reliability SLA</div>
                </div>
                <div className="text-center px-3 border-r border-slate-800">
                  <div className="text-lg font-bold text-amber-400">{systemHealthReport.warningsCount}</div>
                  <div className="text-[11px] text-slate-400">Active Warnings</div>
                </div>
                <div className="text-center px-3">
                  <div className="text-lg font-bold text-rose-400">{systemHealthReport.criticalIssuesCount}</div>
                  <div className="text-[11px] text-slate-400">Critical Issues</div>
                </div>
              </div>
            </div>

            {/* Score Deduction Breakdown (Deterministic Transparency) */}
            {systemHealthReport.scoreBreakdown.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Info size={14} className="text-amber-400" />
                  Deterministic Score Deductions Applied:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {systemHealthReport.scoreBreakdown.map((ded, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/30 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-300">[{ded.category}]</span>
                        <span className="text-slate-400">{ded.reason}</span>
                      </div>
                      <span className="font-bold text-rose-400 whitespace-nowrap">-{ded.deduction} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </M3Card>

          {/* Subsystem Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Firestore DB */}
            <M3Card 
              variant="outlined" 
              className="p-5 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDrilldown('Firestore Subsystem Diagnostic', systemHealthReport.components.firestore)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <Database size={18} className="text-indigo-400" />
                  Firestore Database
                </div>
                {renderStatusBadge(systemHealthReport.components.firestore.status)}
              </div>
              <div className="mt-4 text-xs text-slate-300">
                {systemHealthReport.components.firestore.message}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                <span>Response Latency</span>
                <span className="font-mono text-slate-200">{systemHealthReport.components.firestore.latencyMs} ms</span>
              </div>
            </M3Card>

            {/* 2. Authentication & Admin RBAC */}
            <M3Card 
              variant="outlined" 
              className="p-5 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDrilldown('Authentication Subsystem Diagnostic', systemHealthReport.components.auth)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <Users size={18} className="text-emerald-400" />
                  Auth & Admin RBAC
                </div>
                {renderStatusBadge(systemHealthReport.components.auth.status)}
              </div>
              <div className="mt-4 text-xs text-slate-300">
                {systemHealthReport.components.auth.message}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                <span>Enrolled Administrators</span>
                <span className="font-mono text-slate-200">{systemHealthReport.components.auth.activeAdminsCount} Verified</span>
              </div>
            </M3Card>

            {/* 3. Backup Status */}
            <M3Card 
              variant="outlined" 
              className="p-5 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDrilldown('Backup Subsystem Diagnostic', systemHealthReport.components.backup)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <HardDrive size={18} className="text-cyan-400" />
                  Disaster Backup Status
                </div>
                {renderStatusBadge(systemHealthReport.components.backup.status)}
              </div>
              <div className="mt-4 text-xs text-slate-300">
                {systemHealthReport.components.backup.message}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                <span>Snapshot Age</span>
                <span className="font-mono text-slate-200">
                  {systemHealthReport.components.backup.hoursAgo !== null ? `${systemHealthReport.components.backup.hoursAgo}h old` : 'None'}
                </span>
              </div>
            </M3Card>

            {/* 4. Scheduled Jobs */}
            <M3Card 
              variant="outlined" 
              className="p-5 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDrilldown('Scheduled Jobs Diagnostic', systemHealthReport.components.scheduledJobs)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <Clock size={18} className="text-amber-400" />
                  Scheduled Jobs Health
                </div>
                {renderStatusBadge(systemHealthReport.components.scheduledJobs.status)}
              </div>
              <div className="mt-4 text-xs text-slate-300">
                {systemHealthReport.components.scheduledJobs.message}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                <span>Delayed / Failed Jobs</span>
                <span className="font-mono text-slate-200">
                  {systemHealthReport.components.scheduledJobs.delayedCount} del / {systemHealthReport.components.scheduledJobs.failedCount} fail
                </span>
              </div>
            </M3Card>

            {/* 5. Data Integrity */}
            <M3Card 
              variant="outlined" 
              className="p-5 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDrilldown('Data Integrity Diagnostic', dataIntegrityReport)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <Database size={18} className="text-purple-400" />
                  Data Integrity & Balance
                </div>
                {renderStatusBadge(systemHealthReport.components.dataIntegrity.status)}
              </div>
              <div className="mt-4 text-xs text-slate-300">
                {systemHealthReport.components.dataIntegrity.message}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                <span>Discrepancy Count</span>
                <span className="font-mono text-slate-200">{systemHealthReport.components.dataIntegrity.discrepancyCount}</span>
              </div>
            </M3Card>

            {/* 6. Admin Security & Threats */}
            <M3Card 
              variant="outlined" 
              className="p-5 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => openDrilldown('Admin Security Threat Diagnostic', securityReport)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <Lock size={18} className="text-rose-400" />
                  Threat & Access Control
                </div>
                {renderStatusBadge(systemHealthReport.components.adminSecurity.status)}
              </div>
              <div className="mt-4 text-xs text-slate-300">
                {systemHealthReport.components.adminSecurity.message}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                <span>Unauthorized Attempts</span>
                <span className="font-mono text-slate-200">{systemHealthReport.components.adminSecurity.unauthorizedAttemptsCount}</span>
              </div>
            </M3Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BACKUP REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Key Backup Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Total Backups in Period</div>
              <div className="text-2xl font-bold text-white mt-1">{backupReport.totalBackupsInRange}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {backupReport.scheduledCount} auto / {backupReport.manualCount} manual
              </div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Backup SLA Success Rate</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{backupReport.successRate}%</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {backupReport.successfulBackups} successful / {backupReport.failedBackups} failed
              </div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Total Storage Consumed</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{backupReport.formattedTotalSize}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Avg snapshot: {backupReport.formattedAverageSize}
              </div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Last Successful Snapshot</div>
              <div className="text-sm font-bold text-white mt-1 truncate">
                {backupReport.lastSuccessfulBackup?.formattedTime || 'None in range'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Size: {backupReport.lastSuccessfulBackup?.formattedSize || '0 B'}
              </div>
            </M3Card>
          </div>

          {/* Missing Expected Backup Days Warning */}
          {backupReport.missingExpectedBackupDays.length > 0 && (
            <M3Card variant="outlined" className="p-4 bg-amber-500/5 border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">
                    Missing Expected Backup Days ({backupReport.missingExpectedBackupDays.length} days without recorded snapshots)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    The following calendar days within the selected audit range had zero successful disaster-recovery backups recorded:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {backupReport.missingExpectedBackupDays.map(d => (
                      <span key={d.dateString} className="px-2 py-0.5 rounded-md text-[11px] bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                        {d.formattedDate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </M3Card>
          )}

          {/* Snapshot Records Table */}
          <M3Card variant="elevated" className="overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HardDrive size={16} className="text-cyan-400" />
                Disaster Recovery Snapshot Records ({backupReport.records.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">SHA-256 Checksum</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {backupReport.records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        No backup records found in selected range.
                      </td>
                    </tr>
                  ) : (
                    backupReport.records.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          {new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold font-sans uppercase',
                            r.type === 'manual' ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'
                          )}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {renderStatusBadge(r.status === 'verified' ? 'healthy' : 'problem')}
                        </td>
                        <td className="py-3 px-4">{r.formattedSize}</td>
                        <td className="py-3 px-4">
                          {r.durationMs > 0 ? `${(r.durationMs / 1000).toFixed(1)}s` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {r.sha256 ? `${r.sha256.substring(0, 16)}...` : 'Verified Cloud Storage'}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            onClick={() => openDrilldown(`Backup Snapshot #${r.id.slice(-6)}`, r)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </M3Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SECURITY ACTIVITY REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Key Security Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Successful Logins</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{securityReport.successfulLogins}</div>
              <div className="text-[11px] text-slate-500 mt-1">Authenticated user & admin sessions</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Failed Attempts</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{securityReport.failedAttempts}</div>
              <div className="text-[11px] text-slate-500 mt-1">Rate-limited / rejected logins</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Unrecognized Devices</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{securityReport.newUnrecognizedDevices}</div>
              <div className="text-[11px] text-slate-500 mt-1">New device signature alerts</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Unauthorized Access Blocked</div>
              <div className="text-2xl font-bold text-rose-400 mt-1">{securityReport.unauthorizedAdminAttempts}</div>
              <div className="text-[11px] text-slate-500 mt-1">Restricted route denials</div>
            </M3Card>
          </div>

          {/* Geo & Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <M3Card variant="outlined" className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                Geographical Origin Distribution
              </h3>
              <div className="space-y-2">
                {securityReport.geoDistribution.length === 0 ? (
                  <p className="text-xs text-slate-500">No geo events recorded in period.</p>
                ) : (
                  securityReport.geoDistribution.map(g => (
                    <div key={g.location} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-300">{g.location}</span>
                      <span className="font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                        {g.count} events
                      </span>
                    </div>
                  ))
                )}
              </div>
            </M3Card>

            <M3Card variant="outlined" className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Device Category Breakdown
              </h3>
              <div className="space-y-2">
                {securityReport.deviceDistribution.length === 0 ? (
                  <p className="text-xs text-slate-500">No device events recorded in period.</p>
                ) : (
                  securityReport.deviceDistribution.map(d => (
                    <div key={d.category} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-300">{d.category}</span>
                      <span className="font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                        {d.count} requests
                      </span>
                    </div>
                  ))
                )}
              </div>
            </M3Card>
          </div>

          {/* Authoritative Security Events Table */}
          <M3Card variant="elevated" className="overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock size={16} className="text-indigo-400" />
                Authoritative Security Audit Events (Sanitized)
              </h3>
              <span className="text-xs text-slate-400">{securityReport.events.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Identity / Email</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Client IP</th>
                    <th className="py-3 px-4">Device / Browser</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {securityReport.events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No security activity events recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    securityReport.events.slice(0, 30).map(e => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(e.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-medium text-white max-w-[150px] truncate">{e.email}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                            (e.action || '').includes('DENIED') || (e.action || '').includes('FAILED')
                              ? 'bg-rose-500/15 text-rose-400'
                              : (e.action || '').includes('NEW')
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          )}>
                            {(e.action || e.eventType || 'EVENT').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{e.ip}</td>
                        <td className="py-3 px-4 text-slate-300 truncate max-w-[120px]">{e.device} / {e.browser}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">{e.details}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openDrilldown(`Security Event: ${e.action}`, e)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </M3Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DATA INTEGRITY REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'data_integrity' && (
        <div className="space-y-6">
          {/* Main Reconciliation Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Ledger Double-Entry Audit */}
            <M3Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Database size={18} className="text-indigo-400" />
                  Main Ledger Reconciliation
                </div>
                {renderStatusBadge(dataIntegrityReport.mainLedger.isBalanced ? 'healthy' : 'problem')}
              </div>

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Inflows (Received)</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    ₹{dataIntegrityReport.mainLedger.inflows.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Outflows (Sent)</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">
                    ₹{dataIntegrityReport.mainLedger.outflows.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
                <div className="flex justify-between text-slate-300">
                  <span>Calculated Net (Inflows - Outflows):</span>
                  <span className="font-mono font-bold text-white">₹{dataIntegrityReport.mainLedger.calculatedBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Current Stored Balance:</span>
                  <span className="font-mono font-bold text-white">₹{dataIntegrityReport.mainLedger.storedBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800/60 font-semibold">
                  <span>Reconciliation Difference:</span>
                  <span className={cn(
                    'font-mono',
                    dataIntegrityReport.mainLedger.isBalanced ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {dataIntegrityReport.mainLedger.isBalanced 
                      ? 'Balanced (₹0.00)' 
                      : `Mismatch (₹${dataIntegrityReport.mainLedger.discrepancyAmount.toLocaleString()})`}
                  </span>
                </div>
              </div>
            </M3Card>

            {/* Gullak Vault Reconciliation */}
            <M3Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <PieChart size={18} className="text-purple-400" />
                  Gullak Vault Reconciliation
                </div>
                {renderStatusBadge(dataIntegrityReport.gullak.isBalanced ? 'healthy' : 'problem')}
              </div>

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Vault Credits</div>
                  <div className="text-lg font-bold text-purple-400 mt-1">
                    ₹{dataIntegrityReport.gullak.totalCredits.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Vault Debits</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">
                    ₹{dataIntegrityReport.gullak.totalDebits.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
                <div className="flex justify-between text-slate-300">
                  <span>Calculated Vault Sum:</span>
                  <span className="font-mono font-bold text-white">₹{dataIntegrityReport.gullak.calculatedBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Current Stored Vault Balance:</span>
                  <span className="font-mono font-bold text-white">₹{dataIntegrityReport.gullak.storedBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800/60 font-semibold">
                  <span>Vault Variance:</span>
                  <span className={cn(
                    'font-mono',
                    dataIntegrityReport.gullak.isBalanced ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {dataIntegrityReport.gullak.isBalanced 
                      ? 'Balanced (₹0.00)' 
                      : `Mismatch (₹${dataIntegrityReport.gullak.discrepancyAmount.toLocaleString()})`}
                  </span>
                </div>
              </div>
            </M3Card>
          </div>

          {/* Anomaly Detection Tables */}
          {/* 1. Duplicate Transaction Candidates */}
          <M3Card variant="outlined" className="overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Duplicate Transaction Candidates ({dataIntegrityReport.duplicates.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">Non-destructive identification</span>
            </div>
            {dataIntegrityReport.duplicates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                Zero duplicate transaction candidates detected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Party Name</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Diagnostic Reasoning</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {dataIntegrityReport.duplicates.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-mono">{d.date}</td>
                        <td className="py-2.5 px-4 font-semibold text-white">{d.personName}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-400">₹{d.amount}</td>
                        <td className="py-2.5 px-4 text-slate-400">{d.reason}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => openDrilldown('Duplicate Candidate Inspection', d)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </M3Card>

          {/* 2. Missing Fields or Invalid Amounts */}
          {(dataIntegrityReport.missingRequiredFields.length > 0 || dataIntegrityReport.invalidAmounts.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <M3Card variant="outlined" className="p-4">
                <h4 className="text-xs font-bold text-rose-400 mb-2">
                  Missing Required Fields ({dataIntegrityReport.missingRequiredFields.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dataIntegrityReport.missingRequiredFields.map(m => (
                    <div key={m.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-semibold text-slate-200">ID: #{m.id.slice(-6)}</div>
                      <div className="text-slate-400 text-[11px]">{m.description}</div>
                    </div>
                  ))}
                </div>
              </M3Card>

              <M3Card variant="outlined" className="p-4">
                <h4 className="text-xs font-bold text-rose-400 mb-2">
                  Invalid Amount Entries ({dataIntegrityReport.invalidAmounts.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dataIntegrityReport.invalidAmounts.map(inv => (
                    <div key={inv.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-semibold text-slate-200">ID: #{inv.id.slice(-6)} - {inv.personName}</div>
                      <div className="text-rose-400 text-[11px]">{inv.issue}</div>
                    </div>
                  ))}
                </div>
              </M3Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SCHEDULED JOBS REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'scheduled_jobs' && (
        <div className="space-y-6">
          {/* Scheduled Jobs Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Registered Jobs</div>
              <div className="text-2xl font-bold text-white mt-1">{scheduledJobsReport.totalJobsConfigured}</div>
              <div className="text-[11px] text-slate-500 mt-1">24/7 background scheduler</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Executions in Period</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">{scheduledJobsReport.totalExecutionsInRange}</div>
              <div className="text-[11px] text-slate-500 mt-1">Server recorded execution runs</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Success Rate</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{scheduledJobsReport.successRate}%</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {scheduledJobsReport.successExecutionsCount} success / {scheduledJobsReport.failedExecutionsCount} failed
              </div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Overall Execution Health</div>
              <div className="text-base font-bold text-white mt-2">
                {renderStatusBadge(scheduledJobsReport.overallHealth)}
              </div>
            </M3Card>
          </div>

          {/* Job Registry Execution Breakdown */}
          <M3Card variant="elevated" className="overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                Background Job Execution Registry
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Job Name</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4">Executions in Range</th>
                    <th className="py-3 px-4">Avg Duration</th>
                    <th className="py-3 px-4">Last Executed</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {scheduledJobsReport.jobSummaries.map(j => (
                    <tr key={j.jobId} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-white">{j.jobName}</td>
                      <td className="py-3 px-4 text-slate-400">{j.scheduleHuman}</td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold',
                          j.status === 'HEALTHY' ? 'bg-emerald-500/15 text-emerald-400' :
                          j.status === 'FAILED' ? 'bg-rose-500/15 text-rose-400' :
                          j.status === 'DELAYED' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-slate-800 text-slate-300'
                        )}>
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {j.successRunsInRange} / {j.totalRunsInRange}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {j.averageDurationMs > 0 ? `${(j.averageDurationMs / 1000).toFixed(1)}s` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {j.lastExecutedAt 
                          ? new Date(j.lastExecutedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openDrilldown(`Scheduled Job: ${j.jobName}`, j)}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </M3Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADMIN ACTIVITY REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'admin_activity' && (
        <div className="space-y-6">
          {/* Key Admin Activity Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Total Admin Actions</div>
              <div className="text-2xl font-bold text-white mt-1">{adminActivityReport.totalActions}</div>
              <div className="text-[11px] text-slate-500 mt-1">Recorded audit trail records</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">System Mode Changes</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{adminActivityReport.modeChangesCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Maintenance / Readonly switches</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Disaster Backup Actions</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{adminActivityReport.backupActionsCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Manual snapshots created</div>
            </M3Card>

            <M3Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-400 font-medium">Job Trigger Invocations</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">{adminActivityReport.jobTriggersCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Manual executions & retries</div>
            </M3Card>
          </div>

          {/* Admin Activity Table */}
          <M3Card variant="elevated" className="overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                Administrative Operations Audit Trail
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Account</th>
                    <th className="py-3 px-4">Action Taken</th>
                    <th className="py-3 px-4">IP / Source</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {adminActivityReport.actions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No administrative operations recorded in selected period.
                      </td>
                    </tr>
                  ) : (
                    adminActivityReport.actions.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          {new Date(a.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{a.adminEmail}</td>
                        <td className="py-3 px-4 font-medium text-slate-200">{a.action}</td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{a.ip}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                            a.result === 'success' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          )}>
                            {a.result}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[220px] truncate">{a.details}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openDrilldown(`Admin Action: ${a.action}`, a)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </M3Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REPORT PREVIEW DIALOG */}
      {/* ========================================================================= */}
      <M3Dialog
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={`Report Preview: ${activeTab.replace(/_/g, ' ').toUpperCase()}`}
        subtitle={`Period: ${dateRange.label} // Classification: Restricted Admin Audit`}
        maxWidth="2xl"
        actions={
          <div className="flex items-center gap-2">
            <M3Button variant="outlined" size="sm" onClick={() => setShowPreviewModal(false)}>
              Close
            </M3Button>
            <M3Button variant="tonal" size="sm" onClick={handleExportCsv} icon={FileText}>
              Download CSV
            </M3Button>
            <M3Button 
              variant="filled" 
              size="sm" 
              onClick={handleExportPdf} 
              icon={Download}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Download PDF
            </M3Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
          {/* Executive Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Report Type:</span>
              <span className="text-white uppercase">{activeTab.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Date Period:</span>
              <span className="text-white">{dateRange.startDate.toLocaleDateString()} to {dateRange.endDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Auditor / Admin:</span>
              <span className="text-indigo-400">{adminEmail}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Security Classification:</span>
              <span className="text-rose-400">CONFIDENTIAL // RESTRICTED ADMIN AUDIT</span>
            </div>
          </div>

          {/* JSON Summary Inspection */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-400">Aggregated Report Metrics:</div>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto">
              {JSON.stringify(currentReportData, null, 2)}
            </pre>
          </div>
        </div>
      </M3Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM DATE RANGE DIALOG */}
      {/* ========================================================================= */}
      <M3Dialog
        isOpen={showCustomDateModal}
        onClose={() => setShowCustomDateModal(false)}
        title="Custom Report Date Range"
        subtitle="Select start and end dates for authoritative audit filtering"
        maxWidth="sm"
        actions={
          <div className="flex items-center gap-2">
            <M3Button variant="outlined" size="sm" onClick={() => setShowCustomDateModal(false)}>
              Cancel
            </M3Button>
            <M3Button
              variant="filled"
              size="sm"
              onClick={() => {
                setDatePreset('custom');
                setShowCustomDateModal(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Apply Filter
            </M3Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </M3Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: DRILLDOWN INSPECTOR DIALOG */}
      {/* ========================================================================= */}
      <M3Dialog
        isOpen={showDrilldownModal}
        onClose={() => setShowDrilldownModal(false)}
        title={drilldownTitle || 'Record Inspector'}
        subtitle="Authoritative metadata and diagnostic breakdown"
        maxWidth="lg"
        actions={
          <div className="flex items-center gap-2">
            {selectedDrilldown && (
              <M3Button
                variant="outlined"
                size="sm"
                icon={copiedText ? Check : Copy}
                onClick={() => copyToClipboard(JSON.stringify(selectedDrilldown, null, 2))}
              >
                {copiedText ? 'Copied' : 'Copy JSON'}
              </M3Button>
            )}
            <M3Button variant="tonal" size="sm" onClick={() => setShowDrilldownModal(false)}>
              Dismiss
            </M3Button>
          </div>
        }
      >
        <div className="p-1 space-y-3">
          <p className="text-xs text-slate-400">
            SmartLedger adheres strictly to non-destructive compliance: administrative reports highlight discrepancies for inspection and never mutate underlying financial records silently.
          </p>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto">
            {JSON.stringify(selectedDrilldown, null, 2)}
          </pre>
        </div>
      </M3Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: SCHEDULED DELIVERY CONFIGURATION DIALOG */}
      {/* ========================================================================= */}
      <M3Dialog
        isOpen={showScheduleConfigModal}
        onClose={() => setShowScheduleConfigModal(false)}
        title="Automated Scheduled Reports Delivery"
        subtitle="Manage recurring weekly/monthly server-side cron report dispatches"
        maxWidth="2xl"
        actions={
          <M3Button variant="tonal" size="sm" onClick={() => setShowScheduleConfigModal(false)}>
            Close
          </M3Button>
        }
      >
        <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto">
          {/* Active Subscriptions List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Server-Side Subscriptions ({scheduledReportConfigs.length})
            </h4>
            <div className="space-y-2">
              {scheduledReportConfigs.map(s => (
                <div key={s.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{s.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 uppercase">
                        {s.frequency}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Delivery: {s.deliveryEmail}</span>
                      <span>•</span>
                      <span>Format: {s.format.toUpperCase()}</span>
                      {s.nextRunAt && (
                        <>
                          <span>•</span>
                          <span>Next Run: {new Date(s.nextRunAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunScheduleNow(s.id)}
                      className="px-2.5 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg transition-colors font-semibold"
                    >
                      Run Now
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Schedule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Subscription Form */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white">Add New Scheduled Report Delivery</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Report Category</label>
                <select
                  value={newScheduleData.reportType}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, reportType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg p-2 text-white"
                >
                  <option value="weekly_system">Weekly System Health Report</option>
                  <option value="monthly_security">Monthly Security Audit Report</option>
                  <option value="monthly_backup">Monthly Backup SLA Report</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Frequency</label>
                <select
                  value={newScheduleData.frequency}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, frequency: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg p-2 text-white"
                >
                  <option value="weekly">Weekly (Every Monday 09:00 AM)</option>
                  <option value="monthly">Monthly (1st of Month 09:00 AM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Verified Admin Delivery Email</label>
                <input
                  type="email"
                  value={newScheduleData.deliveryEmail}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, deliveryEmail: e.target.value })}
                  placeholder="admin@smartledgerx.io"
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Attachment Format</label>
                <select
                  value={newScheduleData.format}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, format: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg p-2 text-white"
                >
                  <option value="pdf">PDF Document Only</option>
                  <option value="csv">CSV Spreadsheet Only</option>
                  <option value="both">Both PDF & CSV Attachments</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <M3Button
                variant="filled"
                size="sm"
                onClick={handleSaveScheduledReport}
                icon={Plus}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Schedule Delivery
              </M3Button>
            </div>
          </div>
        </div>
      </M3Dialog>
    </div>
  );
}
