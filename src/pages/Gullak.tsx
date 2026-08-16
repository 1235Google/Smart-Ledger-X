import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PiggyBank, Plus, List as ListIcon, BarChart3, Settings, Search as SearchIcon, 
  ArrowLeft, Download, Upload, Shield, Trash2, Edit2, Share2, Copy, Filter, 
  Calendar as CalendarIcon, Target, TrendingUp, Trophy, X, CheckCircle2,
  Medal, Coins, Banknote, Gem, Crown, Building, Diamond, Flame, FileText,
  Files, Layers, BookOpen, Archive, User, Users, Star, Zap, Award, Sparkles,
  Activity
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { format, parseISO, startOfMonth, endOfMonth, isSameMonth, isToday, isThisWeek, isThisYear, differenceInDays } from 'date-fns';
import { GullakEntry } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { calculateProgress, ACHIEVEMENTS, getCurrentLevel, getNextLevel } from '../lib/achievements';
import DataStateGuard from '../components/ui/DataStateGuard';
import CountUp from '../components/ui/CountUp';

const iconMap: Record<string, React.ReactNode> = {
  medal: <Medal size={24} />, coins: <Coins size={24} />, banknote: <Banknote size={24} />,
  gem: <Gem size={24} />, crown: <Crown size={24} />, building: <Building size={24} />,
  diamond: <Diamond size={24} />, flame: <Flame size={24} />, 'file-text': <FileText size={24} />,
  files: <Files size={24} />, copy: <Copy size={24} />, layers: <Layers size={24} />,
  'book-open': <BookOpen size={24} />, archive: <Archive size={24} />, user: <User size={24} />,
  users: <Users size={24} />, star: <Star size={24} />, target: <Target size={24} />,
  zap: <Zap size={24} />, award: <Award size={24} />, trophy: <Trophy size={24} />
};

