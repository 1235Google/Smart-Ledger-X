import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { ArrowDownLeft, Clock, Users, ArrowUpRight } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';
import BalanceCard from '../components/BalanceCard';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import AnimatedButton from '../components/ui/AnimatedButton';

export default function CurrentBalance() {
  const { 
    currentBalance, 
    startingBalance, 
    transactions,
    generalSettings
  } = useStore();

  const { totalReceived, totalPending, totalSent, pendingCount, receivedCount } = useMemo(() => {
    let tr = 0;
    let tp = 0;
    let ts = 0;
    let pc = 0;
    let rc = 0;
    transactions.forEach(tx => {
      if (tx.type === 'received') {
        tr += tx.amount;
        rc += 1;
      }
      if (tx.type === 'pending' && tx.status === 'pending') {
        tp += tx.amount;
        pc += 1;
      }
      if (tx.type === 'sent') {
        ts += tx.amount;
      }
    });
    return { totalReceived: tr, totalPending: tp, totalSent: ts, pendingCount: pc, receivedCount: rc };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.type === 'pending' ? (a as any).dueDate : (a as any).date).getTime();
      const dateB = new Date(b.type === 'pending' ? (b as any).dueDate : (b as any).date).getTime();
      return dateB - dateA;
    }).slice(0, 15);
  }, [transactions]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full space-y-8"
    >
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Current Balance</h1>
          <p className="text-slate-400 text-sm font-medium">Real-time ledger audit, liquidity status, and activity tracking.</p>
        </div>

        <div className="flex gap-3">
          <Link to="/received">
            <AnimatedButton variant="success" icon={<ArrowDownLeft size={16} />}>
              Add Received
            </AnimatedButton>
          </Link>
          <Link to="/pending">
            <AnimatedButton variant="primary" icon={<Clock size={16} />}>
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
        totalSent={totalSent}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <GlassCard delay={0.08} glowColor="rgba(16, 185, 129, 0.25)">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
            <ArrowDownLeft size={48} className="text-emerald-500" />
          </div>
          <div className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Total Received</div>
          <div className="text-3xl font-extrabold text-white mb-4">
            <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-black/30 w-fit px-3 py-1.5 rounded-xl border border-white/5">
            <Users size={14} className="text-emerald-400" /> Received from {receivedCount} {receivedCount === 1 ? 'person' : 'people'}
          </div>
        </GlassCard>

        <GlassCard delay={0.16} glowColor="rgba(245, 158, 11, 0.25)">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
            <Clock size={48} className="text-amber-500" />
          </div>
          <div className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Total Pending</div>
          <div className="text-3xl font-extrabold text-white mb-4">
            <CountUp value={totalPending} formatter={(v) => formatCurrency(v)} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-black/30 w-fit px-3 py-1.5 rounded-xl border border-white/5">
            <Users size={14} className="text-amber-400" /> Pending from {pendingCount} {pendingCount === 1 ? 'person' : 'people'}
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
  );
}
