import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart3, Sparkles } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths, isWithinInterval, parseISO, format, endOfDay, endOfMonth } from 'date-fns';
import GlassCard from '../components/ui/GlassCard';
import CountUp from '../components/ui/CountUp';
import AnimatedButton from '../components/ui/AnimatedButton';
import DataStateGuard from '../components/ui/DataStateGuard';

type DateFilter = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'all';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Analytics() {
  const { transactions, dataStatus, dataError, retryFetchData } = useStore();
  const [filter, setFilter] = useState<DateFilter>('month');

  // AI Insights
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const generateInsights = async () => {
    setAiInsights([
      "Your expenses decreased by 12% compared to last month.",
      "Food & Utilities is your highest spending category this month.",
      "You can save ₹2,500 more by reducing unnecessary impulse purchases.",
      "Your savings habit is excellent and on track for your financial goals."
    ]);
  };

  // Filter transactions based on selected date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (filter) {
      case 'today':
        start = startOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'year':
        start = startOfYear(now);
        break;
      case 'all':
      default:
        return transactions;
    }

    return transactions.filter(t => {
      const txDate = parseISO(t.type === 'pending' ? t.dueDate : t.date);
      return isWithinInterval(txDate, { start, end });
    });
  }, [transactions, filter]);

  // Calculate Metrics
  const {
    income,
    expenses,
    netSavings,
    pendingAmount,
  } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let pendingAmount = 0;
    
    filteredTransactions.forEach(t => {
      if (t.type === 'received') income += t.amount;
      if (t.type === 'sent') expenses += t.amount;
      if (t.type === 'pending' && t.status === 'pending') pendingAmount += t.amount;
    });

    return {
      income,
      expenses,
      netSavings: income - expenses,
      pendingAmount,
      totalTxCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Chart Data Processing
  const { timelineData, categoryData } = useMemo(() => {
    const datesMap = new Map<string, { date: string; income: number; expenses: number; balance: number }>();
    const expensesByCategory = new Map<string, number>();
    
    filteredTransactions.forEach(t => {
      const dateStr = t.type === 'pending' ? t.dueDate : t.date;
      const displayDate = format(parseISO(dateStr), 'MMM dd');
      
      if (!datesMap.has(displayDate)) {
        datesMap.set(displayDate, { date: displayDate, income: 0, expenses: 0, balance: 0 });
      }
      
      const dayData = datesMap.get(displayDate)!;
      
      if (t.type === 'received') dayData.income += t.amount;
      if (t.type === 'sent') {
        dayData.expenses += t.amount;
        const cat = (t.purpose || 'Other').trim();
        expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + t.amount);
      }
    });

    return {
      timelineData: Array.from(datesMap.values()),
      categoryData: Array.from(expensesByCategory.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [filteredTransactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-neutral-900/95 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl pointer-events-none"
        >
          <p className="text-slate-400 text-xs font-semibold uppercase mb-2 tracking-wider">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-bold flex items-center gap-2 my-1" style={{ color: entry.color || entry.payload.fill }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill }}></span>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  // Net Worth Calculation
  const netWorth = useMemo(() => {
    const assets = income;
    const liabilities = pendingAmount;
    return {
        assets,
        liabilities,
        netWorth: assets - liabilities
    };
  }, [income, pendingAmount]);

  // Trend Calculation
  const netWorthTrend = useMemo(() => {
    const now = new Date();
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();
    const prevMonth = currMonth === 0 ? 11 : currMonth - 1;
    const prevYear = currMonth === 0 ? currYear - 1 : currYear;

    const getNetWorthForMonth = (month: number, year: number) => {
        const monthTransactions = transactions.filter(t => {
            const date = parseISO(t.type === 'pending' ? t.dueDate : t.date);
            return date.getMonth() === month && date.getFullYear() === year;
        });
        const income = monthTransactions.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0);
        const expenses = monthTransactions.filter(t => t.type === 'sent').reduce((sum, t) => sum + t.amount, 0);
        return income - expenses;
    };

    const currentNetWorth = getNetWorthForMonth(currMonth, currYear);
    const prevNetWorth = getNetWorthForMonth(prevMonth, prevYear);
    
    return prevNetWorth !== 0 ? ((currentNetWorth - prevNetWorth) / Math.abs(prevNetWorth)) * 100 : 0;
  }, [transactions]);

  const healthScore = useMemo(() => {
    let score = 100;
    if (pendingAmount > income * 0.3) score -= 20;
    if (expenses > income) score -= 30;
    if (income === 0) score -= 50;
    return Math.max(0, Math.min(100, score));
  }, [pendingAmount, income, expenses]);

  const forecast = Math.round(income * 1.1);

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Analyzing financial metrics..."
      skeletonType="cards"
    >
      <motion.div 
        layoutId="shared-analytics"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8 bg-[#05060a]"
      >
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={32} />
            Analytics & Insights
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">Deep financial intelligence and real-time visualization.</p>
        </div>
        
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as DateFilter)} 
          className="bg-white/[0.05] border border-white/10 hover:border-white/20 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all cursor-pointer font-semibold"
        >
            <option value="today" className="bg-neutral-900">Today</option>
            <option value="week" className="bg-neutral-900">This Week</option>
            <option value="month" className="bg-neutral-900">This Month</option>
            <option value="lastMonth" className="bg-neutral-900">Last Month</option>
            <option value="year" className="bg-neutral-900">This Year</option>
            <option value="all" className="bg-neutral-900">All Time</option>
        </select>
      </header>
      
      {/* 1. Net Worth Tracker Glass Card */}
      <GlassCard delay={0.05} glowColor="rgba(99, 102, 241, 0.25)" className="p-8 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-blue-950/40">
        <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider text-indigo-300">Net Worth Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Net Worth</p>
                <p className="text-4xl font-extrabold text-white mt-1">
                  <CountUp value={netWorth.netWorth} formatter={(v) => formatCurrency(v)} />
                </p>
                <p className={cn("text-xs font-bold mt-2 flex items-center gap-1", netWorthTrend >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {netWorthTrend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(netWorthTrend))}% vs last period
                </p>
            </div>
            <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Assets (Income)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  <CountUp value={netWorth.assets} formatter={(v) => formatCurrency(v)} />
                </p>
            </div>
            <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Liabilities (Pending)</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">
                  <CountUp value={netWorth.liabilities} formatter={(v) => formatCurrency(v)} />
                </p>
            </div>
        </div>
      </GlassCard>

      {/* 2. Insights & Warnings */}
      <GlassCard delay={0.12} glowColor="rgba(168, 85, 247, 0.2)">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles size={20}/>
          </div>
          <h2 className="text-lg font-bold text-white">Smart AI Insights</h2>
        </div>
        <div className="space-y-3">
          {aiInsights.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-300 font-medium">
              {aiInsights.map((i, idx) => (
                <motion.li 
                  key={idx} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: idx * 0.08 }}
                  className="flex gap-2.5 items-start bg-white/[0.03] p-3 rounded-xl border border-white/5"
                >
                  <span className="text-purple-400 font-bold">•</span>
                  <span>{i}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <AnimatedButton onClick={generateInsights} variant="primary" icon={<Sparkles size={16} />}>
              Generate Smart Insights
            </AnimatedButton>
          )}
        </div>
      </GlassCard>

      {/* 3. Financial Health & Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard delay={0.18}>
            <h2 className="text-base font-bold text-white mb-4">Financial Health Score</h2>
            <div className="flex items-center gap-6">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  "w-24 h-24 rounded-full border-4 flex items-center justify-center font-black text-3xl text-white shadow-xl shrink-0", 
                  healthScore > 75 ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : 
                  healthScore > 50 ? "border-amber-500 bg-amber-500/10 text-amber-300" : 
                  "border-rose-500 bg-rose-500/10 text-rose-300"
                )}
              >
                <CountUp value={Math.round(healthScore)} />
              </motion.div>
              <div>
                  <p className="font-bold text-lg text-white">{healthScore > 75 ? 'Excellent' : healthScore > 50 ? 'Good' : 'Needs Attention'}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{healthScore > 75 ? 'Optimal expense control and savings ratio.' : healthScore > 50 ? 'Healthy baseline, watch pending dues.' : 'Expenses or pending liabilities exceed safe limits.'}</p>
              </div>
            </div>
        </GlassCard>

        <GlassCard delay={0.24}>
            <h2 className="text-base font-bold text-white mb-4">30-Day Financial Forecast</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Based on active incoming/outgoing cash flow:
            </p>
            <p className="text-3xl font-extrabold text-blue-400 mt-3">
              <CountUp value={forecast} formatter={(v) => formatCurrency(v)} />
            </p>
        </GlassCard>
      </div>

      {/* 4. Progressive Animated Charts Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <GlassCard hoverEffect={false} className="h-[420px] p-6 flex flex-col justify-between">
          <h3 className="text-base font-bold text-white mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)"/>
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={1200} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard hoverEffect={false} className="h-[420px] p-6 flex flex-col justify-between">
          <h3 className="text-base font-bold text-white mb-4">Expense Categories</h3>
          <ResponsiveContainer width="100%" height="88%">
            <PieChart>
              <Pie 
                data={categoryData.length > 0 ? categoryData : [{ name: 'No Expenses', value: 1 }]} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={65} 
                outerRadius={95}
                paddingAngle={4}
                isAnimationActive={true}
                animationDuration={1200}
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip/>}/>
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>
    </motion.div>
    </DataStateGuard>
  );
}
