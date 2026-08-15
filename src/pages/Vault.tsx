import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react';
import { useStore } from '../context/StoreContext';
import { PendingMoney } from '../types';
import { formatDate } from '../lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, TrendingUp, TrendingDown, Target, Shield, CreditCard, Clock, Play, BarChart2, CheckCircle, Info, Heart, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LuxuryVaultDisplay } from '../components/Vault3D';
import DataStateGuard from '../components/ui/DataStateGuard';

interface CashEvent {
  id: number;
  type: 'in' | 'out';
  amount: number;
  createdAt: number;
}

// 3D Components removed for image layout.

// --- UI Components ---

function BalanceCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime = performance.now();
    const startValue = displayValue;
    const duration = 1500;
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(startValue + (value - startValue) * easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <>₹{Math.floor(displayValue).toLocaleString()}</>;
}

// --- Sparkline & Progress Components ---

function Sparkline({ color, fillOpacity = 0.1, data }: { color: string, fillOpacity?: number, data: number[] }) {
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
    <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d opacity-80" preserveAspectRatio="none">
      <path d={pathData} fill={color} fillOpacity={fillOpacity} />
      <path d={lineData} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CircularProgress({ value }: { value: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-[88px] h-[88px] flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="none" className="text-white/5" />
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          stroke="url(#gradient)" 
          strokeWidth="6" 
          fill="none" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          className="drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-1000 ease-out" 
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-medium text-xl text-white">
        {value}
      </div>
    </div>
  )
}

// --- Main Page Component ---

export default function VaultPage() {
  const store = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion() ?? false;
  
  const totalReceived = store.transactions
    .filter(t => t.type === 'received')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalSent = store.transactions
    .filter(t => t.type === 'sent')
    .reduce((sum, t) => sum + t.amount, 0);

  const realBalance = store.startingBalance + totalReceived - totalSent;

  const [vaultLoaded, setVaultLoaded] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const previousBalance = useRef(realBalance);
  const [status, setStatus] = useState<'idle' | 'receiving' | 'sending'>('idle');
  const [cashEvents, setCashEvents] = useState<CashEvent[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [goalAchieved, setGoalAchieved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setVaultLoaded(true);
      setDisplayBalance(realBalance);
      previousBalance.current = realBalance;
    }, 800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (displayBalance >= 50000 && !goalAchieved && !isReplaying) {
       setGoalAchieved(true);
       if (!prefersReducedMotion) {
         confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4ade80', '#fbbf24', '#ffffff']
         });
       }
    }
  }, [displayBalance, goalAchieved, isReplaying, prefersReducedMotion]);

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
    
    setDisplayBalance(store.startingBalance);
    previousBalance.current = store.startingBalance;
    setStatus('idle');
    
    let current = store.startingBalance;
    const sorted = [...store.transactions].filter(t => t.type !== 'pending').sort((a,b) => {
        const da = (a as any).date;
        const db = (b as any).date;
        return new Date(da).getTime() - new Date(db).getTime();
    });
    
    if (sorted.length === 0) {
      setIsReplaying(false);
      return;
    }

    sorted.forEach((t, i) => {
       setTimeout(() => {
          const newBalance = t.type === 'received' ? current + t.amount : current - t.amount;
          
          if (t.type === 'received') {
             setStatus('receiving');
             if (!prefersReducedMotion) setCashEvents(prev => [...prev, { id: Date.now() + i, type: 'in', amount: t.amount, createdAt: performance.now() }]);
          } else if (t.type === 'sent') {
             setStatus('sending');
             if (!prefersReducedMotion) setCashEvents(prev => [...prev, { id: Date.now() + i, type: 'out', amount: t.amount, createdAt: performance.now() }]);
          }
          
          setDisplayBalance(newBalance);
          previousBalance.current = newBalance;
          current = newBalance;
          
          setTimeout(() => setStatus('idle'), 1500);

          if (i === sorted.length - 1) {
             setTimeout(() => setIsReplaying(false), 2000);
          }
       }, (i + 1) * 800);
    });
  };

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  
  const monthlyIncome = store.transactions
    .filter(t => t.type === 'received' && t.date.startsWith(currentMonthPrefix))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthlyExpenses = store.transactions
    .filter(t => t.type === 'sent' && t.date.startsWith(currentMonthPrefix))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalSavings = monthlyIncome - monthlyExpenses;
  const savingsRatio = monthlyIncome > 0 ? totalSavings / monthlyIncome : 0;
  const healthScore = Math.min(Math.max(Math.floor(savingsRatio * 100 + 50), 0), 100);
  const predictedNextMonth = realBalance + totalSavings;

  const last7Days = useMemo(() => {
    return Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const incomeData = useMemo(() => {
    const data = last7Days.map(date => 
      store.transactions.filter(t => t.type === 'received' && t.date === date).reduce((sum, t) => sum + t.amount, 0)
    );
    // fallback if completely empty
    return data.some(d => d > 0) ? data : [10, 20, 15, 30, 25, 40, 35];
  }, [store.transactions, last7Days]);

  const expenseData = useMemo(() => {
    const data = last7Days.map(date => 
      store.transactions.filter(t => t.type === 'sent' && t.date === date).reduce((sum, t) => sum + t.amount, 0)
    );
    return data.some(d => d > 0) ? data : [30, 25, 35, 20, 15, 25, 10];
  }, [store.transactions, last7Days]);

  const savingsData = useMemo(() => {
    const data = incomeData.map((inc, i) => Math.max(0, inc - expenseData[i]));
    return data.some(d => d > 0) ? data : [10, 20, 30, 25, 40, 50, 60];
  }, [incomeData, expenseData]);

  const recentTransactions = [...store.transactions].sort((a, b) => {
    const dateA = a.type === 'pending' ? (a as any).dueDate : (a as any).date;
    const dateB = b.type === 'pending' ? (b as any).dueDate : (b as any).date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  }).slice(0, 5);

  const pendingPayments = store.transactions.filter((t): t is PendingMoney => t.type === 'pending' && t.status === 'pending');

  return (
    <DataStateGuard
      status={store.dataStatus}
      error={store.dataError}
      onRetry={store.retryFetchData}
      loadingMessage="Synchronizing vault data..."
      skeletonType="dashboard"
    >
      <div className="w-full flex flex-col gap-6 relative">
        <header className="mb-2">
        <h1 className="text-3xl font-light text-white tracking-tight">Money Vault</h1>
        <p className="text-slate-400 mt-1">Premium visual overview of your net worth</p>
      </header>
      
      <div className="relative rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.15)] border border-white/5 bg-[#05060a] min-h-[550px]">
        {/* Dark luxury gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/30 via-[#0a0b10] to-[#05060a] z-0" />

        {/* Ambient background particles (UI layer) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

        <div className="absolute inset-0 z-0 pointer-events-auto flex items-center justify-center p-12">
            <Suspense fallback={null}>
              <LuxuryVaultDisplay 
                balance={displayBalance} 
                status={status} 
                cashEvents={cashEvents}
                prefersReducedMotion={prefersReducedMotion}
                vaultLoaded={vaultLoaded}
              />
            </Suspense>
        </div>
        
        {/* Top Controls */}
        <div className="absolute top-6 left-6 z-10 flex gap-4">
           <div className="px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
              <Shield size={16} className="text-indigo-400" />
              <span className="text-xs text-slate-300 font-medium uppercase tracking-widest">Secured</span>
           </div>
        </div>
        
        <div className="absolute top-6 right-6 z-10">
          <button 
             onClick={(e) => { e.stopPropagation(); handleReplay(); }} 
             disabled={isReplaying || !vaultLoaded}
             className="flex items-center gap-2 bg-black/40 backdrop-blur-md hover:bg-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl transition-all shadow-lg border border-white/10 disabled:opacity-50"
          >
             <Play size={16} className={isReplaying ? "animate-pulse text-indigo-400" : ""} />
             <span className="text-sm font-medium tracking-wide">{isReplaying ? "Replaying..." : "Replay"}</span>
          </button>
        </div>

        {/* Floating Transaction Texts (UI Overlay) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <AnimatePresence>
            {cashEvents.map(e => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: e.type === 'in' ? 50 : 0, scale: 0.8 }}
                animate={{ opacity: 1, y: e.type === 'in' ? 0 : -50, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 1 }}
                className={`absolute text-4xl md:text-5xl font-light tracking-tight ${e.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}
                style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
              >
                {e.type === 'in' ? '+' : '-'}₹{e.amount.toLocaleString()}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Total Vault Value Card (Right) */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 hidden xl:block">
           <div 
             onClick={() => setIsModalOpen(true)}
             className="bg-slate-950/80 backdrop-blur-3xl p-8 rounded-2xl border border-white/10 shadow-2xl min-w-[280px] cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] transition-all group"
           >
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold mb-3">Total Vault Value</p>
              <h2 className="text-5xl font-light text-white mb-8 tracking-tight">
                <BalanceCounter value={displayBalance} />
              </h2>
              
              <div className="flex items-center gap-3 text-indigo-400 text-sm group-hover:text-indigo-300 transition-colors">
                <BarChart2 size={16} />
                <span className="font-medium">Tap to view analytics</span>
              </div>
           </div>
        </div>

        {/* Bottom Cards */}
        <div className="absolute bottom-6 left-6 right-6 z-10 grid grid-cols-2 xl:grid-cols-4 gap-4">
           {/* Income Card */}
           <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative shadow-lg">
              <div className="flex items-center gap-2 mb-3 relative z-10">
                 <TrendingUp size={16} className="text-emerald-400" />
                 <span className="text-sm font-medium text-slate-300">Income</span>
              </div>
              <div className="mb-6 relative z-10">
                 <h3 className="text-3xl font-semibold text-white">₹{monthlyIncome.toLocaleString()}</h3>
                 <p className="text-xs text-slate-500 mt-1">This Month</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16">
                 <Sparkline color="#34d399" data={incomeData} />
              </div>
           </div>
           
           {/* Expenses Card */}
           <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative shadow-lg">
              <div className="flex items-center gap-2 mb-3 relative z-10">
                 <TrendingDown size={16} className="text-red-400" />
                 <span className="text-sm font-medium text-slate-300">Expenses</span>
              </div>
              <div className="mb-6 relative z-10">
                 <h3 className="text-3xl font-semibold text-white">₹{monthlyExpenses.toLocaleString()}</h3>
                 <p className="text-xs text-slate-500 mt-1">This Month</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16">
                 <Sparkline color="#f87171" data={expenseData} />
              </div>
           </div>
           
           {/* Savings Card */}
           <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative shadow-lg">
              <div className="flex items-center gap-2 mb-3 relative z-10">
                 <Shield size={16} className="text-blue-400" />
                 <span className="text-sm font-medium text-slate-300">Total Savings</span>
              </div>
              <div className="mb-6 relative z-10">
                 <h3 className="text-3xl font-semibold text-white">₹{totalSavings.toLocaleString()}</h3>
                 <p className="text-xs text-slate-500 mt-1">This Month</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16">
                 <Sparkline color="#60a5fa" data={savingsData} />
              </div>
           </div>
           
           {/* Health Score Card */}
           <div className="bg-[#0c0d12]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
              <div>
                 <div className="flex items-center gap-2 mb-3">
                    <Heart size={16} className="text-purple-400" />
                    <span className="text-sm font-medium text-slate-300">Health Score</span>
                 </div>
                 <div className="flex items-baseline gap-1 mb-2">
                    <h3 className="text-3xl font-semibold text-white">{healthScore}</h3>
                    <span className="text-sm text-slate-500">/ 100</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md w-fit">
                    <CheckCircle size={12} />
                    {healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Fair' : 'Needs Work'}
                 </div>
              </div>
              <CircularProgress value={healthScore} />
           </div>
        </div>

      </div>

      {/* Vault Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0b10] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-light text-white tracking-wide">Vault Analytics</h2>
                    <p className="text-sm text-slate-400">Detailed financial breakdown</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
                
                {/* AI Insight & Savings Goal inside Modal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AI Insight */}
                  <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <span className="text-indigo-400 font-bold text-sm">AI</span>
                        </div>
                        <h3 className="text-white font-medium">Financial Coach</h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md">
                        <BarChart2 size={14} />
                        Projection
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm font-light leading-relaxed relative z-10">
                      {healthScore >= 70 
                        ? `Excellent momentum. You've saved ₹${totalSavings.toLocaleString()} this period. Your financial health is optimal. Keep maintaining this savings rate.`
                        : `Your expenses are taking up a significant portion of your income. Consider reviewing recent transactions to identify potential savings opportunities.`}
                    </p>
                    <div className="mt-4 pt-4 border-t border-indigo-500/20 relative z-10">
                       <p className="text-xs text-indigo-200/70">Projected Next Month Balance:</p>
                       <p className="text-xl font-light text-indigo-300 mt-1">₹{predictedNextMonth.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Savings Goal Progress */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-medium flex items-center gap-2">
                          <Target size={18} className="text-emerald-400" />
                          Emergency Fund
                        </h3>
                        <span className="text-sm text-slate-400">₹50,000</span>
                      </div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-400 font-light">Progress</span>
                        <span className="text-white font-medium">{Math.min(Math.round((realBalance / 50000) * 100), 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((realBalance / 50000) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                    </div>
                    {goalAchieved && (
                      <div className="mt-4 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Goal Achieved!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Alerts */}
                {pendingPayments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-light text-white mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-amber-400" />
                      Pending Action Required
                    </h3>
                    <div className="space-y-3">
                      {pendingPayments.map(p => (
                        <div key={p.id} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{p.personName}</p>
                            <p className="text-sm text-amber-200/60 font-light">{p.reason}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-amber-400 font-medium">₹{p.amount.toLocaleString()}</p>
                            <p className="text-xs text-amber-200/40">Due: {formatDate(p.dueDate, store.generalSettings?.timezone)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-light text-white mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-slate-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {recentTransactions.map(t => (
                      <div key={t.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            t.type === 'received' ? 'bg-emerald-500/10 text-emerald-400' :
                            t.type === 'sent' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {t.type === 'received' ? <TrendingUp size={18} /> :
                             t.type === 'sent' ? <TrendingDown size={18} /> :
                             <Clock size={18} />}
                          </div>
                          <div>
                            <p className="text-white font-medium">{t.personName}</p>
                            <p className="text-xs text-slate-400 font-light">
                              {t.type === 'pending' ? (t as any).reason : (t as any).purpose}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            t.type === 'received' ? 'text-emerald-400' :
                            t.type === 'sent' ? 'text-red-400' :
                            'text-amber-400'
                          }`}>
                            {t.type === 'received' ? '+' : t.type === 'sent' ? '-' : ''}
                            ₹{t.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(t.type === 'pending' ? (t as any).dueDate : (t as any).date, store.generalSettings?.timezone)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentTransactions.length === 0 && (
                      <p className="text-slate-400 text-center py-4 font-light">No recent activity found.</p>
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
