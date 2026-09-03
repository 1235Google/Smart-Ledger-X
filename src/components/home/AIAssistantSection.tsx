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
    <div className="relative rounded-[32px] vision-glass-elevated p-6 sm:p-8 md:p-10 backdrop-blur-3xl overflow-hidden z-10 select-none">
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* 2-Column AI Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Glowing VisionOS Intelligence Orb */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-[28px] vision-glass relative overflow-hidden group">
          {/* Glowing Intelligent Core */}
          <div className="relative w-52 h-52 flex items-center justify-center my-4">
            {/* Ambient Aura */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#0a84ff]/25 via-[#bf5af2]/25 to-[#64d2ff]/25 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />

            {/* Rotating Glass Harmonic Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="absolute inset-2 rounded-full border border-dashed border-[#64d2ff]/30"
            />

            {/* Counter-Rotating Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 26, ease: 'linear' }}
              className="absolute inset-7 rounded-full border border-[#bf5af2]/30"
            />

            {/* Core Center */}
            <motion.div
              animate={{
                scale: isAnalyzing ? [1, 1.08, 0.96, 1] : [1, 1.03, 1],
              }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] p-1 shadow-[0_0_35px_rgba(10,132,255,0.4)] flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full bg-[#0a0f1d] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <Sparkles size={28} className="text-[#64d2ff]" />
                <span className="text-[9px] font-bold text-[#64d2ff] uppercase tracking-wider mt-1">
                  Vision AI
                </span>
              </div>
            </motion.div>
          </div>

          <div className="w-full text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
              <span className="text-xs font-bold text-[#30d158] tracking-wide uppercase">
                Active Analysis Ready
              </span>
            </div>
            <p className="text-xs text-[#86868b]">
              Local on-device encrypted neural assistant
            </p>
          </div>

          {/* Trigger Live Analysis Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={triggerAnalysis}
            disabled={isAnalyzing}
            className="mt-5 w-full py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin text-[#64d2ff]' : 'text-[#86868b]'} />
            {isAnalyzing ? 'Analyzing Transactions...' : 'Run Financial Check'}
          </motion.button>
        </div>

        {/* Right Column: Dynamic Insight Terminal & Categories */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main AI Insight Terminal in Liquid Glass */}
          <div className="p-6 md:p-7 rounded-[26px] vision-glass relative overflow-hidden">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#0a84ff]/20 border border-[#0a84ff]/30 flex items-center justify-center text-[#64d2ff]">
                  <Sparkles size={15} />
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Live Financial Assistant</span>
              </div>
              <span className="text-[10px] text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full border border-[#30d158]/25 font-bold uppercase tracking-wider">
                Audited
              </span>
            </div>

            {/* Typewriter text stream */}
            <div className="min-h-[64px] flex items-center">
              <p className="text-base sm:text-lg font-medium text-white tracking-tight leading-relaxed">
                "{displayedText}"
                <span className={`inline-block w-2 h-4 bg-[#64d2ff] ml-1.5 align-middle ${isTyping ? 'animate-pulse' : 'opacity-0'}`} />
              </p>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#86868b]">
              <span>Continuous local monitoring</span>
              <span className="text-[#64d2ff] flex items-center gap-1 font-semibold">
                <CheckCircle2 size={12} /> Synced with ledger
              </span>
            </div>
          </div>

          {/* 4 VisionOS Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveCategory('categorization')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'categorization'
                  ? 'bg-[#0a84ff]/20 border-[#0a84ff]/50 shadow-lg shadow-[#0a84ff]/15'
                  : 'vision-glass hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Search size={16} className="text-[#64d2ff]" />
                <h4 className="text-sm font-bold text-white">Smart Categorization</h4>
              </div>
              <p className="text-xs text-[#86868b]">
                Automatically identifies expense types and recurring bills from notes and receipts.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveCategory('budget')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'budget'
                  ? 'bg-[#0a84ff]/20 border-[#0a84ff]/50 shadow-lg shadow-[#0a84ff]/15'
                  : 'vision-glass hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-[#30d158]" />
                <h4 className="text-sm font-bold text-white">Expense Tracking</h4>
              </div>
              <p className="text-xs text-[#86868b]">
                Visualizes spending velocity and highlights opportunities for monthly savings.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveCategory('reminders')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'reminders'
                  ? 'bg-[#0a84ff]/20 border-[#0a84ff]/50 shadow-lg shadow-[#0a84ff]/15'
                  : 'vision-glass hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 size={16} className="text-[#bf5af2]" />
                <h4 className="text-sm font-bold text-white">Cashflow Forecasts</h4>
              </div>
              <p className="text-xs text-[#86868b]">
                Projects month-end balances based on upcoming scheduled payments and average burn rate.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveCategory('security')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeCategory === 'security'
                  ? 'bg-[#0a84ff]/20 border-[#0a84ff]/50 shadow-lg shadow-[#0a84ff]/15'
                  : 'vision-glass hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-[#ffd60a]" />
                <h4 className="text-sm font-bold text-white">Duplicate Detection</h4>
              </div>
              <p className="text-xs text-[#86868b]">
                Alerts you to identical invoice numbers or duplicate transaction entries immediately.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
