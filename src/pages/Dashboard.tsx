import React, { useState, lazy, Suspense } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, useReducedMotion, Variants } from 'motion/react';
import { 
  ArrowDownLeft, Clock, Users, ArrowUpRight, Bell, 
  AlertTriangle, ShieldAlert, Sparkles, ChevronDown, 
  LayoutDashboard, Flame, ArrowRight, ShieldCheck, 
  Cloud, RefreshCw, Zap, Cpu, Lock, Search, PiggyBank,
  ChevronRight, Plus, Target, FileSpreadsheet, Calculator as CalculatorIcon,
  CheckCircle2, Send, ExternalLink
} from 'lucide-react';
import { formatCurrency, formatDate, cn, calculateReminderDetails } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { PendingMoney, ReceivedMoney } from '../types';
import BalanceCard from '../components/BalanceCard';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import DataStateGuard from '../components/ui/DataStateGuard';

// Lazy Loaded Interactive Modules
const AIAssistantSection = lazy(() => import('../components/home/AIAssistantSection'));
const SmartReminderHUD = lazy(() => import('../components/home/SmartReminderHUD'));
const InteractiveAnalyticsSection = lazy(() => import('../components/home/InteractiveAnalyticsSection'));
const InteractiveFeatureBento = lazy(() => import('../components/home/InteractiveFeatureBento'));

