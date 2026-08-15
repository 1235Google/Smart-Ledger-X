import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert, WifiOff } from 'lucide-react';
import { subscribeToSyncStatus, SyncStatus } from '../lib/cloudSync';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function SyncStatusBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState<SyncStatus>('synced');

  useEffect(() => {
    return subscribeToSyncStatus(setStatus);
  }, []);

  const configMap: Record<SyncStatus, {
    icon: any;
    label: string;
    color: string;
    bg: string;
    dot: string;
    animate: boolean;
  }> = {
    synced: {
      icon: CheckCircle2,
      label: 'Synced',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
      animate: false,
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing...',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      dot: 'bg-amber-400 animate-ping',
      animate: true,
    },
    offline: {
      icon: WifiOff,
      label: 'Offline',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      dot: 'bg-rose-400',
      animate: false,
    },
    auth_error: {
      icon: ShieldAlert,
      label: 'Auth Error',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      dot: 'bg-rose-400',
      animate: false,
    },
    permission_error: {
      icon: AlertCircle,
      label: 'Permission Error',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      dot: 'bg-rose-400',
      animate: false,
    },
    network_error: {
      icon: CloudOff,
      label: 'Network Error',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      dot: 'bg-rose-400',
      animate: false,
    },
  };

  const config = configMap[status] || configMap.synced;
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-colors select-none',
          config.bg,
          className
        )}
        title={`Cloud Firestore Status: ${config.label}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
        </span>
        <Icon
          size={13}
          className={cn(config.color, config.animate && 'animate-spin')}
        />
        <span className={cn('hidden sm:inline font-mono tracking-tight', config.color)}>
          {config.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
