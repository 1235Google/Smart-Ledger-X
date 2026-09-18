import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  X, TrendingUp, TrendingDown, Target, Shield, CreditCard, 
  Clock, Play, BarChart2, CheckCircle, Heart, 
  Sparkles, Lock, Unlock, CheckCircle2, PiggyBank,
  ArrowUpRight, AlertCircle, Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { PendingMoney } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import DataStateGuard from '../components/ui/DataStateGuard';
import FaceUnlock from '../components/FaceUnlock';
import CountUp from '../components/ui/CountUp';

interface CashEvent {
  id: number;
  type: 'in' | 'out';
  amount: number;
  createdAt: number;
}

// Sparkline Component
function Sparkline({ color, fillOpacity = 0.12, data }: { color: string, fillOpacity?: number, data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 80 - 10;
    return `${x},${y}`;
  });
  
  const pathData = `M 0,100 L ${points.map(p => {
     const [x, y] = p.split(',');
     return `${x},${y}`;
  }).join(' L ')} L 100,100 Z`;

  const lineData = `M ${points.join(' L ')}`;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d opacity-85" preserveAspectRatio="none">
      <path d={pathData} fill={color} fillOpacity={fillOpacity} />
      <path d={lineData} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Circular Mini Gauge for Health Score
function MiniCircularProgress({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={radius} stroke="currentColor" strokeWidth="5" fill="none" className="text-white/5" />
        <circle 
          cx="35" 
          cy="35" 
          r={radius} 
          stroke="url(#health-gradient)" 
          strokeWidth="5" 
          fill="none" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          className="drop-shadow-[0_0_6px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out" 
        />
        <defs>
          <linearGradient id="health-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-white font-tabular">
        {value}
      </div>
    </div>
  );
}

