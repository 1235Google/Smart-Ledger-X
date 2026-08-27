import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { 
  Shield, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Sparkles, Lock, Eye, EyeOff, Activity, Clock, 
  ChevronRight, DollarSign, Wallet
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface FloatingVault3DProps {
  balance?: number;
  totalReceived?: number;
  totalSent?: number;
  totalPending?: number;
  onExplore?: () => void;
  onRunBackup?: () => void;
}

export default function FloatingVault3D({
  balance = 0,
  totalReceived = 0,
  totalSent = 0,
  totalPending = 0,
  onExplore,
  onRunBackup,
}: FloatingVault3DProps) {
  const [currencyMode, setCurrencyMode] = useState<'INR' | 'USD'>('INR');
  const [isLocked, setIsLocked] = useState(false);

  const hasActivity = totalReceived > 0 || totalSent > 0 || totalPending > 0 || balance !== 0;

  // Mouse tilt mechanics
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 220, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const displayBalance = currencyMode === 'INR' ? balance : Math.round(balance / 86);
  const formattedBalance = currencyMode === 'INR' 
    ? `₹${displayBalance.toLocaleString('en-IN')}` 
    : `$${displayBalance.toLocaleString('en-US')}`;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-4xl mx-auto perspective-1200 py-4 select-none"
    >
      {/* Dynamic Ambient Backlight Glow */}
      <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-r from-indigo-500/20 via-cyan-500/15 to-emerald-500/15 rounded-[48px] blur-3xl opacity-60 pointer-events-none" />

      {/* Floating 3D Main Chassis */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative rounded-[32px] md:rounded-[40px] bg-gradient-to-b from-[#0b0f1d]/95 via-[#090d18]/98 to-[#050811]/100 border border-white/[0.14] shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(99,102,241,0.15)] backdrop-blur-3xl overflow-hidden p-6 md:p-8"
      >
        {/* Specular glass highlight bar on top edge */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute top-0 left-12 w-32 h-24 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Vault Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08] relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                <Wallet size={18} className="text-cyan-300" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight">Ledger Balance Overview</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Synced & Active
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                Client-side encrypted personal ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency switcher */}
            <div className="flex items-center bg-white/[0.05] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setCurrencyMode('INR')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currencyMode === 'INR' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ₹ INR
              </button>
              <button
                onClick={() => setCurrencyMode('USD')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currencyMode === 'USD' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>

            {/* Lock / Unlock Toggle */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`p-2 rounded-xl border transition-all ${
                isLocked 
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                  : 'bg-white/[0.05] border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isLocked ? "Reveal Balance" : "Hide Balance"}
            >
              {isLocked ? <Lock size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Middle Core: Live Balance & Rising Waveform */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-center relative z-20">
          {/* Main Balance Display */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" /> Current Net Balance
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                hasActivity 
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                  : 'text-slate-400 bg-white/[0.04] border-white/10'
              }`}>
                <TrendingUp size={12} /> {hasActivity ? (balance >= 0 ? 'Positive Cashflow' : 'Net Outflow') : 'No transactions yet'}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <motion.h1 
                key={currencyMode + (isLocked ? 'locked' : 'open')}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight font-sans"
              >
                {isLocked ? '••••••••' : (hasActivity || balance !== 0 ? formattedBalance : '₹0')}
              </motion.h1>
            </div>

            {/* Income Trend Waveform */}
            <div className="relative h-24 w-full bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent rounded-2xl border border-white/[0.08] p-3 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
              
              {hasActivity ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="vaultWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="vaultStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area */}
                  <motion.path
                    d="M0,60 Q50,20 100,45 T200,30 T300,15 T400,10 L400,80 L0,80 Z"
                    fill="url(#vaultWaveGrad)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />

                  {/* Stroke Line with Drawing Animation */}
                  <motion.path
                    d="M0,60 Q50,20 100,45 T200,30 T300,15 T400,10"
                    fill="none"
                    stroke="url(#vaultStrokeGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                  />

                  <circle cx="396" cy="10" r="4" fill="#34d399" />
                </svg>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="w-full h-[1px] bg-white/10 my-auto" />
                  <p className="text-[11px] text-slate-400 font-medium -mt-2 bg-[#090d18] px-3 z-10 rounded-full border border-white/5">
                    No financial data available yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Key Financial Telemetry Chips */}
          <div className="lg:col-span-5 space-y-3">
            {/* Total Inflow */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowDownLeft size={18} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Received</div>
                  <div className="text-base font-bold text-white">{formatCurrency(totalReceived)}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Verified
              </span>
            </div>

            {/* Total Outflow */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Sent</div>
                  <div className="text-base font-bold text-white">{formatCurrency(totalSent)}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5">
                Logged
              </span>
            </div>

            {/* Pending & Reminders */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">Pending Payments</div>
                  <div className="text-base font-bold text-amber-200">{formatCurrency(totalPending)}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight Footer Banner */}
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-20">
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles size={13} />
            </div>
            <span>
              <strong className="text-white font-semibold">Smart Financial Assistant:</strong>{' '}
              {hasActivity
                ? 'Automated balance tracking and expense analysis active.'
                : 'AI insights will appear after analyzing your financial activity.'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onExplore && (
              <button
                onClick={onExplore}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-1.5"
              >
                Go to Dashboard <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
