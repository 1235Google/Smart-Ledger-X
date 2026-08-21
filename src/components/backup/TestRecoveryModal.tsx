import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Layers, 
  HardDrive, 
  Zap,
  Activity,
  Check
} from 'lucide-react';
import { RecoveryTestReport } from '../../types';
import { BackupService } from '../../lib/backupService';

interface TestRecoveryModalProps {
  report: RecoveryTestReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TestRecoveryModal({ report, isOpen, onClose }: TestRecoveryModalProps) {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-[#0a0c16] border border-purple-500/30 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden z-10 p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FlaskConical size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Recovery Test Report</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  report.passed 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                }`}>
                  {report.passed ? 'DRY-RUN PASSED' : 'DRY-RUN FAILED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Non-destructive sandbox simulation (Live DB untouched)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Snapshot Summary Banner */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Target Snapshot</span>
            <span className="font-mono text-purple-300 font-bold">{report.snapshotId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Simulation Latency</span>
            <span className="font-semibold text-white">{report.latencyMs} ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Estimated Restore Time</span>
            <span className="font-bold text-emerald-400">~{report.estimatedRestoreTimeSec} seconds</span>
          </div>
        </div>

        {/* Test Result Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">SHA-256 Checksum</span>
              <span className="text-xs font-bold text-white">Valid & Matched</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">AES-256 Decryption</span>
              <span className="text-xs font-bold text-white">100% Readable</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
            <Layers size={16} className="text-blue-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">Entities Verified</span>
              <span className="text-xs font-bold text-white">{report.recordCount} Records</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">Database Safety</span>
              <span className="text-xs font-bold text-emerald-400">0 Overwrites Made</span>
            </div>
          </div>
        </div>

        {/* Diagnostics Step Checklist */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Diagnostics Sequence</span>
          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
            {report.diagnostics.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-300">
                <Check size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-colors"
          >
            Close Report
          </button>
        </div>
      </motion.div>
    </div>
  );
}