export default function VaultPage() {
  const store = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const prefersReducedMotion = useReducedMotion() ?? false;
  
  const totalReceived = useMemo(() => {
    return (store.transactions || [])
      .filter(t => t.type === 'received')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [store.transactions]);

  const totalSent = useMemo(() => {
    return (store.transactions || [])
      .filter(t => t.type === 'sent')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [store.transactions]);

  const realBalance = useMemo(() => {
    if (typeof store.currentBalance === 'number') {
      return store.currentBalance;
    }
    return (store.startingBalance || 0) + totalReceived - totalSent;
  }, [store.currentBalance, store.startingBalance, totalReceived, totalSent]);

  const [vaultLoaded, setVaultLoaded] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(realBalance);
  const previousBalance = useRef(realBalance);
  const [status, setStatus] = useState<'idle' | 'receiving' | 'sending'>('idle');
  const [cashEvents, setCashEvents] = useState<CashEvent[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [goalAchieved, setGoalAchieved] = useState(false);

  // Target Goal (Emergency Fund / Milestone target)
  const targetGoal = useMemo(() => {
    if (store.savingsGoals && store.savingsGoals.length > 0) {
      return store.savingsGoals[0].targetAmount || 50000;
    }
    return 50000;
  }, [store.savingsGoals]);

  const goalProgress = useMemo(() => {
    if (targetGoal <= 0) return 0;
    return Math.min(100, Math.round((displayBalance / targetGoal) * 100));
  }, [displayBalance, targetGoal]);

  useEffect(() => {
    const t = setTimeout(() => {
      setVaultLoaded(true);
      setDisplayBalance(realBalance);
      previousBalance.current = realBalance;
    }, 400);
    return () => clearTimeout(t);
  }, [realBalance]);

  useEffect(() => {
    if (!vaultLoaded || isReplaying) return;
    
    if (realBalance !== previousBalance.current) {
      const diff = realBalance - previousBalance.current;
      
      if (diff > 0) {
        setStatus('receiving');
        setCashEvents(prev => [...prev, { id: Date.now(), type: 'in', amount: diff, createdAt: performance.now() }]);
      } else {
        setStatus('sending');
        setCashEvents(prev => [...prev, { id: Date.now(), type: 'out', amount: Math.abs(diff), createdAt: performance.now() }]);
      }
      
      setDisplayBalance(realBalance);
      previousBalance.current = realBalance;
      
      const timer = setTimeout(() => setStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [realBalance, vaultLoaded, isReplaying]);

  useEffect(() => {
    if (displayBalance >= targetGoal && !goalAchieved && !isReplaying && displayBalance > 0) {
       setGoalAchieved(true);
       if (!prefersReducedMotion) {
         try {
           confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#4ade80', '#fbbf24', '#818cf8']
           });
         } catch (e) {}
       }
    }
  }, [displayBalance, targetGoal, goalAchieved, isReplaying, prefersReducedMotion]);

  useEffect(() => {
    if (cashEvents.length > 0) {
      const timer = setInterval(() => {
         setCashEvents(prev => prev.filter(e => performance.now() - e.createdAt < 2000));
      }, 500);
      return () => clearInterval(timer);
    }
  }, [cashEvents]);

  const handleReplay = () => {
    if (isReplaying || !vaultLoaded) return;
    setIsReplaying(true);
    
    const startingBal = store.startingBalance || 0;
    setDisplayBalance(startingBal);
    previousBalance.current = startingBal;
    setStatus('idle');
    
    let current = startingBal;
    const sorted = [...(store.transactions || [])]
      .filter(t => t.type !== 'pending')
      .sort((a, b) => new Date((a as any).date).getTime() - new Date((b as any).date).getTime());
    
    if (sorted.length === 0) {
      setTimeout(() => {
        setDisplayBalance(realBalance);
        setIsReplaying(false);
      }, 1000);
      return;
    }

    sorted.forEach((t, i) => {
       setTimeout(() => {
          const amt = Number(t.amount) || 0;
          const newBalance = t.type === 'received' ? current + amt : current - amt;
          
          if (t.type === 'received') {
             setStatus('receiving');
             if (!prefersReducedMotion) setCashEvents(prev => [...prev, { id: Date.now() + i, type: 'in', amount: amt, createdAt: performance.now() }]);
          } else if (t.type === 'sent') {
             setStatus('sending');
             if (!prefersReducedMotion) setCashEvents(prev => [...prev, { id: Date.now() + i, type: 'out', amount: amt, createdAt: performance.now() }]);
          }
          
          setDisplayBalance(newBalance);
          previousBalance.current = newBalance;
          current = newBalance;
          
          setTimeout(() => setStatus('idle'), 1500);

          if (i === sorted.length - 1) {
             setTimeout(() => setIsReplaying(false), 2000);
          }
       }, (i + 1) * 700);
    });
  };

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  
  const monthlyIncome = useMemo(() => {
    return (store.transactions || [])
      .filter(t => t.type === 'received' && t.date?.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [store.transactions, currentMonthPrefix]);

  const monthlyPending = useMemo(() => {
    return (store.transactions || [])
      .filter(t => t.type === 'pending' && t.status === 'pending' && (t as any).dueDate?.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [store.transactions, currentMonthPrefix]);
    
  const totalSavings = monthlyIncome;
  const healthScore = Math.min(100, Math.max(30, Math.round((displayBalance / Math.max(1, displayBalance + monthlyPending)) * 100)));
  const predictedNextMonth = Math.max(0, realBalance + totalSavings - monthlyPending);

  const last7Days = useMemo(() => {
    return Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const incomeData = useMemo(() => {
    const data = last7Days.map(date => 
      (store.transactions || []).filter(t => t.type === 'received' && t.date === date).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    );
    return data.some(d => d > 0) ? data : [12, 24, 18, 35, 28, 45, 38];
  }, [store.transactions, last7Days]);

  const pendingData = useMemo(() => {
    const data = last7Days.map(date => 
      (store.transactions || []).filter(t => t.type === 'pending' && t.status === 'pending' && (t as any).dueDate === date).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    );
    return data.some(d => d > 0) ? data : [8, 15, 12, 22, 18, 25, 20];
  }, [store.transactions, last7Days]);

  const savingsData = useMemo(() => {
    return incomeData;
  }, [incomeData]);

  const recentTransactions = useMemo(() => {
    return [...(store.transactions || [])].sort((a, b) => {
      const dateA = a.type === 'pending' ? (a as any).dueDate : (a as any).date;
      const dateB = b.type === 'pending' ? (b as any).dueDate : (b as any).date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    }).slice(0, 5);
  }, [store.transactions]);

  const pendingPayments = useMemo(() => {
    return (store.transactions || []).filter((t): t is PendingMoney => t.type === 'pending' && t.status === 'pending');
  }, [store.transactions]);

  return (
    <DataStateGuard
      status={store.dataStatus}
      error={store.dataError}
      onRetry={store.retryFetchData}
      loadingMessage="Synchronizing encrypted vault data..."
      skeletonType="dashboard"
    >
      {isVaultLocked && (
        <FaceUnlock 
          onUnlock={() => setIsVaultLocked(false)} 
          onCancel={() => window.history.back()}
          title="Secret Vault" 
        />
      )}

      <div className="w-full space-y-6 sm:space-y-8 animate-[fade-in-up_0.4s_ease-out_forwards] pb-24 sm:pb-12 overflow-x-hidden">
        
        {/* Header with Title & Security Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.35)] border border-white/15 flex items-center justify-center shrink-0">
              <Shield className="text-white relative z-10 shrink-0" size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight whitespace-nowrap">
                Money Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Ultra-secure encrypted financial vault & net worth monitor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              onClick={() => setIsVaultLocked(true)}
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-2 text-xs font-semibold transition-all active:scale-95"
            >
              <Lock size={14} className="text-indigo-400" />
              <span>Lock Vault</span>
            </button>
            <button
              onClick={handleReplay}
              disabled={isReplaying || !vaultLoaded}
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              <Play size={14} className={cn("text-indigo-400", isReplaying && "animate-pulse")} />
              <span>{isReplaying ? "Replaying..." : "Replay History"}</span>
            </button>
          </div>
        </div>

        {/* Premium Hero Section */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-10 bg-[#0A0B10] border border-white/10 shadow-2xl group">
          {/* Background Mesh & Ambient Glow (Strictly z-0 behind content) */}
          <div className="decorative-element absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/25 via-[#0A0B10] to-[#0A0B10] opacity-80 pointer-events-none -z-10" />
          <div className="decorative-element absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
          <div className="decorative-element absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-500/5 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

          {/* Background Decorative Currency Particles - Confined strictly to right margin (70%+), never intersecting text */}
          <div className="decorative-element absolute inset-0 overflow-hidden select-none -z-10 hidden sm:block pointer-events-none">
            {[
              { x: '74%', y: '18%', size: 'text-2xl', delay: 0, dur: 18 },
              { x: '88%', y: '62%', size: 'text-xl', delay: 3, dur: 22 },
              { x: '80%', y: '78%', size: 'text-3xl', delay: 6, dur: 20 },
              { x: '92%', y: '28%', size: 'text-lg', delay: 9, dur: 24 }
            ].map((item, i) => (
              <motion.div
                key={i}
                className={`absolute text-indigo-400/[0.08] font-serif ${item.size} select-none pointer-events-none`}
                style={{ left: item.x, top: item.y }}
                animate={{ 
                  y: [-8, 8, -8],
                  rotate: [0, 180, 360],
                  opacity: [0.04, 0.1, 0.04]
                }}
                transition={{
                  duration: item.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: item.delay
                }}
              >
                ₹
              </motion.div>
            ))}
          </div>

          {/* Ambient interactive border glow */}
          <div className="decorative-element absolute -inset-[1px] bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm pointer-events-none" />

          {/* Foreground Content with isolated stacking context (z-10) */}
          <div className="relative z-10 isolate flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-10 pr-0 lg:pr-6">
            <div className="space-y-4 sm:space-y-6 flex-1 w-full min-w-0">
              
              {/* Vault Security Pill */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                  <Shield size={13} className="text-emerald-400" />
                  <span className="tracking-wider uppercase">AES-256 Encrypted</span>
                </div>
                {status !== 'idle' && (
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[11px] font-bold animate-pulse",
                    status === 'receiving' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  )}>
                    {status === 'receiving' ? '+ Incoming Funds' : '- Outgoing Debit'}
                  </span>
                )}
              </div>

              {/* Current Savings Block with 100% isolated text layering */}
              <div className="relative z-10 space-y-2 sm:space-y-2.5">
                <div className="text-slate-300 font-bold tracking-[0.2em] text-[11px] sm:text-xs uppercase flex items-center gap-2 select-none">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
                  <span>CURRENT SAVINGS</span>
                </div>

                <div className="relative flex items-baseline gap-2 group cursor-default w-fit max-w-full">
                  {/* Background Ambient Glow strictly behind the amount */}
                  <div className="absolute -inset-3 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent rounded-2xl blur-lg pointer-events-none -z-10 opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Foreground Amount Text with responsive clamp */}
                  <div className="relative z-10 text-[clamp(2.25rem,6.8vw,4.25rem)] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-300 tracking-tight font-tabular">
                    <CountUp prefix="₹" value={displayBalance} />
                  </div>
                </div>
              </div>

              {/* Badges / Chips Row with flex-wrap and aligned icons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 w-full">
                {[
                  { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", shadow: "hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]", label: `+₹${monthlyIncome.toLocaleString('en-IN')} This Month` },
                  { icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", shadow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]", label: "Biometric Protected" },
                  { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", shadow: "hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]", label: "AI On Track" }
                ].map((badge, idx) => (
                  <div 
                    key={idx} 
                    className={`badge-chip ${badge.bg} border ${badge.border} ${badge.shadow} px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 cursor-default text-xs sm:text-[13px] whitespace-nowrap min-h-[38px] sm:min-h-[40px] shrink-0`}
                  >
                    <badge.icon size={15} className={cn(badge.color, "shrink-0")} />
                    <span className={cn(badge.color, "font-semibold tracking-wide leading-none")}>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal Progress Circular Chart - Responsive CSS Clamp */}
            <div 
              className="progress-circle-wrap mx-auto lg:mx-0 shrink-0 my-3 lg:my-0 self-center"
              style={{
                width: 'clamp(180px, 46vw, 240px)',
                height: 'clamp(180px, 46vw, 240px)'
              }}
            >
               <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/15 to-pink-500/15 rounded-full blur-[35px] animate-pulse pointer-events-none -z-10" />
               <div className="relative w-full h-full bg-[#0f1117]/90 border border-white/10 rounded-full backdrop-blur-2xl flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] p-3 sm:p-5 group-hover:scale-[1.02] transition-transform duration-500 text-center">
                  <Target size={16} className="text-slate-400 mb-1 sm:mb-1.5 opacity-70 shrink-0" />
                  <div className="text-slate-400 text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase mb-0.5 sm:mb-1 select-none">
                    Goal Progress
                  </div>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-0.5 sm:mb-1 tracking-tight flex items-baseline justify-center font-tabular">
                    <CountUp value={goalProgress} />
                    <span className="text-xl sm:text-2xl font-bold text-white/50 ml-0.5">%</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-normal truncate max-w-[85%] px-1 font-tabular">
                    ₹{displayBalance.toLocaleString('en-IN')} / ₹{targetGoal.toLocaleString('en-IN')}
                  </div>
                  
                  {/* SVG Progress Circle */}
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none p-1" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="5.5" />
                    <motion.circle 
                      cx="50" cy="50" r="45" fill="transparent" 
                      stroke="url(#vault-progress-gradient)" strokeWidth="5.5" strokeLinecap="round"
                      strokeDasharray="282.743"
                      initial={{ strokeDashoffset: 282.743 }}
                      animate={{ strokeDashoffset: 282.743 - (282.743 * Math.min(100, goalProgress)) / 100 }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.5))" }}
                    />
                    <defs>
                      <linearGradient id="vault-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                  </svg>
               </div>
            </div>
          </div>

          {/* Floating Cash Event Alerts Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
            <AnimatePresence>
              {cashEvents.map(e => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: e.type === 'in' ? 40 : -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: e.type === 'in' ? -10 : 20, scale: 1.05 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.8 }}
                  className={cn(
                    "absolute text-2xl sm:text-4xl font-bold tracking-tight px-4 py-1.5 rounded-2xl backdrop-blur-xl border font-tabular shadow-2xl",
                    e.type === 'in' 
                      ? "text-emerald-400 bg-emerald-950/80 border-emerald-500/30" 
                      : "text-rose-400 bg-rose-950/80 border-rose-500/30"
                  )}
                >
                  {e.type === 'in' ? '+' : '-'}₹{e.amount.toLocaleString('en-IN')}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Detailed Analytics Callout Banner */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black/40 border border-white/10 hover:border-indigo-500/40 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all duration-300 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <BarChart2 size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Deep Vault Analytics & AI Projections
              </h3>
              <p className="text-xs text-slate-400">
                Tap to explore projected next month balance, emergency fund metrics & recent activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform self-end sm:self-center">
            <span>View Report</span>
            <ArrowUpRight size={15} />
          </div>
        </div>

        {/* Financial Breakdown Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Income Card */}
          <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-300">Income</span>
            </div>
            <div className="mb-6 relative z-10 font-tabular">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">₹{monthlyIncome.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-slate-500 mt-1">This Month</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
              <Sparkline color="#34d399" data={incomeData} />
            </div>
          </div>
          
          {/* Pending Due Card */}
          <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <TrendingDown size={16} className="text-amber-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-300">Pending Dues</span>
            </div>
            <div className="mb-6 relative z-10 font-tabular">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">₹{monthlyPending.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-slate-500 mt-1">Due This Month</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
              <Sparkline color="#fbbf24" data={pendingData} />
            </div>
          </div>
          
          {/* Total Net Savings Card */}
          <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative shadow-lg transition-all">
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <PiggyBank size={16} className="text-blue-400" />
              <span className="text-xs sm:text-sm font-semibold text-slate-300">Net Savings</span>
            </div>
            <div className="mb-6 relative z-10 font-tabular">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">₹{totalSavings.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-slate-500 mt-1">Recorded</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
              <Sparkline color="#60a5fa" data={savingsData} />
            </div>
          </div>
          
          {/* Health Score Card */}
          <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-lg relative overflow-hidden transition-all">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Heart size={16} className="text-purple-400" />
                <span className="text-xs sm:text-sm font-semibold text-slate-300">Health Score</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2 font-tabular">
                <h3 className="text-2xl sm:text-3xl font-bold text-white">{healthScore}</h3>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg w-fit">
                <CheckCircle2 size={12} />
                {healthScore >= 70 ? 'Optimal' : healthScore >= 40 ? 'Moderate' : 'Needs Review'}
              </div>
            </div>
            <MiniCircularProgress value={healthScore} />
          </div>

        </div>

        {/* Vault Analytics Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={() => setIsModalOpen(false)}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-[#0a0b10] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
              >
                <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 text-indigo-400 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-xl font-bold text-white">Vault Analytics</h2>
                      <p className="text-xs sm:text-sm text-slate-400">Detailed financial breakdown & projections</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    aria-label="Close modal"
                    className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1 custom-scrollbar">
                  
                  {/* AI Insight & Savings Goal inside Modal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* AI Insight */}
                    <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none"></div>
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-indigo-400 font-bold text-xs">AI</span>
                          </div>
                          <h3 className="text-white font-semibold text-sm">Financial Coach</h3>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          <BarChart2 size={13} />
                          Projection
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed relative z-10">
                        {healthScore >= 70 
                          ? `Excellent momentum. You have saved ₹${totalSavings.toLocaleString('en-IN')} this period. Your financial health is optimal. Keep maintaining this savings trajectory.`
                          : `Pending dues are taking up a noticeable portion of your liquidity. Prioritize clearing dues to boost your vault safety score.`}
                      </p>
                      <div className="mt-4 pt-3 border-t border-indigo-500/20 relative z-10">
                         <p className="text-[11px] text-indigo-200/70 uppercase tracking-wider">Projected Next Month Balance</p>
                         <p className="text-lg font-bold text-indigo-300 mt-0.5 font-tabular">₹{predictedNextMonth.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Savings Goal Progress */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                            <Target size={16} className="text-emerald-400" />
                            Milestone Target
                          </h3>
                          <span className="text-xs sm:text-sm font-semibold text-slate-300 font-tabular">₹{targetGoal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="mb-2 flex justify-between text-xs font-tabular">
                          <span className="text-slate-400">Vault Progress</span>
                          <span className="text-white font-bold">{goalProgress}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${goalProgress}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                      </div>
                      {goalAchieved && (
                        <div className="mt-4 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 text-xs font-semibold">
                          <CheckCircle2 size={16} />
                          <span>Goal milestone reached!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pending Alerts */}
                  {pendingPayments.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" />
                        Pending Payments Required
                      </h3>
                      <div className="space-y-2.5">
                        {pendingPayments.map(p => (
                          <div key={p.id} className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold text-sm">{p.personName}</p>
                              <p className="text-xs text-amber-200/70">{p.reason}</p>
                            </div>
                            <div className="text-right font-tabular">
                              <p className="text-amber-400 font-bold text-sm">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                              <p className="text-[11px] text-amber-200/50">Due: {formatDate(p.dueDate, store.generalSettings?.timezone)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2">
                      <CreditCard size={16} className="text-slate-400" />
                      Recent Activity
                    </h3>
                    <div className="space-y-2.5">
                      {recentTransactions.map(t => (
                        <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 flex items-center justify-between hover:bg-white/[0.06] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                              t.type === 'received' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            )}>
                              {t.type === 'received' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{t.personName}</p>
                              <p className="text-xs text-slate-400">
                                {t.type === 'pending' ? (t as any).reason : (t as any).purpose || 'General transaction'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-tabular">
                            <p className={cn(
                              "font-bold text-sm",
                              t.type === 'received' ? 'text-emerald-400' : 'text-rose-400'
                            )}>
                              {t.type === 'received' ? '+' : '-'}
                              ₹{Number(t.amount).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatDate(t.type === 'pending' ? (t as any).dueDate : (t as any).date, store.generalSettings?.timezone)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentTransactions.length === 0 && (
                        <p className="text-slate-400 text-center py-4 text-xs font-medium">No recent activity recorded.</p>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DataStateGuard>
  );
}