export default function Gullak() {
  const { 
    gullakEntries, 
    gullakSettings, 
    addGullakEntry, 
    updateGullakEntry, 
    deleteGullakEntry, 
    updateGullakSettings, 
    unlockedAchievements, 
    newlyUnlocked, 
    clearNewlyUnlocked,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();
  const { width, height } = useWindowSize();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'analytics' | 'achievements' | 'settings'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GullakEntry | null>(null);
  
  const totalSavings = useMemo(() => (gullakEntries || []).reduce((acc, curr) => acc + curr.amount, 0), [gullakEntries]);
  
  const thisMonthSavings = useMemo(() => {
    const now = new Date();
    return (gullakEntries || []).filter(e => isSameMonth(new Date(e.date), now)).reduce((acc, curr) => acc + curr.amount, 0);
  }, [gullakEntries]);

  const lastMonthSavings = useMemo(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return (gullakEntries || []).filter(e => isSameMonth(new Date(e.date), lastMonth)).reduce((acc, curr) => acc + curr.amount, 0);
  }, [gullakEntries]);

  const todaySavings = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return (gullakEntries || []).filter(e => e.date === today).reduce((acc, curr) => acc + curr.amount, 0);
  }, [gullakEntries]);

  const highestDeposit = useMemo(() => {
    if (!gullakEntries || gullakEntries.length === 0) return 0;
    return Math.max(...gullakEntries.map(e => e.amount));
  }, [gullakEntries]);

  const averageDeposit = useMemo(() => {
    if (!gullakEntries || gullakEntries.length === 0) return 0;
    return Math.round(totalSavings / gullakEntries.length);
  }, [gullakEntries, totalSavings]);

  const goal = gullakSettings?.monthlyGoal || 1;
  const progress = Math.min((totalSavings / goal) * 100, 100);
  const remainingGoal = Math.max(goal - totalSavings, 0);

  const daysLeftInMonth = useMemo(() => {
    const now = new Date();
    return differenceInDays(endOfMonth(now), now);
  }, []);

  const savingsStreak = useMemo(() => {
    if (!gullakEntries || gullakEntries.length === 0) return 0;
    const uniqueDates = [...new Set(gullakEntries.map(e => e.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    const firstDate = new Date(uniqueDates[0]);
    firstDate.setHours(0,0,0,0);
    
    const diffDays = Math.ceil(Math.abs(currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)); 
    if (diffDays > 1) return 0;
    
    let checkDate = firstDate;
    for (const dateStr of uniqueDates) {
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      if (d.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [gullakEntries]);

  const [formData, setFormData] = useState({
    personName: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'), paymentMethod: 'Cash', category: 'Savings', note: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filteredEntries = useMemo(() => {
    let result = gullakEntries || [];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.personName.toLowerCase().includes(lower) || e.amount.toString().includes(lower) || 
        e.date.includes(lower) || (e.note || '').toLowerCase().includes(lower)
      );
    }
    const now = new Date();
    if (dateRange === 'today') result = result.filter(e => isToday(new Date(e.date)));
    else if (dateRange === 'week') result = result.filter(e => isThisWeek(new Date(e.date)));
    else if (dateRange === 'month') result = result.filter(e => isSameMonth(new Date(e.date), now));
    else if (dateRange === 'year') result = result.filter(e => isThisYear(new Date(e.date)));
    
    result = [...result].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;
      return 0;
    });
    return result;
  }, [gullakEntries, searchTerm, dateRange, sortBy]);

  const [chartPeriod, setChartPeriod] = useState('30days');
  const dynamicChartData = useMemo(() => {
    if (!gullakEntries || gullakEntries.length === 0) return [];
    let days = 30;
    if (chartPeriod === '7days') days = 7;
    else if (chartPeriod === '90days') days = 90;
    else if (chartPeriod === '1year') days = 365;

    const aggregated: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      aggregated[format(d, 'yyyy-MM-dd')] = 0;
    }

    gullakEntries.forEach(entry => {
      if (aggregated[entry.date] !== undefined) {
        aggregated[entry.date] += entry.amount;
      }
    });

    return Object.entries(aggregated).map(([date, amount]) => ({
      name: format(parseISO(date), days > 30 ? 'MMM' : 'dd MMM'),
      amount
    }));
  }, [gullakEntries, chartPeriod]);

  const categoryData = useMemo(() => {
    if (!gullakEntries || gullakEntries.length === 0) return [];
    const aggregated: Record<string, number> = {};
    gullakEntries.forEach(entry => {
      aggregated[entry.category] = (aggregated[entry.category] || 0) + entry.amount;
    });
    const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
    return Object.entries(aggregated).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [gullakEntries]);

  const personData = useMemo(() => {
    if (!gullakEntries || gullakEntries.length === 0) return [];
    const aggregated: Record<string, number> = {};
    gullakEntries.forEach(entry => {
      aggregated[entry.personName] = (aggregated[entry.personName] || 0) + entry.amount;
    });
    return Object.entries(aggregated)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); 
  }, [gullakEntries]);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    addGullakEntry({
      personName: formData.personName, amount: Number(formData.amount),
      date: formData.date, time: formData.time, paymentMethod: formData.paymentMethod,
      category: formData.category, note: formData.note
    });
    setFormData({ personName: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), paymentMethod: 'Cash', category: 'Savings', note: '' });
    setIsAddModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleEditEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    updateGullakEntry(editingEntry.id, {
      personName: formData.personName, amount: Number(formData.amount),
      date: formData.date, time: formData.time, paymentMethod: formData.paymentMethod,
      category: formData.category, note: formData.note
    });
    setEditingEntry(null);
    setIsEditModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const openEditModal = (entry: GullakEntry) => {
    setEditingEntry(entry);
    setFormData({ personName: entry.personName, amount: entry.amount.toString(), date: entry.date, time: entry.time, paymentMethod: entry.paymentMethod, category: entry.category, note: entry.note });
    setIsEditModalOpen(true);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (entryToDelete) { deleteGullakEntry(entryToDelete); setIsDeleteModalOpen(false); setEntryToDelete(null); }
  };

  const openDeleteModal = (id: string) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const currentProgress = useMemo(() => calculateProgress(gullakEntries || [], gullakSettings), [gullakEntries, gullakSettings]);
  const totalXp = useMemo(() => (unlockedAchievements || []).reduce((sum, u) => sum + u.xpEarned, 0), [unlockedAchievements]);
  
  const currentLevel = useMemo(() => getCurrentLevel(totalXp), [totalXp]);
  const nextLevel = useMemo(() => getNextLevel(totalXp), [totalXp]);
  
  const [achievementSearch, setAchievementSearch] = useState('');
  const [achievementFilter, setAchievementFilter] = useState('all');

  const filteredAchievements = useMemo(() => {
    let result = ACHIEVEMENTS;
    if (achievementSearch) {
      const lower = achievementSearch.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower));
    }
    if (achievementFilter !== 'all') {
      if (achievementFilter === 'unlocked') result = result.filter(a => (unlockedAchievements || []).some(u => u.id === a.id));
      else if (achievementFilter === 'locked') result = result.filter(a => !(unlockedAchievements || []).some(u => u.id === a.id));
      else result = result.filter(a => a.category.toLowerCase() === achievementFilter.toLowerCase());
    }
    return result;
  }, [achievementSearch, achievementFilter, unlockedAchievements]);

  useEffect(() => {
    if (newlyUnlocked) {
      const timer = setTimeout(() => clearNewlyUnlocked(), 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

  const handleDuplicate = (entry: GullakEntry) => {
    addGullakEntry({ personName: entry.personName, amount: entry.amount, date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), paymentMethod: entry.paymentMethod, category: entry.category, note: entry.note });
  };

  const savingsDiff = lastMonthSavings > 0 ? ((thisMonthSavings - lastMonthSavings) / lastMonthSavings) * 100 : 100;
  
  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading Gullak savings..."
      skeletonType="cards"
    >
      <div className="w-full space-y-8">
        {progress >= 100 && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.2} />}
      
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 bg-[#0A0B10] border border-white/5 shadow-2xl group">
        {/* Background Mesh & Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0A0B10] to-[#0A0B10] opacity-80" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-[100%] pointer-events-none" />
        
        {/* Subtle Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/5 font-serif text-2xl select-none"
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%", 
                opacity: 0,
                scale: 0.5,
                rotate: 0
              }}
              animate={{ 
                y: [null, Math.random() * -100 - 50],
                opacity: [0, 0.4, 0],
                scale: [0.5, 1, 0.5],
                rotate: 360
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10
              }}
            >
              ₹
            </motion.div>
          ))}
        </div>

        <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 pr-0 lg:pr-8">
          <div className="space-y-10 flex-1">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/10 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <PiggyBank className="text-white relative z-10" size={26} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Gullak Savings</h1>
            </div>
            
            <div className="relative">
              <p className="text-slate-400 font-medium tracking-[0.2em] text-[11px] uppercase mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Current Savings
              </p>
              <div className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 tracking-tight flex items-baseline gap-1 relative group cursor-default w-fit">
                <CountUp prefix="₹" value={totalSavings} />
                
                {/* Floating Coins on Hover */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-visible z-50">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-amber-400"
                      initial={{ opacity: 0, y: 10, x: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        y: [-10, -60],
                        x: [(i - 2) * 15, (i - 2) * 35],
                        rotate: [0, Math.random() * 360]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeOut"
                      }}
                      style={{
                        left: '50%',
                        top: '50%',
                        marginLeft: '-12px',
                        marginTop: '-12px',
                        filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.6))'
                      }}
                    >
                      <Coins size={24} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[
                { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", shadow: "hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]", label: `+₹${todaySavings.toLocaleString('en-IN')} Today` },
                { icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", shadow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]", label: `${savingsStreak} Day Streak` },
                { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", shadow: "hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]", label: "AI On Track" }
              ].map((badge, idx) => (
                <div key={idx} className={`flex items-center gap-2 ${badge.bg} border ${badge.border} px-4 py-2.5 rounded-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${badge.shadow} cursor-default`}>
                  <badge.icon size={16} className={badge.color} />
                  <span className={`${badge.color} text-[13px] font-semibold tracking-wide`}>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:w-[22rem] aspect-square max-w-[300px] mx-auto lg:mx-0 flex items-center justify-center shrink-0">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 rounded-full blur-[40px] animate-pulse group-hover:blur-[60px] transition-all duration-700" />
             <div className="relative w-[90%] h-[90%] bg-[#0f1117]/80 border border-white/10 rounded-full backdrop-blur-2xl flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] p-6 group-hover:scale-[1.02] transition-transform duration-500">
                <Target size={20} className="text-slate-400 mb-3 opacity-50" />
                <div className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Goal Progress</div>
                <div className="text-5xl font-black text-white mb-2 tracking-tighter flex items-baseline">
                  <CountUp value={progress} />
                  <span className="text-3xl font-bold text-white/50 ml-1">%</span>
                </div>
                <div className="text-[13px] text-slate-400 font-medium tracking-wide">
                  ₹{totalSavings.toLocaleString('en-IN')} / ₹{goal.toLocaleString('en-IN')}
                </div>
                
                {/* SVG Progress Circle */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  <motion.circle 
                    cx="50" cy="50" r="46" fill="transparent" 
                    stroke="url(#progress-gradient)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray="289.0265"
                    initial={{ strokeDashoffset: 289.0265 }}
                    animate={{ strokeDashoffset: 289.0265 - (289.0265 * progress) / 100 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.5))" }}
                  />
                  <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
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

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar items-center w-full border-b border-white/10">
        {[
          { id: 'dashboard', icon: Target, label: 'Overview' },
          { id: 'list', icon: ListIcon, label: 'Entries' },
          { id: 'analytics', icon: BarChart3, label: 'Analytics' },
          { id: 'achievements', icon: Trophy, label: 'Achievements' },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-t-xl whitespace-nowrap transition-all font-semibold ${
              activeTab === tab.id 
                ? 'bg-white/10 text-white border-b-2 border-indigo-500' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
        
        <div className="ml-auto pl-4">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          >
            <Plus size={18} />
            New Saving
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            
            {/* AI Insights & Goal Card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-[#0f1117] to-indigo-950/20 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Smart AI Insights</h3>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                    <div className="text-2xl pt-1">📈</div>
                    <div>
                      <p className="text-white font-medium">You are saving {Math.abs(savingsDiff).toFixed(0)}% {savingsDiff >= 0 ? 'more' : 'less'} than last month.</p>
                      <p className="text-sm text-slate-400 mt-1">Consistent deposits are helping you build wealth faster.</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                    <div className="text-2xl pt-1">💡</div>
                    <div>
                      <p className="text-white font-medium">Save ₹{Math.ceil(remainingGoal / Math.max(1, daysLeftInMonth)).toLocaleString('en-IN')} daily</p>
                      <p className="text-sm text-slate-400 mt-1">To comfortably hit your ₹{goal.toLocaleString('en-IN')} goal this month.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#0f1117] to-purple-950/20 border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Monthly Goal</h3>
                    <p className="text-slate-400 text-sm">Target: ₹{goal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">{progress.toFixed(0)}%</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2 text-white font-medium">
                    <span>₹{thisMonthSavings.toLocaleString('en-IN')} Saved</span>
                    <span>₹{remainingGoal.toLocaleString('en-IN')} Left</span>
                  </div>
                  <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="text-slate-400">
                    <span className="text-white font-medium">{daysLeftInMonth}</span> Days Remaining
                  </div>
                  <div className="text-slate-400">
                    Est. Completion: <span className="text-white font-medium">{daysLeftInMonth < 15 ? 'Soon' : 'On Track'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Saved', value: `₹${totalSavings.toLocaleString('en-IN')}`, icon: PiggyBank, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: "Today", value: `₹${todaySavings.toLocaleString('en-IN')}`, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Highest Deposit', value: `₹${highestDeposit.toLocaleString('en-IN')}`, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Avg Deposit', value: `₹${averageDeposit.toLocaleString('en-IN')}`, icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' }
              ].map((stat, i) => (
                <div key={i} className="bg-[#0f1117] border border-white/5 rounded-2xl p-5 hover:bg-white/5 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} mb-4 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={stat.color} size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-white tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-[#0f1117] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Savings Activity</h3>
                  <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                    {['7days', '30days', '90days'].map(period => (
                      <button 
                        key={period} 
                        onClick={() => setChartPeriod(period)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${chartPeriod === period ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        {period.replace('days', 'D')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicChartData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 17, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Savings Timeline */}
              <div className="bg-[#0f1117] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Recent Savings</h3>
                  <button onClick={() => setActiveTab('list')} className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors">View All</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  {filteredEntries.slice(0, 5).map((entry, i) => (
                    <div key={entry.id} className="relative flex gap-4 group">
                      {i !== filteredEntries.slice(0, 5).length - 1 && (
                        <div className="absolute left-[19px] top-[40px] bottom-[-24px] w-[2px] bg-white/5 group-hover:bg-indigo-500/30 transition-colors" />
                      )}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0 z-10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
                        <PiggyBank size={18} />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-white text-base">₹{entry.amount.toLocaleString('en-IN')}</p>
                          <span className="text-xs font-medium text-slate-500">{isToday(new Date(entry.date)) ? 'Today' : format(parseISO(entry.date), 'dd MMM')}</span>
                        </div>
                        <p className="text-sm text-slate-400">{entry.personName}</p>
                      </div>
                    </div>
                  ))}
                  {filteredEntries.length === 0 && (
                    <div className="text-center py-10 text-slate-500">No savings yet.</div>
                  )}
                </div>
              </div>
            </div>
            
          </motion.div>
        )}

        {/* Other tabs follow the original style but upgraded slightly */}
        {activeTab === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
               <div className="relative w-full sm:w-96">
                 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input type="text" placeholder="Search entries..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0a0b10] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-indigo-500/50" />
               </div>
               <div className="flex gap-2 w-full sm:w-auto">
                 <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-[#0a0b10] border border-white/10 rounded-xl px-4 py-2.5 text-white">
                   <option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="year">This Year</option>
                 </select>
                 <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#0a0b10] border border-white/10 rounded-xl px-4 py-2.5 text-white">
                   <option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="highest">Highest Amount</option><option value="lowest">Lowest Amount</option>
                 </select>
               </div>
            </div>
            <div className="bg-[#0a0b10] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-black/20 text-slate-400 text-sm">
                      <th className="p-4 font-medium">Date & Time</th><th className="p-4 font-medium">Added By</th>
                      <th className="p-4 font-medium text-right">Amount</th><th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium">Method</th><th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4"><div className="text-white font-medium">{format(parseISO(entry.date), 'dd MMM yyyy')}</div><div className="text-slate-500 text-xs">{entry.time}</div></td>
                        <td className="p-4 text-white">{entry.personName}</td>
                        <td className="p-4 text-right font-bold text-emerald-400">₹{entry.amount.toLocaleString('en-IN')}</td>
                        <td className="p-4"><span className="px-2.5 py-1 bg-white/5 rounded-md text-slate-300 text-xs">{entry.category}</span></td>
                        <td className="p-4 text-slate-400 text-sm">{entry.paymentMethod}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDuplicate(entry)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10"><Copy size={16} /></button>
                            <button onClick={() => openEditModal(entry)} className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-md hover:bg-white/10"><Edit2 size={16} /></button>
                            <button onClick={() => openDeleteModal(entry.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-white/10"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                       <tr><td colSpan={6} className="p-10 text-center text-slate-500">No entries found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tab (Simplified for space, matching premium look) */}
        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0f1117] border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6">Savings by Category</h3>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie><RechartsTooltip formatter={(val: number) => `₹${val}`} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px' }} /></PieChart></ResponsiveContainer></div>
              </div>
              <div className="bg-[#0f1117] border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6">Top Contributors</h3>
                <div className="space-y-4">
                  {categoryData.length === 0 ? <p className="text-slate-500">No data available.</p> : personData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">{p.name.charAt(0)}</div><span className="text-white">{p.name}</span></div>
                      <span className="font-bold text-white">₹{p.total.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <motion.div key="achievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="bg-gradient-to-br from-amber-500/10 to-[#0f1117] border border-amber-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-center">
              <Trophy size={48} className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Level {currentLevel.level}: {currentLevel.title}</h2>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">Earn XP by saving regularly and unlocking achievements. Level up to become a Savings Master!</p>
              <div className="max-w-xl mx-auto bg-black/40 rounded-full h-4 border border-white/10 overflow-hidden relative">
                 <motion.div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500 to-yellow-400"
                    initial={{ width: 0 }} animate={{ width: `${((totalXp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100}%` }}
                 />
              </div>
              <p className="text-sm font-semibold text-amber-400 mt-3">{totalXp} / {nextLevel.minXp} XP</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements.map(a => {
                const isUnlocked = unlockedAchievements?.find(u => u.id === a.id);
                return (
                  <div key={a.id} className={`p-6 rounded-3xl border transition-all ${isUnlocked ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30' : 'bg-[#0f1117] border-white/5 opacity-70 grayscale'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isUnlocked ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                         {iconMap[a.icon] || <Trophy size={20} />}
                      </div>
                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${isUnlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-500'}`}>+{a.xpReward} XP</div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{a.name}</h3>
                    <p className="text-sm text-slate-400">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl">
             <div className="bg-[#0f1117] border border-white/5 rounded-3xl p-8 shadow-xl">
               <h3 className="text-xl font-bold text-white mb-6">Savings Goal Configuration</h3>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-400 mb-2">Monthly Target Amount (₹)</label>
                   <input 
                     type="number" 
                     value={gullakSettings?.monthlyGoal || 5000} 
                     onChange={(e) => updateGullakSettings({ monthlyGoal: Number(e.target.value) })}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none text-lg"
                   />
                 </div>
                 <p className="text-sm text-slate-500 leading-relaxed">This goal helps track your monthly savings progress. We recommend saving at least 20% of your income.</p>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0f1117] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PiggyBank className="text-indigo-400" /> 
                  {isEditModalOpen ? 'Edit Saving' : 'Add to Gullak'}
                </h2>
                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={isEditModalOpen ? handleEditEntry : handleAddEntry} className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Amount (₹)</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:border-indigo-500/50 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Added By</label>
                  <input type="text" required value={formData.personName} onChange={e => setFormData({...formData, personName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none" placeholder="e.g. Rahul" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-1.5">Date</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-1.5">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none">
                      {['Savings', 'Emergency', 'Investment', 'Goal', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] mt-2">
                  {isEditModalOpen ? 'Save Changes' : 'Add to Piggy Bank'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0f1117] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Entry?</h3>
              <p className="text-slate-400 mb-6">This action cannot be undone. Are you sure you want to remove this saving entry?</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-500/20">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
    </DataStateGuard>
  );
}
