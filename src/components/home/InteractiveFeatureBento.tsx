import React from 'react';
import { motion } from 'motion/react';
import { 
  PiggyBank, FileSpreadsheet, History, Cloud, 
  ArrowUpRight, Shield, Zap, Sparkles, Smartphone, Check, ChevronRight
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
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-[#bf5af2] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bf5af2]" /> 07 • System Capabilities
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Feature Bento Vaults
          </h2>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
        {/* Bento 1: Gullak Smart Micro-Savings (Col-span 7) */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.008 }}
          className="md:col-span-7 rounded-[30px] vision-glass-elevated p-7 md:p-8 relative overflow-hidden group shadow-xl"
        >
          {/* Top Specular Rim */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#bf5af2]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#bf5af2]/25 transition-all duration-500" />
          
          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#bf5af2]/20 border border-[#bf5af2]/35 flex items-center justify-center text-[#bf5af2] shadow-sm">
              <PiggyBank size={24} />
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#bf5af2] bg-[#bf5af2]/10 border border-[#bf5af2]/25">
              Micro-Savings Vault
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight relative z-10">Smart Gullak Auto-Sweep</h3>
          <p className="text-xs sm:text-sm text-[#86868b] mt-1.5 max-w-md relative z-10">
            Rounds up daily expenditures and deposits micro-surpluses into virtual target vaults without manual effort.
          </p>

          <div className="mt-6 p-4 rounded-2xl vision-glass border-white/[0.08] flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${hasGullakData ? 'bg-[#30d158] shadow-[0_0_8px_#30d158]' : 'bg-[#86868b]'}`} />
              <div>
                <div className="text-xs font-bold text-white">Savings Target</div>
                <div className="text-[11px] text-[#86868b]">
                  {hasGullakData 
                    ? `${goalPercent}% of ${formatCurrency(targetGoal)} achieved`
                    : 'Target goal ready to configure'}
                </div>
              </div>
            </div>
            <span className="text-base font-extrabold text-[#30d158] font-mono">
              {hasGullakData ? formatCurrency(totalGullakSaved) : '₹0'}
            </span>
          </div>

          <Link
            to="/gullak"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#bf5af2] hover:text-white mt-6 group-hover:translate-x-1 transition-all relative z-10"
          >
            Open Gullak Vault <ChevronRight size={13} />
          </Link>
        </motion.div>

        {/* Bento 2: Financial Time Machine / Replay (Col-span 5) */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.008 }}
          className="md:col-span-5 rounded-[30px] vision-glass-elevated p-7 md:p-8 relative overflow-hidden group shadow-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#64d2ff]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#64d2ff]/25 transition-all duration-500" />

          <div className="w-12 h-12 rounded-2xl bg-[#64d2ff]/20 border border-[#64d2ff]/35 flex items-center justify-center text-[#64d2ff] mb-6 shadow-sm">
            <History size={24} />
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Timeline Replay</h3>
          <p className="text-xs sm:text-sm text-[#86868b] mt-1.5">
            Replay your financial activity chronologically to visualize cashflow evolution.
          </p>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#86868b]">
              <span>{transactions.length > 0 ? `${transactions.length} Records` : 'No logs yet'}</span>
              <span className="text-[#64d2ff] font-bold">Ledger Time-lapse</span>
            </div>
            <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
              <div 
                className="h-full bg-gradient-to-r from-[#0a84ff] to-[#64d2ff] rounded-full transition-all duration-500 shadow-sm" 
                style={{ width: transactions.length > 0 ? '100%' : '0%' }}
              />
            </div>
          </div>

          <Link
            to="/timeline"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64d2ff] hover:text-white mt-6 group-hover:translate-x-1 transition-all"
          >
            Launch Timeline Replay <ChevronRight size={13} />
          </Link>
        </motion.div>

        {/* Bento 3: Instant Audit Reports (Col-span 5) */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.008 }}
          className="md:col-span-5 rounded-[30px] vision-glass-elevated p-7 md:p-8 relative overflow-hidden group shadow-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#30d158]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#30d158]/25 transition-all duration-500" />

          <div className="w-12 h-12 rounded-2xl bg-[#30d158]/20 border border-[#30d158]/35 flex items-center justify-center text-[#30d158] mb-6 shadow-sm">
            <FileSpreadsheet size={24} />
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Audit-Ready Export</h3>
          <p className="text-xs sm:text-sm text-[#86868b] mt-1.5">
            Generate pixel-perfect PDF, CSV, and Excel reports with checksum validation.
          </p>

          <div className="mt-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-white">
              PDF
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-white">
              Excel .xlsx
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-white">
              JSON
            </span>
          </div>

          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#30d158] hover:text-white mt-6 group-hover:translate-x-1 transition-all"
          >
            Generate Statement <ChevronRight size={13} />
          </Link>
        </motion.div>

        {/* Bento 4: Secure Cloud Backup (Col-span 7) */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.008 }}
          className="md:col-span-7 rounded-[30px] vision-glass-elevated p-7 md:p-8 relative overflow-hidden group shadow-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#0a84ff]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#0a84ff]/25 transition-all duration-500" />

          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#0a84ff]/20 border border-[#0a84ff]/35 flex items-center justify-center text-[#0a84ff] shadow-sm">
              <Cloud size={24} />
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#0a84ff] bg-[#0a84ff]/10 border border-[#0a84ff]/25">
              Secure Storage
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight relative z-10">Automatic Secure Backups</h3>
          <p className="text-xs sm:text-sm text-[#86868b] mt-1.5 max-w-md relative z-10">
            Always-on backup to the cloud with instant restore points and secure verification.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-[#a1a1a6] relative z-10">
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-[#30d158]" /> AES-256 Storage
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-[#30d158]" /> Offline IndexedDB
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-[#30d158]" /> Instant Rollback
            </div>
          </div>

          <Link
            to="/backup"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a84ff] hover:text-white mt-6 group-hover:translate-x-1 transition-all relative z-10"
          >
            Manage Backup Vault <ChevronRight size={13} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
