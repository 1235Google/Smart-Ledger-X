import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Database, 
  Activity, 
  Lock, 
  RefreshCw, 
  Save, 
  Check, 
  ChevronRight, 
  Sparkles, 
  History, 
  Server,
  FileText,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { SystemMode, SystemSafetyReport, SystemConfig } from '../../types';
import { systemModeService } from '../../lib/systemModeService';
import { cn } from '../../lib/utils';
import { M3Card } from './material3/M3Card';
import { M3Button } from './material3/M3Button';
import { M3Dialog } from './material3/M3Dialog';

export default function SystemModeControlCard() {
  const { systemConfig, setSystemMode, adminUser } = useStore();
  const { showSuccess, showError, showInfo } = useToast();

  const [selectedTargetMode, setSelectedTargetMode] = useState<SystemMode | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states for dialog
  const [reason, setReason] = useState('');
  const [durationPreset, setDurationPreset] = useState<'none' | '15m' | '30m' | '1h' | '2h' | 'custom'>('30m');
  const [customEndTime, setCustomEndTime] = useState('');
  const [autoRestore, setAutoRestore] = useState(true);

  // Safety inspection states (for Maintenance mode pre-flight)
  const [isInspecting, setIsInspecting] = useState(false);
  const [safetyReport, setSafetyReport] = useState<SystemSafetyReport | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Audit history state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    fetchModeLogs();
  }, [systemConfig.mode]);

  const fetchModeLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          const modeEvents = data.events.filter((e: any) => 
            e.action === 'SYSTEM_MODE_CHANGE' || 
            e.action === 'SYSTEM_MODE_AUTO_RESTORE' ||
            e.action === 'SAFETY_BACKUP_CREATED'
          );
          setAuditLogs(modeEvents.slice(0, 5));
        }
      }
    } catch (e) {
      // Non-blocking
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const calculateExpectedEnd = (): string | null => {
    if (selectedTargetMode === 'normal') return null;
    if (durationPreset === 'none') return null;
    if (durationPreset === 'custom') {
      return customEndTime ? new Date(customEndTime).toISOString() : null;
    }

    const now = new Date();
    if (durationPreset === '15m') now.setMinutes(now.getMinutes() + 15);
    else if (durationPreset === '30m') now.setMinutes(now.getMinutes() + 30);
    else if (durationPreset === '1h') now.setHours(now.getHours() + 1);
    else if (durationPreset === '2h') now.setHours(now.getHours() + 2);

    return now.toISOString();
  };

  const handleSelectMode = async (mode: SystemMode) => {
    if (mode === systemConfig.mode) {
      showInfo('Current Mode Active', `System is already running in ${mode.toUpperCase()} mode.`);
      return;
    }

    setSelectedTargetMode(mode);
    setReason(
      mode === 'maintenance' 
        ? 'Scheduled infrastructure maintenance and database optimization' 
        : mode === 'readonly' 
          ? 'Temporary financial freeze for ledger auditing' 
          : 'Restoring standard user access'
    );
    setDurationPreset(mode === 'normal' ? 'none' : '30m');
    setAutoRestore(mode !== 'normal');
    setBackupSuccessMessage(null);
    setShowConfirmDialog(true);

    // If switching to Maintenance or Read-Only, immediately run safety pre-flight
    if (mode === 'maintenance' || mode === 'readonly') {
      runSafetyInspection();
    }
  };

  const runSafetyInspection = async () => {
    setIsInspecting(true);
    try {
      const report = await systemModeService.getSafetyCheck();
      setSafetyReport(report);
    } catch (err: any) {
      console.warn('[SafetyCheck] Inspection warning:', err);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleCreateSafetyBackup = async () => {
    setIsCreatingBackup(true);
    setBackupSuccessMessage(null);
    try {
      const result = await systemModeService.createSafetyBackup();
      if (result.success) {
        setBackupSuccessMessage(result.message || 'Safety backup successfully generated and verified.');
        showSuccess('Safety Backup Complete', 'Disaster recovery snapshot created before mode change.');
        // Re-run inspection to refresh backup status
        await runSafetyInspection();
      }
    } catch (err: any) {
      showError('Backup Failed', err?.message || 'Could not create safety backup.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleConfirmModeChange = async () => {
    if (!selectedTargetMode) return;

    setIsLoading(true);
    try {
      const expectedEndAt = calculateExpectedEnd();
      const res = await setSystemMode(
        selectedTargetMode,
        reason.trim(),
        expectedEndAt,
        selectedTargetMode === 'normal' ? false : autoRestore
      );

      if (res.success) {
        showSuccess(
          `System Mode: ${selectedTargetMode.toUpperCase()}`,
          res.message || `SmartLedger availability mode switched to ${selectedTargetMode}.`
        );
        setShowConfirmDialog(false);
        fetchModeLogs();
      }
    } catch (err: any) {
      showError('Mode Change Failed', err?.message || 'Server rejected system mode change.');
    } finally {
      setIsLoading(false);
    }
  };

  const getModeBadge = (mode: SystemMode) => {
    switch (mode) {
      case 'normal':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-500',
          label: '🟢 Normal Mode',
          desc: 'All features and user transactions operational'
        };
      case 'readonly':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-500',
          label: '🟡 Read-Only Mode',
          desc: 'Ledger mutations locked; user browsing permitted'
        };
      case 'maintenance':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dot: 'bg-rose-500',
          label: '🔴 Maintenance Mode',
          desc: 'Normal users blocked; maintenance screen active'
        };
    }
  };

  const currentBadge = getModeBadge(systemConfig.mode);

  return (
    <M3Card variant="elevated" className="overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold shrink-0 shadow-md">
            <Server size={22} className="text-[#a8c7fa]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">System Mode</h2>
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5', currentBadge.bg)}>
                <span className={cn('w-2 h-2 rounded-full animate-pulse', currentBadge.dot)} />
                {currentBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control application availability, read-only freezing, and maintenance windows.
            </p>
          </div>
        </div>

        {/* Quick status details */}
        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-mono">Last Changed By</span>
          <span className="text-xs font-semibold text-slate-300">{systemConfig.changedBy || 'System'}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {new Date(systemConfig.changedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div className="p-5 sm:p-6">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
          Select Application Availability State
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Normal Mode Card */}
          <div
            onClick={() => handleSelectMode('normal')}
            className={cn(
              'group relative p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-4',
              systemConfig.mode === 'normal'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🟢</span>
                {systemConfig.mode === 'normal' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Normal Mode
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Standard full operation. Users can create, edit, delete, and view all financial records, gullak, and reports normally.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>{systemConfig.mode === 'normal' ? 'Current System State' : 'Switch to Normal'}</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Read-Only Mode Card */}
          <div
            onClick={() => handleSelectMode('readonly')}
            className={cn(
              'group relative p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-4',
              systemConfig.mode === 'readonly'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🟡</span>
                {systemConfig.mode === 'readonly' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Read-Only Mode
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Users can browse their dashboard, reports, and ledger history, but cannot create, edit, or delete any financial records.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>{systemConfig.mode === 'readonly' ? 'Current System State' : 'Switch to Read-Only'}</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Maintenance Mode Card */}
          <div
            onClick={() => handleSelectMode('maintenance')}
            className={cn(
              'group relative p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-4',
              systemConfig.mode === 'maintenance'
                ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.15)]'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🔴</span>
                {systemConfig.mode === 'maintenance' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                Maintenance Mode
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                SmartLedger is offline for standard users. They see a maintenance screen. Authorized administrators retain full console access.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>{systemConfig.mode === 'maintenance' ? 'Current System State' : 'Switch to Maintenance'}</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Current Active Mode Context Box */}
        {systemConfig.mode !== 'normal' && (
          <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-400" />
                Active Maintenance Parameters
              </span>
              <p className="text-xs text-slate-300">
                Reason: <span className="text-white font-medium">{systemConfig.reason || 'None specified'}</span>
              </p>
              {systemConfig.expectedEndAt && (
                <p className="text-xs text-slate-400">
                  Expected completion:{' '}
                  <span className="text-amber-300 font-mono">
                    {new Date(systemConfig.expectedEndAt).toLocaleString()}
                  </span>{' '}
                  {systemConfig.autoRestore && (
                    <span className="text-emerald-400 text-[11px] font-semibold">(Auto-restore active)</span>
                  )}
                </p>
              )}
            </div>

            <M3Button
              variant="filled"
              size="sm"
              icon={RotateCcw}
              onClick={() => handleSelectMode('normal')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 self-start sm:self-auto"
            >
              Restore Normal Mode
            </M3Button>
          </div>
        )}

        {/* Audit Log Trail for System Mode Changes */}
        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History size={14} />
              Recent Availability & Mode Audit Events
            </span>
            <button
              onClick={fetchModeLogs}
              className="text-[11px] text-[#a8c7fa] hover:underline flex items-center gap-1"
            >
              <RefreshCw size={11} className={isLoadingLogs ? 'animate-spin' : ''} />
              Refresh Logs
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center text-xs text-slate-500">
              No recent mode transition events recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0',
                      log.action === 'SYSTEM_MODE_AUTO_RESTORE' ? 'bg-indigo-500/20 text-indigo-300' :
                      log.action === 'SAFETY_BACKUP_CREATED' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    )}>
                      {log.action}
                    </span>
                    <span className="text-slate-300 truncate">
                      {log.details || log.reason || 'Mode transition executed'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono shrink-0 self-end sm:self-auto">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safe Confirmation & Pre-Flight Dialog */}
      <M3Dialog
        isOpen={showConfirmDialog}
        onClose={() => !isLoading && setShowConfirmDialog(false)}
        title={
          selectedTargetMode === 'maintenance'
            ? 'Enable Maintenance Mode?'
            : selectedTargetMode === 'readonly'
            ? 'Enable Read-Only Mode?'
            : 'Restore Normal Mode?'
        }
        subtitle="Confirm application availability transition"
        maxWidth="2xl"
        actions={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <M3Button
              variant="text"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading || isCreatingBackup}
            >
              Cancel
            </M3Button>

            <M3Button
              variant="filled"
              onClick={handleConfirmModeChange}
              disabled={isLoading || isCreatingBackup}
              icon={Check}
              className={cn(
                selectedTargetMode === 'maintenance'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : selectedTargetMode === 'readonly'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              )}
            >
              {isLoading
                ? 'Applying Mode...'
                : selectedTargetMode === 'maintenance'
                ? 'Confirm & Enter Maintenance'
                : selectedTargetMode === 'readonly'
                ? 'Confirm & Enable Read-Only'
                : 'Confirm & Restore Normal'}
            </M3Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {/* Summary Alert */}
          <div className={cn(
            'p-4 rounded-2xl border text-xs leading-relaxed',
            selectedTargetMode === 'maintenance'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : selectedTargetMode === 'readonly'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          )}>
            {selectedTargetMode === 'maintenance' && (
              <p>
                <strong className="block text-sm font-bold text-white mb-1">
                  🔴 Maintenance Mode Impact
                </strong>
                Normal users will immediately be blocked from accessing SmartLedger and will see the maintenance screen.
                All background cron tasks will be deferred. You will retain diagnostic access through this Admin Console.
              </p>
            )}
            {selectedTargetMode === 'readonly' && (
              <p>
                <strong className="block text-sm font-bold text-white mb-1">
                  🟡 Read-Only Mode Impact
                </strong>
                Users can browse their dashboard, reports, and ledger history, but cannot create, edit, or delete any financial records.
                Direct Firestore writes are rejected by security rules.
              </p>
            )}
            {selectedTargetMode === 'normal' && (
              <p>
                <strong className="block text-sm font-bold text-white mb-1">
                  🟢 Normal Mode Restoration
                </strong>
                SmartLedger will return to standard operation. All normal users will regain access to transactions, Gullak, and backups.
              </p>
            )}
          </div>

          {/* Pre-Flight Inspection (Required before Maintenance Mode) */}
          {(selectedTargetMode === 'maintenance' || selectedTargetMode === 'readonly') && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-400" />
                  Pre-Flight Safety Inspection
                </span>
                <button
                  type="button"
                  onClick={runSafetyInspection}
                  disabled={isInspecting}
                  className="text-[11px] text-[#a8c7fa] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isInspecting ? 'animate-spin' : ''} />
                  Re-Inspect
                </button>
              </div>

              {isInspecting ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-400" />
                  Checking backup status, active operations, and database connectivity...
                </div>
              ) : safetyReport ? (
                <div className="space-y-2.5">
                  {/* Backup status check */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        safetyReport.backupStatus.status === 'HEALTHY' ? 'bg-emerald-400' : 'bg-amber-400'
                      )} />
                      <div>
                        <span className="font-semibold text-white">Disaster Recovery Backup</span>
                        <p className="text-[11px] text-slate-400">
                          Last backup: {safetyReport.backupStatus.lastBackupTimestamp ? new Date(safetyReport.backupStatus.lastBackupTimestamp).toLocaleString() : 'No recent backup'} &bull; {safetyReport.backupStatus.message}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      safetyReport.backupStatus.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {safetyReport.backupStatus.status}
                    </span>
                  </div>

                  {/* Active jobs check */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        safetyReport.activeCriticalOperations === 0 ? 'bg-emerald-400' : 'bg-amber-400'
                      )} />
                      <div>
                        <span className="font-semibold text-white">Active Background Jobs</span>
                        <p className="text-[11px] text-slate-400">
                          {safetyReport.activeCriticalOperations === 0 
                            ? 'No critical background jobs currently executing'
                            : `${safetyReport.activeCriticalOperations} operation(s) in progress: ${safetyReport.activeJobs.join(', ')}`}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      safetyReport.activeCriticalOperations === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {safetyReport.activeCriticalOperations === 0 ? 'Idle' : 'Running'}
                    </span>
                  </div>

                  {/* Database connectivity */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div>
                        <span className="font-semibold text-white">Firestore Connectivity</span>
                        <p className="text-[11px] text-slate-400">
                          Latency: {safetyReport.databaseLatencyMs}ms &bull; Security rules deployed
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">
                      Operational
                    </span>
                  </div>

                  {/* Safety backup offer button */}
                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-[11px] text-slate-400">
                      {backupSuccessMessage ? (
                        <span className="text-emerald-300 flex items-center gap-1 font-semibold">
                          <CheckCircle2 size={13} /> {backupSuccessMessage}
                        </span>
                      ) : (
                        'Recommend generating an immutable safety backup prior to maintenance.'
                      )}
                    </div>
                    <M3Button
                      type="button"
                      variant="tonal"
                      size="sm"
                      icon={Database}
                      disabled={isCreatingBackup}
                      onClick={handleCreateSafetyBackup}
                    >
                      {isCreatingBackup ? 'Generating Backup...' : 'Create Safety Backup First'}
                    </M3Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Reason / Public Maintenance Notice:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scheduled database upgrade and indexing"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Duration Preset Selector (for Read-Only or Maintenance) */}
          {selectedTargetMode !== 'normal' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Estimated Maintenance Duration:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: '15m', label: '15 mins' },
                  { id: '30m', label: '30 mins' },
                  { id: '1h', label: '1 hour' },
                  { id: '2h', label: '2 hours' },
                  { id: 'custom', label: 'Custom' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDurationPreset(preset.id as any)}
                    className={cn(
                      'py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center',
                      durationPreset === preset.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {durationPreset === 'custom' && (
                <div className="pt-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Expected End Date & Time:</label>
                  <input
                    type="datetime-local"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
              )}

              {/* Auto-Restore Toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="pr-4">
                  <span className="text-xs font-bold text-white block">Auto-Restore to Normal Mode</span>
                  <span className="text-[11px] text-slate-400">
                    Automatically bring SmartLedger back online when the estimated duration expires.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoRestore}
                  onChange={(e) => setAutoRestore(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-500 bg-black/40 border-white/20 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </M3Dialog>
    </M3Card>
  );
}
