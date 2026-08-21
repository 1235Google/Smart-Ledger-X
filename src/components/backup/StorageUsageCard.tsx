import React from 'react';
import { motion } from 'motion/react';
import { HardDrive, Zap, Database, Layers, CheckCircle2 } from 'lucide-react';
import { BackupStats, BackupService } from '../../lib/backupService';

interface StorageUsageCardProps {
  stats: BackupStats;
}

export default function StorageUsageCard({ stats }: StorageUsageCardProps) {
  const totalUsedMb = (stats.totalStorageBytes / (1024 * 1024)).toFixed(1);
  const quotaGb = 5.0;
  const quotaBytes = quotaGb * 1024 * 1024 * 1024;
  const usagePercentage = Math.min(100, Math.max(0.5, (stats.totalStorageBytes / quotaBytes) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative overflow-hidden"
    >
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <HardDrive size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Cloud Storage Quota</h3>
            <p className="text-xs text-slate-400">Tier: Enterprise Encrypted Pool</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
          5 GB Limit
        </span>
      </div>

      {/* Progress Bar & Numerical readout */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Storage Consumed</span>
          <span className="text-white font-bold">
            {BackupService.formatSize(stats.totalStorageBytes)} <span className="text-slate-500 font-normal">/ {quotaGb} GB ({usagePercentage.toFixed(2)}%)</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, usagePercentage)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
          />
        </div>
      </div>

      {/* Storage Breakdown Details */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/5">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase tracking-wider mb-1">
            <Database size={13} className="text-blue-400" />
            <span>Available</span>
          </div>
          <div className="text-sm font-bold text-slate-200">
            {BackupService.formatSize(stats.availableStorageBytes)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase tracking-wider mb-1">
            <Layers size={13} className="text-indigo-400" />
            <span>Snapshots</span>
          </div>
          <div className="text-sm font-bold text-white">
            {stats.totalBackups} <span className="text-[11px] text-slate-500 font-normal">Stored</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase tracking-wider mb-1">
            <Zap size={13} className="text-emerald-400" />
            <span>Compressed</span>
          </div>
          <div className="text-sm font-bold text-emerald-400">
            {stats.compressionRatio}% <span className="text-[11px] text-slate-500 font-normal">Saved</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
