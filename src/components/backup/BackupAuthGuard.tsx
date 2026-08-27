import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, LogIn, RefreshCw } from 'lucide-react';
import { AuthStatusState } from '../../lib/backupAuth';
import AnimatedButton from '../ui/AnimatedButton';

interface BackupAuthGuardProps {
  authStatus: AuthStatusState;
  onSignIn: () => void;
  children: React.ReactNode;
}

export default function BackupAuthGuard({ authStatus, onSignIn, children }: BackupAuthGuardProps) {
  if (authStatus === 'loading') {
    return (
      <div className="w-full min-h-[520px] flex flex-col items-center justify-center p-8 text-center bg-[#07090e]/80 backdrop-blur-2xl rounded-[32px] border border-white/[0.06] shadow-2xl relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-md">
          {/* Animated Spinner with Pulsing Ring */}
          <div className="relative mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-400"
            />
            <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
              <Lock size={22} className="animate-pulse" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white tracking-tight">Loading secure session...</h3>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Restoring encrypted authorization tokens and validating cloud storage session credentials.
          </p>

          <div className="flex items-center gap-2 mt-6 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-[11px] text-indigo-300/80 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Zero-Knowledge Auth Verification
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || authStatus === 'error') {
    return (
      <div className="w-full min-h-[480px] flex flex-col items-center justify-center p-8 text-center bg-[#07090e]/90 backdrop-blur-2xl rounded-[32px] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
            <Shield size={28} />
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">Cloud Authentication Required</h3>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Sign in with your Google account to access your private AES-256 encrypted cloud backup vault and automated disaster recovery.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <AnimatedButton
              onClick={onSignIn}
              icon={<LogIn size={18} />}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/25 px-6 py-3 rounded-2xl"
            >
              Sign In with Google
            </AnimatedButton>
          </div>

          <p className="text-slate-500 text-xs mt-6">
            All backups are encrypted with your unique user key before leaving your device.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
