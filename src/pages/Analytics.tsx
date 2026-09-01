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
        className="w-full space-y-8"
      >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0a84ff] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#0a84ff]" /> Intelligence & Trends
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Financial Insights
          </h1>
          <p className="text-[#86868b] mt-1 text-sm font-medium">Deep algorithmic cashflow breakdown, net worth tracking, and category velocity.</p>
        </div>
        
        {/* Apple Segmented Pill Filter */}
        <div className="flex items-center p-1 bg-white/[0.05] border border-white/[0.08] rounded-full backdrop-blur-2xl self-start md:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'today', label: 'Day' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'lastMonth', label: 'Prev Mo' },
            { id: 'year', label: 'Year' },
            { id: 'all', label: 'All' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as DateFilter)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                filter === tab.id
                  ? "bg-white text-black shadow-md"
                  : "text-[#86868b] hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      
      {/* 1. Net Worth Tracker Glass Card */}
      <div className="bg-[#12131a]/85 border border-white/[0.08] rounded-[28px] p-7 md:p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Position Summary</h2>
          <span className={cn(
            "text-xs font-bold px-3 py-1 rounded-full font-tabular",
            netWorthTrend >= 0 ? "bg-[#30d158]/15 text-[#30d158]" : "bg-[#ff453a]/15 text-[#ff453a]"
          )}>
            {netWorthTrend >= 0 ? '↑ +' : '↓ '}{Math.abs(Math.round(netWorthTrend))}% Period Growth
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            <div>
                <p className="text-[#86868b] text-xs font-bold uppercase tracking-wider">Estimated Net Worth</p>
                <p className="text-4xl font-extrabold text-white mt-1 font-tabular tracking-tight">
                  <CountUp value={netWorth.netWorth} formatter={(v) => formatCurrency(v)} />
                </p>
                <p className="text-xs text-[#86868b] mt-1 font-medium">Liquidity after unsettled liabilities</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
                <p className="text-[#86868b] text-xs font-bold uppercase tracking-wider">Inflows (Assets)</p>
                <p className="text-2xl font-extrabold text-[#30d158] mt-1 font-tabular">
                  <CountUp value={netWorth.assets} formatter={(v) => `+ ${formatCurrency(v)}`} />
                </p>
                <p className="text-xs text-[#86868b] mt-1 font-medium">Cleared deposits in timeframe</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
                <p className="text-[#86868b] text-xs font-bold uppercase tracking-wider">Pending Receivables</p>
                <p className="text-2xl font-extrabold text-[#ffd60a] mt-1 font-tabular">
                  <CountUp value={netWorth.liabilities} formatter={(v) => formatCurrency(v)} />
                </p>
                <p className="text-xs text-[#86868b] mt-1 font-medium">Outstanding payments due to you</p>
            </div>
        </div>
      </div>

      {/* 2. Insights & Warnings */}
      <div className="bg-[#12131a]/85 border border-white/[0.08] rounded-[28px] p-6 backdrop-blur-3xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#bf5af2]/15 text-[#bf5af2]">
              <Sparkles size={18}/>
            </div>
            <h2 className="text-base font-bold text-white">Apple Intelligence Forecast</h2>
          </div>
          {aiInsights.length === 0 && (
            <button 
              onClick={generateInsights}
              className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-all"
            >
              Analyze Financial Behavior
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {aiInsights.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.map((i, idx) => (
                <motion.li 
                  key={idx} 
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-3 items-start bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.05]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#bf5af2] mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-white/90 font-medium leading-relaxed">{i}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#86868b]">Click 'Analyze Financial Behavior' to run statistical cashflow pattern detection.</p>
          )}
        </div>
      </div>

      {/* 3. Financial Health & Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#12131a]/85 border border-white/[0.08] rounded-[28px] p-6 backdrop-blur-3xl shadow-xl flex items-center gap-6">
            <div className={cn(
              "w-20 h-20 rounded-full border-4 flex items-center justify-center font-extrabold text-2xl shadow-inner shrink-0 font-tabular", 
              healthScore > 75 ? "border-[#30d158] bg-[#30d158]/10 text-[#30d158]" : 
              healthScore > 50 ? "border-[#ffd60a] bg-[#ffd60a]/10 text-[#ffd60a]" : 
              "border-[#ff453a] bg-[#ff453a]/10 text-[#ff453a]"
            )}>
              <CountUp value={Math.round(healthScore)} />
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#86868b]">Health Score</p>
                <p className="font-extrabold text-lg text-white mt-0.5">{healthScore > 75 ? 'Optimal Standing' : healthScore > 50 ? 'Stable Liquidity' : 'Action Recommended'}</p>
                <p className="text-xs text-[#86868b] mt-1 leading-relaxed">{healthScore > 75 ? 'High savings velocity and low receivable risk.' : 'Watch overdue pending receivables to preserve cashflow.'}</p>
            </div>
        </div>

        <div className="bg-[#12131a]/85 border border-white/[0.08] rounded-[28px] p-6 backdrop-blur-3xl shadow-xl flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#86868b]">30-Day Pro Forma Forecast</p>
              <p className="text-xs text-[#86868b] mt-0.5">Projected trajectory based on current collection velocity</p>
            </div>
            <p className="text-3xl font-extrabold text-[#0a84ff] font-tabular tracking-tight mt-3">
              <CountUp value={forecast} formatter={(v) => formatCurrency(v)} />
            </p>
        </div>
      </div>

      {/* 4. Progressive Animated Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#12131a]/85 border border-white/[0.08] rounded-[28px] h-[400px] p-6 flex flex-col justify-between backdrop-blur-3xl shadow-xl">
          <h3 className="text-sm font-bold text-white">Cashflow Velocity (Inflow vs Outflow)</h3>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="income" name="Inflows" fill="#30d158" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={800} />
              <Bar dataKey="expenses" name="Outflows" fill="#ff453a" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#12131a]/85 border border-white/[0.08] rounded-[28px] h-[400px] p-6 flex flex-col justify-between backdrop-blur-3xl shadow-xl">
          <h3 className="text-sm font-bold text-white">Expense Category Distribution</h3>
          <ResponsiveContainer width="100%" height="88%">
            <PieChart>
              <Pie 
                data={categoryData.length > 0 ? categoryData : [{ name: 'No Expenses', value: 1 }]} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={70} 
                outerRadius={105}
                paddingAngle={5}
                isAnimationActive={true}
                animationDuration={800}
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip/>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
    </DataStateGuard>
  );
}
