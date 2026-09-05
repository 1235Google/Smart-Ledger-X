import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Clock, 
  RotateCw, 
  ShieldCheck, 
  Database, 
  Lock, 
  ArrowRight,
  Server,
  Sparkles,
  Info
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { systemModeService } from '../lib/systemModeService';

export default function MaintenanceScreen() {
  const { systemConfig, refreshSystemMode } = useStore();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString());
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!systemConfig.expectedEndAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(systemConfig.expectedEndAt!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining('Finishing up shortly...');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [systemConfig.expectedEndAt]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await refreshSystemMode();
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      // Handled
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-rose-500/20 selection:text-rose-300">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-rose-500/10 via-amber-500/5 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-indigo-500/5 blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 py-6 sm:px-12 flex items-center justify-between border-b border-white/[0.06] bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-500/20">
            <div className="w-full h-full bg-[#0d0e14] rounded-[14px] flex items-center justify-center">
              <ShieldAlert className="text-rose-400" size={20} />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              SmartLedger
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Maintenance
              </span>
            </h1>
            <p className="text-xs text-slate-400">Enterprise Financial System</p>
          </div>
        </div>

        <Link
          to="/admin"
          className="text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
        >
          <span>Admin Console</span>
          <ArrowRight size={14} />
        </Link>
      </header>

      {/* Center Main Stage */}
      <main className="relative z-10 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col items-center text-center my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          {/* Animated Status Beacon */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold mb-6 shadow-[0_0_24px_rgba(244,63,94,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>System Maintenance Mode Active</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            We are performing scheduled maintenance
          </h2>

          <p className="text-slate-300 text-base leading-relaxed max-w-lg mx-auto mb-8">
            {systemConfig.reason ? (
              <span className="font-medium text-slate-200">
                &ldquo;{systemConfig.reason}&rdquo;
              </span>
            ) : (
              'SmartLedger is currently offline while our team performs database upgrades, security hardening, and infrastructure maintenance.'
            )}
          </p>

          {/* Time Remaining Card (if scheduled end time set) */}
          {timeRemaining && (
            <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 flex items-center justify-center gap-3 max-w-md mx-auto">
              <Clock size={20} className="text-amber-400 shrink-0" />
              <div className="text-sm text-left">
                <span className="text-xs uppercase tracking-wider text-amber-400/80 font-bold block">
                  Estimated Completion
                </span>
                <span className="font-bold text-base text-amber-100">{timeRemaining}</span>
              </div>
            </div>
          )}

          {/* System Safety Guarantee Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Ledger Data Intact</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">All customer balances & records are safely encrypted.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Cloud Backup Done</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated safety backup completed prior to freeze.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Transactions Locked</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Direct Firestore writes are rejected by security rules.</p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-sm font-semibold border border-white/20 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              <RotateCw size={16} className={isChecking ? 'animate-spin text-rose-400' : ''} />
              <span>{isChecking ? 'Checking status...' : 'Check If Available'}</span>
            </button>

            <Link
              to="/admin"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Server size={16} />
              <span>Administrator Login</span>
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Last checked at <span className="font-mono text-slate-400">{lastChecked}</span>. This page updates in real-time as soon as the maintenance window closes.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-white/[0.06] bg-black/40 text-center text-xs text-slate-500">
        SmartLedger Availability Engine &bull; System Integrity Protection active &bull; Cloud Run Container
      </footer>
    </div>
  );
}
