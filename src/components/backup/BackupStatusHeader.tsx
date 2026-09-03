import React from 'react';
import { motion } from 'motion/react';
import { 
  Cloud, RefreshCw, Settings as SettingsIcon, Play, 
  Wifi, WifiOff, ShieldCheck, CheckCircle2, Sparkles, UserCheck 
} from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import { User } from 'firebase/auth';

interface BackupStatusHeaderProps {
  user: User | null;
  isOnline: boolean;
  isCreating: boolean;
  isRefreshing: boolean;
  autoBackupEnabled: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onRunBackup: () => void;
}

export default function BackupStatusHeader({
  user,
  isOnline,
  isCreating,
  isRefreshing,
  autoBackupEnabled,
  onRefresh,
  onOpenSettings,
  onRunBackup,
}: BackupStatusHeaderProps) {
  return (
    <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08] relative">
      {/* Title and descriptions */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 shadow-inner">
            <Cloud size={24} className="animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Cloud Backup & Disaster Recovery
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AES-256 Cloud Vault
          </span>
        </div>

        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Highly secure backup system. Your financial records are compressed, encrypted on your device, and checked for safety before saving to Cloud Storage.
        </p>

        {/* Live system pills */}
        <div className="flex items-center gap-2.5 pt-1 flex-wrap text-xs">
          {/* Internet Status */}
          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'Cloud Sync Online' : 'Offline (Local Queue)'}</span>
          </div>

          {/* User Auth Status */}
          <div className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
            <UserCheck size={13} />
            <span className="truncate max-w-[200px]">
              {user?.email || 'Authenticated User'}
            </span>
          </div>

          {/* 24h Auto Backup Pill */}
          <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] text-slate-300 border border-white/10 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-indigo-400" />
            <span>Auto Backup: {autoBackupEnabled ? 'Active (24h)' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRefresh}
          disabled={isRefreshing || isCreating}
          className="p-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
          title="Refresh Backup List"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-2xl text-sm font-medium transition-all shadow-sm"
        >
          <SettingsIcon size={16} className="text-indigo-400" />
          <span>Config</span>
        </motion.button>

        <AnimatedButton
          onClick={onRunBackup}
          disabled={isCreating}
          icon={isCreating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
          className={`relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 px-6 py-3 rounded-2xl font-semibold text-sm transition-all ${
            isCreating ? 'ring-2 ring-indigo-400/50 cursor-not-allowed opacity-90' : ''
          }`}
        >
          {isCreating ? 'Backing up...' : 'Run Backup Now'}
        </AnimatedButton>
      </div>
    </div>
  );
}
