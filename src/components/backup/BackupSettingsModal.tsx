import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, X, Shield, Clock, HardDrive, Check, Save } from 'lucide-react';
import { BackupSettings } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import AnimatedButton from '../ui/AnimatedButton';

interface BackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackupSettingsModal({ isOpen, onClose }: BackupSettingsModalProps) {
  const { backupSettings, updateBackupSettings } = useStore();
  const { showSuccess } = useToast();

  const [frequency, setFrequency] = useState<'12h' | '24h' | '7d'>(backupSettings?.frequency || '24h');
  const [retention, setRetention] = useState<'10' | '25' | '30' | 'unlimited'>(backupSettings?.retention || '30');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(backupSettings?.autoBackupEnabled ?? true);
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(backupSettings?.notifyOnSuccess ?? true);

  if (!isOpen) return null;

  const handleSave = () => {
    updateBackupSettings({
      ...backupSettings,
      frequency,
      retention,
      autoBackupEnabled,
      notifyOnSuccess,
    });

    showSuccess('Settings Updated', 'Automated backup preferences and retention rules saved.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg rounded-[28px] bg-[#0d101a] border border-white/[0.08] p-6 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Backup Engine Configuration</h3>
              <p className="text-xs text-slate-400 mt-0.5">Automated schedules and retention policy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4 text-xs">
          {/* Enable Auto Backup */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-white">Automated Background Backup</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">Automatically take encrypted snapshots at scheduled intervals</p>
            </div>
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              onChange={(e) => setAutoBackupEnabled(e.target.checked)}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          {/* Schedule Frequency */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            <label className="font-semibold text-white block">Snapshot Interval</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as '12h' | '24h' | '7d')}
              className="w-full bg-[#07080f] border border-white/[0.08] text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
            >
              <option value="12h">Every 12 Hours</option>
              <option value="24h">Every 24 Hours (Standard)</option>
              <option value="7d">Every 7 Days</option>
            </select>
          </div>

          {/* Retention Limit */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            <label className="font-semibold text-white block">Snapshot Retention Limit</label>
            <p className="text-slate-400 text-[11px]">Automatically prune older backups to manage Cloud Storage capacity</p>
            <select
              value={retention}
              onChange={(e) => setRetention(e.target.value as '10' | '25' | '30' | 'unlimited')}
              className="w-full bg-[#07080f] border border-white/[0.08] text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
            >
              <option value="10">Keep Last 10 Snapshots</option>
              <option value="25">Keep Last 25 Snapshots</option>
              <option value="30">Keep Last 30 Snapshots (Recommended)</option>
              <option value="unlimited">Unlimited (Manual Prune Only)</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-white">System Notifications</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">Show notifications when automated backups finish</p>
            </div>
            <input
              type="checkbox"
              checked={notifyOnSuccess}
              onChange={(e) => setNotifyOnSuccess(e.target.checked)}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <AnimatedButton
            onClick={handleSave}
            icon={<Save size={16} />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30"
          >
            Save Configuration
          </AnimatedButton>
        </div>
      </motion.div>
    </div>
  );
}
