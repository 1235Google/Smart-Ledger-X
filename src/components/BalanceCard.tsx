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
  const [pulseState, setPulseState] = useState<'increase' | 'decrease' | null>(null);
  const [floatingPills, setFloatingPills] = useState<FloatingPill[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [displayBalance, setDisplayBalance] = useState(currentBalance);

  useEffect(() => {
    const throttleTimer = setTimeout(() => {
      if (displayBalance !== currentBalance) {
        const diff = currentBalance - displayBalance;
        const isIncrease = diff > 0;
        const absDiffStr = formatCurrency(Math.abs(diff));
        const amountText = `${isIncrease ? '+' : '-'}${absDiffStr}`;

        setDisplayBalance(currentBalance);
        setPulseState(isIncrease ? 'increase' : 'decrease');

        const pillId = crypto.randomUUID();
        setFloatingPills((p) => [...p, { id: pillId, amountText, isIncrease }]);

        setTimeout(() => {
          setPulseState(null);
        }, 1200);
      }
    }, 300);

    return () => clearTimeout(throttleTimer);
  }, [currentBalance, displayBalance]);

  const removePill = (id: string) => {
    setFloatingPills((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className={`relative p-5 sm:p-7 rounded-[28px] overflow-hidden border transition-all duration-200 select-none shadow-sm ${
        pulseState === 'increase'
          ? 'border-[var(--md-sys-color-success)] bg-[var(--md-sys-color-success-container)]/30'
          : pulseState === 'decrease'
          ? 'border-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)]/30'
          : 'border-[var(--md-sys-color-outline-variant)]/40 bg-[var(--md-sys-color-surface-container)] hover:shadow-md'
      }`}
    >
      {/* Floating Pill on Balance Updates */}
      <AnimatePresence>
        {floatingPills.map((pill) => (
          <motion.div
            key={pill.id}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: -24, scale: 1 }}
            exit={{ opacity: 0, y: -48, scale: 0.95 }}
            transition={{ duration: 1.2, ease: [0.2, 0, 0, 1] }}
            onAnimationComplete={() => removePill(pill.id)}
            className={`absolute top-5 right-5 z-30 px-3 py-1 rounded-full font-bold text-xs border shadow-md flex items-center gap-1.5 pointer-events-none ${
              pill.isIncrease
                ? 'bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)] border-[var(--md-sys-color-success)]'
                : 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] border-[var(--md-sys-color-error)]'
            }`}
          >
            {pill.isIncrease ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{pill.amountText}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col justify-between gap-5 sm:gap-6">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                pulseState === 'increase'
                  ? 'bg-[var(--md-sys-color-success)]'
                  : pulseState === 'decrease'
                  ? 'bg-[var(--md-sys-color-error)]'
                  : 'bg-[var(--md-sys-color-primary)]'
              }`}
            />
            <span className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider truncate">
              Total Available Balance
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBalance(!showBalance);
              }}
              className="p-1.5 rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors border border-[var(--md-sys-color-outline-variant)]/40 shadow-xs"
              title={showBalance ? "Hide balance" : "Show balance"}
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)]/40 flex items-center gap-1.5 shadow-xs">
              <ShieldCheck size={13} className="text-[var(--md-sys-color-success)]" />
              <span>Secured & Verified</span>
            </div>
          </div>
        </div>

        {/* Primary Monetary Value */}
        <div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--md-sys-color-on-surface)] mb-1 flex items-baseline gap-1 font-mono tabular-nums break-words">
            {showBalance ? (
              <CountUp
                value={displayBalance}
                duration={800}
                formatter={(val) => formatCurrency(val)}
                className="text-[var(--md-sys-color-on-surface)]"
              />
            ) : (
              <span className="tracking-widest text-[var(--md-sys-color-outline)] font-mono text-2xl sm:text-4xl">••••••••</span>
            )}
          </div>
          <p className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)]">
            Real-time liquid assets across all connected ledger vaults
          </p>
        </div>

        {/* Metric Capsules */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-3 border-t border-[var(--md-sys-color-outline-variant)]/30">
          {/* Starting Vault */}
          <div className="bg-[var(--md-sys-color-surface-container-low)] p-3 sm:p-3.5 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/40 flex flex-col justify-center shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider font-bold">
              Starting Vault
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-[var(--md-sys-color-on-surface)] font-mono tabular-nums mt-0.5 truncate">
              {showBalance ? formatCurrency(startingBalance) : '••••'}
            </span>
          </div>

          {/* Total In */}
          <div className="bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)] p-3 sm:p-3.5 rounded-2xl border border-[var(--md-sys-color-success)]/20 flex flex-col justify-center shadow-xs">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold flex items-center gap-1 opacity-90">
              <TrendingUp size={12} /> Total Received (In)
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold font-mono tabular-nums mt-0.5 truncate">
              {showBalance ? `+${formatCurrency(totalReceived)}` : '••••'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BalanceCard);
