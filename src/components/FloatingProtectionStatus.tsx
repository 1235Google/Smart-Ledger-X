import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, AlertTriangle, XCircle, Cloud, RefreshCw } from 'lucide-react';
import { BackupService, BackupStats } from '../lib/backupService';
import { useStore } from '../context/StoreContext';

interface FloatingProtectionStatusProps {
  onClick?: () => void;
}

export default function FloatingProtectionStatus({ onClick }: FloatingProtectionStatusProps) {
  const { backupSettings } = useStore();
  const [stats, setStats] = useState<BackupStats | null>(null);

  const fetchStatus = async () => {
    try {
      const backups = await BackupService.listBackups();
      const calculated = BackupService.calculateStats(backups, backupSettings);
      setStats(calculated);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [backupSettings]);

  if (!stats) return null;

  const isHealthy = stats.status === 'healthy';
  const isWarning = stats.status === 'warning';

  const badgeConfig = isHealthy
    ? {
        color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
        label: 'Protected',
        icon: ShieldCheck,
      }
    : isWarning
    ? {
        color: 'text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
        label: 'Attention',
        icon: AlertTriangle,
      }
    : {
        color: 'text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
        label: 'Action Required',
        icon: XCircle,
      };

  const Icon = badgeConfig.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all cursor-pointer ${badgeConfig.color}`}
      title={`Cloud Backup Status: ${stats.health} | Last: ${stats.latestBackupDate ? BackupService.formatRelativeTime(stats.latestBackupDate) : 'Never'}`}
    >
      <span className={`w-2 h-2 rounded-full ${badgeConfig.dot}`} />
      <span className="truncate">{badgeConfig.label}</span>
      <span className="text-white/40 text-[10px]">•</span>
      <span className="text-[11px] font-normal text-slate-300">
        {stats.latestBackupDate ? BackupService.formatRelativeTime(stats.latestBackupDate) : 'Pending 24h Backup'}
      </span>
    </motion.button>
  );
}
