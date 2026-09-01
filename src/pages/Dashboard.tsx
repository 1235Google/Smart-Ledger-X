import React, { useState, lazy, Suspense } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownLeft, Clock, Users, ArrowUpRight, Bell, 
  AlertTriangle, ShieldAlert, Sparkles, ChevronDown, 
  LayoutDashboard, Flame, ArrowRight, ShieldCheck, 
  Cloud, RefreshCw, Zap, Cpu, Lock, Search, PiggyBank,
  ChevronRight, Plus
} from 'lucide-react';
import { formatCurrency, formatDate, cn, calculateReminderDetails } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { PendingMoney, SentMoney, ReceivedMoney } from '../types';
import BalanceCard from '../components/BalanceCard';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import DataStateGuard from '../components/ui/DataStateGuard';
import MagneticButton from '../components/home/MagneticButton';

// Lazy Loaded Futuristic Landing Showcase Components
const Hero3DCanvas = lazy(() => import('../components/home/Hero3DCanvas'));
const FloatingVault3D = lazy(() => import('../components/home/FloatingVault3D'));
const ProductShowcaseVideo = lazy(() => import('../components/home/ProductShowcaseVideo'));
const AIAssistantSection = lazy(() => import('../components/home/AIAssistantSection'));
const SmartReminderHUD = lazy(() => import('../components/home/SmartReminderHUD'));
const SecurityVaultSection = lazy(() => import('../components/home/SecurityVaultSection'));
const InteractiveAnalyticsSection = lazy(() => import('../components/home/InteractiveAnalyticsSection'));
const InteractiveFeatureBento = lazy(() => import('../components/home/InteractiveFeatureBento'));

