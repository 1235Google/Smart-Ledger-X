import React from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, Clock, Users, ArrowUpRight, Bell, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate, cn, calculateReminderDetails } from '../lib/utils';
import { Link } from 'react-router-dom';
import { PendingMoney, SentMoney, ReceivedMoney } from '../types';
import BalanceCard from '../components/BalanceCard';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import DataStateGuard from '../components/ui/DataStateGuard';

export default function Dashboard() {
  console.log('[Dashboard] Rendering dashboard view');
  const { 
    startingBalance, 
    currentBalance, 
    totalReceived, 
    totalPending, 
    totalSent, 
    transactions, 
    generalSettings,
    userProfile,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();

  const recentTransactions = transactions.slice(0, 5);

  const receivedCount = transactions.filter(t => t.type === 'received').length;
  const pendingCount = transactions.filter(t => t.type === 'pending' && t.status === 'pending').length;

  const today = new Date().toISOString().split('T')[0];
  const dueReminders = transactions.filter((t): t is PendingMoney => {
    if (t.type !== 'pending' || t.status !== 'pending' || t.reminderStatus !== 'active') return false;
    const details = calculateReminderDetails(t, generalSettings?.timezone);
    return !details.isStopped && !!details.nextReminderDate && details.nextReminderDate <= today;
  });

  // Anomaly Detection
  const sentMoneyTxs = transactions.filter((t): t is SentMoney => t.type === 'sent');
  const totalSentAmount = sentMoneyTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const avgSpending = sentMoneyTxs.length > 0 ? totalSentAmount / sentMoneyTxs.length : 0;
  
  const highSpendingAnomalies = sentMoneyTxs.filter(
    tx => tx.amount > avgSpending * 2 && avgSpending > 0
  );

  const invoiceNumberMap = new Map<string, Array<SentMoney | ReceivedMoney>>();
  transactions.forEach(tx => {
    if ((tx.type === 'sent' || tx.type === 'received') && tx.invoiceNumber) {
      const key = tx.invoiceNumber.toLowerCase().trim();
      const existing = invoiceNumberMap.get(key) || [];
      existing.push(tx);
      invoiceNumberMap.set(key, existing);
    }
  });

  const duplicateInvoices = Array.from(invoiceNumberMap.values()).filter(group => group.length > 1);

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading your financial dashboard..."
      skeletonType="dashboard"
    >
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8"
      >
        <header className="mb-8">
          <h1 className="text-3xl font-[800] tracking-[-0.03em] text-white mb-2">Dashboard</h1>
          
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative mt-2"
          >
            <div className="text-lg md:text-xl tracking-tight mb-4 flex items-baseline gap-[6px] flex-nowrap">
              <span className="font-[500] text-[rgba(255,255,255,0.72)] text-inherit leading-[1.2]">Welcome back,</span>
              <span 
                style={{
                  backgroundImage: "linear-gradient(to right, #8CB4FF, #FFFFFF)",
                }}
                className="font-[700] text-inherit leading-[1.2] cursor-default bg-clip-text text-transparent transition-all duration-200 hover:brightness-110 drop-shadow-[0_0_6px_rgba(140,180,255,0.3)] hover:drop-shadow-[0_0_8px_rgba(140,180,255,0.4)]"
              >
                {userProfile?.fullName || 'Souvik Dash'}
              </span>
            </div>
            
            {/* Premium Divider */}
            <div className="flex items-center gap-3 w-full max-w-[280px] mb-4 opacity-80">
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#2D4DFF]/60"></div>
              <div className="w-1.5 h-1.5 rotate-45 bg-[#2D4DFF] shadow-[0_0_10px_rgba(45,77,255,0.8)] ring-1 ring-white/20"></div>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-[#2D4DFF]/60 to-transparent"></div>
            </div>
            
            <p className="text-sm md:text-base text-[#8e96a4] tracking-wide font-medium">
              Your financial command center is ready. Track balances, manage pending payments, and stay in complete control.
            </p>
          </motion.div>
        </header>

        {/* Anomaly Banners */}
        {(highSpendingAnomalies.length > 0 || duplicateInvoices.length > 0) && (
          <div className="space-y-3">
            {highSpendingAnomalies.slice(0, 3).map(tx => (
              <motion.div
                key={`anomaly-spend-${tx.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex gap-3 items-start sm:items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-amber-500/20 text-amber-400">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-amber-400">
                      Unusual Spending Detected
                    </h3>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {formatCurrency(tx.amount)} sent to {tx.personName} is significantly higher than your average spending of {formatCurrency(avgSpending)}.
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            {duplicateInvoices.map((group, idx) => (
              <motion.div
                key={`anomaly-inv-${idx}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border bg-red-500/10 border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex gap-3 items-start sm:items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-red-400">
                      Duplicate Invoice Number
                    </h3>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Invoice <strong>{group[0].invoiceNumber}</strong> has been used in {group.length} transactions.
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {dueReminders.length > 0 && (
          <div className="space-y-3">
            {dueReminders.map(reminder => {
              const isOverdue = reminder.dueDate < today;
              return (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    isOverdue ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"
                  )}
                >
                  <div className="flex gap-3 items-start sm:items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      isOverdue ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                    )}>
                      {isOverdue ? <AlertTriangle size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-sm", isOverdue ? "text-red-400" : "text-blue-400")}>
                        {isOverdue ? "⚠️ Payment Overdue" : "🔔 Reminder Due"}
                      </h3>
                      <p className="text-slate-300 text-xs mt-0.5">
                        {isOverdue 
                          ? `${reminder.personName}'s payment is overdue.`
                          : `${reminder.personName}'s ${formatCurrency(reminder.amount)} payment reminder is ready.`}
                      </p>
                    </div>
                  </div>
                  {reminder.phoneNumber && (
                    <Link 
                      to="/pending" 
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap text-center sm:text-left",
                        isOverdue ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                      )}
                    >
                      Send WhatsApp
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Main Balance Card Component */}
        <BalanceCard
          currentBalance={currentBalance}
          startingBalance={startingBalance}
          totalReceived={totalReceived}
          totalSent={totalSent}
        />

        {/* Stats Grid with Staggered Glass Cards */}
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

        {/* Recent Activity List with Slide-in and Staggered Transitions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Recent Activity</h2>
            <Link to="/analytics" className="text-xs text-blue-400 font-bold hover:underline transition-all">
              View All →
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
                    exit={{ opacity: 0, scale: 0.92, height: 0, marginTop: 0, marginBottom: 0, padding: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 26,
                      delay: idx * 0.05,
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
                        "text-sm font-bold tracking-tight",
                        tx.type === 'received' ? "text-emerald-400" :
                        tx.type === 'sent' ? "text-rose-400" :
                        "text-amber-400"
                      )}>
                        {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">{tx.type}</p>
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
