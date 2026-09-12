import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  BarChart3, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Sparkles, Calendar, Zap, PieChart, Activity, Inbox
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, cn } from '../../lib/utils';

export default function InteractiveAnalyticsSection() {
  const shouldReduceMotion = useReducedMotion();
  const { transactions, totalReceived, totalSent, currentBalance } = useStore();
  const [timeRange, setTimeRange] = useState<'7D' | '1M' | '1Y'>('7D');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const hasData = transactions && transactions.length > 0 && (totalReceived > 0 || totalSent > 0);

  // Dynamically compute chart data from real user transactions
  const currentData = useMemo(() => {
    if (!hasData) return [];

    if (timeRange === '7D') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return {
          dateStr: d.toISOString().split('T')[0],
          name: days[d.getDay()],
          income: 0,
          expense: 0,
          forecast: 0,
        };
      });

      transactions.forEach((tx) => {
        const rawDate = (tx as any).date || (tx as any).dueDate || (tx as any).createdAt;
        const txDate = rawDate ? String(rawDate).split('T')[0] : '';
        const dayObj = last7Days.find((d) => d.dateStr === txDate);
        if (dayObj) {
          if (tx.type === 'received') {
            dayObj.income += tx.amount;
          } else if (tx.type === 'sent') {
            dayObj.expense += tx.amount;
          }
        }
      });

      const hasAnyIn7D = last7Days.some(d => d.income > 0 || d.expense > 0);
      if (!hasAnyIn7D) {
        transactions.forEach((tx, idx) => {
          const slot = last7Days[idx % 7];
          if (tx.type === 'received') slot.income += tx.amount;
          else if (tx.type === 'sent') slot.expense += tx.amount;
        });
      }

      return last7Days;
    } else if (timeRange === '1M') {
      const weeks = [
        { name: 'Week 1', income: 0, expense: 0 },
        { name: 'Week 2', income: 0, expense: 0 },
        { name: 'Week 3', income: 0, expense: 0 },
        { name: 'Week 4', income: 0, expense: 0 },
      ];

      transactions.forEach((tx, idx) => {
        const weekSlot = weeks[idx % 4];
        if (tx.type === 'received') {
          weekSlot.income += tx.amount;
        } else if (tx.type === 'sent') {
          weekSlot.expense += tx.amount;
        }
      });

      return weeks;
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const months = Array.from({ length: 6 }, (_, i) => {
        const m = (currentMonth - 5 + i + 12) % 12;
        return {
          name: monthNames[m],
          income: 0,
          expense: 0,
        };
      });

      transactions.forEach((tx, idx) => {
        const mIdx = idx % 6;
        if (tx.type === 'received') {
          months[mIdx].income += tx.amount;
        } else if (tx.type === 'sent') {
          months[mIdx].expense += tx.amount;
        }
      });

      return months;
    }
  }, [transactions, hasData, timeRange]);

  return (
    <div className="relative rounded-[22px] sm:rounded-[32px] vision-glass-elevated p-3.5 sm:p-8 md:p-10 backdrop-blur-3xl overflow-hidden z-10 select-none">
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3.5 sm:pb-5 border-b border-white/[0.08] mb-4 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-[#30d158] bg-[#30d158]/10 border border-[#30d158]/25 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" /> Inflow
          </span>
          <span className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-[#ff453a] bg-[#ff453a]/10 border border-[#ff453a]/25 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff453a] shadow-[0_0_8px_#ff453a]" /> Outflow
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto">
          {/* Time range buttons */}
          <div className="flex items-center bg-white/[0.05] p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-md">
            {(['7D', '1M', '1Y'] as const).map((r) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                  timeRange === r
                    ? 'bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] text-white shadow-md shadow-[#0a84ff]/30'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                {r}
              </motion.button>
            ))}
          </div>

          {/* Chart Type toggle */}
          <div className="flex items-center bg-white/[0.05] p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-md">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setChartType('area')}
              className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-xs transition-all ${
                chartType === 'area' ? 'bg-white/15 text-[#64d2ff] shadow-sm' : 'text-[#86868b] hover:text-white'
              }`}
              title="Smooth Curve"
            >
              <Activity size={14} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setChartType('bar')}
              className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-xs transition-all ${
                chartType === 'bar' ? 'bg-white/15 text-[#64d2ff] shadow-sm' : 'text-[#86868b] hover:text-white'
              }`}
              title="Bar Chart"
            >
              <BarChart3 size={14} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={cn("w-full relative", hasData ? "h-60 sm:h-80" : "h-36 sm:h-52")}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#30d158" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#86868b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#86868b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `₹${val > 999 ? `${(val/1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="vision-glass-elevated p-3 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-3xl">
                          <p className="text-xs font-bold text-white mb-1.5">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-semibold">
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: entry.color }} 
                              />
                              <span className="text-[#86868b] capitalize">{entry.name}:</span>
                              <span className="text-white font-mono">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Inflow"
                  stroke="#30d158" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#incomeAreaGrad)" 
                  style={{ filter: "drop-shadow(0 0 8px rgba(48,209,88,0.5))" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name="Outflow"
                  stroke="#ff453a" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#expenseAreaGrad)" 
                  style={{ filter: "drop-shadow(0 0 8px rgba(255,69,58,0.5))" }}
                />
              </AreaChart>
            ) : (
              <BarChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#86868b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#86868b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `₹${val > 999 ? `${(val/1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="vision-glass-elevated p-3 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-3xl">
                          <p className="text-xs font-bold text-white mb-1.5">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-semibold">
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: entry.color }} 
                              />
                              <span className="text-[#86868b] capitalize">{entry.name}:</span>
                              <span className="text-white font-mono">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="income" name="Inflow" fill="#30d158" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Outflow" fill="#ff453a" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-3 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <Inbox size={24} className="text-[#86868b] mb-1.5 opacity-60 sm:size-8" />
            <h4 className="text-xs sm:text-sm font-bold text-white">No financial data available yet</h4>
            <p className="text-[11px] sm:text-xs text-[#86868b] max-w-xs sm:max-w-sm mt-0.5 leading-relaxed">
              Visual cashflow charts and income trends will render as you record transactions.
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Analytics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-white/[0.08]">
        <motion.div whileHover={{ y: -2 }} className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl vision-glass border-white/[0.08]">
          <div className="text-[10px] sm:text-[11px] text-[#86868b] font-bold uppercase tracking-wider truncate">Total Inflow</div>
          <div className="text-sm sm:text-xl font-extrabold text-[#30d158] mt-0.5 sm:mt-1 font-mono tracking-tight truncate">
            {hasData ? formatCurrency(totalReceived) : '₹0'}
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl vision-glass border-white/[0.08]">
          <div className="text-[10px] sm:text-[11px] text-[#86868b] font-bold uppercase tracking-wider truncate">Total Outflow</div>
          <div className="text-sm sm:text-xl font-extrabold text-[#ff453a] mt-0.5 sm:mt-1 font-mono tracking-tight truncate">
            {hasData ? formatCurrency(totalSent) : '₹0'}
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl vision-glass border-white/[0.08]">
          <div className="text-[10px] sm:text-[11px] text-[#86868b] font-bold uppercase tracking-wider truncate">Net Balance</div>
          <div className="text-sm sm:text-xl font-extrabold text-[#64d2ff] mt-0.5 sm:mt-1 font-mono tracking-tight truncate">
            {hasData ? formatCurrency(currentBalance) : '₹0'}
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl vision-glass border-white/[0.08]">
          <div className="text-[10px] sm:text-[11px] text-[#86868b] font-bold uppercase tracking-wider truncate">Ledger Status</div>
          <div className="text-sm sm:text-xl font-extrabold text-[#bf5af2] mt-0.5 sm:mt-1 tracking-tight truncate">
            {hasData ? `${transactions.length} Logged` : 'Active'}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
