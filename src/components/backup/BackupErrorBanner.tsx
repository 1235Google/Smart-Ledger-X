import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, X, LogIn, Wifi, ShieldAlert, Database } from 'lucide-react';
import { AuthErrorInfo } from '../../lib/backupAuth';

interface BackupErrorBannerProps {
  error: AuthErrorInfo | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export default function BackupErrorBanner({ error, onRetry, onDismiss }: BackupErrorBannerProps) {
  if (!error) return null;

  const getErrorIcon = (code: string) => {
    switch (code) {
      case 'NETWORK_UNAVAILABLE':
        return <Wifi className="text-amber-400 flex-shrink-0" size={20} />;
      case 'SESSION_EXPIRED':
      case 'AUTH_CANCELLED':
        return <LogIn className="text-rose-400 flex-shrink-0" size={20} />;
      case 'PERMISSION_DENIED':
        return <ShieldAlert className="text-rose-400 flex-shrink-0" size={20} />;
      case 'QUOTA_EXCEEDED':
        return <Database className="text-amber-400 flex-shrink-0" size={20} />;
      default:
        return <AlertTriangle className="text-rose-400 flex-shrink-0" size={20} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-5 bg-rose-500/10 border border-rose-500/25 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl shadow-lg"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-rose-500/20 rounded-xl mt-0.5 sm:mt-0">
          {getErrorIcon(error.code)}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">{error.title}</h4>
          <p className="text-xs text-rose-200/80 mt-0.5 leading-relaxed">{error.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {error.canRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-xl transition-all border border-rose-500/30 shadow-sm"
          >
            <RefreshCw size={13} />
            <span>{error.actionLabel || 'Retry'}</span>
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
