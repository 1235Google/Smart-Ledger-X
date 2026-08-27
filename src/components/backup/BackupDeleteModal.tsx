import React from 'react';
import { motion } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { BackupMetadata } from '../../types';
import AnimatedButton from '../ui/AnimatedButton';

interface BackupDeleteModalProps {
  backup: BackupMetadata | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function BackupDeleteModal({
  backup,
  isDeleting,
  onConfirm,
  onClose,
}: BackupDeleteModalProps) {
  if (!backup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md rounded-[28px] bg-[#0d101a] border border-white/[0.08] p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Delete Cloud Backup</h3>
              <p className="text-xs text-slate-400 mt-0.5">Permanent cloud deletion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-white font-mono">{backup.name}</span>? This will permanently remove the encrypted archive from Firebase Cloud Storage and Firestore.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <AnimatedButton
            onClick={onConfirm}
            disabled={isDeleting}
            icon={<Trash2 size={16} />}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </AnimatedButton>
        </div>
      </motion.div>
    </div>
  );
}
