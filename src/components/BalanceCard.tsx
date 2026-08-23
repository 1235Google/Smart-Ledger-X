import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Wallet, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
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

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: pulseState ? [1, 1.025, 1] : 1,
      }}
      transition={
        pulseState
          ? { duration: 0.6, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 380, damping: 26 }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative p-7 sm:p-9 rounded-[28px] sm:rounded-[32px] border overflow-hidden backdrop-blur-2xl transition-all duration-300 group select-none shadow-[0_20px_50px_rgba(0,0,0,0.6)] ${
        pulseState === 'increase'
          ? 'border-emerald-400/50 bg-[#12281e] shadow-[0_0_50px_rgba(16,185,129,0.35)]'
          : pulseState === 'decrease'
          ? 'border-rose-400/50 bg-[#2d1218] shadow-[0_0_50px_rgba(244,63,94,0.35)]'
          : 'border-white/[0.12] bg-[#161822] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* Ambient Radial Highlights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#0842a0]/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#004a77]/20 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Decorative Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Floating Pill Animation (+₹Amount or -₹Amount) */}
      <AnimatePresence>
        {floatingPills.map((pill) => (
          <motion.div
            key={pill.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1.05 }}
            exit={{ opacity: 0, y: -80, scale: 0.9 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => removePill(pill.id)}
            className={`absolute top-8 right-8 z-30 px-4 py-2 rounded-full font-bold text-sm md:text-base border shadow-2xl backdrop-blur-xl flex items-center gap-1.5 pointer-events-none ${
              pill.isIncrease
                ? 'bg-[#00522b] text-[#a8f5ba] border-emerald-400/50 shadow-emerald-500/30'
                : 'bg-[#601410] text-[#f9dedc] border-rose-400/50 shadow-rose-500/30'
            }`}
          >
            {pill.isIncrease ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{pill.amountText}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="w-full">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-[#c2e7ff] text-xs font-bold tracking-wider uppercase">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  pulseState === 'increase'
                    ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                    : pulseState === 'decrease'
                    ? 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                    : 'bg-[#a8c7fa] shadow-[0_0_8px_rgba(168,199,250,0.8)]'
                }`}
              />
              Available Balance
              <Sparkles size={14} className="text-[#a8c7fa] ml-1 opacity-80" />
            </div>

            <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.08] text-slate-300 border border-white/10 flex items-center gap-1.5">
              <Wallet size={12} className="text-[#a8c7fa]" />
              <span>Smart Ledger Active</span>
            </div>
          </div>

          <div className="text-4xl sm:text-5xl md:text-6xl font-[800] tracking-tight text-white mb-6 flex items-baseline gap-1 font-tabular">
            <CountUp
              value={currentBalance}
              duration={1000}
              formatter={(val) => formatCurrency(val)}
              className="text-white drop-shadow-sm"
            />
          </div>

          {/* Material 3 Tonal Chips */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            <div className="bg-[#20222a] px-4 py-2.5 rounded-2xl border border-white/10 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em] font-bold">
                Starting
              </p>
              <p className="text-sm sm:text-base font-bold text-white font-tabular mt-0.5">
                {formatCurrency(startingBalance)}
              </p>
            </div>
            <div className="bg-[#00391c]/80 px-4 py-2.5 rounded-2xl border border-[#6dd58c]/30 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] text-[#a8f5ba] uppercase tracking-[0.1em] font-bold flex items-center gap-1">
                <TrendingUp size={11} /> Total In
              </p>
              <p className="text-sm sm:text-base font-bold text-[#a8f5ba] font-tabular mt-0.5">
                +{formatCurrency(totalReceived)}
              </p>
            </div>
            <div className="bg-[#4c0d18]/80 px-4 py-2.5 rounded-2xl border border-[#f2b8b5]/30 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] text-[#f9dedc] uppercase tracking-[0.1em] font-bold flex items-center gap-1">
                <TrendingDown size={11} /> Total Out
              </p>
              <p className="text-sm sm:text-base font-bold text-[#f9dedc] font-tabular mt-0.5">
                -{formatCurrency(totalSent)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BalanceCard;
