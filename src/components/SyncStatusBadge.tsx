import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { subscribeToSyncStatus, SyncStatus } from '../lib/cloudSync';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function SyncStatusBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState<SyncStatus>('synced');

  useEffect(() => {
    return subscribeToSyncStatus(setStatus);
  }, []);

  const config = {
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
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      dot: 'bg-blue-400 animate-ping',
      animate: true,
    },
    reconnecting: {
      icon: RefreshCw,
      label: 'Reconnecting...',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      dot: 'bg-amber-400 animate-pulse',
      animate: true,
    },
    offline: {
      icon: CloudOff,
      label: 'Offline (Cached)',
      color: 'text-slate-400',
      bg: 'bg-slate-500/10 border-slate-500/20',
      dot: 'bg-slate-400',
      animate: false,
    },
    error: {
      icon: CloudOff,
      label: 'Sync Retry...',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      dot: 'bg-rose-400',
      animate: false,
    },
  }[status];

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
        title={`Cloud Firestore: ${config.label}`}
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
