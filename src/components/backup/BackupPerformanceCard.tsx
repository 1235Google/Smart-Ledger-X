import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Clock, 
  Lock, 
  UploadCloud, 
  DownloadCloud, 
  Cpu, 
  Gauge, 
  Archive 
} from 'lucide-react';
import { BackupPerformanceMetrics } from '../../types';

interface BackupPerformanceCardProps {
  metrics: BackupPerformanceMetrics;
}

export default function BackupPerformanceCard({ metrics }: BackupPerformanceCardProps) {
  const metricsList = [
    {
      label: 'Avg Backup Duration',
      value: `${(metrics.backupDurationMs / 1000).toFixed(2)}s`,
      sub: 'End-to-end cycle',
      icon: Clock,
      color: 'text-blue-400',
    },
    {
      label: 'Avg Restore Duration',
      value: `${(metrics.restoreDurationMs / 1000).toFixed(2)}s`,
      sub: 'Decryption & sync',
      icon: Zap,
      color: 'text-indigo-400',
    },
    {
      label: 'DEFLATE Compression',
      value: `${metrics.compressionTimeMs}ms`,
      sub: 'Level 9 max ratio',
      icon: Archive,
      color: 'text-purple-400',
    },
    {
      label: 'AES-256 Encryption',
      value: `${metrics.encryptionTimeMs}ms`,
      sub: 'CBC Zero-knowledge',
      icon: Lock,
      color: 'text-teal-400',
    },
    {
      label: 'Upload Throughput',
      value: `${metrics.uploadSpeedKbps} KB/s`,
      sub: 'Firebase Storage pipeline',
      icon: UploadCloud,
      color: 'text-emerald-400',
    },
    {
      label: 'Download Speed',
      value: `${metrics.downloadSpeedKbps} KB/s`,
      sub: 'Direct cloud bucket stream',
      icon: DownloadCloud,
      color: 'text-cyan-400',
    },
    {
      label: 'Average Pipeline Speed',
      value: `${metrics.averageBackupSpeedKbps} KB/s`,
      sub: 'Aggregate efficiency',
      icon: Gauge,
      color: 'text-amber-400',
    },
    {
      label: 'Efficiency Ratio',
      value: `${metrics.compressionRatio}%`,
      sub: 'Bandwidth saved',
      icon: Cpu,
      color: 'text-sky-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gauge size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Performance & Speed Benchmarks</h3>
            <p className="text-xs text-slate-400">Hardware acceleration, network throughput, and cipher latency</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
          Hardware Accelerated
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {metricsList.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-slate-400 truncate">{m.label}</span>
                <Icon size={14} className={m.color} />
              </div>
              <div className="text-base font-bold text-white">{m.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{m.sub}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
