import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  FileArchive, 
  FileCode, 
  FileSpreadsheet, 
  FileText, 
  Sparkles, 
  RefreshCw,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { BackupMetadata } from '../../types';
import { BackupService } from '../../lib/backupService';
import { useToast } from '../../context/ToastContext';

interface ExportBackupModalProps {
  snapshot: BackupMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportBackupModal({ snapshot, isOpen, onClose }: ExportBackupModalProps) {
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'zip' | 'json' | 'csv' | 'excel' | 'slbx'>('zip');

  if (!isOpen || !snapshot) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await BackupService.exportBackup(snapshot.id, selectedFormat);
      showSuccess('Export Succeeded', `Backup exported in ${selectedFormat.toUpperCase()} format.`);
      onClose();
    } catch (err: any) {
      showError('Export Failed', err?.message || 'Failed to generate export file.');
    } finally {
      setIsExporting(false);
    }
  };

  const formats = [
    {
      id: 'zip' as const,
      name: 'Encrypted ZIP Archive (.zip)',
      desc: 'Industry standard DEFLATE archive containing AES-256 encrypted payload & metadata envelope.',
      icon: FileArchive,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      badge: 'Recommended',
    },
    {
      id: 'slbx' as const,
      name: 'Smart Ledger Backup (.slbx)',
      desc: 'Native Smart Ledger binary format with cryptographic signature for cross-device migration.',
      icon: Sparkles,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      badge: 'Native App',
    },
    {
      id: 'json' as const,
      name: 'Encrypted JSON (.json.enc)',
      desc: 'Standard JSON structured envelope with AES-256 ciphertext and SHA-256 signature.',
      icon: FileCode,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      badge: 'Developer',
    },
    {
      id: 'excel' as const,
      name: 'Excel Compatible (.xlsx.csv)',
      desc: 'Decrypted spreadsheet format with UTF-8 BOM encoding ready for Microsoft Excel.',
      icon: FileSpreadsheet,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      badge: 'Spreadsheet',
    },
    {
      id: 'csv' as const,
      name: 'Standard CSV Records (.csv)',
      desc: 'Plain text comma-separated transaction records compatible with Google Sheets & Numbers.',
      icon: FileText,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      badge: 'Universal',
    },
  ];

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

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-[#0a0c16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Download size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Export Cloud Snapshot</h3>
              <p className="text-xs text-slate-400">Export snapshot {snapshot.id} in your preferred data format</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formats Radio List */}
        <div className="space-y-2.5">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;

            return (
              <div
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${fmt.color} flex-shrink-0 mt-0.5`}>
                  <Icon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{fmt.name}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium">
                      {fmt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{fmt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{isExporting ? 'Generating...' : `Export .${selectedFormat}`}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