const SectionLoadingFallback = () => (
  <div className="w-full h-44 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin" />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
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

  const [viewMode, setViewMode] = useState<'showcase' | 'compact'>('showcase');
  const [heroMode, setHeroMode] = useState<'video' | 'interactive'>('video');

  const recentTransactions = transactions.slice(0, 6);
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading Smart Ledger X..."
      skeletonType="dashboard"
    >
      <div className="w-full relative min-h-screen text-[#f5f5f7] overflow-x-hidden selection:bg-[#0a84ff]/30 selection:text-white">
        
        {/* Apple Status HUD: Mode Switcher & Live Engine Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 px-1 mb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#30d158] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
              SMART LEDGER X • APPLE FINANCIAL INTELLIGENCE
            </span>
          </div>

          {/* View Mode Segment Switcher (iOS Segmented Control Style) */}
          <div className="inline-flex items-center bg-[#161722]/80 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-md self-start sm:self-auto">
            <button
              onClick={() => setViewMode('showcase')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'showcase'
                  ? 'bg-[#0a84ff] text-white shadow-sm shadow-[#0a84ff]/30'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              <Sparkles size={13} /> Product Showcase
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'compact'
                  ? 'bg-[#0a84ff] text-white shadow-sm shadow-[#0a84ff]/30'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              <LayoutDashboard size={13} /> Operational Grid
            </button>
          </div>
        </div>

        {/* Floating Quick Action Pills Bar */}
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          <Link
            to="/received"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] border border-[#30d158]/30 font-semibold text-xs transition-all shadow-sm active:scale-95"
          >
            <ArrowDownLeft size={14} />
            <span>+ Add Income</span>
          </Link>

          <Link
            to="/pending"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd60a]/15 hover:bg-[#ffd60a]/25 text-[#ffd60a] border border-[#ffd60a]/30 font-semibold text-xs transition-all shadow-sm active:scale-95"
          >
            <Clock size={14} />
            <span>Add Pending</span>
          </Link>

          <Link
            to="/analytics"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#bf5af2]/15 hover:bg-[#bf5af2]/25 text-[#bf5af2] border border-[#bf5af2]/30 font-semibold text-xs transition-all shadow-sm active:scale-95"
          >
            <Sparkles size={14} />
            <span>Analytics</span>
          </Link>

          <Link
            to="/gullak"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff375f]/15 hover:bg-[#ff375f]/25 text-[#ff375f] border border-[#ff375f]/30 font-semibold text-xs transition-all shadow-sm active:scale-95"
          >
            <PiggyBank size={14} />
            <span>Gullak</span>
          </Link>

          <Link
            to="/search"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#f5f5f7] border border-white/10 font-semibold text-xs transition-all shadow-sm active:scale-95 ml-auto"
          >
            <Search size={14} />
            <span>Search Ledger</span>
          </Link>
        </div>

        {viewMode === 'showcase' ? (
          <div className="space-y-12 pb-24">
            {/* ========================================================================= */}
            {/* HERO SECTION: Realistic Product Showcase & Ambient 3D Canvas               */}
            {/* ========================================================================= */}
            <section className="relative min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 md:px-8 overflow-hidden rounded-[36px] bg-gradient-to-b from-[#0e0f17]/90 via-[#0a0b12]/95 to-[#04050a]/100 border border-white/[0.1] shadow-2xl">
              {/* Three.js Ambient 3D Background Canvas */}
              <Suspense fallback={null}>
                <Hero3DCanvas className="opacity-70" />
              </Suspense>

              {/* Ambient radial glows */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#0a84ff]/15 via-[#5e5ce6]/15 to-[#bf5af2]/10 rounded-full blur-[140px] pointer-events-none" />

              <div className="relative z-10 w-full max-w-5xl mx-auto text-center space-y-6 pt-4">
                {/* Micro Pill Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl shadow-md"
                >
                  <Sparkles size={13} className="text-[#64d2ff]" />
                  <span className="text-xs font-bold tracking-wider uppercase text-white">
                    Apple Precision Finance Suite
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
                </motion.div>

                {/* Hero Title with Apple High Contrast Typography */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.06]"
                >
                  Smart Ledger <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0a84ff] via-[#64d2ff] to-[#bf5af2]">PRO</span>
                  <br />
                  <span className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-300">
                    Financial Intelligence Built for Clarity
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="max-w-2xl mx-auto text-base sm:text-lg text-[#86868b] font-medium leading-relaxed"
                >
                  End-to-end client encryption, automated spending insights, and instantaneous cashflow tracking wrapped in a modern Apple-inspired experience.
                </motion.p>

                {/* Magnetic CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="flex flex-wrap items-center justify-center gap-4 pt-2"
                >
                  <MagneticButton
                    variant="primary"
                    onClick={() => scrollToSection('operational-terminal')}
                    className="shadow-lg shadow-[#0a84ff]/25"
                  >
                    <Zap size={16} className="text-white" /> Open Ledger
                  </MagneticButton>

                  <MagneticButton
                    variant="glass"
                    onClick={() => navigate('/backup')}
                  >
                    <Cloud size={16} className="text-[#0a84ff]" /> Secure Cloud Backup
                  </MagneticButton>

                  <MagneticButton
                    variant="secondary"
                    onClick={() => scrollToSection('ai-assistant-section')}
                  >
                    <Cpu size={16} className="text-[#bf5af2]" /> AI Insights
                  </MagneticButton>
                </motion.div>

                {/* Hero Showcase Switcher */}
                <div className="pt-6 flex justify-center">
                  <div className="inline-flex items-center bg-[#161722]/80 p-1 rounded-full border border-white/10 shadow-lg">
                    <button
                      onClick={() => setHeroMode('video')}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                        heroMode === 'video'
                          ? 'bg-[#0a84ff] text-white shadow-sm'
                          : 'text-[#86868b] hover:text-white'
                      }`}
                    >
                      <Sparkles size={13} /> Product Showcase
                    </button>
                    <button
                      onClick={() => setHeroMode('interactive')}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                        heroMode === 'interactive'
                          ? 'bg-[#0a84ff] text-white shadow-sm'
                          : 'text-[#86868b] hover:text-white'
                      }`}
                    >
                      <LayoutDashboard size={13} /> Interactive Vault
                    </button>
                  </div>
                </div>
              </div>

              {/* Centered Showcase Area */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full mt-8 relative z-20"
              >
                <Suspense fallback={<SectionLoadingFallback />}>
                  {heroMode === 'video' ? (
                    <ProductShowcaseVideo 
                      balance={currentBalance}
                      totalReceived={totalReceived}
                      totalSent={totalSent}
                      hasTransactions={transactions.length > 0}
                      onInteractiveClick={() => scrollToSection('operational-terminal')} 
                    />
                  ) : (
                    <FloatingVault3D
                      balance={currentBalance}
                      totalReceived={totalReceived}
                      totalSent={totalSent}
                      totalPending={totalPending}
                      onExplore={() => scrollToSection('operational-terminal')}
                      onRunBackup={() => navigate('/backup')}
                    />
                  )}
                </Suspense>
              </motion.div>

              {/* Scroll Down Indicator */}
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                onClick={() => scrollToSection('operational-terminal')}
                className="mt-8 text-[#86868b] hover:text-white cursor-pointer flex flex-col items-center gap-1 text-xs font-medium select-none"
              >
                <span>EXPLORE LEDGER DASHBOARD</span>
                <ChevronDown size={18} />
              </motion.div>
            </section>

            {/* ========================================================================= */}
            {/* LIVE OPERATIONAL TERMINAL (Apple Wallet + Ledger Grid)                    */}
            {/* ========================================================================= */}
            <div id="operational-terminal" className="pt-6 scroll-mt-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0a84ff] uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#0a84ff]" /> Operational Dashboard
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
                    Live Balance & Recent Feed
                  </h2>
                </div>
                <button
                  onClick={() => setViewMode('compact')}
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-[#86868b] hover:text-white transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard size={14} /> Compact Grid
                </button>
              </div>

              {/* Apple-Style Anomaly Banners */}
              {(highSpendingAnomalies.length > 0 || duplicateInvoices.length > 0) && (
                <div className="space-y-3 mb-8">
                  {highSpendingAnomalies.slice(0, 3).map(tx => (
                    <div
                      key={`anomaly-spend-${tx.id}`}
                      className="p-4 rounded-2xl border bg-[#ffd60a]/10 border-[#ffd60a]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl"
                    >
                      <div className="flex gap-3 items-start sm:items-center">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-[#ffd60a]/20 text-[#ffd60a]">
                          <ShieldAlert size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#ffd60a]">
                            Unusual Spending Detected
                          </h3>
                          <p className="text-[#a1a1a6] text-xs mt-0.5">
                            {formatCurrency(tx.amount)} sent to {tx.personName} is higher than your average spending of {formatCurrency(avgSpending)}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {duplicateInvoices.map((group, idx) => (
                    <div
                      key={`anomaly-inv-${idx}`}
                      className="p-4 rounded-2xl border bg-[#ff453a]/10 border-[#ff453a]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl"
                    >
                      <div className="flex gap-3 items-start sm:items-center">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-[#ff453a]/20 text-[#ff453a]">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#ff453a]">
                            Duplicate Invoice Number
                          </h3>
                          <p className="text-[#a1a1a6] text-xs mt-0.5">
                            Invoice <strong>{group[0].invoiceNumber}</strong> has been logged in {group.length} transactions.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Due Reminders Bar */}
              {dueReminders.length > 0 && (
                <div className="space-y-3 mb-8">
                  {dueReminders.map(reminder => {
                    const isOverdue = reminder.dueDate < today;
                    return (
                      <div
                        key={reminder.id}
                        className={cn(
                          "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl",
                          isOverdue ? "bg-[#ff453a]/10 border-[#ff453a]/25" : "bg-[#0a84ff]/10 border-[#0a84ff]/25"
                        )}
                      >
                        <div className="flex gap-3 items-start sm:items-center">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                            isOverdue ? "bg-[#ff453a]/20 text-[#ff453a]" : "bg-[#0a84ff]/20 text-[#0a84ff]"
                          )}>
                            {isOverdue ? <AlertTriangle size={20} /> : <Bell size={20} />}
                          </div>
                          <div>
                            <h3 className={cn("font-bold text-sm", isOverdue ? "text-[#ff453a]" : "text-[#0a84ff]")}>
                              {isOverdue ? "Payment Overdue" : "Reminder Due"}
                            </h3>
                            <p className="text-[#a1a1a6] text-xs mt-0.5">
                              {isOverdue 
                                ? `${reminder.personName}'s payment of ${formatCurrency(reminder.amount)} is overdue.`
                                : `${reminder.personName}'s ${formatCurrency(reminder.amount)} payment reminder is ready.`}
                            </p>
                          </div>
                        </div>
                        {reminder.phoneNumber && (
                          <Link 
                            to="/pending" 
                            className={cn(
                              "px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap text-center sm:text-left shadow-sm",
                              isOverdue ? "bg-[#ff453a] hover:bg-[#ff453a]/90 text-white" : "bg-[#0a84ff] hover:bg-[#0a84ff]/90 text-white"
                            )}
                          >
                            Send WhatsApp
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bento Grid: Apple Wallet Card + Apple Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max">
                {/* Main Balance Card Component */}
                <div onClick={() => navigate('/balance')} className="lg:col-span-2 cursor-pointer h-full flex flex-col">
                  <BalanceCard
                    currentBalance={currentBalance}
                    startingBalance={startingBalance}
                    totalReceived={totalReceived}
                    totalSent={totalSent}
                  />
                </div>

                {/* Apple Wallet Style Recent Activity List */}
                <div 
                  onClick={() => navigate('/analytics')}
                  className="lg:col-span-1 lg:row-span-2 flex flex-col bg-[#12131a]/80 border border-white/[0.08] rounded-[28px] p-6 cursor-pointer relative group overflow-hidden shadow-2xl backdrop-blur-3xl"
                >
                  <div className="flex items-center justify-between mb-5 relative z-10">
                    <h2 className="text-base font-bold text-white tracking-tight">Recent Activity</h2>
                    <span className="text-xs text-[#0a84ff] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      All <ChevronRight size={14} />
                    </span>
                  </div>

                  <div className="space-y-2.5 relative z-10 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[350px]">
                    {recentTransactions.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-[#86868b] text-sm">
                        <p>No recent transactions</p>
                      </div>
                    ) : (
                      recentTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] p-3 rounded-2xl flex items-center gap-3 transition-all"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            tx.type === 'received' ? "bg-[#30d158]/15 text-[#30d158]" :
                            tx.type === 'sent' ? "bg-[#ff453a]/15 text-[#ff453a]" :
                            "bg-[#ffd60a]/15 text-[#ffd60a]"
                          )}>
                            {tx.type === 'received' ? <ArrowDownLeft size={18} /> :
                             tx.type === 'sent' ? <ArrowUpRight size={18} /> :
                             <Clock size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-white truncate">{tx.personName}</div>
                            <div className="text-[11px] text-[#86868b] mt-0.5 truncate">
                              {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-sm font-bold tracking-tight font-tabular",
                              tx.type === 'received' ? "text-[#30d158]" :
                              tx.type === 'sent' ? "text-[#ff453a]" :
                              "text-[#ffd60a]"
                            )}>
                              {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Stats Grid: Received & Pending */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div onClick={() => navigate('/received')} className="cursor-pointer h-full flex flex-col">
                    <GlassCard delay={0.08} glowColor="rgba(48, 209, 88, 0.25)" className="h-full">
                      <div className="text-[#86868b] text-xs font-bold mb-1 uppercase tracking-wider relative z-10">Total Received</div>
                      <div className="text-3xl font-extrabold text-white mb-3 relative z-10 font-tabular">
                        <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#86868b] bg-white/[0.04] w-fit px-3 py-1.5 rounded-full border border-white/[0.06] relative z-10">
                        <Users size={14} className="text-[#30d158]" /> From {receivedCount} {receivedCount === 1 ? 'client' : 'clients'}
                      </div>
                    </GlassCard>
                  </div>

                  <div onClick={() => navigate('/pending')} className="cursor-pointer h-full flex flex-col">
                    <GlassCard delay={0.16} glowColor="rgba(255, 214, 10, 0.25)" className="h-full">
                      <div className="text-[#86868b] text-xs font-bold mb-1 uppercase tracking-wider relative z-10">Total Pending</div>
                      <div className="text-3xl font-extrabold text-white mb-3 relative z-10 font-tabular">
                        <CountUp value={totalPending} formatter={(v) => formatCurrency(v)} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#86868b] bg-white/[0.04] w-fit px-3 py-1.5 rounded-full border border-white/[0.06] relative z-10">
                        <Users size={14} className="text-[#ffd60a]" /> From {pendingCount} {pendingCount === 1 ? 'party' : 'parties'}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 1: AI FINANCE ASSISTANT                                           */}
            {/* ========================================================================= */}
            <div id="ai-assistant-section">
              <Suspense fallback={<SectionLoadingFallback />}>
                <AIAssistantSection />
              </Suspense>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2: SMART REMINDERS & PROACTIVE HUD                                */}
            {/* ========================================================================= */}
            <div id="smart-reminders-section">
              <Suspense fallback={<SectionLoadingFallback />}>
                <SmartReminderHUD />
              </Suspense>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 3: SECURITY VAULT                                                 */}
            {/* ========================================================================= */}
            <div id="security-vault-section">
              <Suspense fallback={<SectionLoadingFallback />}>
                <SecurityVaultSection />
              </Suspense>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 4: INTERACTIVE ANALYTICS                                          */}
            {/* ========================================================================= */}
            <div id="analytics-section">
              <Suspense fallback={<SectionLoadingFallback />}>
                <InteractiveAnalyticsSection />
              </Suspense>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 5: BENTO FEATURE SHOWCASE (Gullak, Timeline, Reports, Cloud)      */}
            {/* ========================================================================= */}
            <Suspense fallback={<SectionLoadingFallback />}>
              <InteractiveFeatureBento />
            </Suspense>
          </div>
        ) : (
          /* Operational Compact View */
          <div className="space-y-8 pb-16">
            <header className="mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Financial Command Center</h1>
              <p className="text-sm text-[#86868b]">
                Welcome back, <span className="text-white font-bold">{userProfile?.fullName || 'Souvik Dash'}</span>. Your ledger telemetry is live.
              </p>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max">
              <div onClick={() => navigate('/balance')} className="lg:col-span-2 cursor-pointer">
                <BalanceCard
                  currentBalance={currentBalance}
                  startingBalance={startingBalance}
                  totalReceived={totalReceived}
                  totalSent={totalSent}
                />
              </div>

              <div 
                onClick={() => navigate('/analytics')}
                className="lg:col-span-1 lg:row-span-2 flex flex-col bg-[#12131a]/80 border border-white/[0.08] rounded-[28px] p-6 cursor-pointer backdrop-blur-3xl"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-white">Recent Activity</h2>
                  <span className="text-xs text-[#0a84ff] font-bold">View All →</span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="bg-white/[0.03] p-3 rounded-2xl flex items-center justify-between border border-white/[0.05]">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${tx.type === 'received' ? 'bg-[#30d158]/15 text-[#30d158]' : 'bg-[#ff453a]/15 text-[#ff453a]'}`}>
                          {tx.type === 'received' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{tx.personName}</div>
                          <div className="text-[10px] text-[#86868b]">
                            {formatDate((tx as any).date || (tx as any).dueDate || (tx as any).createdAt || new Date().toISOString())}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-bold font-tabular ${tx.type === 'received' ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
                        {tx.type === 'received' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => navigate('/received')} className="cursor-pointer">
                  <GlassCard delay={0.08} glowColor="rgba(48, 209, 88, 0.25)">
                    <div className="text-[#86868b] text-xs font-bold mb-1 uppercase tracking-wider">Total Received</div>
                    <div className="text-2xl font-extrabold text-white font-tabular">{formatCurrency(totalReceived)}</div>
                  </GlassCard>
                </div>

                <div onClick={() => navigate('/pending')} className="cursor-pointer">
                  <GlassCard delay={0.16} glowColor="rgba(255, 214, 10, 0.25)">
                    <div className="text-[#86868b] text-xs font-bold mb-1 uppercase tracking-wider">Total Pending</div>
                    <div className="text-2xl font-extrabold text-white font-tabular">{formatCurrency(totalPending)}</div>
                  </GlassCard>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DataStateGuard>
  );
}

