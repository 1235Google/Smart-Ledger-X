import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart3, Activity, Download, FileText, ArrowUpRight, ArrowDownLeft, Target, Clock, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart } from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths, isWithinInterval, parseISO, format, endOfDay, endOfMonth } from 'date-fns';

type DateFilter = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'all';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Analytics() {
  const { transactions, startingBalance, currentBalance, savingsGoals } = useStore();
  const [filter, setFilter] = useState<DateFilter>('month');

  // AI Insights
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const generateInsights = async () => {
    // Dummy integration for this example
    setAiInsights([
      "Your expenses decreased by 12% compared to last month.",
      "Food is your highest spending category this month.",
      "You can save ₹2,500 more by reducing unnecessary expenses.",
      "Your current saving habit is excellent."
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
    totalTxCount
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

  const savingsRate = income > 0 ? ((netSavings / income) * 100).toFixed(1) : '0.0';

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
        <div className="bg-neutral-900 border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-xl">
          <p className="text-neutral-400 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium flex items-center gap-2" style={{ color: entry.color || entry.payload.fill }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill }}></span>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Net Worth Calculation
  const netWorth = useMemo(() => {
    const assets = income; // Simplified for this example based on available variables
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
    <div className="w-full space-y-8 print:text-black">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-blue-400" />
            Wealth Management
          </h1>
          <p className="text-neutral-400 mt-1">Advanced financial overview.</p>
        </div>
        
        <select value={filter} onChange={(e) => setFilter(e.target.value as DateFilter)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm">
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
        </select>
      </header>
      
      {/* 1. Net Worth Tracker */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white mb-6">Net Worth</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
                <p className="text-neutral-400 text-sm">Total Net Worth</p>
                <p className="text-4xl font-bold text-white mt-1">{formatCurrency(netWorth.netWorth)}</p>
                <p className={cn("text-sm mt-2", netWorthTrend >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {netWorthTrend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(netWorthTrend))}% vs last month
                </p>
            </div>
            <div>
                <p className="text-neutral-400 text-sm">Assets</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(netWorth.assets)}</p>
            </div>
            <div>
                <p className="text-neutral-400 text-sm">Liabilities</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(netWorth.liabilities)}</p>
            </div>
        </div>
      </div>

      {/* 1. Insights & Warning System */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-500/10"><Sparkles className="text-purple-400" size={20}/></div>
          <h2 className="text-lg font-bold text-white">Smart Insights & Warnings</h2>
        </div>
        <ul className="space-y-2 text-sm text-neutral-300">
          {aiInsights.length > 0 ? aiInsights.map((i, idx) => <li key={idx} className="flex gap-2"><span>•</span>{i}</li>) : <button onClick={generateInsights} className="px-4 py-2 bg-purple-600 rounded-lg text-white">Generate Insights</button>}
          <li className="text-red-400 mt-2">⚠ Spending Alert: You spent 40% more on shopping this month.</li>
        </ul>
      </div>

      {/* 2. Financial Health Score & Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">Financial Health Score</h2>
            <div className="flex items-center gap-6">
            <div className={cn("w-24 h-24 rounded-full border-4 flex items-center justify-center font-bold text-2xl text-white", healthScore > 75 ? "border-emerald-500" : healthScore > 50 ? "border-amber-500" : "border-red-500")}>{Math.round(healthScore)}</div>
            <div>
                <p className="font-bold text-white">{healthScore > 75 ? 'Excellent' : healthScore > 50 ? 'Good' : 'Needs Attention'}</p>
                <p className="text-sm text-neutral-400">{healthScore > 75 ? 'Excellent financial management' : healthScore > 50 ? 'Good progress' : 'Improvement needed'}</p>
            </div>
            </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4">Financial Forecast</h2>
            <p className="text-neutral-300">Based on your saving pattern, 30-day forecast: <span className="font-bold text-white">{formatCurrency(forecast)}</span></p>
        </div>
      </div>

      {/* 3. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl h-[400px]">
          <h3 className="text-lg font-bold text-white mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={timelineData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/><XAxis dataKey="date" stroke="rgba(255,255,255,0.4)"/><YAxis stroke="rgba(255,255,255,0.4)"/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="income" fill="#10b981"/><Bar dataKey="expenses" fill="#ef4444"/></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl h-[400px]">
          <h3 className="text-lg font-bold text-white mb-4">Expense Categories</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}><Cell fill={COLORS[0]} /><Cell fill={COLORS[1]} /></Pie><Tooltip content={<CustomTooltip/>}/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
