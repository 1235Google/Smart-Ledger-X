import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, Database, Lock, CheckCircle2, ArrowUpRight, 
  Sparkles, Zap, ShieldCheck, Activity, Check 
} from 'lucide-react';
import { BackupProgressInfo, BackupService } from '../../lib/backupService';

interface BackupLiveProgressRingProps {
  progress: BackupProgressInfo;
}

export default function BackupLiveProgressRing({ progress }: BackupLiveProgressRingProps) {
  const { stage, percentage, message, speedBytesPerSec, uploadedBytes, totalBytes } = progress;
  
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isCompleted = stage === 'completed';

  const stages = [
    { key: 'preparing', label: 'Preparing', icon: Database },
    { key: 'encrypting', label: 'Encrypting', icon: Lock },
    { key: 'uploading', label: 'Uploading', icon: Cloud },
    { key: 'verifying', label: 'Verifying', icon: ShieldCheck },
  ];

  const getCurrentStageIndex = () => {
    switch (stage) {
      case 'preparing': return 0;
      case 'encrypting': return 1;
      case 'uploading': return 2;
      case 'verifying':
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentIdx = getCurrentStageIndex();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#0e1222]/95 to-[#080a14]/95 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left: Animated Progress Ring & Live Stats */}
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
            {/* SVG Circular Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
              {/* Background track */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-white/[0.08]"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Animated Progress Arc */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-indigo-400 transition-all duration-500 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Centered Percentage / Success Icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40 shadow-lg shadow-emerald-500/20"
                >
                  <Check size={28} strokeWidth={3} />
                </motion.div>
              ) : (
                <>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {Math.round(percentage)}%
                  </span>
                  <span className="text-[10px] text-indigo-300/80 font-semibold uppercase tracking-wider">
                    {stage}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Text Descriptions & Live Speed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-indigo-400 animate-ping'}`} />
              <h4 className="text-lg font-bold text-white tracking-tight">
                {isCompleted ? 'Snapshot Verification Succeeded' : 'Cloud Backup in Progress'}
              </h4>
            </div>

            <p className="text-sm text-slate-300 max-w-md line-clamp-2 leading-relaxed">
              {message || 'Synchronizing zero-knowledge encrypted ledger payload with Cloud Storage...'}
            </p>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
              {speedBytesPerSec && speedBytesPerSec > 0 && (
                <div className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center gap-1 font-mono font-medium">
                  <Zap size={13} className="text-amber-400" />
                  <span>{BackupService.formatSize(speedBytesPerSec)}/s</span>
                </div>
              )}

              {uploadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0 && (
                <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-mono">
                  {BackupService.formatSize(uploadedBytes)} / {BackupService.formatSize(totalBytes)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Stage Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isDone = isCompleted || idx < currentIdx;
            const isCurrent = !isCompleted && idx === currentIdx;

            return (
              <div
                key={st.key}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center gap-2 min-w-[90px] ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200 ring-1 ring-indigo-400/30'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                }`}
              >
                <div className={`p-2 rounded-xl ${
                  isDone ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-indigo-500/30 text-indigo-300 animate-bounce' : 'bg-white/[0.04]'
                }`}>
                  <Icon size={16} />
                </div>
                <span className="text-xs font-semibold">{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
