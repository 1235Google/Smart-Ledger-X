import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { 
  Target, Plus, Trash2, Edit2, TrendingUp, Sparkles, Flame, 
  CheckCircle2, Clock, Calendar, Search, ArrowUpRight, Award, 
  X, DollarSign, Wallet, PiggyBank, ChevronRight
} from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useStore } from '../context/StoreContext';
import { SavingsGoal } from '../types';
import CountUp from '../components/ui/CountUp';
import { formatCurrency, cn } from '../lib/utils';
import DataStateGuard from '../components/ui/DataStateGuard';

export default function Goals() {
  const { 
    savingsGoals, 
    addSavingsGoal, 
    updateSavingsGoal, 
    deleteSavingsGoal,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const { width, height } = useWindowSize();

  // Local fallback storage sync
  const [localGoals, setLocalGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem('smartledger_manual_goals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((g: any) => ({
            id: g.id || crypto.randomUUID(),
            name: g.name || 'Savings Goal',
            targetAmount: Number(g.targetAmount) || 10000,
            savedAmount: Number(g.savedAmount ?? g.currentAmount ?? 0),
            deadline: g.deadline || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
            createdAt: g.createdAt || new Date().toISOString()
          }));
        }
      }
    } catch (e) {}
    // Default initial goal if no goals exist
    return [{
      id: 'default-emergency-goal',
      name: 'Emergency Fund',
      targetAmount: 10000,
      savedAmount: 7490,
      deadline: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }];
  });

  // Combine store goals with local goals seamlessly
  const mergedGoals: SavingsGoal[] = useMemo(() => {
    if (savingsGoals && savingsGoals.length > 0) {
      return savingsGoals.map(g => ({
        ...g,
        savedAmount: Number(g.savedAmount ?? (g as any).currentAmount ?? 0)
      }));
    }
    return localGoals;
  }, [savingsGoals, localGoals]);

  // Sync to local storage whenever goals change
  const persistGoals = (updated: SavingsGoal[]) => {
    setLocalGoals(updated);
    try {
      localStorage.setItem('smartledger_manual_goals', JSON.stringify(updated));
    } catch (e) {}
  };

  // State management
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    savedAmount: '0',
    deadline: ''
  });
  const [customDepositAmount, setCustomDepositAmount] = useState('');

  // Check for ?new=true in query parameters
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openAddModal();
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Aggregate stats
  const totalSaved = useMemo(() => {
    return mergedGoals.reduce((sum, g) => sum + (Number(g.savedAmount) || 0), 0);
  }, [mergedGoals]);

  const totalTarget = useMemo(() => {
    return mergedGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  }, [mergedGoals]);

  const overallProgress = useMemo(() => {
    if (totalTarget <= 0) return 0;
    return Math.min(100, Math.round((totalSaved / totalTarget) * 100));
  }, [totalSaved, totalTarget]);

  const activeGoals = useMemo(() => {
    return mergedGoals.filter(g => (g.savedAmount || 0) < g.targetAmount);
  }, [mergedGoals]);

  const completedGoals = useMemo(() => {
    return mergedGoals.filter(g => (g.savedAmount || 0) >= g.targetAmount);
  }, [mergedGoals]);

  // Filtered goals for list
  const filteredGoals = useMemo(() => {
    return mergedGoals
      .filter(g => {
        if (filter === 'active') return (g.savedAmount || 0) < g.targetAmount;
        if (filter === 'completed') return (g.savedAmount || 0) >= g.targetAmount;
        return true;
      })
      .filter(g => {
        if (!searchQuery.trim()) return true;
        return g.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [mergedGoals, filter, searchQuery]);

  // Modal openers
  const openAddModal = () => {
    const defaultDeadline = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    setFormData({
      name: '',
      targetAmount: '',
      savedAmount: '0',
      deadline: defaultDeadline
    });
    setEditingGoal(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      savedAmount: (goal.savedAmount || 0).toString(),
      deadline: goal.deadline ? goal.deadline.split('T')[0] : ''
    });
    setIsAddModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount) return;

    const target = Number(formData.targetAmount);
    const saved = Number(formData.savedAmount) || 0;

    if (editingGoal) {
      if (updateSavingsGoal) {
        updateSavingsGoal(editingGoal.id, {
          name: formData.name,
          targetAmount: target,
          savedAmount: saved,
          deadline: formData.deadline
        });
      }
      const updated = mergedGoals.map(g => 
        g.id === editingGoal.id ? { ...g, name: formData.name, targetAmount: target, savedAmount: saved, deadline: formData.deadline } : g
      );
      persistGoals(updated);
    } else {
      const newGoalData = {
        name: formData.name,
        targetAmount: target,
        savedAmount: saved,
        deadline: formData.deadline || new Date().toISOString()
      };
      if (addSavingsGoal) {
        addSavingsGoal(newGoalData);
      }
      const newGoal: SavingsGoal = {
        ...newGoalData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      persistGoals([...mergedGoals, newGoal]);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteGoal = () => {
    if (!deleteGoalId) return;
    if (deleteSavingsGoal) {
      deleteSavingsGoal(deleteGoalId);
    }
    const updated = mergedGoals.filter(g => g.id !== deleteGoalId);
    persistGoals(updated);
    setDeleteGoalId(null);
  };

  const handleDeposit = (goal: SavingsGoal, addAmount: number) => {
    if (addAmount <= 0) return;
    const newSaved = Math.min(goal.targetAmount, (goal.savedAmount || 0) + addAmount);
    
    if (updateSavingsGoal) {
      updateSavingsGoal(goal.id, { savedAmount: newSaved });
    }
    const updated = mergedGoals.map(g => g.id === goal.id ? { ...g, savedAmount: newSaved } : g);
    persistGoals(updated);

    if (newSaved >= goal.targetAmount && (goal.savedAmount || 0) < goal.targetAmount) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4500);
    }
  };

  const handleCustomDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal || !customDepositAmount) return;
    handleDeposit(depositGoal, Number(customDepositAmount));
    setDepositGoal(null);
    setCustomDepositAmount('');
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
    >
      <div className="w-full space-y-6 sm:space-y-8 animate-[fade-in-up_0.4s_ease-out_forwards] pb-24 sm:pb-12 overflow-x-hidden">
        {showCelebration && (
          <Confetti 
            width={width} 
            height={height} 
            recycle={false} 
            numberOfPieces={400} 
            gravity={0.25} 
          />
        )}

        {/* Premium Hero Section */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-10 bg-[#0A0B10] border border-white/10 shadow-2xl group">
          {/* Background Mesh & Ambient Glow (Strictly z-0 behind content) */}
          <div className="decorative-element absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/25 via-[#0A0B10] to-[#0A0B10] opacity-80 pointer-events-none -z-10" />
          <div className="decorative-element absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
          <div className="decorative-element absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-500/5 blur-[120px] rounded-[100%] pointer-events-none -z-10" />
          
          {/* Background Decorative Currency Particles - Confined STRICTLY to right side (70%+), never intersecting text */}
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
              {/* Title / Icon Block */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.35)] border border-white/15 relative overflow-hidden group-hover:scale-105 transition-transform duration-500 shrink-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <Target className="text-white relative z-10 shrink-0" size={22} />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight whitespace-nowrap">
                  Goal Tracker
                </h1>
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
                    <CountUp prefix="₹" value={totalSaved} />
                  </div>
                </div>
              </div>

              {/* Badges / Chips Row with flex-wrap and aligned icons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 w-full">
                {[
                  { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", shadow: "hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]", label: `${activeGoals.length} Active Goals` },
                  { icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", shadow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]", label: `${completedGoals.length} Achieved` },
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
                    <CountUp value={overallProgress} />
                    <span className="text-xl sm:text-2xl font-bold text-white/50 ml-0.5">%</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-normal truncate max-w-[85%] px-1 font-tabular">
                    ₹{totalSaved.toLocaleString('en-IN')} / ₹{totalTarget.toLocaleString('en-IN')}
                  </div>
                  
                  {/* SVG Progress Circle */}
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none p-1" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="5.5" />
                    <motion.circle 
                      cx="50" cy="50" r="45" fill="transparent" 
                      stroke="url(#goal-progress-gradient)" strokeWidth="5.5" strokeLinecap="round"
                      strokeDasharray="282.743"
                      initial={{ strokeDashoffset: 282.743 }}
                      animate={{ strokeDashoffset: 282.743 - (282.743 * Math.min(100, overallProgress)) / 100 }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.5))" }}
                    />
                    <defs>
                      <linearGradient id="goal-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                  </svg>
               </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search goals..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full bg-[#0a0b10] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-white focus:border-indigo-500/50 text-sm outline-none placeholder:text-slate-500" 
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 shrink-0 w-full min-[420px]:w-auto justify-center">
              {[
                { id: 'all', label: `All (${mergedGoals.length})` },
                { id: 'active', label: `Active (${activeGoals.length})` },
                { id: 'completed', label: `Done (${completedGoals.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={cn(
                    "px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all flex-1 min-[420px]:flex-initial text-center",
                    filter === tab.id 
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Add Goal Button */}
            <button
              onClick={openAddModal}
              className="w-full min-[420px]:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-4 py-2.5 min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all shrink-0"
            >
              <Plus size={18} />
              <span>Add Goal</span>
            </button>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredGoals.map(goal => {
            const currentSaved = goal.savedAmount || 0;
            const progress = Math.min(100, Math.round((currentSaved / Math.max(1, goal.targetAmount)) * 100));
            const isFinished = currentSaved >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - currentSaved);

            return (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-[#0a0b10] border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden group transition-all duration-300",
                  isFinished 
                    ? "border-emerald-500/30 bg-gradient-to-br from-[#0a0b10] to-emerald-950/15" 
                    : "border-white/10 hover:border-white/20"
                )}
              >
                {/* Top Row: Title & Actions */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">
                        {goal.name}
                      </h3>
                      {isFinished ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <CheckCircle2 size={12} />
                          Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                          {progress}%
                        </span>
                      )}
                    </div>
                    {goal.deadline && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                        <Calendar size={13} className="text-slate-500 shrink-0" />
                        <span>Target date: {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions (Edit & Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(goal)}
                      aria-label="Edit goal"
                      className="w-9 h-9 min-h-[40px] min-w-[40px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteGoalId(goal.id)}
                      aria-label="Delete goal"
                      className="w-9 h-9 min-h-[40px] min-w-[40px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Amount Row */}
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between items-baseline text-xs sm:text-sm font-medium font-tabular">
                    <div>
                      <span className="text-white font-bold text-base sm:text-lg">
                        ₹{currentSaved.toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">saved</span>
                    </div>
                    <div className="text-right text-slate-400 text-xs">
                      Target: <span className="text-white font-semibold">₹{goal.targetAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-black/50 border border-white/5 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        isFinished 
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                          : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400 pt-0.5">
                    <span>
                      {isFinished ? '🎉 Goal achieved!' : `₹${remaining.toLocaleString('en-IN')} left to go`}
                    </span>
                    <span className="font-semibold font-tabular text-slate-300">
                      {progress}% achieved
                    </span>
                  </div>
                </div>

                {/* Quick Deposit Buttons Row */}
                {!isFinished && (
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Quick Save
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {[500, 1000, 5000].map(amount => (
                        <button
                          key={amount}
                          onClick={() => handleDeposit(goal, amount)}
                          className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white border border-white/5 transition-all flex items-center gap-1 font-tabular"
                        >
                          <Plus size={13} className="text-indigo-400" />
                          ₹{amount.toLocaleString('en-IN')}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setDepositGoal(goal);
                          setCustomDepositAmount('');
                        }}
                        className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-300 border border-indigo-500/20 transition-all flex items-center gap-1"
                      >
                        + Custom
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredGoals.length === 0 && (
          <div className="bg-[#0a0b10] border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
              <Target size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Goals Found</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">
              {searchQuery 
                ? "No goals matched your search query. Try another keyword or clear the filter." 
                : "Set your first financial goal to start saving for your dreams."}
            </p>
            <button
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 min-h-[44px] rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus size={18} />
              Create a Goal
            </button>
          </div>
        )}

        {/* Add / Edit Goal Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="bg-[#0f1117] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-black/20 shrink-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Target className="text-indigo-400" size={22} /> 
                    {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                  </h2>
                  <button 
                    onClick={() => setIsAddModalOpen(false)} 
                    aria-label="Close modal"
                    className="text-slate-400 hover:text-white transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={handleSaveGoal} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-slate-300 block mb-1.5">
                      Goal Name
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none min-h-[48px] text-sm sm:text-base" 
                      placeholder="e.g. Dream Vacation, New Car, Emergency Fund" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-slate-300 block mb-1.5">
                        Target Amount (₹)
                      </label>
                      <input 
                        type="number" 
                        required 
                        min="1"
                        value={formData.targetAmount} 
                        onChange={e => setFormData({ ...formData, targetAmount: e.target.value })} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-indigo-500/50 outline-none min-h-[48px] text-sm sm:text-base font-tabular" 
                        placeholder="50000" 
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-slate-300 block mb-1.5">
                        Initial Saved (₹)
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.savedAmount} 
                        onChange={e => setFormData({ ...formData, savedAmount: e.target.value })} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-indigo-500/50 outline-none min-h-[48px] text-sm sm:text-base font-tabular" 
                        placeholder="0" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-slate-300 block mb-1.5">
                      Target Deadline
                    </label>
                    <input 
                      type="date" 
                      value={formData.deadline} 
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none min-h-[48px] text-sm sm:text-base" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full min-h-[48px] py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-95 mt-2 text-sm sm:text-base"
                  >
                    {editingGoal ? 'Save Changes' : 'Create Goal'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Quick Deposit Modal */}
        <AnimatePresence>
          {depositGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="bg-[#0f1117] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Wallet className="text-indigo-400" size={20} />
                    Add Savings
                  </h3>
                  <button 
                    onClick={() => setDepositGoal(null)}
                    aria-label="Close"
                    className="text-slate-400 hover:text-white p-2 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-400">
                  Deposit towards <span className="text-white font-semibold">{depositGoal.name}</span>
                </p>

                <form onSubmit={handleCustomDepositSubmit} className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      type="number"
                      required
                      min="1"
                      autoFocus
                      placeholder="Enter amount"
                      value={customDepositAmount}
                      onChange={e => setCustomDepositAmount(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 min-h-[48px] text-white font-bold text-lg font-tabular focus:border-indigo-500/50 outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositGoal(null)}
                      className="flex-1 min-h-[44px] py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!customDepositAmount}
                      className="flex-1 min-h-[44px] py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition-colors"
                    >
                      Deposit
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {deleteGoalId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="bg-[#0f1117] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full text-center shadow-2xl"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                  <Trash2 size={28} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Delete Goal?</h3>
                <p className="text-xs sm:text-sm text-slate-400 mb-6">
                  Are you sure you want to remove this goal? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteGoalId(null)} 
                    className="flex-1 min-h-[44px] py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteGoal} 
                    className="flex-1 min-h-[44px] py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-rose-500/20 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DataStateGuard>
  );
}
