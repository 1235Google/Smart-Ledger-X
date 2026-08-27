import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, Lock, Unlock, Fingerprint, 
  Key, CheckCircle2, ShieldCheck, RefreshCw
} from 'lucide-react';

export default function SecurityVaultSection() {
  const [authStage, setAuthStage] = useState<'idle' | 'scanning_biometric' | 'verifying' | 'secured'>('secured');
  const [scanProgress, setScanProgress] = useState(100);

  const triggerSecurityDemo = () => {
    setAuthStage('scanning_biometric');
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAuthStage('verifying');
          setTimeout(() => {
            setAuthStage('secured');
          }, 1000);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  return (
    <section className="relative py-16 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck size={14} className="text-emerald-400" />
          Enterprise Data Protection
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Bank-Grade Security. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Encrypted & Private.
          </span>
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-400 font-medium">
          Robust client-side encryption and biometric authentication ensure only you can access your financial ledger.
        </p>
      </div>

      {/* 3-Card Security Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Card 1: Client-Side Encryption */}
        <div className="p-8 rounded-[32px] bg-gradient-to-b from-[#09111e]/90 to-[#050811]/95 border border-white/[0.12] shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center relative overflow-hidden group">
          <div className="relative w-36 h-36 my-4 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 24, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-emerald-400/30"
            />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center">
              <div className="w-full h-full bg-[#070e17] rounded-[14px] flex items-center justify-center">
                <Shield size={36} className="text-emerald-400" />
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mt-2">End-to-End Encryption</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Data is encrypted locally using industry-standard AES-256 protocols before being securely saved.
          </p>

          <div className="mt-6 w-full pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-emerald-400">
            <span>AES-256</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Active</span>
          </div>
        </div>

        {/* Card 2: Biometric Access Verification */}
        <div className="p-8 rounded-[32px] bg-gradient-to-b from-[#09111e]/90 to-[#050811]/95 border border-white/[0.12] shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center relative overflow-hidden group">
          <div className="relative w-36 h-36 my-4 flex items-center justify-center rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
            <Fingerprint size={64} className={`transition-colors duration-500 ${
              authStage === 'secured' ? 'text-emerald-400' :
              authStage === 'scanning_biometric' ? 'text-cyan-400 animate-pulse' :
              'text-indigo-400'
            }`} />

            {authStage === 'scanning_biometric' && (
              <motion.div
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              />
            )}
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mt-2">Biometric Lock</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Protect your sensitive balances and transaction details with instant biometric validation.
          </p>

          <button
            onClick={triggerSecurityDemo}
            disabled={authStage !== 'secured'}
            className="mt-6 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={13} className={authStage !== 'secured' ? 'animate-spin text-cyan-400' : ''} />
            {authStage === 'secured' ? 'Test Biometric Lock' : 'Verifying...'}
          </button>
        </div>

        {/* Card 3: Encrypted Backups & Export */}
        <div className="p-8 rounded-[32px] bg-gradient-to-b from-[#09111e]/90 to-[#050811]/95 border border-white/[0.12] shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center relative overflow-hidden group">
          <div className="relative w-36 h-36 my-4 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-cyan-400 p-0.5 shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center">
              <div className="w-full h-full bg-[#070e17] rounded-[14px] flex items-center justify-center">
                <Key size={36} className="text-cyan-300" />
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mt-2">Private Key Control</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            You hold the master passkey. Export encrypted JSON backups or generate PDF statements anytime.
          </p>

          <div className="mt-6 w-full pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-cyan-400">
            <span>Passkey Verification</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Ready</span>
          </div>
        </div>
      </div>
    </section>
  );
}
