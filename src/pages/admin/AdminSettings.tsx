import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Database, Upload, Download, CheckCircle2, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function AdminSettings() {
  const { importData, updateAdminPassword, isAdminAuthenticated } = useStore();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  const currentPassInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    currentPassInputRef.current?.focus();
  }, []);

  const validateNewPassword = (pwd: string, currPwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter.";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number.";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      return "Password must contain at least one special character.";
    }
    if (pwd === currPwd) {
      return "New password cannot be the same as current password.";
    }
    return null;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPassSuccess(false);

    if (!isAdminAuthenticated) {
      setError("Authentication session expired. Please log in again.");
      return;
    }

    if (lockoutTime && Date.now() < lockoutTime) {
      const remainingSecs = Math.ceil((lockoutTime - Date.now()) / 1000);
      setError(`Too many failed attempts. Please wait ${remainingSecs} seconds before trying again.`);
      return;
    }

    const cPass = currentPass.trim();
    const nPass = newPass.trim();
    const confPass = confirmPass.trim();

    if (!cPass || !nPass || !confPass) {
      setError("Please fill in all password fields.");
      return;
    }

    if (nPass !== confPass) {
      setError("New passwords do not match.");
      return;
    }

    const valError = validateNewPassword(nPass, cPass);
    if (valError) {
      setError(valError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateAdminPassword(cPass, nPass);

      if (!result.success) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);

        if (nextFailed >= 5) {
          const lockUntil = Date.now() + 5 * 60 * 1000;
          setLockoutTime(lockUntil);
          setError("Too many failed attempts. Please wait 5 minutes before trying again.");
        } else {
          setError(result.error || "Current password is incorrect.");
        }
        setIsLoading(false);
        return;
      }

      setFailedAttempts(0);
      setLockoutTime(null);
      setPassSuccess(true);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setIsLoading(false);

      setTimeout(() => {
        setPassSuccess(false);
      }, 4000);

    } catch (err: any) {
      setIsLoading(false);
      if (err.message?.includes('network') || !navigator.onLine) {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleBackupDatabase = () => {
    const data = localStorage.getItem('smart-ledger-data') || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartledgerx_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        importData(parsed);
        alert("Database restored successfully from backup.");
      } catch (err) {
        alert("Invalid backup file format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Settings</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage administrator credentials, security preferences, and database backups.</p>
      </div>

      {/* Change Password */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Change Admin Password</h2>
            <p className="text-neutral-400 text-sm">Update your secure portal authentication credentials</p>
          </div>
        </div>

        {passSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3"
          >
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span className="font-medium">Password updated successfully.</span>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
          >
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input 
                type={showCurrentPass ? "text" : "password"} 
                value={currentPass} 
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="••••••••" 
                required
                autoFocus
                ref={currentPassInputRef}
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors"
                title={showCurrentPass ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              New Password
            </label>
            <div className="relative">
              <input 
                type={showNewPass ? "text" : "password"} 
                value={newPass} 
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••" 
                required
                autoComplete="new-password"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors"
                title={showNewPass ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {newPass.length > 0 && (
              <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-neutral-400">
                <div className={`flex items-center gap-1.5 ${newPass.length >= 8 ? 'text-emerald-400 font-medium' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${newPass.length >= 8 ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  8+ characters
                </div>
                <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPass) ? 'text-emerald-400 font-medium' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPass) ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  1 Uppercase
                </div>
                <div className={`flex items-center gap-1.5 ${/[a-z]/.test(newPass) ? 'text-emerald-400 font-medium' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPass) ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  1 Lowercase
                </div>
                <div className={`flex items-center gap-1.5 ${/[0-9]/.test(newPass) ? 'text-emerald-400 font-medium' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPass) ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  1 Number
                </div>
                <div className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass) ? 'text-emerald-400 font-medium' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass) ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  1 Special char
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input 
                type={showConfirmPass ? "text" : "password"} 
                value={confirmPass} 
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••" 
                required
                autoComplete="new-password"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors"
                title={showConfirmPass ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Database Backup & Restore</h2>
            <p className="text-neutral-400 text-sm">Download encrypted JSON backups or restore system state</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleBackupDatabase}
            className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-emerald-500/40 text-left transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <div>
              <div className="font-bold text-white text-base">Backup Database</div>
              <div className="text-xs text-neutral-400 mt-0.5">Download full JSON snapshot</div>
            </div>
          </button>

          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleRestoreBackup} 
            className="hidden" 
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-blue-500/40 text-left transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div>
              <div className="font-bold text-white text-base">Restore Backup</div>
              <div className="text-xs text-neutral-400 mt-0.5">Upload JSON restore file</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

