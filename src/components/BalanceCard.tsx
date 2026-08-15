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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (!shouldReduceMotion) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rx = ((y - centerY) / centerY) * -3.5;
      const ry = ((x - centerX) / centerX) * 3.5;
      setTilt({ rx, ry });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateX: isHovered ? tilt.rx : 0,
        rotateY: isHovered ? tilt.ry : 0,
        scale: pulseState ? [1, 1.025, 1] : 1,
      }}
      transition={
        pulseState
          ? { duration: 0.6, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 380, damping: 26 }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={`relative p-8 rounded-[2rem] border overflow-hidden backdrop-blur-2xl transition-all duration-300 group select-none shadow-2xl perspective-1000 ${
        pulseState === 'increase'
          ? 'border-emerald-500/60 bg-gradient-to-br from-[#0B1026] via-[#10322b] to-[#04422e] shadow-[0_0_50px_rgba(16,185,129,0.35)] animate-[pulseGlowGreen_1.2s_ease-in-out_infinite]'
          : pulseState === 'decrease'
          ? 'border-rose-500/60 bg-gradient-to-br from-[#0B1026] via-[#3d1822] to-[#4c0d18] shadow-[0_0_50px_rgba(244,63,94,0.35)] animate-[pulseGlowRed_1.2s_ease-in-out_infinite]'
          : 'border-white/15 bg-gradient-to-br from-[#0B1026] via-[#161a38] to-[#2D4DFF]/80 shadow-[0_20px_50px_-15px_rgba(45,77,255,0.4)]'
      }`}
    >
      {/* Background Glow Orbs */}
      <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-blue-500/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Interactive Glass Reflection Effect Following Mouse */}
      {isHovered && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.15), transparent 80%)`,
          }}
        />
      )}

      {/* Floating Pill Animation (+₹Amount or -₹Amount) */}
      <AnimatePresence>
        {floatingPills.map((pill) => (
          <motion.div
            key={pill.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1.1 }}
            exit={{ opacity: 0, y: -80, scale: 0.9 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => removePill(pill.id)}
            className={`absolute top-12 right-12 z-30 px-4 py-2 rounded-full font-bold text-sm md:text-base border shadow-2xl backdrop-blur-xl flex items-center gap-1.5 pointer-events-none ${
              pill.isIncrease
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/30'
            }`}
          >
            {pill.isIncrease ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{pill.amountText}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase tracking-widest mb-1.5">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                pulseState === 'increase'
                  ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                  : pulseState === 'decrease'
                  ? 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`}
            />
            Available Balance
            <Sparkles size={14} className="text-blue-400 ml-1 opacity-80" />
          </div>

          <div className="text-4xl sm:text-5xl md:text-6xl font-[800] tracking-tight text-white mb-6 flex items-baseline gap-1 font-tabular">
            <CountUp
              value={currentBalance}
              duration={1000}
              formatter={(val) => formatCurrency(val)}
              className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-white/[0.06] backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <p className="text-[10px] text-white/70 uppercase tracking-[0.1em] font-bold">
                Starting
              </p>
              <p className="text-base font-bold text-white/95 font-tabular">
                {formatCurrency(startingBalance)}
              </p>
            </div>
            <div className="bg-emerald-500/[0.12] backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em] font-bold">
                Total In
              </p>
              <p className="text-base font-bold text-emerald-300 font-tabular">
                +{formatCurrency(totalReceived)}
              </p>
            </div>
            <div className="bg-rose-500/[0.12] backdrop-blur-md px-4 py-2.5 rounded-2xl border border-rose-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-[10px] text-rose-400 uppercase tracking-[0.1em] font-bold">
                Total Out
              </p>
              <p className="text-base font-bold text-rose-300 font-tabular">
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
