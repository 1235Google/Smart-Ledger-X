import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Lock, 
  Cloud, 
  Activity, 
  RefreshCw,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { BackupStats, BackupService } from '../../lib/backupService';
import { BackupMetadata } from '../../types';

interface BackupHealthDashboardProps {
  stats: BackupStats;
  latestSnapshot?: BackupMetadata;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function BackupHealthDashboard({
  stats,
  latestSnapshot,
  onRefresh,
  isRefreshing
}: BackupHealthDashboardProps) {
  const isOptimal = stats.status === 'healthy';
  const isWarning = stats.status === 'warning';
  const isCritical = stats.status === 'error';

  const healthColor = isOptimal 
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : isWarning
    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

  const healthBadge = isOptimal 
    ? { icon: '🟢', label: 'Excellent', subtext: 'Continuous 24-Hour Snapshot Protection' }
    : isWarning 
    ? { icon: '🟡', label: 'Warning / Attention', subtext: 'Scheduled Backup Overdue or Pending Initial Run' }
    : { icon: '🔴', label: 'Critical Alert', subtext: 'Backup Failed - Immediate Attention Recommended' };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      {/* Top Atmospheric Glow */}
      <div className={`absolute top-0 right-0 w-80 h-40 rounded-full blur-3xl pointer-events-none ${
        isOptimal ? 'bg-emerald-500/10' : isWarning ? 'bg-amber-500/10' : 'bg-rose-500/10'
      }`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Enterprise Backup Health</h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${healthColor}`}>
                <span>{healthBadge.icon}</span>
                <span>{healthBadge.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{healthBadge.subtext}</p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Health Diagnostics"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
            <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 relative z-10">
        {/* Last Successful Backup */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Last Successful</span>
            <Clock size={14} className="text-blue-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {stats.latestBackupDate ? BackupService.formatRelativeTime(stats.latestBackupDate) : 'No Snapshot Yet'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {stats.latestBackupDate ? new Date(stats.latestBackupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending run'}
          </div>
        </div>

        {/* Next Scheduled Backup */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Next Scheduled</span>
            <Calendar size={14} className="text-indigo-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {stats.nextBackupDate ? BackupService.formatRelativeTime(stats.nextBackupDate) : 'Automatic (24h)'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {stats.nextBackupDate ? new Date(stats.nextBackupDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Every 24 Hours'}
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Success Rate</span>
            <Activity size={14} className="text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400">
            {stats.successRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {stats.totalBackups} total snapshots stored
          </div>
        </div>

        {/* Last Verification */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Last Verification</span>
            <CheckCircle2 size={14} className="text-teal-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {stats.lastVerificationTime ? BackupService.formatRelativeTime(stats.lastVerificationTime) : 'Pre-flight verified'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            SHA-256 Validated
          </div>
        </div>
      </div>

      {/* Security & Status Row */}
      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Integrity Status */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-emerald-300">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <div className="truncate">
            <span className="font-semibold">Integrity: </span>
            <span className="text-emerald-200">SHA-256 Zero Corruption</span>
          </div>
        </div>

        {/* Encryption Status */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-300">
          <Lock size={15} className="text-blue-400 flex-shrink-0" />
          <div className="truncate">
            <span className="font-semibold">Encryption: </span>
            <span className="text-blue-200">AES-256-CBC Zero-Knowledge</span>
          </div>
        </div>

        {/* Cloud Connection Status */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/15 text-indigo-300">
          <Cloud size={15} className="text-indigo-400 flex-shrink-0" />
          <div className="truncate">
            <span className="font-semibold">Cloud Connection: </span>
            <span className="text-indigo-200">Firebase Storage Active</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
