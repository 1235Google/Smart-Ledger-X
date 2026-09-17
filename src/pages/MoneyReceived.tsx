import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownLeft, 
  Plus, 
  User, 
  Calendar, 
  FileText, 
  Hash, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Award, 
  Coins, 
  Sparkles, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../lib/utils';
import { ReceivedMoney } from '../types';
import AnimatedInput from '../components/ui/AnimatedInput';
import AnimatedButton from '../components/ui/AnimatedButton';
import GlassCard from '../components/ui/GlassCard';
import DataStateGuard from '../components/ui/DataStateGuard';
import { CountUp } from '../components/ui/CountUp';

export default function MoneyReceived() {
  const { 
    addReceivedMoney, 
    transactions, 
    generalSettings,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'today'>('all');

  const receivedTransactions = useMemo(() => {
    return transactions.filter((t): t is ReceivedMoney => t.type === 'received' && !t.deleted);
  }, [transactions]);

  // Aggregate metrics
  const {
    totalReceived,
    todayInflow,
    thisMonthInflow,
    uniqueSendersCount,
    highestInflow,
    monthlyTarget,
    targetProgressPercent
  } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    let total = 0;
    let todayAmt = 0;
    let monthAmt = 0;
    let maxAmt = 0;
    const senders = new Set<string>();

    receivedTransactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      total += amt;
      if (amt > maxAmt) maxAmt = amt;
      if (tx.date && tx.date.startsWith(todayStr)) {
        todayAmt += amt;
      }
      if (tx.date && tx.date.startsWith(currentMonthStr)) {
        monthAmt += amt;
      }
      if (tx.personName?.trim()) {
        senders.add(tx.personName.trim().toLowerCase());
      }
    });

    // Dynamic monthly inflow goal target (default ₹1,00,000 or scaled)
    const target = Math.max(50000, Math.ceil((monthAmt * 1.25) / 10000) * 10000);
    const progress = target > 0 ? Math.min(100, Math.round((monthAmt / target) * 100)) : 0;

    return {
      totalReceived: total,
      todayInflow: todayAmt,
      thisMonthInflow: monthAmt,
      uniqueSendersCount: senders.size,
      highestInflow: maxAmt,
      monthlyTarget: target,
      targetProgressPercent: progress
    };
  }, [receivedTransactions]);

  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    return receivedTransactions.filter(tx => {
      // Search matching
      const matchesSearch = 
        tx.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.invoiceNumber && tx.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Time filter
      if (timeFilter === 'today') {
        return tx.date && tx.date.startsWith(todayStr);
      }
      if (timeFilter === 'month') {
        return tx.date && tx.date.startsWith(currentMonthStr);
      }
      return true;
    });
  }, [receivedTransactions, searchQuery, timeFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || !date || !purpose) return;

    const numAmount = Number(amount);
    addReceivedMoney({
      personName,
      amount: numAmount,
      date,
      purpose,
      invoiceNumber: invoiceNumber.trim() || undefined,
    });

    showSuccess('Money Received Added', `Recorded +${formatCurrency(numAmount)} from ${personName}`);

    setPersonName('');
    setAmount('');
    setPurpose('');
    setInvoiceNumber('');
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading received transactions..."
      skeletonType="table"
    >
      <motion.div 
        layoutId="shared-received"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-6 sm:space-y-8 overflow-x-hidden"
      >
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-[#30d158] uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse shadow-[0_0_8px_rgba(48,209,88,0.8)]" /> 
              <span>Inflow Ledger • Real-time Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-2.5 sm:gap-3">
              <span>Money In</span>
            </h1>
            <p className="text-[#86868b] mt-1 text-xs sm:text-sm font-medium">
              Record and track incoming client credits, salary, freelance milestones, and deposits.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/pending" className="w-full sm:w-auto">
              <AnimatedButton 
                variant="secondary" 
                icon={<Clock size={16} />} 
                className="w-full sm:w-auto justify-center min-h-[44px] text-xs font-semibold"
              >
                View Pending
              </AnimatedButton>
            </Link>
            <Link to="/balance" className="w-full sm:w-auto">
              <AnimatedButton 
                variant="primary" 
                icon={<Coins size={16} />} 
                className="w-full sm:w-auto justify-center min-h-[44px] text-xs font-semibold"
              >
                Balance Overview
              </AnimatedButton>
            </Link>
          </div>
        </header>

        {/* HERO CARD: Money In Overview & Goal Progress */}
        <GlassCard 
          glowColor="rgba(48, 209, 88, 0.2)"
          className="p-4 sm:p-6 md:p-8 relative select-none rounded-[22px] sm:rounded-[28px] overflow-hidden"
        >
          {/* Top Specular Rim */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Ambient Lighting Orbs - Isolated Layering Strictly Behind Text (-z-10) */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#30d158]/10 rounded-full blur-3xl pointer-events-none decorative-element -z-10" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#0a84ff]/08 rounded-full blur-3xl pointer-events-none decorative-element -z-10" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8">
            {/* Left Block: Amount, Badges, and Details */}
            <div className="space-y-4 sm:space-y-6 flex-1 w-full min-w-0">
              {/* Title / Icon Block */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#30d158] to-[#128a34] rounded-2xl shadow-[0_0_24px_rgba(48,209,88,0.35)] border border-white/20 relative overflow-hidden shrink-0 flex items-center justify-center">
                  <ArrowDownLeft className="text-black relative z-10 shrink-0 font-bold" size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate">
                    Total Inflow Ledger
                  </h2>
                  <div className="text-[#86868b] text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" /> Settled Transactions
                  </div>
                </div>
              </div>

              {/* Current Amount Section with Strict Z-Index & No Overlap */}
              <div className="relative z-10 space-y-1.5 sm:space-y-2">
                <div className="text-slate-400 font-semibold tracking-[0.18em] text-[10px] sm:text-[11px] uppercase flex items-center gap-2 select-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse shadow-[0_0_8px_rgba(48,209,88,0.8)] shrink-0" />
                  CURRENT INFLOWS
                </div>

                <div className="relative flex items-baseline gap-2 group cursor-default w-fit max-w-full">
                  {/* Foreground Amount Text with responsive clamp */}
                  <div className="relative z-10 text-[clamp(1.9rem,6vw,3.75rem)] font-extrabold leading-none text-white tracking-tight font-tabular">
                    <CountUp value={totalReceived} formatter={(v) => formatCurrency(v)} />
                  </div>

                  {/* Decorative Micro-Coin Icon: Positioned strictly to the right, hidden or scaled on narrow mobile, NEVER overlaps label */}
                  <div className="pointer-events-none opacity-40 overflow-visible -z-10 decorative-element hidden sm:block ml-2">
                    <div className="text-[#30d158]/50 animate-pulse">
                      <Coins size={22} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge/Chip Row with flex-wrap and aligned icons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                <div className="badge-chip bg-[#30d158]/10 border border-[#30d158]/25 text-[#30d158] text-xs sm:text-[13px] shadow-sm">
                  <TrendingUp size={14} className="shrink-0" />
                  <span className="font-semibold leading-none">+₹{todayInflow.toLocaleString('en-IN')} Today</span>
                </div>

                <div className="badge-chip bg-white/[0.05] border border-white/10 text-white text-xs sm:text-[13px] shadow-sm">
                  <CheckCircle2 size={14} className="text-[#30d158] shrink-0" />
                  <span className="font-semibold leading-none">{receivedTransactions.length} Inflows Settled</span>
                </div>

                <div className="badge-chip bg-white/[0.05] border border-white/10 text-slate-300 text-xs sm:text-[13px] shadow-sm">
                  <Users size={14} className="text-blue-400 shrink-0" />
                  <span className="font-semibold leading-none">{uniqueSendersCount} {uniqueSendersCount === 1 ? 'Client' : 'Clients'}</span>
                </div>

                {highestInflow > 0 && (
                  <div className="badge-chip bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-[13px] shadow-sm">
                    <Award size={14} className="shrink-0" />
                    <span className="font-semibold leading-none">Max: ₹{highestInflow.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Block: Monthly Inflow Target Progress Circular Chart */}
            <div className="w-full lg:w-auto flex flex-col items-center justify-center pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
              <div className="progress-circle-wrap">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="8"
                  />
                  {/* Active Progress Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="url(#greenGradient)"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * targetProgressPercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#30d158" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Inner Ring Metrics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 select-none">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#86868b] uppercase mb-0.5">
                    MONTHLY TARGET
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white font-tabular leading-none tracking-tight">
                    {targetProgressPercent}%
                  </span>
                  <span className="text-[10.5px] sm:text-xs text-[#30d158] font-bold mt-1 font-tabular">
                    ₹{thisMonthInflow.toLocaleString('en-IN')} / ₹{monthlyTarget.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Form and Inflow Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="vision-glass rounded-[22px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] relative overflow-hidden">
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              
              <h2 className="text-base font-bold text-white mb-4 sm:mb-5 flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-[#30d158]/15 text-[#30d158]">
                  <ArrowDownLeft size={16} />
                </span>
                <span>Record Inflow</span>
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                <AnimatedInput
                  label="Client / Sender Name"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  icon={<User size={16} />}
                  required
                />

                <AnimatedInput
                  label="Amount (₹)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  icon={<span className="font-bold text-xs">₹</span>}
                  required
                />

                <AnimatedInput
                  label="Transaction Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  icon={<Calendar size={16} />}
                  required
                />

                <AnimatedInput
                  label="Purpose / Category"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Website Consulting"
                  icon={<FileText size={16} />}
                  required
                />

                <AnimatedInput
                  label="Invoice Number (Optional)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-08"
                  icon={<Hash size={16} />}
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-full bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-sm transition-all shadow-lg shadow-[#30d158]/20 flex items-center justify-center gap-2 active:scale-[0.98] min-h-[48px] touch-target"
                  >
                    <Plus size={18} />
                    <span>Save Received Money</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Inflow Feed Section */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search & Filter Header */}
            <div className="flex flex-col gap-3 px-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Inflow Feed</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold font-tabular">
                    {filteredTransactions.length}
                  </span>
                </h2>

                {/* Time filter pills */}
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setTimeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                      timeFilter === 'all' ? 'bg-[#30d158] text-black font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('month')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                      timeFilter === 'month' ? 'bg-[#30d158] text-black font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('today')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                      timeFilter === 'today' ? 'bg-[#30d158] text-black font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  placeholder="Search by client, category, or invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-[#86868b] outline-none focus:border-[#30d158] focus:ring-2 focus:ring-[#30d158]/20 transition-all min-h-[44px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Transaction List */}
            <div className="space-y-2.5">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-14 sm:py-16 border border-dashed border-white/[0.08] rounded-[22px] flex flex-col items-center justify-center text-[#86868b] text-sm bg-white/[0.02]">
                  <ArrowDownLeft size={32} className="text-[#86868b]/50 mb-2" />
                  <p className="font-medium text-white">No received money records found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Record an inflow above or adjust your search filter.</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((tx, idx) => (
                    <motion.div
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: idx * 0.02 }}
                      className="bg-[#171717] hover:bg-[#1c1c1c] border border-white/[0.08] p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 transition-all duration-200 shadow-sm group min-w-0"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#30d158]/15 text-[#30d158] rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                        <ArrowDownLeft size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate text-white">{tx.personName}</p>
                        <p className="text-[10.5px] sm:text-xs text-[#86868b] mt-0.5 truncate">
                          {tx.purpose} {tx.invoiceNumber && `• #${tx.invoiceNumber}`} • {formatDate(tx.date, generalSettings?.timezone)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 min-w-fit pl-1">
                        <p className="text-xs sm:text-sm md:text-base font-extrabold text-[#30d158] font-tabular whitespace-nowrap">
                          + {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-[9.5px] sm:text-[10px] text-[#86868b] uppercase font-semibold">Cleared</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </DataStateGuard>
  );
}
