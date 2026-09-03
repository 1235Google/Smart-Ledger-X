import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Users, 
  ShieldCheck, 
  Activity, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  ExternalLink,
  Crown,
  ChevronRight,
  Shield,
  Cloud,
  Layers,
  Plus,
  ArrowRight,
  FileText,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useStore } from '../../context/StoreContext';
import { subscribeToAdminLogs } from '../../lib/adminAuthService';
import { AdminSecurityLog } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { M3StatCard } from '../../components/admin/material3/M3StatCard';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminDashboard() {
  const { 
    adminUser, 
    transactions, 
    customers, 
    gullakEntries, 
    currentBalance, 
    totalReceived, 
    totalSent, 
    totalPending 
  } = useStore();
  const navigate = useNavigate();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [recentLogs, setRecentLogs] = useState<AdminSecurityLog[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAdminLogs((logs) => {
      setRecentLogs(logs.slice(0, 5));
    }, 5);

    return () => unsubscribe();
  }, []);

  const safeTransactions = transactions || [];
  const completedTransactions = safeTransactions.filter((tx: any) => tx.type !== 'pending' && tx.status !== 'pending');

  // Chart Data: 7-Day Trend
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const summary: Record<string, { day: string; received: number }> = {};
    days.forEach((d) => {
      summary[d] = { day: d, received: 0 };
    });

    safeTransactions.forEach((tx: any) => {
      if (tx.date) {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          const dayIndex = (d.getDay() + 6) % 7; // 0 = Mon
          const dayName = days[dayIndex];
          if (summary[dayName]) {
            if (tx.type === 'received' || tx.type === 'income') {
              summary[dayName].received += Number(tx.amount) || 0;
            }
          }
        }
      }
    });

    return Object.values(summary);
  }, [safeTransactions]);

  // Payment Method Breakdown
  const methodData = useMemo(() => {
    const counts: Record<string, number> = { UPI: 0, Cash: 0, Card: 0, 'Bank Transfer': 0 };
    safeTransactions.forEach((tx: any) => {
      const m = tx.method || tx.paymentMethod || 'UPI';
      const amt = Number(tx.amount) || 0;
      if (counts[m] !== undefined) counts[m] += amt;
      else counts['UPI'] += amt;
    });

    const COLORS = isDark
      ? ['#a8c7fa', '#6dd58c', '#ffe082', '#ffaed0']
      : ['#0b57d0', '#1e8e3e', '#e37400', '#835368'];

    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length],
    }));
  }, [safeTransactions, isDark]);

  // Recent 5 Transactions columns
  const recentColumns: Column<any>[] = [
    {
      key: 'personName',
      header: 'Customer / Party',
      render: (tx) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
            tx.type === 'received' || tx.type === 'income'
              ? isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]'
              : isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]'
          )}>
            {tx.personName ? tx.personName.substring(0, 2).toUpperCase() : 'TX'}
          </div>
          <div>
            <div className="font-semibold text-xs">{tx.personName || 'Direct Settlement'}</div>
            <div className="text-[10px] text-slate-400">{tx.category || tx.purpose || 'General'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (tx) => (
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
          tx.type === 'received' || tx.type === 'income'
            ? isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]'
            : isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]'
        )}>
          {tx.type || 'Transaction'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (tx) => (
        <span className={cn(
          'font-mono font-bold text-xs',
          tx.type === 'received' || tx.type === 'income' ? 'text-[#6dd58c]' : 'text-[#f2b8b5]'
        )}>
          {tx.type === 'received' || tx.type === 'income' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      render: (tx) => (
        <span className="text-[11px] text-slate-400">
          {formatDate(tx.date || tx.createdAt || new Date().toISOString())}
        </span>
      ),
    },
  ];

  const uniqueCustomerCount = useMemo(() => {
    const names = new Set<string>();
    (customers || []).forEach(c => c.name && names.add(c.name.trim().toLowerCase()));
    safeTransactions.forEach((t: any) => {
      const name = t.personName || t.customerName;
      if (name && typeof name === 'string' && name.trim()) {
        names.add(name.trim().toLowerCase());
      }
    });
    return names.size;
  }, [customers, safeTransactions]);

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner (Material 3 Hero Surface) */}
      <M3Card variant="elevated" padding="lg" className="relative overflow-hidden">
        {/* Soft Tonal Ambient Glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#0b57d0]/10 dark:bg-[#a8c7fa]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                'px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5',
                isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
              )}>
                <Crown size={13} className="text-amber-400" />
                <span>{adminUser?.role || 'Administrator'}</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">Google Auth Verified</span>
            </div>

            <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Welcome back, {adminUser?.displayName?.split(' ')[0] || 'Administrator'}
            </h1>
            <p className={cn('text-xs sm:text-sm max-w-2xl', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              Real-time enterprise overview of settled ledgers, customer pending receivables, cloud backups, and security privileges.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <M3Button
              variant="tonal"
              icon={Cloud}
              onClick={() => navigate('/admin/backup')}
            >
              Cloud Backup
            </M3Button>
            <M3Button
              variant="filled"
              icon={Wallet}
              onClick={() => navigate('/admin/ledger')}
            >
              Open Ledger
            </M3Button>
          </div>
        </div>
      </M3Card>

      {/* 4 Premium Stat Cards with Animated Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <M3StatCard
          title="Net Balance"
          value={currentBalance}
          isCurrency
          subtitle="Active ledger funds"
          icon={Wallet}
          tone="emerald"
          onClick={() => navigate('/admin/ledger')}
        />

        <M3StatCard
          title="Pending Amount"
          value={totalPending}
          isCurrency
          subtitle="Uncollected receivables"
          icon={Clock}
          tone="rose"
          onClick={() => navigate('/admin/pending')}
        />

        <M3StatCard
          title="Total Transactions"
          value={safeTransactions.length}
          subtitle="Completed & logged"
          icon={Layers}
          tone="primary"
          onClick={() => navigate('/admin/ledger')}
        />

        <M3StatCard
          title="Active Customers"
          value={uniqueCustomerCount}
          subtitle="Registered & transacting parties"
          icon={Users}
          tone="amber"
          onClick={() => navigate('/admin/ledger')}
        />
      </div>

      {/* Charts Section: Cash Flow Area Chart + Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Area Chart */}
        <M3Card variant="elevated" padding="lg" className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                Financial Inflow Trends
              </h2>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                Weekly volume of money received and customer settlements
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#1e8e3e] dark:bg-[#6dd58c]" />
                <span>Received Inflow</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#6dd58c' : '#1e8e3e'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isDark ? '#6dd58c' : '#1e8e3e'} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#a8c7fa' : '#0b57d0'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isDark ? '#a8c7fa' : '#0b57d0'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke={isDark ? '#8e918f' : '#747775'} tickLine={false} />
                <YAxis
                  stroke={isDark ? '#8e918f' : '#747775'}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e1f20' : '#ffffff',
                    borderColor: isDark ? '#3c4043' : '#e1e3e1',
                    borderRadius: '1rem',
                    color: isDark ? '#ffffff' : '#1f1f1f',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke={isDark ? '#6dd58c' : '#1e8e3e'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRec)"
                  name="Money Received"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </M3Card>

        {/* Payment Methods Distribution */}
        <M3Card variant="elevated" padding="lg" className="flex flex-col justify-between">
          <div>
            <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Payment Channels
            </h2>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
              Volume distributed by payment rail
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

          <div className="grid grid-cols-2 gap-2 text-xs">
            {methodData.map((m) => (
              <div key={m.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="truncate">{m.name}</span>
              </div>
            ))}
          </div>
        </M3Card>
      </div>

      {/* Tables Grid: Recent Transactions + Security Audit Mini Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Ledger Entries */}
        <div className="lg:col-span-2">
          <M3DataTable
            title="Recent Ledger Transactions"
            subtitle="Latest completed customer payments and money sent"
            data={safeTransactions.slice(0, 10)}
            columns={recentColumns}
            keyExtractor={(item) => item.id || Math.random()}
            actions={
              <M3Button
                variant="text"
                size="sm"
                trailingIcon={ArrowRight}
                onClick={() => navigate('/admin/ledger')}
              >
                View All Entries
              </M3Button>
            }
          />
        </div>

        {/* Security Audit Feed */}
        <M3Card variant="elevated" padding="lg" className="flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#e1e3e1]/60 dark:border-[#2d2f31]">
            <div>
              <h3 className={cn('font-bold text-base', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                Security Audit Log
              </h3>
              <p className={cn('text-xs', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
                Live activity & auth attempts
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/logs')}
              className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:underline"
            >
              See All
            </button>
          </div>

          <div className="py-3 space-y-3 flex-1 overflow-y-auto">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'p-3 rounded-2xl border text-xs flex items-start gap-3 transition-colors',
                    isDark ? 'bg-[#1e1f20] border-[#2d2f31]' : 'bg-[#f0f4f9] border-[#e1e3e1]'
                  )}
                >
                  <div className="w-7 h-7 rounded-xl bg-[#004a77] text-[#c2e7ff] flex items-center justify-center shrink-0 mt-0.5">
                    <Shield size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{log.email || (log as any).adminEmail || 'Admin User'}</div>
                    <div className="text-[11px] text-slate-400">{log.action}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Security audit logging active. All administrative actions are recorded with IP & User Agent.
              </div>
            )}
          </div>
        </M3Card>
      </div>
    </div>
  );
}
