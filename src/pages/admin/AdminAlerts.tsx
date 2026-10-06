import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Search, 
  Filter, 
  Check, 
  Download, 
  Trash2, 
  ExternalLink,
  ShieldAlert,
  Clock,
  User,
  Activity,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { AdminAlert, AlertService } from '../../lib/alertService';
import { cn, formatDate } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminAlerts() {
  const { adminUser } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'Warning' | 'Success' | 'Information'>('all');
  const [resolutionFilter, setResolutionFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to live Firestore alerts
  useEffect(() => {
    console.log('[AlertCenter] Establishing real-time onSnapshot listener to admin_alerts...');
    const unsubscribe = AlertService.subscribeToAlerts((liveAlerts) => {
      setAlerts(liveAlerts);
      setIsLoading(false);
    });

    return () => {
      console.log('[AlertCenter] Detaching alert center Firestore listeners');
      unsubscribe();
    };
  }, []);

  const handleResolve = async (alertId: string) => {
    if (!alertId) return;
    const adminEmail = adminUser?.email || 'System Admin';
    try {
      const res = await AlertService.resolveAlert(alertId, adminEmail);
      if (res.success) {
        showSuccess('Alert Resolved', 'The alert status was updated successfully.');
      } else {
        showError('Resolve Failed', 'Failed to resolve alert document.');
      }
    } catch (err: any) {
      showError('Action Error', err?.message || 'Error occurred.');
    }
  };

  // Filter & Search Logics
  const filteredAlerts = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return alerts.filter((alert) => {
      // 1. Severity filter
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;

      // 2. Resolution filter
      if (resolutionFilter === 'resolved' && !alert.resolved) return false;
      if (resolutionFilter === 'unresolved' && alert.resolved) return false;

      // 3. Time filter
      if (timeFilter !== 'all') {
        const time = new Date(alert.createdAt).getTime();
        const diff = now - time;
        if (timeFilter === 'today' && diff > oneDay) return false;
        if (timeFilter === 'week' && diff > oneWeek) return false;
        if (timeFilter === 'month' && diff > oneMonth) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (alert.title || '').toLowerCase();
        const desc = (alert.description || '').toLowerCase();
        const type = (alert.type || '').toLowerCase();
        const uid = (alert.userId || '').toLowerCase();
        
        return (
          title.includes(q) ||
          desc.includes(q) ||
          type.includes(q) ||
          uid.includes(q)
        );
      }

      return true;
    });
  }, [alerts, severityFilter, resolutionFilter, timeFilter, searchQuery]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) {
      showInfo('No Data', 'No active records match the current filter selection.');
      return;
    }

    const headers = ['ID', 'Type', 'Title', 'Description', 'Severity', 'Created At', 'Resolved', 'Resolved At', 'Resolved By', 'User ID'];
    const rows = filteredAlerts.map(a => [
      a.id || '',
      a.type,
      a.title,
      a.description.replace(/,/g, ';'),
      a.severity,
      a.createdAt,
      a.resolved ? 'Yes' : 'No',
      a.resolvedAt || '',
      a.resolvedBy || '',
      a.userId || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin_alerts_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Export Succeeded', 'CSV snapshot generated successfully.');
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return {
          bg: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
          icon: <ShieldAlert className="text-rose-400 shrink-0" size={16} />,
          dot: 'bg-rose-500'
        };
      case 'Warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
          icon: <AlertCircle className="text-amber-400 shrink-0" size={16} />,
          dot: 'bg-amber-500'
        };
      case 'Success':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
          icon: <CheckCircle2 className="text-emerald-400 shrink-0" size={16} />,
          dot: 'bg-emerald-500'
        };
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
          icon: <Info className="text-blue-400 shrink-0" size={16} />,
          dot: 'bg-blue-500'
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Enterprise Alert Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time authoritative operational & security logs synced directly from Firestore.
          </p>
        </div>

        <M3Button
          variant="tonal"
          icon={Download}
          onClick={handleExportCSV}
        >
          Export CSV Log
        </M3Button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Bell size={13} className="text-indigo-400" /> Total Active Alerts
          </div>
          <p className="text-2xl font-mono font-extrabold text-white">
            {alerts.filter(a => !a.resolved).length}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-[#2d1b22]/60 border border-rose-500/20 backdrop-blur-xl space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-rose-400 animate-pulse" /> Critical Incidents
          </div>
          <p className="text-2xl font-mono font-extrabold text-rose-400">
            {alerts.filter(a => a.severity === 'Critical' && !a.resolved).length}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-[#2d261b]/60 border border-amber-500/20 backdrop-blur-xl space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-400" /> Warnings Pending
          </div>
          <p className="text-2xl font-mono font-extrabold text-amber-400">
            {alerts.filter(a => a.severity === 'Warning' && !a.resolved).length}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-[#1c2d22]/60 border border-emerald-500/20 backdrop-blur-xl space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> Resolved Today
          </div>
          <p className="text-2xl font-mono font-extrabold text-emerald-400">
            {alerts.filter(a => a.resolved).length}
          </p>
        </div>
      </div>

      {/* Filter capsules */}
      <M3Card variant="elevated" padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Title, Type, UID, Email..."
              className="w-full text-xs bg-slate-900 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Severity:</span>
            {(['all', 'Critical', 'Warning', 'Success', 'Information'] as const).map((s) => (
              <M3Chip
                key={s}
                label={s === 'all' ? 'All' : s}
                selected={severityFilter === s}
                onClick={() => setSeverityFilter(s)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 pt-2 border-t border-white/[0.05] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Resolution:</span>
            <select
              value={resolutionFilter}
              onChange={(e: any) => setResolutionFilter(e.target.value)}
              className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All States</option>
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Time Window:</span>
            <select
              value={timeFilter}
              onChange={(e: any) => setTimeFilter(e.target.value)}
              className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today (Last 24h)</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </M3Card>

      {/* Alerts Feed */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-xs flex items-center justify-center gap-2">
            <Activity className="animate-spin text-indigo-400" size={16} />
            <span>Establishing secure real-time stream...</span>
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const styles = getSeverityStyle(alert.severity);
            return (
              <div
                key={alert.id}
                className={cn(
                  "p-5 rounded-3xl border text-xs transition-all relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
                  alert.resolved 
                    ? "bg-[#161622]/40 border-white/[0.06] opacity-60" 
                    : isDark ? "bg-[#181824]/80 border-white/[0.08]" : "bg-white border-[#e1e3e1] shadow-sm"
                )}
              >
                {/* Left accent color strip */}
                <span className={cn("absolute left-0 top-0 bottom-0 w-1", styles.dot)} />

                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={cn("w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5", styles.bg)}>
                    {styles.icon}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", styles.bg)}>
                        {alert.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className={cn("font-bold text-sm tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      {alert.title}
                    </h3>
                    
                    <p className={cn("text-xs leading-relaxed max-w-2xl", isDark ? "text-slate-300" : "text-slate-600")}>
                      {alert.description}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      {alert.userId && (
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <User size={12} /> {alert.userId}
                        </span>
                      )}
                      {alert.resolved && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-[10px]">
                          <Check size={11} /> Resolved by {alert.resolvedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!alert.resolved && (
                  <M3Button
                    variant="tonal"
                    size="sm"
                    icon={Check}
                    onClick={() => alert.id && handleResolve(alert.id)}
                    className="shrink-0 self-end sm:self-auto"
                  >
                    Resolve Alert
                  </M3Button>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 rounded-3xl border border-white/[0.05] bg-white/[0.01]">
            <p className="text-slate-400 font-bold text-sm">All operations stable</p>
            <p className="text-slate-500 text-xs mt-1">No active unresolved alerts matching your selected filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
