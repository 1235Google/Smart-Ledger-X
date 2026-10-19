import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert, WifiOff } from 'lucide-react';
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
    containerClass: string;
    textClass: string;
    dotClass: string;
    animate: boolean;
  }> = {
    synced: {
      icon: CheckCircle2,
      label: 'Live',
      containerClass: 'bg-[var(--md-sys-color-success-container)]/70 border-[var(--md-sys-color-success)]/30 text-[var(--md-sys-color-on-success-container)]',
      textClass: 'text-[var(--md-sys-color-on-success-container)] font-semibold',
      dotClass: 'bg-[var(--md-sys-color-success)] shadow-xs',
      animate: false,
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing...',
      containerClass: 'bg-[var(--md-sys-color-tertiary-container)]/70 border-[var(--md-sys-color-tertiary)]/30 text-[var(--md-sys-color-on-tertiary-container)]',
      textClass: 'text-[var(--md-sys-color-on-tertiary-container)] font-semibold',
      dotClass: 'bg-[var(--md-sys-color-tertiary)] animate-ping',
      animate: true,
    },
    offline: {
      icon: WifiOff,
      label: 'Offline',
      containerClass: 'bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline-variant)]/40 text-[var(--md-sys-color-on-surface-variant)]',
      textClass: 'text-[var(--md-sys-color-on-surface-variant)] font-medium',
      dotClass: 'bg-[var(--md-sys-color-outline)]',
      animate: false,
    },
    auth_error: {
      icon: ShieldAlert,
      label: 'Auth Error',
      containerClass: 'bg-[var(--md-sys-color-error-container)] border-[var(--md-sys-color-error)]/40 text-[var(--md-sys-color-on-error-container)]',
      textClass: 'text-[var(--md-sys-color-on-error-container)] font-bold',
      dotClass: 'bg-[var(--md-sys-color-error)]',
      animate: false,
    },
    permission_error: {
      icon: AlertCircle,
      label: 'Permission Error',
      containerClass: 'bg-[var(--md-sys-color-error-container)] border-[var(--md-sys-color-error)]/40 text-[var(--md-sys-color-on-error-container)]',
      textClass: 'text-[var(--md-sys-color-on-error-container)] font-bold',
      dotClass: 'bg-[var(--md-sys-color-error)]',
      animate: false,
    },
    network_error: {
      icon: CloudOff,
      label: 'Network Error',
      containerClass: 'bg-[var(--md-sys-color-error-container)]/70 border-[var(--md-sys-color-error)]/40 text-[var(--md-sys-color-on-error-container)]',
      textClass: 'text-[var(--md-sys-color-on-error-container)] font-semibold',
      dotClass: 'bg-[var(--md-sys-color-error)]',
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
        transition={{ duration: 0.15 }}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border transition-colors select-none shadow-xs',
          config.containerClass,
          className
        )}
        title={`Cloud Firestore Status: ${config.label}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dotClass)} />
        </span>
        <Icon
          size={13}
          className={cn(config.textClass, config.animate && 'animate-spin')}
        />
        <span className={cn('hidden sm:inline font-mono tracking-tight text-[11px]', config.textClass)}>
          {config.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
