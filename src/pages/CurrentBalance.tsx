import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { ArrowDownLeft, Clock, Users, ArrowUpRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import BalanceCard from '../components/BalanceCard';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import AnimatedButton from '../components/ui/AnimatedButton';
import DataStateGuard from '../components/ui/DataStateGuard';

export default function CurrentBalance() {
  const { 
    currentBalance, 
    startingBalance, 
    transactions,
    generalSettings,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();

  const navigate = useNavigate();

  const {
    totalReceived,
    totalPending,
    pendingCount,
    receivedCount,
    receivedPeopleCount,
    pendingPeopleCount,
    overduePendingCount
  } = useMemo(() => {
    let tr = 0;
    let tp = 0;
    let pc = 0;
    let rc = 0;
    let oc = 0;
    const receivedPeople = new Set<string>();
    const pendingPeople = new Set<string>();
    const today = new Date().toISOString().split('T')[0];

    (transactions || []).forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'received') {
        tr += amt;
        rc += 1;
        if (tx.personName?.trim()) {
          receivedPeople.add(tx.personName.trim().toLowerCase());
        }
      } else if (
        tx.type === 'pending' &&
        (tx.status === 'pending' || tx.status === 'overdue' || (tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'closed'))
      ) {
        tp += amt;
        pc += 1;
        if (tx.personName?.trim()) {
          pendingPeople.add(tx.personName.trim().toLowerCase());
        }
        if (tx.dueDate && tx.dueDate < today) {
          oc += 1;
        }
      }
    });

    return {
      totalReceived: tr,
      totalPending: tp,
      pendingCount: pc,
      receivedCount: rc,
      receivedPeopleCount: receivedPeople.size,
      pendingPeopleCount: pendingPeople.size,
      overduePendingCount: oc
    };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.type === 'pending' ? (a as any).dueDate : (a as any).date).getTime();
      const dateB = new Date(b.type === 'pending' ? (b as any).dueDate : (b as any).date).getTime();
      return dateB - dateA;
    }).slice(0, 15);
  }, [transactions]);

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading balance & transactions..."
      skeletonType="cards"
    >
      <motion.div 
        layoutId="shared-balance"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8 bg-[#05060a]"
      >
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Current Balance</h1>
          <p className="text-slate-400 text-sm font-medium">Real-time ledger audit, liquidity status, and activity tracking.</p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Link to="/received" className="flex-1 sm:flex-none">
            <AnimatedButton variant="success" icon={<ArrowDownLeft size={16} />} className="w-full sm:w-auto justify-center">
              Add Received
            </AnimatedButton>
          </Link>
          <Link to="/pending" className="flex-1 sm:flex-none">
            <AnimatedButton variant="primary" icon={<Clock size={16} />} className="w-full sm:w-auto justify-center">
              Add Pending
            </AnimatedButton>
          </Link>
        </div>
      </header>

      {/* Main Balance Card Component with CountUp & Flash glow */}
      <BalanceCard
        currentBalance={currentBalance}
        startingBalance={startingBalance}
        totalReceived={totalReceived}
      />

      {/* Stats Grid with VisionOS Liquid Glass Styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {/* Total Received Card */}
        <GlassCard 
          delay={0.08} 
          glowColor="rgba(48, 209, 88, 0.25)"
          className="p-4 sm:p-6 md:p-7 relative select-none flex flex-col justify-between cursor-pointer group rounded-[22px] sm:rounded-[24px]"
          onClick={() => navigate('/received')}
        >
          {/* Top Specular Rim */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#30d158]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#30d158]/20 transition-all duration-500" />

          <div>
            <div className="flex items-start justify-between relative z-10 mb-3 gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158] shadow-sm shrink-0">
                  <ArrowDownLeft size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[#86868b] text-[11px] sm:text-xs font-bold uppercase tracking-wider block truncate">
                    Total Received
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#30d158] font-semibold">
                    Settled Inflows
                  </span>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 shadow-sm flex items-center gap-1 shrink-0">
                <CheckCircle2 size={12} /> {receivedCount} {receivedCount === 1 ? 'record' : 'records'}
              </span>
            </div>

            <div className="text-2xl sm:text-4xl font-extrabold text-white font-tabular tracking-tight my-2 relative z-10 break-words">
              <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-white/[0.06] mt-4 relative z-10 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[#86868b] text-[11px] sm:text-xs truncate">
              <Users size={14} className="text-[#30d158] shrink-0" />
              <span className="truncate">
                {receivedPeopleCount > 0 
                  ? `Received from ${receivedPeopleCount} ${receivedPeopleCount === 1 ? 'person' : 'people'}`
                  : 'Received from 0 people'}
              </span>
            </div>
            <span className="text-xs text-[#30d158] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0">
              View History <ChevronRight size={13} />
            </span>
          </div>
        </GlassCard>

        {/* Total Pending Card */}
        <GlassCard 
          delay={0.16} 
          glowColor="rgba(255, 214, 10, 0.25)"
          className="p-4 sm:p-6 md:p-7 relative select-none flex flex-col justify-between cursor-pointer group rounded-[22px] sm:rounded-[24px]"
          onClick={() => navigate('/pending')}
        >
          {/* Top Specular Rim */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#ffd60a]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#ffd60a]/20 transition-all duration-500" />

          <div>
            <div className="flex items-start justify-between relative z-10 mb-3 gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ffd60a]/15 border border-[#ffd60a]/30 flex items-center justify-center text-[#ffd60a] shadow-sm shrink-0">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[#86868b] text-[11px] sm:text-xs font-bold uppercase tracking-wider block truncate">
                    Total Pending
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#ffd60a] font-semibold">
                    Outstanding Receivables
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {overduePendingCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30 animate-pulse">
                    {overduePendingCount} overdue
                  </span>
                )}
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/25 shadow-sm">
                  {pendingCount} {pendingCount === 1 ? 'due' : 'dues'}
                </span>
              </div>
            </div>

            <div className="text-2xl sm:text-4xl font-extrabold text-[#ffd60a] font-tabular tracking-tight my-2 relative z-10 break-words">
              <CountUp value={totalPending} formatter={(v) => formatCurrency(v)} />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-white/[0.06] mt-4 relative z-10 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[#86868b] text-[11px] sm:text-xs truncate">
              <Users size={14} className="text-[#ffd60a] shrink-0" />
              <span className="truncate">
                {pendingPeopleCount > 0 
                  ? `Pending from ${pendingPeopleCount} ${pendingPeopleCount === 1 ? 'person' : 'people'}`
                  : 'Pending from 0 people'}
              </span>
            </div>
            <span className="text-xs text-[#0a84ff] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0">
              Collect Now <ChevronRight size={13} />
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Activity Log</h2>
          <Link to="/analytics" className="text-xs text-blue-400 font-bold hover:underline transition-all">
            View Analytics →
          </Link>
        </div>

        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center text-slate-500 text-sm">
              <p>No recent transactions</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {recentTransactions.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, height: 0, padding: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 26,
                    delay: idx * 0.03,
                  }}
                  whileHover={{ scale: 1.01, x: 2 }}
                  className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all shadow-md"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner",
                    tx.type === 'received' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    tx.type === 'sent' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                    "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}>
                    {tx.type === 'received' ? <ArrowDownLeft size={22} /> : 
                     tx.type === 'sent' ? <ArrowUpRight size={22} /> : 
                     <Clock size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">{tx.personName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason} • {formatDate(tx.type === 'received' || tx.type === 'sent' ? tx.date : (tx as any).dueDate, generalSettings?.timezone)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-extrabold tracking-tight",
                      tx.type === 'received' ? "text-emerald-400" :
                      tx.type === 'sent' ? "text-rose-400" :
                      "text-amber-400"
                    )}>
                      {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">{tx.type}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
    </DataStateGuard>
  );
}