const SectionLoadingFallback = () => (
  <div className="w-full h-48 rounded-[28px] vision-glass flex flex-col items-center justify-center gap-3">
    <div className="w-7 h-7 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin" />
    <span className="text-xs text-[#86868b] font-medium tracking-wide">Synthesizing VisionOS view...</span>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
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

  const recentTransactions = transactions.slice(0, 8);
  const receivedCount = transactions.filter(t => t.type === 'received').length;
  const pendingCount = transactions.filter(t => t.type === 'pending' && (t.status === 'pending' || t.status === 'overdue' || (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed'))).length;

  const today = new Date().toISOString().split('T')[0];
  
  // Pending Receivables breakdown
  const pendingTransactions = transactions.filter((t): t is PendingMoney => t.type === 'pending' && (t.status === 'pending' || t.status === 'overdue' || (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed')));
  const overduePending = pendingTransactions.filter(t => t.dueDate < today || t.status === 'overdue');
  const upcomingPending = pendingTransactions.filter(t => t.dueDate >= today && t.status !== 'overdue');

  const dueReminders = transactions.filter((t): t is PendingMoney => {
    if (t.type !== 'pending' || t.status !== 'pending' || t.reminderStatus !== 'active') return false;
    const details = calculateReminderDetails(t, generalSettings?.timezone);
    return !details.isStopped && !!details.nextReminderDate && details.nextReminderDate <= today;
  });

  // Anomaly Detection (AI Insights)
  const receivedMoneyTxs = transactions.filter((t): t is ReceivedMoney => t.type === 'received');
  const totalReceivedAmount = receivedMoneyTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const avgInflow = receivedMoneyTxs.length > 0 ? totalReceivedAmount / receivedMoneyTxs.length : 0;
  
  const highInflowAnomalies = receivedMoneyTxs.filter(
    tx => tx.amount > avgInflow * 2.5 && avgInflow > 0
  );

  const invoiceNumberMap = new Map<string, Array<ReceivedMoney>>();
  transactions.forEach(tx => {
    if (tx.type === 'received' && tx.invoiceNumber) {
      const key = tx.invoiceNumber.toLowerCase().trim();
      const existing = invoiceNumberMap.get(key) || [];
      existing.push(tx);
      invoiceNumberMap.set(key, existing);
    }
  });

  const duplicateInvoices = Array.from(invoiceNumberMap.values()).filter(group => group.length > 1);

  const triggerSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  // Staggered spring container animation
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
    show: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { 
        duration: 0.45, 
        ease: [0.16, 1, 0.3, 1] as const
      } 
    },
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading Smart Ledger X..."
      skeletonType="dashboard"
    >
      <motion.div 
        variants={shouldReduceMotion ? undefined : containerVariants}
        initial="hidden"
        animate="show"
        className="w-full relative min-h-screen text-[#f5f5f7] overflow-x-hidden selection:bg-[#0a84ff]/30 selection:text-white pb-16"
      >
        
        {/* Top Header - Apple VisionOS Style */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 px-1 mb-6 border-b border-white/[0.08]"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#30d158] shadow-[0_0_12px_#30d158] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#86868b]">
              SMART LEDGER X • VISIONOS COCKPIT
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#86868b]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] backdrop-blur-md shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" /> Real-Time Vault Sync Active
            </span>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* EXECUTIVE COMMAND CENTER (Most Important Information First)               */}
        {/* 1. Current Balance                                                        */}
        {/* 2. Pending Payments                                                       */}
        {/* 3. Recent Transactions                                                    */}
        {/* 4. Quick Actions                                                          */}
        {/* 5. Analytics                                                              */}
        {/* 6. AI Insights                                                            */}
        {/* ========================================================================= */}
        <div className="space-y-12">

            {/* --------------------------------------------------------------------- */}
            {/* 1. CURRENT BALANCE & LIQUIDITY VAULT                                  */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-balance" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#0a84ff] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" /> 01 • Core Financial Position
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Current Balance & Liquidity
                  </h1>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/balance')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#0a84ff] hover:text-white flex items-center gap-1 transition-all border border-white/[0.08]"
                >
                  Manage Vaults <ChevronRight size={14} />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Primary Apple Titanium Card */}
                <div onClick={() => navigate('/balance')} className="lg:col-span-2 cursor-pointer">
                  <BalanceCard
                    currentBalance={currentBalance}
                    startingBalance={startingBalance}
                    totalReceived={totalReceived}
                  />
                </div>

                {/* Secondary Liquidity Caps in VisionOS Liquid Glass */}
                <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
                  {/* Total Received Capsule */}
                  <motion.div 
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate('/received')}
                    className="flex-1 vision-glass hover:border-[#30d158]/40 rounded-[26px] p-6 cursor-pointer transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
                  >
                    {/* Top Specular Line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                    
                    {/* Ambient Glow */}
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#30d158]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#30d158]/20 transition-all duration-500" />

                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#30d158] uppercase tracking-wider">
                        <ArrowDownLeft size={16} /> Total Received
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 shadow-sm">
                        {receivedCount} clients
                      </span>
                    </div>

                    <div className="text-3xl sm:text-4xl font-extrabold text-white font-tabular relative z-10 tracking-tight">
                      <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
                    </div>

                    <div className="text-xs text-[#86868b] mt-3 flex items-center justify-between relative z-10 pt-2 border-t border-white/[0.06]">
                      <span>Inflow Velocity</span>
                      <span className="text-[#30d158] font-bold">100% Settled</span>
                    </div>
                  </motion.div>

                  {/* Total Pending Capsule */}
                  <motion.div 
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate('/pending')}
                    className="flex-1 vision-glass hover:border-[#ffd60a]/40 rounded-[26px] p-6 cursor-pointer transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
                  >
                    {/* Top Specular Line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                    {/* Ambient Glow */}
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#ffd60a]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#ffd60a]/20 transition-all duration-500" />

                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#ffd60a] uppercase tracking-wider">
                        <Clock size={16} /> Total Pending
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/30 shadow-sm">
                        {pendingCount} parties
                      </span>
                    </div>

                    <div className="text-3xl sm:text-4xl font-extrabold text-[#ffd60a] font-tabular relative z-10 tracking-tight">
                      <CountUp value={totalPending} formatter={(v) => formatCurrency(v)} />
                    </div>

                    <div className="text-xs text-[#86868b] mt-3 flex items-center justify-between relative z-10 pt-2 border-t border-white/[0.06]">
                      <span>Outstanding Receivables</span>
                      <span className="text-xs text-[#0a84ff] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        View List <ChevronRight size={12} />
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 2. PENDING PAYMENTS (Active Receivables, Overdue Alerts, Reminders)     */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-pending" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#ffd60a] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd60a]" /> 02 • Due Money
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Pending Dues & Reminders
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Link
                      to="/pending?new=true"
                      className="px-3.5 py-1.5 rounded-full bg-[#ffd60a]/15 hover:bg-[#ffd60a]/25 text-[#ffd60a] border border-[#ffd60a]/30 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={14} /> Add Due Money
                    </Link>
                  </motion.div>
                  <Link
                    to="/pending"
                    className="text-xs font-semibold text-[#0a84ff] hover:text-white flex items-center gap-1 transition-colors"
                  >
                    All Dues ({pendingTransactions.length}) <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Overdue Alert Bar in Glowing Liquid Glass */}
              {overduePending.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-[24px] bg-[#ff453a]/10 border border-[#ff453a]/30 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_32px_rgba(255,69,58,0.15)] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff453a]/40 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#ff453a]/25 text-[#ff453a] flex items-center justify-center shrink-0 border border-[#ff453a]/40 shadow-sm">
                      <AlertTriangle size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{overduePending.length} Overdue Dues</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30 font-tabular font-bold">
                          {formatCurrency(overduePending.reduce((acc, t) => acc + t.amount, 0))}
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1a6] mt-0.5">
                        Send automated reminders and payment links to get your money quickly.
                      </p>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Link
                      to="/pending"
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-[#ff453a] to-[#d92d20] hover:brightness-110 text-white font-semibold text-xs whitespace-nowrap self-start sm:self-auto transition-all shadow-md shadow-[#ff453a]/30 inline-flex items-center gap-1.5"
                    >
                      Resolve Overdue →
                    </Link>
                  </motion.div>
                </motion.div>
              )}

              {/* Pending Dues Cards Grid in Liquid Glass */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTransactions.length === 0 ? (
                  <div className="col-span-full py-12 px-6 rounded-[24px] vision-glass text-center space-y-2">
                    <CheckCircle2 size={36} className="text-[#30d158] mx-auto opacity-80" />
                    <p className="text-sm font-bold text-white">All Dues Cleared</p>
                    <p className="text-xs text-[#86868b]">No pending payments outstanding across your records.</p>
                  </div>
                ) : (
                  pendingTransactions.slice(0, 6).map((tx) => {
                    const isOverdue = tx.dueDate < today;
                    return (
                      <motion.div
                        key={tx.id}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className={cn(
                          "vision-glass rounded-[24px] p-5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group",
                          isOverdue ? "border-[#ff453a]/40 shadow-[0_8px_24px_rgba(255,69,58,0.12)]" : "border-white/[0.1]"
                        )}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold border",
                                isOverdue ? "bg-[#ff453a]/20 text-[#ff453a] border-[#ff453a]/30" : "bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/30"
                              )}>
                                {isOverdue ? '!' : '⏳'}
                              </div>
                              <span className="text-sm font-bold text-white truncate max-w-[140px]">{tx.personName}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm",
                              isOverdue ? "text-[#ff453a] bg-[#ff453a]/15 border-[#ff453a]/30" : "text-[#ffd60a] bg-[#ffd60a]/15 border-[#ffd60a]/30"
                            )}>
                              {isOverdue ? 'Overdue' : 'Due ' + formatDate(tx.dueDate)}
                            </span>
                          </div>

                          <div className="text-2xl font-extrabold text-white font-tabular mb-1 tracking-tight">
                            {formatCurrency(tx.amount)}
                          </div>
                          <p className="text-xs text-[#86868b] truncate mb-3">
                            {tx.reason || 'General receivable'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                          <span className="text-[11px] text-[#86868b]">
                            {tx.phoneNumber ? tx.phoneNumber : 'No phone logged'}
                          </span>
                          <Link
                            to="/pending"
                            className="text-xs font-bold text-[#0a84ff] hover:text-white flex items-center gap-1 transition-colors group-hover:translate-x-0.5 transition-transform"
                          >
                            Remind <ChevronRight size={12} />
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 3. RECENT TRANSACTIONS (Activity Feed)                                */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-transactions" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#30d158] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" /> 03 • Activity Feed
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Recent Transactions
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/search')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#0a84ff] hover:text-white flex items-center gap-1 transition-all border border-white/[0.08]"
                >
                  Search Full Ledger <ChevronRight size={14} />
                </motion.button>
              </div>

              <div className="vision-glass-elevated rounded-[28px] p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-12 text-[#86868b]">
                    No transactions recorded yet. Use Quick Actions below to record received money or receivables.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {recentTransactions.map((tx) => {
                      const isReceived = tx.type === 'received';
                      const isSent = tx.type === 'sent';
                      const reason = isReceived || isSent ? tx.purpose : (tx as any).reason;
                      const dateStr = formatDate((tx as any).date || (tx as any).dueDate || (tx as any).createdAt || new Date().toISOString());

                      return (
                        <motion.div
                          key={tx.id}
                          whileHover={{ x: 2 }}
                          className="py-3.5 sm:py-4 flex items-center justify-between gap-4 hover:bg-white/[0.035] px-3 rounded-2xl transition-colors select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                              isReceived ? "bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30 shadow-[#30d158]/10" :
                              isSent ? "bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30 shadow-[#ff453a]/10" :
                              "bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30 shadow-[#ffd60a]/10"
                            )}>
                              {isReceived ? <ArrowDownLeft size={18} /> :
                               isSent ? <ArrowUpRight size={18} /> :
                               <Clock size={18} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                                <span>{tx.personName}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                                  isReceived ? "bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20" :
                                  isSent ? "bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20" :
                                  "bg-[#ffd60a]/10 text-[#ffd60a] border-[#ffd60a]/20"
                                )}>
                                  {isReceived ? 'Received' : isSent ? 'Sent' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-[#86868b] truncate mt-0.5">
                                {reason || 'General transaction'} • {dateStr}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={cn(
                              "text-sm sm:text-base font-extrabold font-tabular tracking-tight",
                              isReceived ? "text-[#30d158]" :
                              isSent ? "text-[#ff453a]" :
                              "text-[#ffd60a]"
                            )}>
                              {isReceived ? '+' : isSent ? '-' : '⏳'} {formatCurrency(tx.amount)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 4. QUICK ACTIONS (High-Utility Action Grid in VisionOS Liquid Glass)  */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-quick-actions" className="space-y-4">
              <div>
                <div className="text-[11px] font-bold text-[#0a84ff] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" /> 04 • Fast Workflow
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Quick Actions
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* 1. Add Inflow */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/received?new=true"
                    className="vision-glass hover:border-[#30d158]/50 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_16px_rgba(48,209,88,0.2)]">
                      <ArrowDownLeft size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">+ Add Inflow</span>
                  </Link>
                </motion.div>

                {/* 2. New Pending */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/pending?new=true"
                    className="vision-glass hover:border-[#ffd60a]/50 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_16px_rgba(255,214,10,0.2)]">
                      <Clock size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">New Pending</span>
                  </Link>
                </motion.div>

                {/* 4. Gullak Bank */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/gullak"
                    className="vision-glass hover:border-[#bf5af2]/50 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#bf5af2]/15 text-[#bf5af2] border border-[#bf5af2]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_16px_rgba(191,90,242,0.2)]">
                      <PiggyBank size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">Gullak Bank</span>
                  </Link>
                </motion.div>

                {/* 5. New Goal */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/goals?new=true"
                    className="vision-glass hover:border-[#64d2ff]/50 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#64d2ff]/15 text-[#64d2ff] border border-[#64d2ff]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_16px_rgba(100,210,255,0.2)]">
                      <Target size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">New Goal</span>
                  </Link>
                </motion.div>

                {/* 6. Spotlight Search */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <button
                    type="button"
                    onClick={triggerSearch}
                    className="vision-glass hover:border-[#0a84ff]/50 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center w-full h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#0a84ff]/15 text-[#0a84ff] border border-[#0a84ff]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_16px_rgba(10,132,255,0.2)]">
                      <Search size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">⌘K Search</span>
                  </button>
                </motion.div>

                {/* 7. PDF Export */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/reports"
                    className="vision-glass hover:border-white/30 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/[0.08] text-white border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                      <FileSpreadsheet size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">PDF Export</span>
                  </Link>
                </motion.div>

                {/* 8. Calculator */}
                <motion.div whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.94 }}>
                  <Link
                    to="/calculator"
                    className="vision-glass hover:border-[#ff9f0a]/50 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 group text-center h-full shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_16px_rgba(255,159,10,0.2)]">
                      <CalculatorIcon size={20} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">Calculator</span>
                  </Link>
                </motion.div>
              </div>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 5. ANALYTICS & VELOCITY (Interactive Analytics Section)               */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-analytics" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#bf5af2] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#bf5af2]" /> 05 • Visual Intelligence
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Financial Analytics & Trajectory
                  </h2>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/analytics"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#0a84ff] hover:text-white flex items-center gap-1 transition-all border border-white/[0.08]"
                  >
                    Open Full Analytics <ChevronRight size={14} />
                  </Link>
                </motion.div>
              </div>

              <Suspense fallback={<SectionLoadingFallback />}>
                <InteractiveAnalyticsSection />
              </Suspense>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 6. SMART ALERTS HUD                                */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-ai-insights" className="space-y-4">
              <div>
                <div className="text-[11px] font-bold text-[#bf5af2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bf5af2]" /> 06 • Smart Intelligence
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Smart Alerts & Warnings
                </h2>
              </div>

              {/* Anomaly Detection Alerts in Liquid Glass */}
              {(highInflowAnomalies.length > 0 || duplicateInvoices.length > 0) && (
                <div className="space-y-3">
                  {highInflowAnomalies.slice(0, 2).map(tx => (
                    <motion.div
                      key={`anomaly-inflow-${tx.id}`}
                      whileHover={{ scale: 1.008 }}
                      className="p-4 rounded-[22px] border bg-[#30d158]/10 border-[#30d158]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-2xl shadow-[0_8px_24px_rgba(48,209,88,0.1)]"
                    >
                      <div className="flex gap-3.5 items-center">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30">
                          <ShieldAlert size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-[#30d158]">
                            High Volume Inflow: {formatCurrency(tx.amount)} received from {tx.personName}
                          </h3>
                          <p className="text-[#a1a1a6] text-xs mt-0.5">
                            Transaction exceeds 2.5x your average revenue settlement of {formatCurrency(avgInflow)}.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {duplicateInvoices.map((group, idx) => (
                    <motion.div
                      key={`anomaly-inv-${idx}`}
                      whileHover={{ scale: 1.008 }}
                      className="p-4 rounded-[22px] border bg-[#ff453a]/10 border-[#ff453a]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-2xl shadow-[0_8px_24px_rgba(255,69,58,0.1)]"
                    >
                      <div className="flex gap-3.5 items-center">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-[#ff453a]">
                            Duplicate Invoice Flag: #{group[0].invoiceNumber}
                          </h3>
                          <p className="text-[#a1a1a6] text-xs mt-0.5">
                            Logged across {group.length} separate transactions. Check for double billing.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* AI Assistant Module */}
              <Suspense fallback={<SectionLoadingFallback />}>
                <AIAssistantSection />
              </Suspense>

              {/* Smart Reminder Proactive HUD */}
              <Suspense fallback={<SectionLoadingFallback />}>
                <SmartReminderHUD />
              </Suspense>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* FEATURE BENTO (Gullak, Timeline, Security Vault, Cloud)               */}
            {/* --------------------------------------------------------------------- */}
            <motion.section variants={itemVariants} id="section-feature-bento" className="pt-4">
              <Suspense fallback={<SectionLoadingFallback />}>
                <InteractiveFeatureBento />
              </Suspense>
            </motion.section>
          </div>
      </motion.div>
    </DataStateGuard>
  );
}
