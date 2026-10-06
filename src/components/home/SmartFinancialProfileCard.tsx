import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { 
  PiggyBank, TrendingUp, TrendingDown, Award, 
  Activity, CheckCircle2, ShieldCheck, RefreshCw, 
  ChevronRight, Calendar, AlertCircle, Sparkles, User, HelpCircle, ArrowRight
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { calculateGullakBalance } from '../../lib/gullakAccounting';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface CalculatedFinancialProfile {
  userId: string;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  gullakBalance: number;
  totalTransactions: number;
  monthlyAverageExpense: number;
  savingRate: number;
  financialHealthScore: number;
  spendingStyle: 'Frugal' | 'Balanced' | 'Spender' | 'Ultra-Saver';
  lastUpdated: string;
}

export default function SmartFinancialProfileCard() {
  const { 
    transactions, 
    gullakEntries, 
    savingsGoals, 
    user, 
    userProfile 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'metrics'>('summary');
  const [isSyncing, setIsSyncing] = useState(false);

  // Core calculations based on real user activity
  const profileData = useMemo(() => {
    const uid = user?.uid || 'anonymous';
    
    // 1. Income calculations
    const receivedTxs = (transactions || []).filter(t => t.type === 'received');
    const totalIncome = receivedTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    // Group income by month
    const incomeByMonth: { [key: string]: number } = {};
    receivedTxs.forEach(t => {
      const date = t.date || new Date().toISOString();
      const monthKey = date.substring(0, 7); // YYYY-MM
      incomeByMonth[monthKey] = (incomeByMonth[monthKey] || 0) + (Number(t.amount) || 0);
    });
    
    const incomeMonths = Object.keys(incomeByMonth);
    const avgMonthlyIncome = incomeMonths.length > 0 
      ? totalIncome / incomeMonths.length 
      : totalIncome;

    // 2. Expenses calculations
    const sentTxs = (transactions || []).filter(t => t.type === 'sent');
    const totalExpenses = sentTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    // Group expense by month
    const expenseByMonth: { [key: string]: number } = {};
    const categoryTotals: { [key: string]: number } = {};
    
    sentTxs.forEach(t => {
      const date = t.date || new Date().toISOString();
      const monthKey = date.substring(0, 7);
      expenseByMonth[monthKey] = (expenseByMonth[monthKey] || 0) + (Number(t.amount) || 0);
      
      const cat = t.purpose || 'General';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t.amount) || 0);
    });
    
    const expenseMonths = Object.keys(expenseByMonth);
    const avgMonthlyExpense = expenseMonths.length > 0 
      ? totalExpenses / expenseMonths.length 
      : totalExpenses;
      
    let topSpendingCategory = 'None';
    let maxSpent = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > maxSpent) {
        maxSpent = amt;
        topSpendingCategory = cat;
      }
    });

    // 3. Gullak Savings & Balance
    const gullakBalance = calculateGullakBalance(gullakEntries || []);
    
    // Total savings (Gullak + Savings Goals Saved)
    const goalsSaved = (savingsGoals || []).reduce((sum, g) => sum + (Number(g.savedAmount) || 0), 0);
    const totalSavings = gullakBalance + goalsSaved;

    // Savings growth rate (ratio of savings to income)
    const savingRate = totalIncome > 0 
      ? Math.round((totalSavings / totalIncome) * 100) 
      : totalSavings > 0 ? 50 : 0;

    // 4. Transactions summary
    const totalTxCount = (transactions || []).length;
    const completedTx = (transactions || []).filter(t => t.type === 'received' || t.type === 'sent');
    const avgTxAmount = completedTx.length > 0
      ? completedTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) / completedTx.length
      : 0;
      
    let lastTxDate = 'None';
    if (transactions && transactions.length > 0) {
      const sortedTxs = [...transactions].sort((a, b) => {
        const dateA = a.type === 'pending' ? a.dueDate : a.date;
        const dateB = b.type === 'pending' ? b.dueDate : b.date;
        return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
      });
      const newest = sortedTxs[0];
      const d = newest.type === 'pending' ? newest.dueDate : newest.date;
      if (d) {
        lastTxDate = new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    // 5. Budgets Usage
    // We compute budget usage based on 50/30/20 rule: 50% of monthly average income is the ideal threshold for expenses.
    const budgetThreshold = avgMonthlyIncome > 0 ? avgMonthlyIncome * 0.7 : 50000;
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    const currentMonthExpenses = expenseByMonth[currentMonthKey] || 0;
    const budgetUsagePercent = budgetThreshold > 0 
      ? Math.round((currentMonthExpenses / budgetThreshold) * 100) 
      : 0;

    // 6. Goals completion
    const totalGoalsCount = (savingsGoals || []).length;
    const completedGoalsCount = (savingsGoals || []).filter(g => g.savedAmount >= g.targetAmount).length;
    const activeGoalsCount = totalGoalsCount - completedGoalsCount;
    const avgGoalProgress = totalGoalsCount > 0
      ? Math.round(((savingsGoals || []).reduce((sum, g) => sum + Math.min(100, (g.savedAmount / (g.targetAmount || 1)) * 100), 0)) / totalGoalsCount)
      : 0;

    // Spending style determination
    let spendingStyle: CalculatedFinancialProfile['spendingStyle'] = 'Balanced';
    if (savingRate >= 40) {
      spendingStyle = 'Ultra-Saver';
    } else if (savingRate >= 20) {
      spendingStyle = 'Frugal';
    } else if (savingRate < 10 && totalExpenses > 0) {
      spendingStyle = 'Spender';
    }

    // FINANCIAL HEALTH SCORE: 0-100 Calculation
    // - Savings Rate score: 30 pts (perfect if rate >= 30%)
    const savingsScore = Math.min(30, Math.round((savingRate / 30) * 30));
    
    // - Expense Control score: 30 pts (perfect if expenses are under 70% of income)
    const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : totalExpenses > 0 ? 1 : 0;
    const expenseControlScore = Math.max(0, Math.min(30, Math.round((1 - expenseRatio) * 30)));
    
    // - Budget Discipline score: 15 pts (perfect if current month spending is below threshold)
    const budgetDisciplineScore = budgetUsagePercent <= 100 ? 15 : Math.max(0, Math.round((1.5 - (budgetUsagePercent / 100)) * 15));
    
    // - Transaction Consistency: 10 pts (based on having recent active usage)
    const consistencyScore = Math.min(10, totalTxCount >= 10 ? 10 : totalTxCount * 1);
    
    // - Goal Progress score: 15 pts
    const goalProgressScore = totalGoalsCount > 0 
      ? Math.round((avgGoalProgress / 100) * 15) 
      : 10; // default 10 points if no goals exist

    const financialHealthScore = Math.max(10, Math.min(100, savingsScore + expenseControlScore + budgetDisciplineScore + consistencyScore + goalProgressScore));

    // Status Activity
    const isActive = totalTxCount > 0 || gullakEntries?.length > 0;

    const profile: CalculatedFinancialProfile = {
      userId: uid,
      totalIncome,
      totalExpenses,
      totalSavings,
      gullakBalance,
      totalTransactions: totalTxCount,
      monthlyAverageExpense: Math.round(avgMonthlyExpense),
      savingRate,
      financialHealthScore,
      spendingStyle,
      lastUpdated: new Date().toISOString()
    };

    return {
      profile,
      topSpendingCategory,
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      currentMonthExpenses,
      budgetThreshold,
      budgetUsagePercent,
      completedGoalsCount,
      activeGoalsCount,
      avgGoalProgress,
      avgTxAmount,
      lastTxDate,
      isActive
    };
  }, [transactions, gullakEntries, savingsGoals, user, userProfile]);

  // Firestore dual-sync
  useEffect(() => {
    if (!user?.uid) return;
    
    let isMounted = true;
    const syncProfileData = async () => {
      setIsSyncing(true);
      try {
        const uid = user.uid;
        
        // 1. Store as subcollection document users/{uid}/financialProfile/summary
        const subdocRef = doc(db, 'users', uid, 'financialProfile', 'summary');
        await setDoc(subdocRef, profileData.profile, { merge: true });
        
        // 2. Also dual-write directly inside the root users/{uid} profile payload for max security
        const rootRef = doc(db, 'users', uid);
        await setDoc(rootRef, {
          financialProfile: profileData.profile
        }, { merge: true });

        console.log('[FinancialProfile] Successfully synced to Firestore users/{uid}/financialProfile');
      } catch (err) {
        console.warn('[FinancialProfile] Failed to sync document (sandbox mode limit):', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    // Sync after a slight debounce to avoid high-volume Firestore writes
    const delayDebounce = setTimeout(() => {
      syncProfileData();
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [profileData.profile, user?.uid]);

  const getHealthLevel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 70) return { label: 'Healthy', color: 'text-[#30d158]', bg: 'bg-[#30d158]/10 border-[#30d158]/20' };
    if (score >= 40) return { label: 'Needs Improvement', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { label: 'Attention Required', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
  };

  const health = getHealthLevel(profileData.profile.financialHealthScore);
  const displayName = userProfile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'Vikas Dash';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[28px] vision-glass border border-white/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.4)] transition-all group duration-300"
    >
      {/* Background radial glow */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />
      <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all" />

      {/* Header Bar */}
      <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
            {user?.photoURL || userProfile?.profilePhoto ? (
              <img 
                src={user?.photoURL || userProfile?.profilePhoto || ''} 
                alt={displayName} 
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <User size={18} className="text-slate-300" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white leading-none tracking-tight">{displayName}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158] animate-pulse" />
              <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                {profileData.isActive ? 'Financially Active' : 'Passive Stance'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing && (
            <RefreshCw size={12} className="text-slate-500 animate-spin" />
          )}
          <span className="text-[10px] text-slate-500 font-mono">Real-Time Sync</span>
        </div>
      </div>

      {/* Segmented Controller (Navigation tab inside bento card) */}
      <div className="px-6 pt-4">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/[0.04]">
          {(['summary', 'details', 'metrics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all",
                activeTab === tab 
                  ? "bg-[#0a84ff] text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Primary Metrics Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Total Money Managed</span>
                  <span className="text-xl font-extrabold text-white font-mono block mt-1.5">
                    {formatCurrency(profileData.profile.totalIncome + profileData.profile.totalExpenses)}
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Savings Balance</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono block mt-1.5">
                    {formatCurrency(profileData.profile.totalSavings)}
                  </span>
                </div>
              </div>

              {/* Second Metrics Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Monthly Spending</span>
                  <span className="text-xl font-extrabold text-rose-400 font-mono block mt-1.5">
                    {formatCurrency(profileData.currentMonthExpenses)}
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Financial Health</span>
                    <span className="text-xl font-extrabold text-indigo-300 font-mono block mt-1.5">
                      {profileData.profile.financialHealthScore}<span className="text-xs text-slate-500">/100</span>
                    </span>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-[8px] font-extrabold border inline-block uppercase mt-1 leading-normal w-fit', health.bg, health.color)}>
                    {health.label}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-3.5 text-xs text-slate-300"
            >
              <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
                  <TrendingUp size={13} className="text-emerald-400" /> Total Inflow / Income
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(profileData.profile.totalIncome)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
                  <TrendingDown size={13} className="text-rose-400" /> Total Outflow / Expenses
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(profileData.profile.totalExpenses)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
                  <PiggyBank size={13} className="text-[#bf5af2]" /> Gullak Balance
                </span>
                <span className="font-mono font-bold text-[#bf5af2]">{formatCurrency(profileData.profile.gullakBalance)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
                  <Activity size={13} className="text-cyan-400" /> Transaction Intensity
                </span>
                <span className="font-mono font-bold text-white">{profileData.profile.totalTransactions} Tx logs</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Goals Progress
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {profileData.completedGoalsCount} / {profileData.activeGoalsCount + profileData.completedGoalsCount} Met ({profileData.avgGoalProgress}%)
                </span>
              </div>
            </motion.div>
          )}

          {activeTab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Financial Health Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-extrabold uppercase tracking-wider">Health Rating index</span>
                  <span className={cn('font-bold', health.color)}>{profileData.profile.financialHealthScore}% ({health.label})</span>
                </div>
                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.06] p-[1px]">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      profileData.profile.financialHealthScore >= 90 ? "bg-gradient-to-r from-emerald-500 to-[#30d158]" :
                      profileData.profile.financialHealthScore >= 70 ? "bg-[#30d158]" :
                      profileData.profile.financialHealthScore >= 40 ? "bg-amber-400" : "bg-rose-500"
                    )}
                    style={{ width: `${profileData.profile.financialHealthScore}%` }}
                  />
                </div>
              </div>

              {/* Analysis Pills */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-semibold">Saving Velocity</span>
                  <strong className="text-white mt-1 block font-bold font-mono">{profileData.profile.savingRate}% of Inflow</strong>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-semibold">Spending Style</span>
                  <strong className="text-white mt-1 block font-bold font-mono">{profileData.profile.spendingStyle}</strong>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl col-span-2">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-semibold">Top Outflow Sink</span>
                  <strong className="text-rose-400 mt-1 block font-bold font-mono truncate">{profileData.topSpendingCategory}</strong>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Footer Navigation Action */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between text-xs font-bold">
        <span className="text-slate-500">Last calculated: {profileData.lastTxDate}</span>
        <button 
          onClick={() => {
            const selector = document.getElementById('section-analytics');
            if (selector) selector.scrollIntoView({ behavior: 'smooth' });
          }}
          className="text-[#0a84ff] hover:text-white flex items-center gap-1 hover:underline transition-colors cursor-pointer"
        >
          <span>Explore Analytics</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}
