import React from 'react';
import { motion } from 'motion/react';
import { 
  PiggyBank, FileSpreadsheet, History, Cloud, 
  ArrowUpRight, Shield, Zap, Sparkles, Smartphone, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../lib/utils';

export default function InteractiveFeatureBento() {
  const { gullakEntries, gullakSettings, transactions } = useStore();

  const totalGullakSaved = (gullakEntries || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const targetGoal = gullakSettings?.monthlyGoal || 10000;
  const goalPercent = targetGoal > 0 ? Math.min(100, Math.round((totalGullakSaved / targetGoal) * 100)) : 0;
  const hasGullakData = gullakEntries && gullakEntries.length > 0;

  return (
    <section className="relative py-20 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <Sparkles size={14} className="text-purple-400" />
          Fintech Engineering Redefined
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Everything You Need to <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400">
            Master Your Capital
          </span>
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-400 font-medium">
          Engineered with precision. Every feature is built for instant access, transparent reporting, and local-first security.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        {/* Bento 1: Gullak Smart Micro-Savings (Col-span 7) */}
        <div className="md:col-span-7 rounded-[36px] bg-gradient-to-b from-[#131126]/90 via-[#0d0a1c]/95 to-[#060410]/98 border border-white/[0.12] p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <PiggyBank size={24} />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20">
              Micro-Savings Vault
            </span>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">Smart Gullak Auto-Sweep</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Rounds up daily expenditures and deposits micro-surpluses into virtual target vaults without manual effort.
          </p>

          <div className="mt-8 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${hasGullakData ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <div>
                <div className="text-xs font-semibold text-white">Savings Target</div>
                <div className="text-[11px] text-slate-400">
                  {hasGullakData 
                    ? `${goalPercent}% of ${formatCurrency(targetGoal)} achieved`
                    : 'Target goal ready to configure'}
                </div>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-400 font-mono">
              {hasGullakData ? formatCurrency(totalGullakSaved) : '₹0'}
            </span>
          </div>

          <Link
            to="/gullak"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 mt-6 group-hover:translate-x-1 transition-transform"
          >
            Open Gullak Vault →
          </Link>
        </div>

        {/* Bento 2: Financial Time Machine / Replay (Col-span 5) */}
        <div className="md:col-span-5 rounded-[36px] bg-gradient-to-b from-[#0e1628]/90 via-[#0a0f1c]/95 to-[#04060c]/98 border border-white/[0.12] p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-8">
            <History size={24} />
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">Timeline Replay</h3>
          <p className="text-sm text-slate-400 mt-2">
            Replay your financial activity chronologically to visualize cashflow evolution.
          </p>

          <div className="mt-8 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{transactions.length > 0 ? `${transactions.length} Records` : 'No logs yet'}</span>
              <span className="text-cyan-400 font-bold">Ledger Time-lapse</span>
            </div>
            <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: transactions.length > 0 ? '100%' : '0%' }}
              />
            </div>
          </div>

          <Link
            to="/timeline"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 mt-8 group-hover:translate-x-1 transition-transform"
          >
            Launch Timeline Replay →
          </Link>
        </div>

        {/* Bento 3: Instant Audit Reports (Col-span 5) */}
        <div className="md:col-span-5 rounded-[36px] bg-gradient-to-b from-[#0c191a]/90 via-[#071112]/95 to-[#030809]/98 border border-white/[0.12] p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 mb-8">
            <FileSpreadsheet size={24} />
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">Audit-Ready Export</h3>
          <p className="text-sm text-slate-400 mt-2">
            Generate pixel-perfect PDF, CSV, and Excel reports with checksum validation.
          </p>

          <div className="mt-8 flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[11px] font-mono text-slate-300">
              PDF
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[11px] font-mono text-slate-300">
              Excel .xlsx
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[11px] font-mono text-slate-300">
              JSON
            </span>
          </div>

          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 mt-8 group-hover:translate-x-1 transition-transform"
          >
            Generate Statement →
          </Link>
        </div>

        {/* Bento 4: Zero-Knowledge Multi-Cloud Backup (Col-span 7) */}
        <div className="md:col-span-7 rounded-[36px] bg-gradient-to-b from-[#181228]/90 via-[#100c1e]/95 to-[#080512]/98 border border-white/[0.12] p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="flex items-start justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Cloud size={24} />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">
              Encrypted Storage
            </span>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">Autonomous Encrypted Backups</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Continuous local-first synchronization with instant restore points and cryptographic verification.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> AES-256 Storage
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> Offline IndexedDB
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> Instant Rollback
            </div>
          </div>

          <Link
            to="/backup"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 mt-6 group-hover:translate-x-1 transition-transform"
          >
            Manage Backup Vault →
          </Link>
        </div>
      </div>
    </section>
  );
}
