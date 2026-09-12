import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
  totalSent?: number;
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || shouldReduceMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        scale: pulseState ? [1, 1.02, 1] : 1,
      }}
      whileHover={
        !shouldReduceMotion
          ? {
              y: -4,
              scale: 1.006,
              transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
      transition={
        pulseState
          ? { duration: 0.5, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 350, damping: 28 }
      }
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-4 sm:p-8 rounded-[24px] sm:rounded-[28px] overflow-hidden backdrop-blur-3xl transition-all duration-300 ease-out group select-none ${
        pulseState === 'increase'
          ? 'border-[#30d158]/50 bg-[#30d158]/[0.05] backdrop-blur-[20px] shadow-lg'
          : pulseState === 'decrease'
          ? 'border-[#ff453a]/50 bg-[#ff453a]/[0.05] backdrop-blur-[20px] shadow-lg'
          : 'border-white/[0.08] bg-white/[0.03] backdrop-blur-[20px] shadow-lg'
      }`}
    >
      {/* Top Specular Rim Reflection Highlight */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Left Specular Glaze */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-white/30 via-transparent to-transparent opacity-50 group-hover:opacity-90 transition-opacity duration-300" />

      {/* Internal Cursor Light Spot inside the Liquid Glass */}
      {isHovered && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 opacity-100 rounded-[28px]"
          style={{
            background: `radial-gradient(450px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.1), transparent 45%)`,
          }}
        />
      )}

      {/* Ambient Liquid Lighting Flares */}
      <div className="absolute -top-10 right-0 w-80 h-80 bg-[#0a84ff]/[0.1] rounded-full blur-[110px] pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-10 left-0 w-72 h-72 bg-[#5e5ce6]/[0.08] rounded-full blur-[100px] pointer-events-none" />

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
                ? 'bg-[#30d158]/25 text-[#30d158] border-[#30d158]/50 shadow-[#30d158]/40'
                : 'bg-[#ff453a]/25 text-[#ff453a] border-[#ff453a]/50 shadow-[#ff453a]/40'
            }`}
          >
            {pill.isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{pill.amountText}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-20 flex flex-col justify-between gap-5 sm:gap-6">
        {/* Header Pill Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${
                pulseState === 'increase'
                  ? 'bg-[#30d158] shadow-[0_0_16px_#30d158]'
                  : pulseState === 'decrease'
                  ? 'bg-[#ff453a] shadow-[0_0_16px_#ff453a]'
                  : 'bg-[#0a84ff] shadow-[0_0_12px_rgba(10,132,255,0.9)] animate-pulse'
              }`}
            />
            <span className="text-[11px] sm:text-xs font-semibold text-[#86868b] uppercase tracking-wider truncate">
              Total Available Balance
            </span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[#86868b] hover:text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] border border-white/[0.08] shadow-sm"
              title={showBalance ? "Hide balance" : "Show balance"}
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
            </motion.button>
            <div className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[#a1a1a6] border border-white/[0.1] flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors backdrop-blur-md">
              <ShieldCheck size={13} className="text-[#30d158]" />
              <span className="hidden xs:inline sm:inline">Apple Secure</span>
            </div>
          </div>
        </div>

        {/* Primary Monetary Value */}
        <div>
          <div className="text-2xl min-[360px]:text-3xl min-[400px]:text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2 flex items-baseline gap-1 font-tabular break-words">
            {showBalance ? (
              <CountUp
                value={currentBalance}
                duration={1000}
                formatter={(val) => formatCurrency(val)}
                className="text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <span className="tracking-widest text-slate-400 font-mono text-2xl sm:text-4xl">••••••••</span>
            )}
          </div>
          <p className="text-xs font-medium text-[#86868b]">Real-time liquid assets across all connected ledger vaults</p>
        </div>

        {/* VisionOS Liquid Glass Metric Capsules */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 pt-3 border-t border-white/[0.08]">
          {/* Starting Balance */}
          <motion.div 
            whileHover={{ y: -2, scale: 1.02 }}
            className="bg-white/[0.04] hover:bg-white/[0.08] p-3 sm:p-3.5 rounded-[18px] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-center backdrop-blur-md shadow-sm"
          >
            <span className="text-[10px] sm:text-[11px] text-[#86868b] uppercase tracking-wider font-bold">
              Starting Vault
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-white font-tabular mt-0.5 truncate">
              {showBalance ? formatCurrency(startingBalance) : '••••'}
            </span>
          </motion.div>

          {/* Total In */}
          <motion.div 
            whileHover={{ y: -2, scale: 1.02 }}
            className="bg-[#30d158]/[0.08] hover:bg-[#30d158]/[0.15] p-3 sm:p-3.5 rounded-[18px] border border-[#30d158]/25 hover:border-[#30d158]/40 transition-all flex flex-col justify-center backdrop-blur-md shadow-[0_4px_16px_rgba(48,209,88,0.08)]"
          >
            <span className="text-[10px] sm:text-[11px] text-[#30d158] uppercase tracking-wider font-bold flex items-center gap-1">
              <TrendingUp size={12} /> Total Received (In)
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-[#30d158] font-tabular mt-0.5 truncate">
              {showBalance ? `+${formatCurrency(totalReceived)}` : '••••'}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default BalanceCard;
