import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Database, 
  Upload, 
  Download, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  Palette, 
  Sun, 
  Moon, 
  Laptop, 
  Sparkles,
  Cloud,
  Layers,
  Key
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { useM3Theme, M3ThemeMode } from '../../components/admin/material3/M3ThemeContext';
import { BackupService } from '../../lib/backupService';

export default function AdminSettings() {
  const store = useStore();
  const { importData, updateAdminPassword, isAdminAuthenticated, adminUser } = store;
  const { showSuccess, showError, showInfo } = useToast();
  const { mode, setMode, resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPass || !newPass || !confirmPass) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('New passwords do not match.');
      return;
    }
    if (newPass.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateAdminPassword(currentPass, newPass);
      if (result.success) {
        showSuccess('Password Updated', 'Master fallback security password changed successfully.');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setError(result.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importData(json);
        showSuccess('Data Imported', 'Ledger entries and settings successfully updated from file.');
      } catch (err) {
        showError('Invalid File', 'Unable to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
          Admin Console Settings
        </h1>
        <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
          Configure Material 3 theme preferences, fallback passwords, and ledger data imports.
        </p>
      </div>

      {/* Theme Preference Card */}
      <M3Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3.5 mb-5">
          <div className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center',
            isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
          )}>
            <Palette size={20} />
          </div>
          <div>
            <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Material 3 Appearance & Theme
            </h2>
            <p className={cn('text-xs', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              Switch between Light, Dark, or System mode with instant UI re-theming.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'light' as M3ThemeMode, label: 'Light Mode', desc: 'Google M3 Light Canvas', icon: Sun },
            { id: 'dark' as M3ThemeMode, label: 'Dark Mode', desc: 'M3 OLED Dark Tones', icon: Moon },
            { id: 'system' as M3ThemeMode, label: 'System Default', desc: 'Sync with OS Theme', icon: Laptop },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={cn(
                  'p-4 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[110px]',
                  isSelected
                    ? isDark
                      ? 'bg-[#004a77]/40 border-[#a8c7fa] text-white'
                      : 'bg-[#c2e7ff]/50 border-[#0b57d0] text-black'
                    : isDark
                    ? 'bg-[#1e1f20] border-[#3c4043] hover:border-slate-500 text-slate-300'
                    : 'bg-[#f0f4f9] border-[#e1e3e1] hover:border-slate-400 text-slate-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon size={20} className={isSelected ? 'text-[#0b57d0] dark:text-[#a8c7fa]' : 'text-slate-400'} />
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa]" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm">{t.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </M3Card>

      {/* Fallback Master Password Card */}
      <M3Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3.5 mb-5">
          <div className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center',
            isDark ? 'bg-[#5c3e00] text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]'
          )}>
            <Key size={20} />
          </div>
          <div>
            <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Fallback Security Passcode
            </h2>
            <p className={cn('text-xs', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              Used exclusively if Google OAuth popup is offline or blocked.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
          <M3TextField
            label="Current Fallback Password"
            type={showPass ? 'text' : 'password'}
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <M3TextField
              label="New Master Password"
              type={showPass ? 'text' : 'password'}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
            />
            <M3TextField
              label="Confirm New Password"
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPass}
                onChange={(e) => setShowPass(e.target.checked)}
                className="w-4 h-4 rounded text-[#0b57d0] accent-[#0b57d0] dark:accent-[#a8c7fa]"
              />
              <span>Show password characters</span>
            </label>

            <M3Button variant="filled" loading={isLoading}>
              Update Password
            </M3Button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </form>
      </M3Card>

      {/* Manual File Import Card */}
      <M3Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3.5 mb-5">
          <div className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center',
            isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]'
          )}>
            <Database size={20} />
          </div>
          <div>
            <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Manual Ledger File Import
            </h2>
            <p className={cn('text-xs', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              Restore transactions or migrate data from an offline JSON backup file.
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json"
          className="hidden"
        />

        <div className="flex items-center gap-3">
          <M3Button
            variant="tonal"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
          >
            Select JSON Backup File
          </M3Button>
        </div>
      </M3Card>
    </div>
  );
}
