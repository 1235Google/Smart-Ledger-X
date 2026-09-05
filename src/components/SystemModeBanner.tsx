import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw,
  Eye,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

interface SystemModeBannerProps {
  isAdmin?: boolean;
}

export default function SystemModeBanner({ isAdmin = false }: SystemModeBannerProps) {
  const { systemConfig, setSystemMode } = useStore();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [isRestoring, setIsRestoring] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!systemConfig.expectedEndAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(systemConfig.expectedEndAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expiring soon');
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        setTimeRemaining(`${hours > 0 ? `${hours}h ` : ''}${remMins}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 5000);
    return () => clearInterval(interval);
  }, [systemConfig.expectedEndAt]);

  // Reset dismissed state if mode changes
  useEffect(() => {
    setIsDismissed(false);
  }, [systemConfig.mode]);

  if (systemConfig.mode === 'normal') {
    return null;
  }

  if (isDismissed && !isAdmin) {
    return null;
  }

  const handleQuickRestore = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      await setSystemMode('normal', 'Restored to normal operation from admin banner');
      showSuccess('System Mode Restored', 'SmartLedger is now operating in Normal Mode.');
    } catch (err: any) {
      showError('Failed to Restore', err?.message || 'Could not update system mode.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (systemConfig.mode === 'readonly') {
    return (
      <div className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-amber-600/20 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 sm:px-6 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <Eye size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-100 uppercase tracking-wider text-[11px] bg-amber-500/30 px-2 py-0.5 rounded-full border border-amber-500/40">
                  Read-Only Mode
                </span>
                <span className="font-semibold text-amber-200">
                  Financial modifications and new records are temporarily disabled.
                </span>
              </div>
              {systemConfig.reason && (
                <p className="text-[11px] text-amber-300/80 mt-0.5 truncate">
                  Reason: &ldquo;{systemConfig.reason}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {timeRemaining && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                <Clock size={12} />
                <span>Ends in ~{timeRemaining}</span>
              </span>
            )}

            {isAdmin ? (
              <button
                onClick={handleQuickRestore}
                disabled={isRestoring}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60"
              >
                <RotateCcw size={12} className={isRestoring ? 'animate-spin' : ''} />
                <span>{isRestoring ? 'Restoring...' : 'Switch to Normal'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 text-amber-300/70 hover:text-amber-100 rounded-md transition-colors"
                title="Dismiss Banner"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Maintenance mode banner (rendered in Admin Console when admin is diagnosing)
  if (systemConfig.mode === 'maintenance') {
    return (
      <div className="w-full bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-amber-950/90 border-b border-rose-500/40 text-rose-200 px-4 py-3 sm:px-6 z-30 shadow-lg shadow-rose-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <span className="p-1.5 rounded-xl bg-rose-500/30 text-rose-300 shrink-0 mt-0.5 sm:mt-0 ring-1 ring-rose-500/40 animate-pulse">
              <ShieldAlert size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white uppercase tracking-wider text-[11px] bg-rose-600 px-2.5 py-0.5 rounded-full shadow-sm">
                  System Maintenance Active
                </span>
                <span className="font-bold text-white">
                  Normal users cannot use SmartLedger and are seeing the maintenance screen.
                </span>
              </div>
              <p className="text-[11px] text-rose-300/90 mt-0.5">
                {systemConfig.reason ? (
                  <span>Reason: &ldquo;{systemConfig.reason}&rdquo; &bull; </span>
                ) : null}
                <span>Admin bypass enabled: You have full repair & diagnostic access.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {timeRemaining && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-200 bg-black/40 px-2.5 py-1 rounded-lg border border-rose-500/30 font-medium">
                <Clock size={13} className="text-amber-400" />
                <span>Est. Window: ~{timeRemaining}</span>
              </span>
            )}

            {isAdmin && (
              <button
                onClick={handleQuickRestore}
                disabled={isRestoring}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                <span>{isRestoring ? 'Restoring...' : 'Bring App Online (Normal)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
