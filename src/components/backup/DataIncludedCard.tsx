import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowDownLeft, 
  Clock, 
  PieChart, 
  Tag, 
  Calculator, 
  PiggyBank, 
  Sliders, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';

export default function DataIncludedCard() {
  const protectedEntities = [
    { label: 'Ledger Records', desc: 'All credits, debits, notes & balance states', icon: FileSpreadsheet, color: 'text-blue-400' },
    { label: 'Money Received', desc: 'Real-time payment history & revenue streams', icon: ArrowDownLeft, color: 'text-emerald-400' },
    { label: 'Pending Payments', desc: 'Due dates, customer names & reminder timers', icon: Clock, color: 'text-amber-400' },
    { label: 'Analytics & Reports', desc: 'Cash flow summaries & periodic charts', icon: PieChart, color: 'text-indigo-400' },
    { label: 'Categories & Tags', desc: 'Custom transaction tags and organization rules', icon: Tag, color: 'text-purple-400' },
    { label: 'Calculator History', desc: 'Audit calculations and scratchpad logs', icon: Calculator, color: 'text-cyan-400' },
    { label: 'Gullak Savings', desc: 'Daily savings entries, jars & goal milestones', icon: PiggyBank, color: 'text-pink-400' },
    { label: 'System Settings', desc: 'Security, PIN, biometrics & notifications', icon: Sliders, color: 'text-teal-400' },
    { label: 'User Profile & Brand', desc: 'Business details, email settings & avatars', icon: UserCheck, color: 'text-sky-400' },
    { label: 'Future Collections', desc: 'Dynamic schema expansion & custom collections', icon: Sparkles, color: 'text-violet-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Protected Data Scope</h3>
            <p className="text-xs text-slate-400">100% comprehensive zero-omission financial state backup</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          Full Fidelity (10/10)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {protectedEntities.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 ${item.color} flex-shrink-0 mt-0.5`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{item.label}</span>
                  <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
