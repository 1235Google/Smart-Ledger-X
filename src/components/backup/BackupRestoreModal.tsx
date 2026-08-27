import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, AlertTriangle, X, Check, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { BackupMetadata } from '../../types';
import { BackupService } from '../../lib/backupService';
import AnimatedButton from '../ui/AnimatedButton';

interface BackupRestoreModalProps {
  backup: BackupMetadata | null;
  isRestoring: boolean;
  progressMsg: string;
  progressPercent: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function BackupRestoreModal({
  backup,
  isRestoring,
  progressMsg,
  progressPercent,
  onConfirm,
  onClose,
}: BackupRestoreModalProps) {
  if (!backup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg rounded-[28px] bg-[#0d101a] border border-white/[0.08] p-6 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <RotateCcw size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Restore Cloud Snapshot</h3>
              <p className="text-xs text-slate-400 mt-0.5">Point-in-time state rollback with SHA-256 verification</p>
            </div>
          </div>

          {!isRestoring && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Snapshot Summary Box */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Snapshot Name:</span>
            <span className="font-semibold text-white font-mono">{backup.name}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Created At:</span>
            <span>{new Date(backup.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Archive Size:</span>
            <span className="font-mono text-indigo-300 font-semibold">{BackupService.formatSize(backup.size)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Record Counts:</span>
            <span>{backup.itemCounts?.transactions || 0} Transactions, {backup.itemCounts?.customers || 0} Customers</span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Restoring will replace your current active ledger and state with the exact contents of this snapshot.
          </span>
        </div>

        {/* Active Restore Progress Indicator */}
        {isRestoring && (
          <div className="space-y-3 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20">
            <div className="flex items-center justify-between text-xs text-indigo-300">
              <span className="font-medium">{progressMsg || 'Restoring...'}</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                style={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!isRestoring && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
          )}

          <AnimatedButton
            onClick={onConfirm}
            disabled={isRestoring}
            icon={isRestoring ? <RefreshCw className="animate-spin" size={16} /> : <RotateCcw size={16} />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30"
          >
            {isRestoring ? 'Restoring Ledger...' : 'Confirm & Restore'}
          </AnimatedButton>
        </div>
      </motion.div>
    </div>
  );
}
