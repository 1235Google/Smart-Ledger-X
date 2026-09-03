import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileJson, X, Copy, Check, ShieldCheck, Database, HardDrive, Cpu, Terminal } from 'lucide-react';
import { BackupMetadata } from '../../types';
import { BackupService } from '../../lib/backupService';

interface BackupDetailsModalProps {
  backup: BackupMetadata | null;
  onClose: () => void;
}

export default function BackupDetailsModal({ backup, onClose }: BackupDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!backup) return null;

  const jsonString = JSON.stringify(backup, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl rounded-[28px] bg-[#0d101a] border border-white/[0.08] p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <FileJson size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Snapshot Technical Manifest</h3>
              <p className="text-xs text-slate-400 mt-0.5">Highly secure encryption and safe backup details</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Grid Spec */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-slate-400 text-[10px] block uppercase">Format</span>
            <span className="font-semibold text-white font-mono">AES-256-CBC</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-slate-400 text-[10px] block uppercase">Archive Size</span>
            <span className="font-semibold text-indigo-300 font-mono">{BackupService.formatSize(backup.size)}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-slate-400 text-[10px] block uppercase">Compression</span>
            <span className="font-semibold text-emerald-300 font-mono">DEFLATE Lv9</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-slate-400 text-[10px] block uppercase">Version</span>
            <span className="font-semibold text-white font-mono">v{backup.version}</span>
          </div>
        </div>

        {/* SHA-256 Checksum Box */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex-shrink-0 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Cryptographic SHA-256 Checksum
          </span>
          <div className="font-mono text-xs text-indigo-300 break-all bg-black/40 p-2 rounded-lg border border-white/5">
            {backup.checksumSha256 || backup.checksum || 'N/A'}
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-2 min-h-0">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal size={14} className="text-indigo-400" />
              <span>Raw Metadata Document</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors border border-indigo-500/20"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-[#07080f] rounded-xl p-3 border border-white/[0.06] font-mono text-[11px] text-slate-300">
            <pre>{jsonString}</pre>
          </div>
        </div>

        <div className="pt-2 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
