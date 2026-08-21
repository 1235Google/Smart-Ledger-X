import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Flame, 
  ShieldAlert, 
  RotateCcw, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  Database,
  Lock
} from 'lucide-react';
import { BackupMetadata, AppState } from '../../types';
import { BackupService } from '../../lib/backupService';
import { useToast } from '../../context/ToastContext';

interface EmergencyRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestVerifiedSnapshot: BackupMetadata | null;
  onEmergencySuccess: (restoredState: AppState) => void;
}

export default function EmergencyRecoveryModal({
  isOpen,
  onClose,
  latestVerifiedSnapshot,
  onEmergencySuccess,
}: EmergencyRecoveryModalProps) {
  const { showSuccess, showError } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgressMsg('Initiating high-priority rollback...');
    setProgressPct(10);

    try {
      const result = await BackupService.emergencyRecovery((msg, pct) => {
        setProgressMsg(msg);
        setProgressPct(pct);
      });

      if (result.success && result.restoredState) {
        onEmergencySuccess(result.restoredState);
        setIsDone(true);
      }
    } catch (err: any) {
      showError('Emergency Recovery Failed', err?.message || 'Failed to rollback to latest verified snapshot.');
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isExecuting ? onClose : undefined}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-[#0a0c16] border border-rose-500/30 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden z-10 p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Flame size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Emergency Disaster Recovery</h3>
              <p className="text-xs text-slate-400">Immediate rollback to latest cryptographically verified snapshot</p>
            </div>
          </div>

          {!isExecuting && !isDone && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        {!isDone ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
              <ShieldAlert size={22} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <span className="font-bold text-rose-200 block">Critical System Rollback</span>
                <p>
                  This emergency procedure bypasses normal dialogs and immediately restores your ledger to the last verified safe state.
                </p>
              </div>
            </div>

            {/* Target Snapshot Details */}
            {latestVerifiedSnapshot ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Target Recovery Point</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Snapshot ID</span>
                  <span className="font-mono text-blue-300 font-bold">{latestVerifiedSnapshot.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="text-white">{new Date(latestVerifiedSnapshot.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Records Saved</span>
                  <span className="font-semibold text-emerald-400">{latestVerifiedSnapshot.itemCounts?.transactions || 0} transactions</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20">
                No verified snapshots detected. Please ensure at least one backup has completed.
              </div>
            )}

            {/* Progress Bar when running */}
            {isExecuting && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-rose-400 mx-auto" />
                <div className="text-xs font-semibold text-white">{progressMsg}</div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Emergency Recovery Succeeded!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your database has been safely restored from the verified recovery point. All balances and ledger records have re-synchronized.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {!isDone ? (
            <>
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={!latestVerifiedSnapshot || isExecuting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>Execute Emergency Rollback</span>
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-colors"
            >
              Close & Continue
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
