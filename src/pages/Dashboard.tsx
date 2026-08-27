import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownLeft, Clock, Users, ArrowUpRight, Bell, 
  AlertTriangle, ShieldAlert, Sparkles, ChevronDown, 
  LayoutDashboard, Flame, ArrowRight, ShieldCheck, 
  Cloud, RefreshCw, Zap, Cpu, Lock
} from 'lucide-react';
import { formatCurrency, formatDate, cn, calculateReminderDetails } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { PendingMoney, SentMoney, ReceivedMoney } from '../types';
import BalanceCard from '../components/BalanceCard';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import DataStateGuard from '../components/ui/DataStateGuard';

// Futuristic Landing Showcase Components
import Hero3DCanvas from '../components/home/Hero3DCanvas';
import FloatingVault3D from '../components/home/FloatingVault3D';
import ProductShowcaseVideo from '../components/home/ProductShowcaseVideo';
import AIAssistantSection from '../components/home/AIAssistantSection';
import SmartReminderHUD from '../components/home/SmartReminderHUD';
import SecurityVaultSection from '../components/home/SecurityVaultSection';
import InteractiveAnalyticsSection from '../components/home/InteractiveAnalyticsSection';
import InteractiveFeatureBento from '../components/home/InteractiveFeatureBento';
import MagneticButton from '../components/home/MagneticButton';

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
      <div className="w-full relative min-h-screen text-slate-100 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
        
        {/* Top Control HUD: Mode Switcher & Live Status */}
        <div className="flex items-center justify-between py-2 px-1 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400">
              SMART LEDGER X • AI FINANCE
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/[0.04] p-1 rounded-2xl border border-white/10 shadow-lg">
            <button
              onClick={() => setViewMode('showcase')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'showcase'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} /> Product Showcase
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'compact'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard size={13} /> Operational Grid
            </button>
          </div>
        </div>

        {viewMode === 'showcase' ? (
          <div className="space-y-12 pb-24">
            {/* ========================================================================= */}
            {/* HERO SECTION: Realistic Product Showcase & Ambient 3D Canvas               */}
            {/* ========================================================================= */}
            <section className="relative min-h-[92vh] flex flex-col justify-center items-center py-12 px-4 md:px-8 overflow-hidden rounded-[40px] bg-gradient-to-b from-[#060913]/90 via-[#040710]/95 to-[#020408]/100 border border-white/[0.1] shadow-2xl">
              {/* Three.js Ambient 3D Background Canvas */}
              <Hero3DCanvas className="opacity-70" />

              {/* Ambient radial glows */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-cyan-500/15 to-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

              <div className="relative z-10 w-full max-w-5xl mx-auto text-center space-y-6 pt-4">
                {/* Micro Pill Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-indigo-500/10 border border-cyan-400/30 backdrop-blur-xl shadow-[0_0_25px_rgba(56,189,248,0.2)]"
                >
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-indigo-300">
                    Next-Generation Personal Finance
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </motion.div>

                {/* Hero Title with Apple / Stripe High Contrast Typography */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.04]"
                >
                  Smart Ledger <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 drop-shadow-[0_0_35px_rgba(99,102,241,0.5)]">X</span>
                  <br />
                  <span className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400">
                    Financial Intelligence Built for Clarity
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 font-medium leading-relaxed"
                >
                  End-to-end client encryption, automated spending insights, and instantaneous cashflow tracking wrapped in a modern glass experience.
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
                    className="shadow-[0_0_35px_rgba(99,102,241,0.5)]"
                  >
                    <Zap size={16} className="text-cyan-300" /> Open Ledger
                  </MagneticButton>

                  <MagneticButton
                    variant="glass"
                    onClick={() => navigate('/backup')}
                  >
                    <Cloud size={16} className="text-indigo-400" /> Secure Cloud Backup
                  </MagneticButton>

                  <MagneticButton
                    variant="secondary"
                    onClick={() => scrollToSection('ai-assistant-section')}
                  >
                    <Cpu size={16} className="text-purple-300" /> AI Insights
                  </MagneticButton>
                </motion.div>

                {/* Hero Showcase Switcher: Video Showcase vs Interactive Live Vault */}
                <div className="pt-6 flex justify-center">
                  <div className="inline-flex items-center bg-white/[0.04] p-1 rounded-2xl border border-white/10 shadow-lg">
                    <button
                      onClick={() => setHeroMode('video')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        heroMode === 'video'
                          ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles size={13} /> Product Showcase (Cinematic)
                    </button>
                    <button
                      onClick={() => setHeroMode('interactive')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        heroMode === 'interactive'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutDashboard size={13} /> Interactive Balance Vault
                    </button>
                  </div>
                </div>
              </div>

              {/* Centered Showcase Area */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full mt-6 relative z-20"
              >
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
              </motion.div>

              {/* Scroll Down Indicator */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                onClick={() => scrollToSection('ai-assistant-section')}
                className="mt-8 text-slate-400 hover:text-white cursor-pointer flex flex-col items-center gap-1 text-xs font-mono select-none"
              >
                <span>EXPLORE PLATFORM FEATURES</span>
                <ChevronDown size={18} />
              </motion.div>
            </section>

            {/* ========================================================================= */}
            {/* SECTION 1: AI FINANCE ASSISTANT                                           */}
            {/* ========================================================================= */}
            <div id="ai-assistant-section">
              <AIAssistantSection />
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2: SMART REMINDERS & PROACTIVE HUD                                */}
            {/* ========================================================================= */}
            <div id="smart-reminders-section">
              <SmartReminderHUD />
            </div>

            {/* ========================================================================= */}
            {/* SECTION 3: QUANTUM SECURITY & ZERO-KNOWLEDGE ENCLAVE                      */}
            {/* ========================================================================= */}
            <div id="security-vault-section">
              <SecurityVaultSection />
            </div>

            {/* ========================================================================= */}
            {/* SECTION 4: BLOOMBERG-GRADE INTERACTIVE ANALYTICS                          */}
            {/* ========================================================================= */}
            <div id="analytics-section">
              <InteractiveAnalyticsSection />
            </div>

            {/* ========================================================================= */}
            {/* SECTION 5: BENTO FEATURE SHOWCASE (Gullak, Timeline, Reports, Cloud)      */}
            {/* ========================================================================= */}
            <InteractiveFeatureBento />

            {/* ========================================================================= */}
            {/* SECTION 6: LIVE OPERATIONAL TERMINAL (Direct Ledger Actions)              */}
            {/* ========================================================================= */}
            <div id="operational-terminal" className="pt-10 scroll-mt-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" /> Operational Terminal
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                    Live Ledger & Transaction Hub
                  </h2>
                </div>
                <button
                  onClick={() => setViewMode('compact')}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard size={14} /> Switch to Compact Grid
                </button>
              </div>

              {/* Anomaly Banners */}
              {(highSpendingAnomalies.length > 0 || duplicateInvoices.length > 0) && (
                <div className="space-y-3 mb-8">
                  {highSpendingAnomalies.slice(0, 3).map(tx => (
                    <div
                      key={`anomaly-spend-${tx.id}`}
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
                    </div>
                  ))}
                  {duplicateInvoices.map((group, idx) => (
                    <div
                      key={`anomaly-inv-${idx}`}
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
                              "px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap text-center sm:text-left",
                              isOverdue ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
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

              {/* Bento Grid Dashboard */}
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

                {/* Recent Activity List */}
                <div 
                  onClick={() => navigate('/analytics')}
                  className="lg:col-span-1 lg:row-span-2 flex flex-col bg-[#0b0e1b]/80 border border-white/10 rounded-[2rem] p-6 cursor-pointer relative group overflow-hidden shadow-xl backdrop-blur-2xl"
                >
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-lg font-bold text-white tracking-tight">Recent Activity</h2>
                    <span className="text-xs text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                      View All →
                    </span>
                  </div>

                  <div className="space-y-3 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[340px]">
                    {recentTransactions.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-slate-500 text-sm">
                        <p>No recent transactions</p>
                      </div>
                    ) : (
                      recentTransactions.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 p-3.5 rounded-2xl flex items-center gap-3 transition-all"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner",
                            tx.type === 'received' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            tx.type === 'sent' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          )}>
                            {tx.type === 'received' ? <ArrowDownLeft size={20} /> :
                             tx.type === 'sent' ? <ArrowUpRight size={20} /> :
                             <Clock size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-white truncate">{tx.personName}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-sm font-bold tracking-tight font-mono",
                              tx.type === 'received' ? "text-emerald-400" :
                              tx.type === 'sent' ? "text-rose-400" :
                              "text-amber-400"
                            )}>
                              {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div onClick={() => navigate('/received')} className="cursor-pointer h-full flex flex-col">
                    <GlassCard delay={0.08} glowColor="rgba(16, 185, 129, 0.25)" className="h-full">
                      <div className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider relative z-10">Total Received</div>
                      <div className="text-3xl font-extrabold text-white mb-4 relative z-10 font-mono">
                        <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-black/30 w-fit px-3 py-1.5 rounded-xl border border-white/5 relative z-10">
                        <Users size={14} className="text-emerald-400" /> Received from {receivedCount} {receivedCount === 1 ? 'person' : 'people'}
                      </div>
                    </GlassCard>
                  </div>

                  <div onClick={() => navigate('/pending')} className="cursor-pointer h-full flex flex-col">
                    <GlassCard delay={0.16} glowColor="rgba(245, 158, 11, 0.25)" className="h-full">
                      <div className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider relative z-10">Total Pending</div>
                      <div className="text-3xl font-extrabold text-white mb-4 relative z-10 font-mono">
                        <CountUp value={totalPending} formatter={(v) => formatCurrency(v)} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-black/30 w-fit px-3 py-1.5 rounded-xl border border-white/5 relative z-10">
                        <Users size={14} className="text-amber-400" /> Pending from {pendingCount} {pendingCount === 1 ? 'person' : 'people'}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Operational Compact View */
          <div className="space-y-8 pb-16">
            <header className="mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Financial Command Center</h1>
              <p className="text-sm text-slate-400">
                Welcome back, <span className="text-white font-bold">{userProfile?.fullName || 'Souvik Dash'}</span>. Your ledger telemetry is live.
              </p>
            </header>

            {/* Anomaly & Reminders */}
            {(highSpendingAnomalies.length > 0 || duplicateInvoices.length > 0) && (
              <div className="space-y-3">
                {highSpendingAnomalies.slice(0, 3).map(tx => (
                  <div
                    key={`anomaly-compact-${tx.id}`}
                    className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 flex items-center gap-3"
                  >
                    <ShieldAlert size={20} className="text-amber-400" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-400">Unusual Spending Detected</h4>
                      <p className="text-slate-300 text-xs">{formatCurrency(tx.amount)} sent to {tx.personName}.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                className="lg:col-span-1 lg:row-span-2 flex flex-col bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                  <span className="text-xs text-blue-400 font-bold">View All →</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="bg-white/[0.04] p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${tx.type === 'received' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {tx.type === 'received' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{tx.personName}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate((tx as any).date || (tx as any).dueDate || (tx as any).createdAt || new Date().toISOString())}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-bold font-mono ${tx.type === 'received' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.type === 'received' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => navigate('/received')} className="cursor-pointer">
                  <GlassCard delay={0.08} glowColor="rgba(16, 185, 129, 0.25)">
                    <div className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Total Received</div>
                    <div className="text-2xl font-extrabold text-white font-mono">{formatCurrency(totalReceived)}</div>
                  </GlassCard>
                </div>

                <div onClick={() => navigate('/pending')} className="cursor-pointer">
                  <GlassCard delay={0.16} glowColor="rgba(245, 158, 11, 0.25)">
                    <div className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Total Pending</div>
                    <div className="text-2xl font-extrabold text-white font-mono">{formatCurrency(totalPending)}</div>
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
