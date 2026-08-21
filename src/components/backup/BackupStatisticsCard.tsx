import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Cloud, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  HardDrive, 
  Zap,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { BackupStats, BackupService } from '../../lib/backupService';

interface BackupStatisticsCardProps {
  stats: BackupStats;
}

export default function BackupStatisticsCard({ stats }: BackupStatisticsCardProps) {
  const items = [
    {
      label: 'Automatic Snapshots',
      value: stats.automaticBackups,
      sub: '24-Hour Cycle',
      icon: Cloud,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Manual Snapshots',
      value: stats.manualBackups,
      sub: 'User Triggered',
      icon: Sparkles,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Successful Restores',
      value: stats.successfulRestores,
      sub: 'State Rollbacks',
      icon: RotateCcw,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Failed Operations',
      value: stats.failedBackups,
      sub: 'Zero Data Loss',
      icon: AlertCircle,
      color: stats.failedBackups > 0 ? 'text-rose-400' : 'text-slate-400',
      bg: stats.failedBackups > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/10',
    },
    {
      label: 'Avg Backup Duration',
      value: `${stats.averageBackupDurationSec}s`,
      sub: 'Compression + Upload',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Avg Restore Time',
      value: `${stats.averageRestoreDurationSec}s`,
      sub: 'Decryption + Write',
      icon: Zap,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
    },
    {
      label: 'Largest Snapshot',
      value: BackupService.formatSize(stats.largestBackupBytes),
      sub: 'Peak Historical Size',
      icon: HardDrive,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Smallest Snapshot',
      value: BackupService.formatSize(stats.smallestBackupBytes),
      sub: 'Baseline Size',
      icon: FileCheck,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Enterprise Backup Statistics</h3>
            <p className="text-xs text-slate-400">High-precision snapshot duration, frequency, and storage analytics</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <TrendingUp size={13} />
          <span>{stats.successRate}% Success Rate</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 truncate">{it.label}</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${it.bg} ${it.color}`}>
                  <Icon size={13} />
                </div>
              </div>
              <div className="text-base font-bold text-white">{it.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{it.sub}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
