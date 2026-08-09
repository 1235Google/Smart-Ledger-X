import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { Clock, Calendar, ArrowUpRight, ArrowDownLeft, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { endOfDay, startOfDay, format } from 'date-fns';

export default function TimelineReplay() {
  const { 
    startingBalance, 
    transactions, 
    generalSettings 
  } = useStore();
  
  const [selectedDate, setSelectedDate] = useState<string>('');

  const { historicalBalance, totalReceived, totalSent, totalPending, pendingCount, filteredTransactions, chartData } = useMemo(() => {
    if (!selectedDate) {
      return { historicalBalance: 0, totalReceived: 0, totalSent: 0, totalPending: 0, pendingCount: 0, filteredTransactions: [], chartData: [] };
    }

    const selectedTime = new Date(selectedDate).getTime();
    
    // Filter transactions up to the selected date
    const historicalTxs = transactions.filter(tx => {
      const txDate = tx.type === 'pending' ? (tx as any).dueDate : (tx as any).date;
      if (!txDate) return false;
      const tTime = new Date(txDate).getTime();
      return tTime <= selectedTime;
    });

    let r = 0;
    let s = 0;
    let p = 0;
    let pc = 0;

    historicalTxs.forEach(tx => {
      if (tx.type === 'received') r += tx.amount;
      else if (tx.type === 'sent') s += tx.amount;
      else if (tx.type === 'pending') {
        p += tx.amount;
        pc += 1;
      }
    });

    const bal = startingBalance + r - s;

    // Generate chart data for the 30 days leading up to selectedDate
    const chartData = [];
    let runningBal = startingBalance;
    
    // Sort all historical txs chronologically
    const sortedTxs = [...historicalTxs].sort((a, b) => {
      const d1 = new Date(a.type === 'pending' ? (a as any).dueDate : (a as any).date).getTime();
      const d2 = new Date(b.type === 'pending' ? (b as any).dueDate : (b as any).date).getTime();
      return d1 - d2;
    });

    // Group by date string
    const txByDate: Record<string, number> = {};
    sortedTxs.forEach(tx => {
      if (tx.type === 'pending') return;
      const dStr = (tx as any).date.split('T')[0];
      if (!txByDate[dStr]) txByDate[dStr] = 0;
      if (tx.type === 'received') txByDate[dStr] += tx.amount;
      if (tx.type === 'sent') txByDate[dStr] -= tx.amount;
    });

    // We'll generate data from the first transaction or 30 days ago, whichever is earlier, up to selectedDate
    const endDate = new Date(selectedDate);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 30);
    
    // Fast forward running balance to startDate
    let tempBal = startingBalance;
    const sortedDates = Object.keys(txByDate).sort();
    sortedDates.forEach(d => {
      if (new Date(d) < startDate) {
        tempBal += txByDate[d];
      }
    });

    runningBal = tempBal;

    for (let i = 0; i <= 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      if (txByDate[dStr]) {
        runningBal += txByDate[dStr];
      }
      chartData.push({
        date: format(d, 'MMM dd'),
        balance: runningBal
      });
    }

    return {
      historicalBalance: bal,
      totalReceived: r,
      totalSent: s,
      totalPending: p,
      pendingCount: pc,
      filteredTransactions: sortedTxs.reverse(), // most recent first
      chartData
    };
  }, [selectedDate, transactions, startingBalance]);

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div className="w-full space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-[800] tracking-[-0.03em] text-white mb-2">Timeline Replay</h1>
        <p className="text-[#8e96a4] mt-2">View your financial history exactly as it appeared on any date.</p>
      </header>

      {/* Date Picker Section */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <label className="block text-sm font-medium text-slate-300 mb-2">Choose any previous date to recreate your financial dashboard.</label>
        <div className="flex items-center gap-4 max-w-sm">
          <div className="relative flex-1">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={handleDateSelect}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedDate ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <Clock size={48} className="text-blue-400 opacity-80" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Select a date to begin</h2>
            <p className="text-slate-400 max-w-md">Travel back in time and view your complete financial snapshot from any day in the past.</p>
          </motion.div>
        ) : filteredTransactions.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl"
          >
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
              <Calendar size={48} className="text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No financial records exist for this date.</h2>
            <button 
              onClick={() => setSelectedDate('')}
              className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm font-medium"
            >
              Choose Another Date
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 bg-amber-500/10 text-amber-400 px-4 py-3 rounded-xl border border-amber-500/20">
              <ShieldAlert size={20} />
              <p className="text-sm font-medium">Viewing Historical Snapshot. This mode is completely read-only.</p>
            </div>

            {/* Premium Balance Card Snapshot */}
            <div className="relative bg-gradient-to-br from-[#0B1026] via-[#1a1b4b] to-[#2D4DFF] p-8 rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_40px_-15px_rgba(45,77,255,0.4)] backdrop-blur-xl">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/30 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none"></div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute top-8 right-8 w-32 h-32 rounded-full bg-gradient-to-tr from-white/10 to-white/30 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(255,255,255,0.1),inset_0_4px_16px_rgba(255,255,255,0.2)] flex items-center justify-center opacity-80 pointer-events-none"
              >
                <svg className="w-16 h-16 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.97 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.61-2.4 1.61 0 .93.61 1.47 2.69 1.95 2.62.61 4.16 1.71 4.16 4.11 0 1.91-1.35 3.09-3.13 3.48z"/></svg>
              </motion.div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-white/60 text-[11px] font-semibold mb-1 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
                    Available Balance
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-5xl md:text-6xl font-[800] tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent mb-6"
                  >
                    {formatCurrency(historicalBalance)}
                  </motion.div>
                  <div className="flex gap-4">
                    <div className="bg-white/[0.03] backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Starting Balance</p>
                      <p className="text-lg font-bold text-white/90">{formatCurrency(startingBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                  <ArrowDownLeft size={48} className="text-green-500" />
                </div>
                <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Received (Snapshot)</div>
                <div className="text-3xl font-bold text-white mb-4">{formatCurrency(totalReceived)}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                  <Clock size={48} className="text-amber-500" />
                </div>
                <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Pending (Snapshot)</div>
                <div className="text-3xl font-bold text-white mb-4">{formatCurrency(totalPending)}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                  <Clock size={14} /> {pendingCount} Pending Payments
                </div>
              </div>
            </div>

            {/* Historical Balance Chart */}
            {chartData.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl">
                <h3 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">Balance Trend (Leading to {formatDate(selectedDate)})</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#05060a', borderColor: '#ffffff20', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Historical Activity */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Historical Transactions</h2>
                <div className="text-sm text-slate-400">{filteredTransactions.length} records</div>
              </div>
              <div className="space-y-3">
                {filteredTransactions.map((tx, idx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    className="group bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      tx.type === 'received' ? "bg-green-500/20 text-green-400" :
                      tx.type === 'sent' ? "bg-red-500/20 text-red-400" :
                      "bg-amber-500/20 text-amber-400"
                    )}>
                      {tx.type === 'received' ? <ArrowDownLeft size={24} /> : 
                       tx.type === 'sent' ? <ArrowUpRight size={24} /> : 
                       <Clock size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{tx.personName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason} • {formatDate(tx.type === 'received' || tx.type === 'sent' ? tx.date : (tx as any).dueDate, generalSettings?.timezone)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-bold",
                        tx.type === 'received' ? "text-green-400" :
                        tx.type === 'sent' ? "text-red-400" :
                        "text-amber-500"
                      )}>
                        {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">{tx.type}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
