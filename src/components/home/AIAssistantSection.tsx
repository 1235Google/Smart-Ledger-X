import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, CheckCircle2, ArrowRight, MessageSquare, 
  RefreshCw, BarChart2, ShieldCheck, TrendingDown, Zap, Search
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../lib/utils';

export default function AIAssistantSection() {
  const { transactions, currentBalance, totalReceived, totalSent, totalPending } = useStore();
  const pendingCount = (transactions || []).filter(t => t.type === 'pending').length;
  const sentCount = (transactions || []).filter(t => t.type === 'sent').length;
  const [insightIndex, setInsightIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'categorization' | 'budget' | 'reminders' | 'security'>('categorization');

  // Compute real dynamic insights based on actual ledger data
  const dynamicInsights = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return ["AI insights will appear after analyzing your financial activity."];
    }

    const list: string[] = [
      `Tracking ${transactions.length} verified transaction${transactions.length === 1 ? '' : 's'} in your active Smart Ledger.`,
    ];

    if (totalReceived > 0) {
      list.push(`Total income recorded: ${formatCurrency(totalReceived)} across verified entries.`);
    }

    if (totalSent > 0) {
      list.push(`Expense analysis active across ${sentCount} expense entries totaling ${formatCurrency(totalSent)}.`);
    }

    if (totalPending > 0) {
      list.push(`You have ${pendingCount} pending payment${pendingCount === 1 ? '' : 's'} totaling ${formatCurrency(totalPending)} scheduled for tracking.`);
    } else {
      list.push(`All payment obligations and pending entries are currently up to date.`);
    }

    list.push(`Current net balance stands at ${formatCurrency(currentBalance)} with client-side local encryption.`);
    return list;
  }, [transactions, currentBalance, totalReceived, totalSent, totalPending, pendingCount, sentCount]);

  // Typewriter effect
  useEffect(() => {
    const currentQuote = dynamicInsights[insightIndex % dynamicInsights.length] || dynamicInsights[0];
    let charIndex = 0;
    setDisplayedText('');
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (charIndex <= currentQuote.length) {
        setDisplayedText(currentQuote.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        if (dynamicInsights.length > 1) {
          const timeout = setTimeout(() => {
            setInsightIndex((prev) => (prev + 1) % dynamicInsights.length);
          }, 4000);
          return () => clearTimeout(timeout);
        }
      }
    }, 28);

    return () => clearInterval(typeInterval);
  }, [insightIndex, dynamicInsights]);

  const triggerAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setInsightIndex((prev) => (prev + 1) % dynamicInsights.length);
    }, 800);
  };

  return (
    <section className="relative py-16 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles size={14} className="text-cyan-400" />
          Intelligent Financial Assistant
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Automated Insights That <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
            Keep You in Full Control
          </span>
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-400 font-medium">
          Continuous smart analysis of your income, expenses, and upcoming obligations to help you make informed decisions.
        </p>
      </div>

      {/* 2-Column AI Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Glowing Intelligent AI Core (Apple Intelligence Style) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-[36px] bg-gradient-to-b from-white/[0.04] to-black/60 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          {/* Glowing Intelligent Core */}
          <div className="relative w-56 h-56 flex items-center justify-center my-6">
            {/* Ambient Aura */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-cyan-400/20 to-purple-500/20 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />

            {/* Rotating Harmonic Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
              className="absolute inset-3 rounded-full border border-dashed border-cyan-400/30"
            />

            {/* Counter-Rotating Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 24, ease: 'linear' }}
              className="absolute inset-8 rounded-full border border-indigo-400/30"
            />

            {/* Core Center */}
            <motion.div
              animate={{
                scale: isAnalyzing ? [1, 1.08, 0.96, 1] : [1, 1.03, 1],
              }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-1 shadow-[0_0_40px_rgba(56,189,248,0.5)] flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full bg-[#080d1a] flex flex-col items-center justify-center relative overflow-hidden">
                <Sparkles size={32} className="text-cyan-300" />
                <span className="text-[10px] font-semibold text-cyan-200 mt-1">
                  AI Assistant
                </span>
              </div>
            </motion.div>
          </div>

          <div className="w-full text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wide">
                Active Analysis Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Private and encrypted financial assistant
            </p>
          </div>

          {/* Trigger Live Analysis Button */}
          <button
            onClick={triggerAnalysis}
            disabled={isAnalyzing}
            className="mt-6 w-full py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
            {isAnalyzing ? 'Analyzing Transactions...' : 'Run Financial Check'}
          </button>
        </div>

        {/* Right Column: Dynamic Insight Terminal & Categories */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main AI Insight Terminal */}
          <div className="p-6 md:p-8 rounded-[32px] bg-[#090d19]/90 border border-white/[0.12] shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-400">
                  <Sparkles size={15} />
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Live Financial Assistant</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                Verified
              </span>
            </div>

            {/* Typewriter text stream */}
            <div className="min-h-[72px] flex items-center">
              <p className="text-base sm:text-lg md:text-xl font-medium text-white tracking-tight leading-relaxed">
                "{displayedText}"
                <span className={`inline-block w-2 h-4 bg-cyan-400 ml-1.5 align-middle ${isTyping ? 'animate-pulse' : 'opacity-0'}`} />
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <span>Updated in real-time</span>
              <span className="text-cyan-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Synced with your ledger
              </span>
            </div>
          </div>

          {/* 4 Realistic Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setActiveCategory('categorization')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'categorization'
                  ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <Search size={16} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Smart Categorization</h4>
              </div>
              <p className="text-xs text-slate-400">
                Automatically identifies expense types and recurring bills from notes and receipts.
              </p>
            </div>

            <div
              onClick={() => setActiveCategory('budget')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'budget'
                  ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <TrendingDown size={16} className="text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Expense Tracking</h4>
              </div>
              <p className="text-xs text-slate-400">
                Visualizes spending velocity and highlights opportunities for monthly savings.
              </p>
            </div>

            <div
              onClick={() => setActiveCategory('reminders')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'reminders'
                  ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <BarChart2 size={16} className="text-purple-400" />
                <h4 className="text-sm font-bold text-white">Cashflow Forecasts</h4>
              </div>
              <p className="text-xs text-slate-400">
                Projects month-end balances based on upcoming scheduled payments and average burn rate.
              </p>
            </div>

            <div
              onClick={() => setActiveCategory('security')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'security'
                  ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <ShieldCheck size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">Duplicate Detection</h4>
              </div>
              <p className="text-xs text-slate-400">
                Alerts you to identical invoice numbers or duplicate transaction entries immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
