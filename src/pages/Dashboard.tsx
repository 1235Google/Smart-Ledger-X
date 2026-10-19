import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, useReducedMotion, Variants } from 'motion/react';
import { 
  ArrowDownLeft, Clock, Users, ArrowUpRight, Bell, 
  AlertTriangle, ShieldAlert, Sparkles, ChevronDown, 
  LayoutDashboard, Flame, ArrowRight, ShieldCheck, 
  Cloud, RefreshCw, Zap, Cpu, Lock, Search, PiggyBank,
  ChevronRight, Plus, Target, FileSpreadsheet, Calculator as CalculatorIcon,
  CheckCircle2, Send, ExternalLink, History
} from 'lucide-react';
import { formatCurrency, formatDate, cn, calculateReminderDetails } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { PendingMoney, ReceivedMoney } from '../types';
import BalanceCard from '../components/BalanceCard';
import EnterpriseCard from '../components/ui/EnterpriseCard';
import CountUp from '../components/ui/CountUp';
import DataStateGuard from '../components/ui/DataStateGuard';
import SmartFinancialProfileCard from '../components/home/SmartFinancialProfileCard';

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

const DeferredSection = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let handle: number;
    let timer: NodeJS.Timeout;
    
    if ('requestIdleCallback' in window) {
      handle = window.requestIdleCallback(() => setIsRendered(true), { timeout: 1000 });
    } else {
      timer = setTimeout(() => setIsRendered(true), 100);
    }
    
    return () => {
      if (handle && 'cancelIdleCallback' in window) window.cancelIdleCallback(handle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!isRendered) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
};

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

  const {
    recentTransactions, receivedCount, pendingCount, pendingTransactions,
    overduePending, upcomingPending, dueReminders, receivedMoneyTxs,
    totalReceivedAmount, avgInflow, highInflowAnomalies, duplicateInvoices,
    today
  } = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const recentTx = transactions.slice(0, 8);
    const rCount = transactions.filter(t => t.type === 'received').length;
    const pCount = transactions.filter(t => t.type === 'pending' && (t.status === 'pending' || t.status === 'overdue' || (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed'))).length;
    
    const pTxs = transactions.filter((t): t is PendingMoney => t.type === 'pending' && (t.status === 'pending' || t.status === 'overdue' || (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'closed')));
    const oPending = pTxs.filter(t => t.dueDate < todayStr || t.status === 'overdue');
    const uPending = pTxs.filter(t => t.dueDate >= todayStr && t.status !== 'overdue');

    const dReminders = transactions.filter((t): t is PendingMoney => {
      if (t.type !== 'pending' || t.status !== 'pending' || t.reminderStatus !== 'active') return false;
      const details = calculateReminderDetails(t, generalSettings?.timezone);
      return !details.isStopped && !!details.nextReminderDate && details.nextReminderDate <= todayStr;
    });

    const rMoneyTxs = transactions.filter((t): t is ReceivedMoney => t.type === 'received');
    const tReceivedAmount = rMoneyTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const aInflow = rMoneyTxs.length > 0 ? tReceivedAmount / rMoneyTxs.length : 0;
    
    const hInflowAnomalies = rMoneyTxs.filter(
      tx => tx.amount > aInflow * 2.5 && aInflow > 0
    );

    const invMap = new Map<string, Array<ReceivedMoney>>();
    transactions.forEach(tx => {
      if (tx.type === 'received' && tx.invoiceNumber) {
        const key = tx.invoiceNumber.toLowerCase().trim();
        const existing = invMap.get(key) || [];
        existing.push(tx);
        invMap.set(key, existing);
      }
    });

    const dInvoices = Array.from(invMap.values()).filter(group => group.length > 1);

    return {
      recentTransactions: recentTx,
      receivedCount: rCount,
      pendingCount: pCount,
      pendingTransactions: pTxs,
      overduePending: oPending,
      upcomingPending: uPending,
      dueReminders: dReminders,
      receivedMoneyTxs: rMoneyTxs,
      totalReceivedAmount: tReceivedAmount,
      avgInflow: aInflow,
      highInflowAnomalies: hInflowAnomalies,
      duplicateInvoices: dInvoices,
      today: todayStr
    };
  }, [transactions, generalSettings?.timezone]);

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
    hidden: { opacity: 0, y: 18 },
    show: { 
      opacity: 1, 
      y: 0, 
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
        className="w-full relative text-[var(--md-sys-color-on-surface)]"
      >
        
        {/* Top Header */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 px-1 mb-4 sm:mb-6 border-b border-[var(--md-sys-color-outline-variant)]/30"
        >
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold tracking-wider text-[var(--md-sys-color-primary)] uppercase">
              Financial Overview
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--md-sys-color-on-surface-variant)] self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/40 text-xs text-[var(--md-sys-color-on-surface)] font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--md-sys-color-success)]" /> Real-Time Vault Sync
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
        <div className="space-y-10 sm:space-y-12">

            {/* --------------------------------------------------------------------- */}
            {/* 1. CURRENT BALANCE & LIQUIDITY VAULT                                  */}
            {/* --------------------------------------------------------------------- */}
            <motion.section 
              variants={itemVariants} 
              id="section-balance" 
              className="space-y-4"
              style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                    Liquidity & Assets
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight mt-0.5">
                    Current Balance & Liquidity
                  </h2>
                </div>
                <button 
                  onClick={() => navigate('/balance')}
                  className="m3-btn-tonal text-xs py-2 px-4 self-start sm:self-auto cursor-pointer"
                >
                  Manage Vaults <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Primary Enterprise Card & Smart Financial Profile Card stacked */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                  <div onClick={() => navigate('/balance')} className="cursor-pointer transition-transform duration-200 hover:scale-[1.005]">
                    <BalanceCard
                      currentBalance={currentBalance}
                      startingBalance={startingBalance}
                      totalReceived={totalReceived}
                    />
                  </div>
                  
                  <SmartFinancialProfileCard />
                </div>

                {/* Secondary Liquidity Caps in Enterprise Style */}
                <div className="lg:col-span-1 flex flex-col sm:flex-row lg:flex-col gap-3 sm:gap-4 justify-between">
                  {/* Total Received Capsule */}
                  <div 
                    onClick={() => navigate('/received')}
                    className="flex-1 enterprise-card p-6 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--md-sys-color-success)] uppercase tracking-wider">
                        <ArrowDownLeft size={16} /> Total Received
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)]">
                        {receivedCount} clients
                      </span>
                    </div>

                    <div className="text-3xl sm:text-4xl font-extrabold text-[var(--md-sys-color-on-surface)] font-mono tabular-nums tracking-tight">
                      <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
                    </div>

                    <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-3 pt-3 border-t border-[var(--md-sys-color-outline-variant)]/30 flex items-center justify-between font-medium">
                      <span>Inflow Velocity</span>
                      <span className="text-[var(--md-sys-color-success)] font-semibold">100% Settled</span>
                    </div>
                  </div>

                  {/* Total Pending Capsule */}
                  <div 
                    onClick={() => navigate('/pending')}
                    className="flex-1 enterprise-card p-6 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--md-sys-color-tertiary)] uppercase tracking-wider">
                        <Clock size={16} /> Total Pending
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]">
                        {pendingCount} parties
                      </span>
                    </div>

                    <div className="text-3xl sm:text-4xl font-extrabold text-[var(--md-sys-color-on-surface)] font-mono tabular-nums tracking-tight">
                      <CountUp value={totalPending} formatter={(v) => formatCurrency(v)} />
                    </div>

                    <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-3 pt-3 border-t border-[var(--md-sys-color-outline-variant)]/30 flex items-center justify-between font-medium">
                      <span>Outstanding Receivables</span>
                      <span className="text-xs text-[var(--md-sys-color-primary)] font-semibold flex items-center gap-1">
                        View List <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 2. PENDING PAYMENTS (Active Receivables, Overdue Alerts, Reminders)     */}
            {/* --------------------------------------------------------------------- */}
            <DeferredSection fallback={<SectionLoadingFallback />}>
              <motion.section 
                variants={itemVariants} 
                id="section-pending" 
                className="space-y-4"
                style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}
              >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[#ffd60a] tracking-wide">
                    Receivables & Dues
                  </div>
                  <div className="text-xs font-bold text-[var(--md-sys-color-tertiary)] uppercase tracking-wider">
                    Receivables & Dues
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight mt-0.5">
                    Pending Dues & Reminders
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/pending?new=true"
                    className="m3-btn-tonal text-xs py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Due Money
                  </Link>
                  <Link
                    to="/pending"
                    className="text-xs font-bold text-[var(--md-sys-color-primary)] hover:underline flex items-center gap-1 transition-colors px-2"
                  >
                    All Dues ({pendingTransactions.length}) <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Overdue Alert Bar in Material 3 Alert Banner */}
              {overduePending.length > 0 && (
                <div 
                  className="p-4 sm:p-5 rounded-[24px] bg-[var(--md-sys-color-error-container)] border border-[var(--md-sys-color-error)]/30 text-[var(--md-sys-color-on-error-container)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>{overduePending.length} Overdue Dues</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] font-mono font-bold">
                          {formatCurrency(overduePending.reduce((acc, t) => acc + t.amount, 0))}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">
                        Send automated reminders and payment links to get your money quickly.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/pending"
                    className="m3-btn-filled text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto"
                    style={{ backgroundColor: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)' }}
                  >
                    Resolve Overdue →
                  </Link>
                </div>
              )}

              {/* Pending Dues Cards Grid in M3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTransactions.length === 0 ? (
                  <div className="col-span-full py-10 px-6 rounded-[28px] m3-card text-center space-y-2">
                    <CheckCircle2 size={36} className="text-[var(--md-sys-color-success)] mx-auto opacity-90" />
                    <p className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">All Dues Cleared</p>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">No pending payments outstanding across your records.</p>
                  </div>
                ) : (
                  pendingTransactions.slice(0, 6).map((tx) => {
                    const isOverdue = tx.dueDate < today;
                    return (
                      <div
                        key={tx.id}
                        className={cn(
                          "m3-card p-5 flex flex-col justify-between group",
                          isOverdue && "border-[var(--md-sys-color-error)]/40 bg-[var(--md-sys-color-error-container)]/10"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0",
                                isOverdue 
                                  ? "bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] border-[var(--md-sys-color-error)]/30" 
                                  : "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] border-[var(--md-sys-color-tertiary)]/30"
                              )}>
                                {isOverdue ? '!' : '⏳'}
                              </div>
                              <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate max-w-[140px]">{tx.personName}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs shrink-0",
                              isOverdue 
                                ? "text-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] border-[var(--md-sys-color-error)]/30" 
                                : "text-[var(--md-sys-color-tertiary)] bg-[var(--md-sys-color-tertiary-container)] border-[var(--md-sys-color-tertiary)]/30"
                            )}>
                              {isOverdue ? 'Overdue' : 'Due ' + formatDate(tx.dueDate)}
                            </span>
                          </div>

                          <div className="text-2xl font-extrabold text-[var(--md-sys-color-on-surface)] font-mono tabular-nums mb-1 tracking-tight">
                            {formatCurrency(tx.amount)}
                          </div>
                          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate mb-3">
                            {tx.reason || 'General receivable'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[var(--md-sys-color-outline-variant)]/30 flex items-center justify-between">
                          <span className="text-[11px] text-[var(--md-sys-color-outline)] font-medium">
                            {tx.phoneNumber ? tx.phoneNumber : 'No phone logged'}
                          </span>
                          <Link
                            to="/pending"
                            className="text-xs font-bold text-[var(--md-sys-color-primary)] hover:underline flex items-center gap-1 transition-colors"
                          >
                            Remind <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </motion.section>
            </DeferredSection>

            {/* --------------------------------------------------------------------- */}
            {/* 3. RECENT TRANSACTIONS (Activity Feed)                                */}
            {/* --------------------------------------------------------------------- */}
            <DeferredSection fallback={<SectionLoadingFallback />}>
              <motion.section 
                variants={itemVariants} 
                id="section-transactions" 
                className="space-y-4"
                style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}
              >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                    Activity Feed
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight mt-0.5">
                    Recent Transactions
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/search')}
                  className="m3-btn-tonal text-xs py-2 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  Search Full Ledger <ChevronRight size={14} />
                </button>
              </div>

              <div className="m3-card p-4 sm:p-6 overflow-hidden">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-12 text-[var(--md-sys-color-on-surface-variant)] text-sm">
                    No transactions recorded yet. Use Quick Actions below to record received money or receivables.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--md-sys-color-outline-variant)]/20">
                    {recentTransactions.map((tx) => {
                      const isReceived = tx.type === 'received';
                      const isSent = tx.type === 'sent';
                      const reason = isReceived || isSent ? tx.purpose : (tx as any).reason;
                      const dateStr = formatDate((tx as any).date || (tx as any).dueDate || (tx as any).createdAt || new Date().toISOString());

                      return (
                        <div
                          key={tx.id}
                          className="py-3 sm:py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--md-sys-color-surface-container-high)]/50 px-3 rounded-2xl transition-colors select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs",
                              isReceived ? "bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)] border-[var(--md-sys-color-success)]/30" :
                              isSent ? "bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] border-[var(--md-sys-color-error)]/30" :
                              "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] border-[var(--md-sys-color-tertiary)]/30"
                            )}>
                              {isReceived ? <ArrowDownLeft size={18} /> :
                               isSent ? <ArrowUpRight size={18} /> :
                               <Clock size={18} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate flex items-center gap-2">
                                <span>{tx.personName}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                                  isReceived ? "bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)] border-[var(--md-sys-color-success)]/20" :
                                  isSent ? "bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] border-[var(--md-sys-color-error)]/20" :
                                  "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] border-[var(--md-sys-color-tertiary)]/20"
                                )}>
                                  {isReceived ? 'Received' : isSent ? 'Sent' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate mt-0.5">
                                {reason || 'General transaction'} • {dateStr}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={cn(
                              "text-sm sm:text-base font-extrabold font-mono tabular-nums tracking-tight",
                              isReceived ? "text-[var(--md-sys-color-success)]" :
                              isSent ? "text-[var(--md-sys-color-error)]" :
                              "text-[var(--md-sys-color-tertiary)]"
                            )}>
                              {isReceived ? '+' : isSent ? '-' : '⏳'} {formatCurrency(tx.amount)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.section>
            </DeferredSection>

            {/* --------------------------------------------------------------------- */}
            {/* 4. QUICK ACTIONS (High-Utility Action Grid in M3 Action Cards)        */}
            {/* --------------------------------------------------------------------- */}
            <motion.section 
              variants={itemVariants} 
              id="section-quick-actions" 
              className="space-y-4"
              style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}
            >
              <div>
                <div className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                  Fast Operations
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight mt-0.5">
                  Quick Actions
                </h2>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
                {/* 1. Add Inflow */}
                <Link
                  to="/received?new=true"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)] flex items-center justify-center shadow-xs">
                    <ArrowDownLeft size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">+ Inflow</span>
                </Link>

                {/* 2. New Pending */}
                <Link
                  to="/pending?new=true"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] flex items-center justify-center shadow-xs">
                    <Clock size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">Pending</span>
                </Link>

                {/* 3. Gullak Bank */}
                <Link
                  to="/gullak"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shadow-xs">
                    <PiggyBank size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">Gullak</span>
                </Link>

                {/* 4. New Goal */}
                <Link
                  to="/goals?new=true"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] flex items-center justify-center shadow-xs">
                    <Target size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">Goal</span>
                </Link>

                {/* 5. Spotlight Search */}
                <button
                  type="button"
                  onClick={triggerSearch}
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center w-full h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center shadow-xs">
                    <Search size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">Search</span>
                </button>

                {/* 6. PDF Export */}
                <Link
                  to="/reports"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center shadow-xs">
                    <FileSpreadsheet size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">Export</span>
                </Link>

                {/* 7. Calculator */}
                <Link
                  to="/calculator"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center shadow-xs">
                    <CalculatorIcon size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">Calc</span>
                </Link>

                {/* 8. Audit Timeline */}
                <Link
                  to="/timeline"
                  className="m3-card hover:border-[var(--md-sys-color-primary)] p-2 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 text-center h-full active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center shadow-xs">
                    <History size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate max-w-full">History</span>
                </Link>
              </div>
            </motion.section>

            {/* --------------------------------------------------------------------- */}
            {/* 5. ANALYTICS & VELOCITY (Interactive Analytics Section)               */}
            {/* --------------------------------------------------------------------- */}
            <DeferredSection fallback={<SectionLoadingFallback />}>
              <motion.section variants={itemVariants} id="section-analytics" className="space-y-4" style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                    Analytics & Trends
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight mt-0.5">
                    Financial Analytics & Trajectory
                  </h2>
                </div>
                <div className="self-start sm:self-auto">
                  <Link
                    to="/analytics"
                    className="m3-btn-tonal text-xs py-2 px-3.5 flex items-center gap-1.5"
                  >
                    Open Full Analytics <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              <Suspense fallback={<SectionLoadingFallback />}>
                <InteractiveAnalyticsSection />
              </Suspense>
            </motion.section>
            </DeferredSection>

            {/* --------------------------------------------------------------------- */}
            {/* 6. SMART ALERTS HUD                                */}
            {/* --------------------------------------------------------------------- */}
            <DeferredSection fallback={<SectionLoadingFallback />}>
              <motion.section variants={itemVariants} id="section-ai-insights" className="space-y-4" style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}>
              <div>
                <div className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                  Risk & Security
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight mt-0.5">
                  Smart Alerts & Warnings
                </h2>
              </div>

              {/* Anomaly Detection Alerts in M3 Cards */}
              {(highInflowAnomalies.length > 0 || duplicateInvoices.length > 0) && (
                <div className="space-y-3">
                  {highInflowAnomalies.slice(0, 2).map(tx => (
                    <div
                      key={`anomaly-inflow-${tx.id}`}
                      className="p-4 rounded-2xl border border-[var(--md-sys-color-success)]/30 bg-[var(--md-sys-color-surface-container)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="flex gap-3.5 items-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)]">
                          <ShieldAlert size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-[var(--md-sys-color-on-surface)]">
                            High Volume Inflow: {formatCurrency(tx.amount)} received from {tx.personName}
                          </h3>
                          <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs mt-0.5">
                            Transaction exceeds 2.5x your average revenue settlement of {formatCurrency(avgInflow)}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {duplicateInvoices.map((group, idx) => (
                    <div
                      key={`anomaly-inv-${idx}`}
                      className="p-4 rounded-2xl border border-[var(--md-sys-color-error)]/30 bg-[var(--md-sys-color-surface-container)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="flex gap-3.5 items-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-[var(--md-sys-color-on-surface)]">
                            Duplicate Invoice Flag: #{group[0].invoiceNumber}
                          </h3>
                          <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs mt-0.5">
                            Logged across {group.length} separate transactions. Check for double billing.
                          </p>
                        </div>
                      </div>
                    </div>
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
            </DeferredSection>

            {/* --------------------------------------------------------------------- */}
            {/* FEATURE BENTO (Gullak, Timeline, Security Vault, Cloud)               */}
            {/* --------------------------------------------------------------------- */}
            <DeferredSection fallback={<SectionLoadingFallback />}>
              <motion.section variants={itemVariants} id="section-feature-bento" className="pt-4" style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)' }}>
              <Suspense fallback={<SectionLoadingFallback />}>
                <InteractiveFeatureBento />
              </Suspense>
            </motion.section>
            </DeferredSection>
          </div>
      </motion.div>
    </DataStateGuard>
  );
}
