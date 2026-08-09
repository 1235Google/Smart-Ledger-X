import React from 'react';
import { useStore } from '../context/StoreContext';
import { motion } from 'motion/react';
import { Wallet, ArrowDownLeft, Clock, Users, ArrowUpRight, Bell, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate, cn, calculateReminderDetails } from '../lib/utils';
import { Link } from 'react-router-dom';
import { PendingMoney, SentMoney, ReceivedMoney } from '../types';

export default function Dashboard() {
  const { startingBalance, currentBalance, totalReceived, totalPending, transactions, generalSettings } = useStore();

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
    <div className="w-full space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-[800] tracking-[-0.03em] text-white mb-2">Dashboard</h1>
        
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mt-2"
        >
          <div className="text-lg md:text-xl tracking-tight mb-5 flex items-baseline gap-[6px] flex-nowrap">
            <span className="font-[500] text-[rgba(255,255,255,0.72)] text-inherit leading-[1.2]">Welcome back,</span>
            <span 
              style={{
                backgroundImage: "linear-gradient(to right, #8CB4FF, #FFFFFF)",
              }}
              className="font-[700] text-inherit leading-[1.2] cursor-default bg-clip-text text-transparent transition-all duration-200 hover:brightness-110 drop-shadow-[0_0_6px_rgba(140,180,255,0.3)] hover:drop-shadow-[0_0_8px_rgba(140,180,255,0.4)]"
            >
              Souvik Dash
            </span>
          </div>
          
          {/* Premium Divider */}
          <div className="flex items-center gap-3 w-full max-w-[280px] mb-5 opacity-80">
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

      {/* Main Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-gradient-to-br from-[#0B1026] via-[#1a1b4b] to-[#2D4DFF] p-8 rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_40px_-15px_rgba(45,77,255,0.4)] backdrop-blur-xl"
      >
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/30 rounded-full blur-[80px] pointer-events-none"></div>
        
        {/* Subtle premium noise texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        {/* Elegant light reflections */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none"></div>

        {/* Glass orb decoration */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-8 right-8 w-32 h-32 rounded-full bg-gradient-to-tr from-white/10 to-white/30 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(255,255,255,0.1),inset_0_4px_16px_rgba(255,255,255,0.2)] flex items-center justify-center opacity-80 pointer-events-none"
        >
          <svg className="w-16 h-16 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.97 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.61-2.4 1.61 0 .93.61 1.47 2.69 1.95 2.62.61 4.16 1.71 4.16 4.11 0 1.91-1.35 3.09-3.13 3.48z"/></svg>
        </motion.div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white/60 text-[11px] font-semibold mb-1 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
              Available Balance
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-6xl font-[800] tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent mb-6"
            >
              {formatCurrency(currentBalance)}
            </motion.div>
            <div className="flex gap-4">
              <div className="bg-white/[0.03] backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Starting Balance</p>
                <p className="text-lg font-bold text-white/90">{formatCurrency(startingBalance)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
            <ArrowDownLeft size={48} className="text-green-500" />
          </div>
          <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Received</div>
          <div className="text-3xl font-bold text-white mb-4">{formatCurrency(totalReceived)}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
            <Users size={14} /> Received from {receivedCount} {receivedCount === 1 ? 'person' : 'people'}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
            <Clock size={48} className="text-amber-500" />
          </div>
          <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Pending</div>
          <div className="text-3xl font-bold text-white mb-4">{formatCurrency(totalPending)}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
            <Users size={14} /> Pending from {pendingCount} {pendingCount === 1 ? 'person' : 'people'}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          <Link to="/analytics" className="text-xs text-blue-400 font-semibold hover:underline">View All</Link>
        </div>

        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl h-16 flex items-center justify-center text-slate-600 text-sm">
              <p>No recent transactions</p>
            </div>
          ) : (
            recentTransactions.map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + 0.1 * idx, duration: 0.5, ease: 'easeOut' }}
                className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                  tx.type === 'received' ? "bg-green-500/20 text-green-400" :
                  tx.type === 'sent' ? "bg-red-500/20 text-red-400" :
                  "bg-amber-500/20 text-amber-400"
                )}>
                  {tx.type === 'received' ? <ArrowDownLeft size={24} /> :
                   tx.type === 'sent' ? <ArrowUpRight size={24} /> :
                   <Clock size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{tx.personName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason} • {formatDate(tx.type === 'received' || tx.type === 'sent' ? tx.date : (tx as any).dueDate, generalSettings?.timezone)}
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    tx.type === 'received' ? "text-green-400" :
                    tx.type === 'sent' ? "text-red-400" :
                    "text-amber-500"
                  )}>
                    {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">{tx.type}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
