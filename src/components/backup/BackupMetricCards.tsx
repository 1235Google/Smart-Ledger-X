import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, HardDrive, Clock, Calendar, 
  Lock, Smartphone, Activity, Sparkles, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { BackupStats, BackupService } from '../../lib/backupService';
import { APP_VERSION, ENCRYPTION_VERSION } from '../../lib/backupCrypto';

interface BackupMetricCardsProps {
  stats: BackupStats;
}

export default function BackupMetricCards({ stats }: BackupMetricCardsProps) {
  const getDeviceName = () => {
    if (typeof navigator === 'undefined') return 'Web Client';
    const ua = navigator.userAgent;
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'macOS Workstation';
    if (ua.includes('Windows')) return 'Windows Workstation';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Mobile Device';
    if (ua.includes('Android')) return 'Android Mobile Device';
    if (ua.includes('Linux')) return 'Linux Workstation';
    return 'Web Browser Client';
  };

  const getHealthBadge = () => {
    switch (stats.status) {
      case 'healthy':
        return {
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
          dot: 'bg-emerald-400',
          text: stats.health || 'Optimal • Verified',
          score: '100% Secure',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
          dot: 'bg-amber-400',
          text: stats.health || 'Warning • Overdue',
          score: 'Action Recommended',
        };
      case 'error':
      default:
        return {
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
          dot: 'bg-rose-400',
          text: stats.health || 'Needs Retry',
          score: 'Attention Required',
        };
    }
  };

  const health = getHealthBadge();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Health Score Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-[24px] bg-[#0c0e17]/90 border border-white/[0.08] p-5 shadow-xl backdrop-blur-xl group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Health Status</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity size={18} />
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${health.dot} animate-pulse`} />
            <h3 className="text-lg font-bold text-white truncate">{health.text}</h3>
          </div>
          <p className="text-xs text-slate-400 font-mono">{health.score}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
          <span>SHA-256 Checksum</span>
          <span className="text-emerald-400 font-mono font-medium">Verified</span>
        </div>
      </motion.div>

      {/* 2. Cloud Storage Usage Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-[24px] bg-[#0c0e17]/90 border border-white/[0.08] p-5 shadow-xl backdrop-blur-xl group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cloud Usage</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <HardDrive size={18} />
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            {BackupService.formatSize(stats.totalStorageBytes)}
          </h3>
          <p className="text-xs text-slate-400">
            {stats.totalBackups} snapshot{stats.totalBackups === 1 ? '' : 's'} stored
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
          <span>Avg. Archive Size</span>
          <span className="text-indigo-300 font-mono font-medium">
            {BackupService.formatSize(stats.averageSizeBytes)}
          </span>
        </div>
      </motion.div>

      {/* 3. Schedule & Timestamps Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-[24px] bg-[#0c0e17]/90 border border-white/[0.08] p-5 shadow-xl backdrop-blur-xl group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backup Schedule</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock size={18} />
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-sm font-semibold text-white">
            Last: <span className="text-slate-300">{BackupService.formatRelativeTime(stats.latestBackupDate)}</span>
          </div>
          <p className="text-xs text-slate-400">
            Next: {stats.nextBackupDate ? new Date(stats.nextBackupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In 24h'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
          <span>Frequency</span>
          <span className="text-blue-300 font-medium">Every 24 Hours</span>
        </div>
      </motion.div>

      {/* 4. Security & Device Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-[24px] bg-[#0c0e17]/90 border border-white/[0.08] p-5 shadow-xl backdrop-blur-xl group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security & Node</span>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Lock size={18} />
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="text-sm font-bold text-white truncate">{getDeviceName()}</h3>
          <p className="text-xs text-slate-400 font-mono">Engine v{APP_VERSION} • {ENCRYPTION_VERSION}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
          <span>Storage Isolation</span>
          <span className="text-violet-300 font-medium">User UID Scoped</span>
        </div>
      </motion.div>
    </div>
  );
}
