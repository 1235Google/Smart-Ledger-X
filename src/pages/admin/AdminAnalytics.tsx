import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  Activity, 
  Calendar, 
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Layers
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useStore } from '../../context/StoreContext';
import { cn, formatCurrency } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3StatCard } from '../../components/admin/material3/M3StatCard';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminAnalytics() {
  const { transactions, customers, currentBalance, totalReceived, totalSent, totalPending } = useStore();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');

  const safeTransactions = transactions || [];

  // Filter transactions within selected timeRange
  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    let daysLimit = 7;
    if (timeRange === '30d') daysLimit = 30;
    if (timeRange === '90d') daysLimit = 90;
    if (timeRange === '1y') daysLimit = 365;

    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;

    return safeTransactions.filter((tx: any) => {
      const txDateStr = tx.date || tx.createdAt;
      if (!txDateStr) return true;
      const t = new Date(txDateStr).getTime();
      return isNaN(t) || t >= cutoff;
    });
  }, [safeTransactions, timeRange]);

  const periodReceived = useMemo(() => {
    return filteredTransactions
      .filter((tx: any) => tx.type === 'received' || tx.type === 'income')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [filteredTransactions]);

  const periodSent = useMemo(() => {
    return filteredTransactions
      .filter((tx: any) => tx.type === 'sent' || tx.type === 'expense')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [filteredTransactions]);

  const periodMargin = periodReceived - periodSent;

  const analyticsData = useMemo(() => {
    if (timeRange === '1y') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const summary: Record<string, { day: string; received: number; sent: number }> = {};
      months.forEach((m) => {
        summary[m] = { day: m, received: 0, sent: 0 };
      });
      filteredTransactions.forEach((tx: any) => {
        const txDateStr = tx.date || tx.createdAt;
        if (txDateStr) {
          const d = new Date(txDateStr);
          if (!isNaN(d.getTime())) {
            const m = months[d.getMonth()];
            if (summary[m]) {
              if (tx.type === 'received' || tx.type === 'income') {
                summary[m].received += Number(tx.amount) || 0;
              } else if (tx.type === 'sent' || tx.type === 'expense') {
                summary[m].sent += Number(tx.amount) || 0;
              }
            }
          }
        }
      });
      return Object.values(summary);
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const summary: Record<string, { day: string; received: number; sent: number }> = {};
    
    days.forEach((d) => {
      summary[d] = { day: d, received: 0, sent: 0 };
    });

    filteredTransactions.forEach((tx: any) => {
      const txDateStr = tx.date || tx.createdAt;
      if (txDateStr) {
        const d = new Date(txDateStr);
        if (!isNaN(d.getTime())) {
          const dayIndex = (d.getDay() + 6) % 7;
          const dayName = days[dayIndex];
          if (summary[dayName]) {
            if (tx.type === 'received' || tx.type === 'income') {
              summary[dayName].received += Number(tx.amount) || 0;
            } else if (tx.type === 'sent' || tx.type === 'expense') {
              summary[dayName].sent += Number(tx.amount) || 0;
            }
          }
        }
      }
    });

    return Object.values(summary);
  }, [filteredTransactions, timeRange]);

  // Category distribution from real filtered transactions
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTransactions.forEach((tx: any) => {
      const cat = tx.category || tx.purpose || 'General';
      counts[cat] = (counts[cat] || 0) + (Number(tx.amount) || 0);
    });

    const colors = isDark
      ? ['#a8c7fa', '#6dd58c', '#ffe082', '#ffaed0', '#c2e7ff', '#85e197']
      : ['#0b57d0', '#1e8e3e', '#e37400', '#835368', '#004a77', '#137333'];

    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return [{ name: 'No Data Recorded', value: 0, color: isDark ? '#3c4043' : '#e1e3e1' }];
    }

    return entries.map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [filteredTransactions, isDark]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Platform Analytics & Insights
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Comprehensive metrics on financial volume, weekly cash velocities, and category distributions.
          </p>
        </div>

        {/* Time Range Chips */}
        <div className="flex items-center gap-1.5">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <M3Chip
              key={range}
              label={range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '3 Months' : '1 Year'}
              selected={timeRange === range}
              onClick={() => setTimeRange(range)}
            />
          ))}
        </div>
      </div>

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <M3StatCard
          title="Period Inflow (Received)"
          value={periodReceived}
          isCurrency
          subtitle={`Customer payments (${timeRange.toUpperCase()})`}
          icon={ArrowDownLeft}
          tone="emerald"
        />

        <M3StatCard
          title="Period Outflow (Sent)"
          value={periodSent}
          isCurrency
          subtitle={`Disbursements (${timeRange.toUpperCase()})`}
          icon={ArrowUpRight}
          tone="rose"
        />

        <M3StatCard
          title="Period Net Margin"
          value={periodMargin}
          isCurrency
          subtitle="Net cash flow surplus"
          icon={Wallet}
          tone="primary"
        />

        <M3StatCard
          title="Pending Receivables"
          value={totalPending}
          isCurrency
          subtitle="Outstanding dues to collect"
          icon={Activity}
          tone="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart: Cash Flow */}
        <M3Card variant="elevated" padding="lg" className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                Weekly Cash Velocity Curve
              </h2>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                Dynamic inflow vs outflow timeline
              </p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="anColorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#6dd58c' : '#1e8e3e'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isDark ? '#6dd58c' : '#1e8e3e'} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anColorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#a8c7fa' : '#0b57d0'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isDark ? '#a8c7fa' : '#0b57d0'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke={isDark ? '#8e918f' : '#747775'} tickLine={false} />
                <YAxis stroke={isDark ? '#8e918f' : '#747775'} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e1f20' : '#ffffff',
                    borderColor: isDark ? '#3c4043' : '#e1e3e1',
                    borderRadius: '1rem',
                    color: isDark ? '#ffffff' : '#1f1f1f',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke={isDark ? '#6dd58c' : '#1e8e3e'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#anColorRec)"
                  name="Inflow"
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke={isDark ? '#a8c7fa' : '#0b57d0'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#anColorSent)"
                  name="Outflow"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </M3Card>

        {/* Category Breakdown Pie */}
        <M3Card variant="elevated" padding="lg" className="flex flex-col justify-between">
          <div>
            <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Category Allocation
            </h2>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              Financial volume distributed across categories
            </p>
          </div>

          <div className="h-60 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cat-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Volume']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e1f20' : '#ffffff',
                    borderColor: isDark ? '#3c4043' : '#e1e3e1',
                    borderRadius: '1rem',
                    color: isDark ? '#ffffff' : '#1f1f1f',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {categoryData.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="truncate">{c.name}</span>
                </div>
                <span className="font-mono font-bold">₹{c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </M3Card>
      </div>

      {/* Bar Chart: Daily Volume */}
      <M3Card variant="elevated" padding="lg">
        <div className="mb-6">
          <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Comparative Daily Volume Breakdown
          </h2>
          <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Side-by-side bar analysis of customer payments received vs disbursements made
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData}>
              <XAxis dataKey="day" stroke={isDark ? '#8e918f' : '#747775'} tickLine={false} />
              <YAxis stroke={isDark ? '#8e918f' : '#747775'} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                contentStyle={{
                  backgroundColor: isDark ? '#1e1f20' : '#ffffff',
                  borderColor: isDark ? '#3c4043' : '#e1e3e1',
                  borderRadius: '1rem',
                  color: isDark ? '#ffffff' : '#1f1f1f',
                }}
              />
              <Bar dataKey="received" fill={isDark ? '#6dd58c' : '#1e8e3e'} radius={[8, 8, 0, 0]} name="Received" />
              <Bar dataKey="sent" fill={isDark ? '#a8c7fa' : '#0b57d0'} radius={[8, 8, 0, 0]} name="Sent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </M3Card>
    </div>
  );
}
