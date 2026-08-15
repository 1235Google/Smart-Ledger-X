import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, Loader2, ShieldCheck, Database } from 'lucide-react';
import Skeleton from './Skeleton';
import AnimatedButton from './AnimatedButton';
import { DataLoadStatus } from '../../types';

interface DataStateGuardProps {
  status: DataLoadStatus;
  error?: string | null;
  onRetry?: () => void;
  loadingMessage?: string;
  skeletonType?: 'dashboard' | 'table' | 'cards' | 'default';
  children: React.ReactNode;
}

export default function DataStateGuard({
  status,
  error,
  onRetry,
  loadingMessage = 'Loading your financial records...',
  skeletonType = 'default',
  children,
}: DataStateGuardProps) {
  if (status === 'loading') {
    return (
      <div className="w-full space-y-6 animate-pulse" role="status" aria-label="Loading data">
        {/* Loading header banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{loadingMessage}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Syncing with encrypted cloud database...
            </p>
          </div>
        </div>

        {/* Dynamic Skeleton Placeholder depending on page layout */}
        {skeletonType === 'dashboard' && (
          <div className="space-y-6">
            <Skeleton variant="rectangular" className="w-full h-44 rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton variant="rectangular" className="h-32 rounded-3xl" />
              <Skeleton variant="rectangular" className="h-32 rounded-3xl" />
            </div>
            <div className="space-y-3">
              <Skeleton variant="text" className="w-36 h-6" />
              <Skeleton variant="rectangular" className="w-full h-20 rounded-2xl" />
              <Skeleton variant="rectangular" className="w-full h-20 rounded-2xl" />
              <Skeleton variant="rectangular" className="w-full h-20 rounded-2xl" />
            </div>
          </div>
        )}

        {skeletonType === 'table' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton variant="rectangular" className="w-64 h-10 rounded-xl" />
              <Skeleton variant="rectangular" className="w-32 h-10 rounded-xl" />
            </div>
            <div className="border border-white/10 rounded-3xl p-6 bg-black/40 space-y-4">
              <Skeleton variant="rectangular" className="w-full h-8 rounded-lg" />
              <Skeleton variant="rectangular" className="w-full h-14 rounded-xl" />
              <Skeleton variant="rectangular" className="w-full h-14 rounded-xl" />
              <Skeleton variant="rectangular" className="w-full h-14 rounded-xl" />
              <Skeleton variant="rectangular" className="w-full h-14 rounded-xl" />
            </div>
          </div>
        )}

        {skeletonType === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton variant="rectangular" className="h-44 rounded-3xl" />
            <Skeleton variant="rectangular" className="h-44 rounded-3xl" />
            <Skeleton variant="rectangular" className="h-44 rounded-3xl" />
          </div>
        )}

        {skeletonType === 'default' && (
          <div className="space-y-4">
            <Skeleton variant="rectangular" className="w-full h-36 rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton variant="rectangular" className="h-28 rounded-2xl" />
              <Skeleton variant="rectangular" className="h-28 rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full p-8 rounded-3xl border border-red-500/30 bg-red-950/20 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-4 max-w-2xl mx-auto my-8 shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Unable to load your records</h2>
          <p className="text-sm text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
            <Database size={16} />
            Your data has NOT been deleted.
          </p>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {error || 'A network interruption or authentication synchronization delay prevented loading your latest database entries.'}
          </p>
        </div>
        {onRetry && (
          <AnimatedButton
            variant="primary"
            onClick={onRetry}
            icon={<RefreshCw size={16} />}
            className="mt-2"
          >
            Retry Connection
          </AnimatedButton>
        )}
      </motion.div>
    );
  }

  return <>{children}</>;
}
