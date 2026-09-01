import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Wallet, TrendingUp, TrendingDown, Sparkles, Eye, EyeOff, ShieldCheck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import CountUp from './ui/CountUp';

interface FloatingPill {
  id: string;
  amountText: string;
  isIncrease: boolean;
}

interface BalanceCardProps {
  currentBalance: number;
  startingBalance: number;
  totalReceived: number;
  totalSent: number;
  onSendClick?: () => void;
  onReceiveClick?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  currentBalance,
  startingBalance,
  totalReceived,
  totalSent,
  onSendClick,
  onReceiveClick,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const prevBalanceRef = useRef<number>(currentBalance);
  
  const [pulseState, setPulseState] = useState<'increase' | 'decrease' | null>(null);
  const [floatingPills, setFloatingPills] = useState<FloatingPill[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // Monitor balance changes for green/red flash and floating pill trigger
  useEffect(() => {
    const prev = prevBalanceRef.current;
    if (prev !== currentBalance) {
      const diff = currentBalance - prev;
      const isIncrease = diff > 0;
      const absDiffStr = formatCurrency(Math.abs(diff));
      const amountText = `${isIncrease ? '+' : '-'}${absDiffStr}`;

      setPulseState(isIncrease ? 'increase' : 'decrease');

      const pillId = crypto.randomUUID();
      setFloatingPills((p) => [...p, { id: pillId, amountText, isIncrease }]);

      const pulseTimer = setTimeout(() => {
        setPulseState(null);
      }, 1200);

      prevBalanceRef.current = currentBalance;

      return () => clearTimeout(pulseTimer);
    }
  }, [currentBalance]);

  const removePill = (id: string) => {
    setFloatingPills((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: pulseState ? [1, 1.02, 1] : 1,
      }}
      transition={
        pulseState
          ? { duration: 0.5, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 350, damping: 28 }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-6 sm:p-8 md:p-9 rounded-[28px] sm:rounded-[32px] border overflow-hidden backdrop-blur-3xl transition-all duration-300 group select-none ${
        pulseState === 'increase'
          ? 'border-[#30d158]/50 bg-gradient-to-br from-[#0c2214] via-[#12141c] to-[#0c0d14] shadow-[0_20px_50px_rgba(48,209,88,0.25)]'
          : pulseState === 'decrease'
          ? 'border-[#ff453a]/50 bg-gradient-to-br from-[#2a0e12] via-[#12141c] to-[#0c0d14] shadow-[0_20px_50px_rgba(255,69,58,0.25)]'
          : 'border-white/[0.12] bg-gradient-to-br from-[#161722]/90 via-[#101119]/90 to-[#0c0d14]/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
      }`}
    >
      {/* Apple Titanium Top Rim Specular Highlight Line */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Deep Iridescent Ambient Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0a84ff]/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#5e5ce6]/12 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Pill Animation on Balance Updates */}
      <AnimatePresence>
        {floatingPills.map((pill) => (
          <motion.div
            key={pill.id}
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: -36, scale: 1.05 }}
            exit={{ opacity: 0, y: -72, scale: 0.9 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => removePill(pill.id)}
            className={`absolute top-6 right-6 z-30 px-3.5 py-1.5 rounded-full font-bold text-xs sm:text-sm border shadow-2xl backdrop-blur-2xl flex items-center gap-1.5 pointer-events-none ${
              pill.isIncrease
                ? 'bg-[#30d158]/20 text-[#30d158] border-[#30d158]/40 shadow-[#30d158]/30'
                : 'bg-[#ff453a]/20 text-[#ff453a] border-[#ff453a]/40 shadow-[#ff453a]/30'
            }`}
          >
            {pill.isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{pill.amountText}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-20 flex flex-col justify-between gap-6">
        {/* Header Pill Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                pulseState === 'increase'
                  ? 'bg-[#30d158] shadow-[0_0_12px_#30d158]'
                  : pulseState === 'decrease'
                  ? 'bg-[#ff453a] shadow-[0_0_12px_#ff453a]'
                  : 'bg-[#0a84ff] shadow-[0_0_8px_rgba(10,132,255,0.8)]'
              }`}
            />
            <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Total Available Balance
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#86868b] hover:text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
              title={showBalance ? "Hide balance" : "Show balance"}
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08] flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#30d158]" />
              <span>Apple Secure</span>
            </div>
          </div>
        </div>

        {/* Primary Monetary Value */}
        <div>
          <div className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2 flex items-baseline gap-1 font-tabular">
            {showBalance ? (
              <CountUp
                value={currentBalance}
                duration={1000}
                formatter={(val) => formatCurrency(val)}
                className="text-white drop-shadow-md"
              />
            ) : (
              <span className="tracking-widest text-slate-400 font-mono text-3xl sm:text-4xl">••••••••</span>
            )}
          </div>
          <p className="text-xs font-medium text-[#86868b]">Real-time liquid assets across all connected ledger vaults</p>
        </div>

        {/* Apple Metric Capsule Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-white/[0.08]">
          {/* Starting Balance */}
          <div className="bg-white/[0.03] hover:bg-white/[0.06] p-3 sm:p-3.5 rounded-2xl border border-white/[0.06] transition-all flex flex-col justify-center">
            <span className="text-[10px] sm:text-[11px] text-[#86868b] uppercase tracking-wider font-bold">
              Starting
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-white font-tabular mt-0.5 truncate">
              {showBalance ? formatCurrency(startingBalance) : '••••'}
            </span>
          </div>

          {/* Total In */}
          <div className="bg-[#30d158]/[0.08] hover:bg-[#30d158]/[0.12] p-3 sm:p-3.5 rounded-2xl border border-[#30d158]/20 transition-all flex flex-col justify-center">
            <span className="text-[10px] sm:text-[11px] text-[#30d158] uppercase tracking-wider font-bold flex items-center gap-1">
              <TrendingUp size={12} /> Total In
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-[#30d158] font-tabular mt-0.5 truncate">
              {showBalance ? `+${formatCurrency(totalReceived)}` : '••••'}
            </span>
          </div>

          {/* Total Out */}
          <div className="bg-[#ff453a]/[0.08] hover:bg-[#ff453a]/[0.12] p-3 sm:p-3.5 rounded-2xl border border-[#ff453a]/20 transition-all flex flex-col justify-center">
            <span className="text-[10px] sm:text-[11px] text-[#ff453a] uppercase tracking-wider font-bold flex items-center gap-1">
              <TrendingDown size={12} /> Total Out
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-[#ff453a] font-tabular mt-0.5 truncate">
              {showBalance ? `-${formatCurrency(totalSent)}` : '••••'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BalanceCard;

