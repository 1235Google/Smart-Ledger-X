import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Activity, 
  Clock, 
  Globe, 
  Laptop, 
  Smartphone,
  Tablet,
  User, 
  Filter, 
  RefreshCw,
  UserPlus,
  UserCheck,
  UserX,
  Key,
  LogOut,
  AlertTriangle,
  FileCode,
  Layers,
  Shield,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { subscribeToAdminLogs } from '../../lib/adminAuthService';
import { AdminSecurityLog, AdminSecurityAction } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return 'Unknown';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return 'Unknown';
  }
}

export default function AdminLogs() {
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [logs, setLogs] = useState<AdminSecurityLog[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [viewingLog, setViewingLog] = useState<AdminSecurityLog | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAdminLogs((updatedLogs) => {
      setLogs(updatedLogs);
      setIsLoading(false);
    }, 100);

    return () => unsubscribe();
  }, []);

  const getActionInfo = (action: AdminSecurityAction) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
      case 'ADMIN_LOGIN':
        return {
          label: 'Login Success',
          icon: ShieldCheck,
          className: isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]',
        };
      case 'GOOGLE_LOGIN':
        return {
          label: 'Google Login',
          icon: ShieldCheck,
          className: isDark ? 'bg-[#004a77]/50 text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]',
        };
      case 'PASSWORD_LOGIN':
        return {
          label: 'Password Login',
          icon: Key,
          className: isDark ? 'bg-[#004a77]/50 text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]',
        };
      case 'LOGIN_FAILED':
        return {
          label: 'Login Failed',
          icon: AlertTriangle,
          className: isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]',
        };
      case 'LOGIN_DENIED_UNAUTHORIZED':
        return {
          label: 'Unauthorized Blocked',
          icon: AlertTriangle,
          className: isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]',
        };
      case 'LOGIN_DENIED_DISABLED':
        return {
          label: 'Disabled Blocked',
          icon: UserX,
          className: isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]',
        };
      case 'NEW_DEVICE_DETECTED':
        return {
          label: 'New Device Alert',
          icon: Sparkles,
          className: isDark ? 'bg-[#5c3e00]/50 text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]',
        };
      case 'LOGOUT':
        return {
          label: 'Sign Out',
          icon: LogOut,
          className: isDark ? 'bg-[#282a2d] text-[#c4c7c5]' : 'bg-[#f0f4f9] text-[#444746]',
        };
      case 'SESSION_REVOKED':
        return {
          label: 'Session Revoked',
          icon: XCircle,
          className: isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]',
        };
      case 'ADMIN_ADDED':
        return {
          label: 'Admin Invited',
          icon: UserPlus,
          className: isDark ? 'bg-[#5c3e00]/50 text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]',
        };
      case 'ADMIN_ROLE_UPDATED':
        return {
          label: 'Role Updated',
          icon: UserCheck,
          className: isDark ? 'bg-[#492532]/50 text-[#ffd8e4]' : 'bg-[#ffd8e4] text-[#31111d]',
        };
      case 'ADMIN_STATUS_CHANGED':
        return {
          label: 'Status Toggled',
          icon: Activity,
          className: isDark ? 'bg-[#004a77]/50 text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]',
        };
      case 'ADMIN_REMOVED':
        return {
          label: 'Admin Removed',
          icon: UserX,
          className: isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]',
        };
      default:
        return {
          label: action,
          icon: ShieldAlert,
          className: isDark ? 'bg-[#282a2d] text-[#c4c7c5]' : 'bg-[#f0f4f9] text-[#444746]',
        };
    }
  };

  const getDeviceCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'mobile':
        return <Smartphone size={14} className="text-emerald-500 shrink-0" />;
      case 'tablet':
        return <Tablet size={14} className="text-amber-500 shrink-0" />;
      default:
        return <Laptop size={14} className="text-blue-500 shrink-0" />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === 'all') return true;
    if (actionFilter === 'logins') {
      return ['LOGIN_SUCCESS', 'PASSWORD_LOGIN', 'GOOGLE_LOGIN', 'ADMIN_LOGIN'].includes(log.action);
    }
    if (actionFilter === 'blocked') {
      return ['LOGIN_FAILED', 'LOGIN_DENIED_UNAUTHORIZED', 'LOGIN_DENIED_DISABLED'].includes(log.action);
    }
    if (actionFilter === 'new_devices') {
      return log.newDevice === true || log.action === 'NEW_DEVICE_DETECTED';
    }
    return log.action === actionFilter;
  });

  const columns: Column<AdminSecurityLog>[] = [
    {
      key: 'action',
      header: 'Event & Method',
      render: (item) => {
        const info = getActionInfo(item.action);
        const Icon = info.icon;
        const authMethod = item.authProvider || (item.action.includes('GOOGLE') ? 'google' : item.action.includes('PASSWORD') ? 'password' : null);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold tracking-wider inline-flex items-center gap-1.5', info.className)}>
              <Icon size={13} />
              <span>{info.label}</span>
            </span>
            <div className="flex items-center gap-1">
              {authMethod && authMethod !== 'none' && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {authMethod}
                </span>
              )}
              {item.newDevice && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  NEW DEVICE
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: 'User & Identifier',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
            {item.email || 'Unknown Account'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <span>UID:</span>
            <span>{item.uid ? `${item.uid.slice(0, 10)}...` : 'Unavailable'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'device',
      header: 'Device & Browser',
      render: (item) => {
        const cat = item.deviceInfo?.category || 'Desktop';
        const browser = item.deviceInfo?.browser || item.browser || 'Browser';
        const browserVer = item.deviceInfo?.browserVersion && item.deviceInfo.browserVersion !== 'Unavailable' ? ` ${item.deviceInfo.browserVersion}` : '';
        const os = item.deviceInfo?.os || 'OS';
        const osVer = item.deviceInfo?.osVersion && item.deviceInfo.osVersion !== 'Unavailable' ? ` ${item.deviceInfo.osVersion}` : '';
        const model = item.deviceInfo?.model && item.deviceInfo.model !== 'Unavailable' ? ` • ${item.deviceInfo.model}` : '';

        return (
          <div className="text-xs">
            <div className="font-medium flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              {getDeviceCategoryIcon(cat)}
              <span>{browser}{browserVer} on {os}{osVer}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              <span>{cat}{model}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'ip',
      header: 'IP & Approximate Location',
      render: (item) => {
        const loc = item.location;
        const locString = loc 
          ? [loc.city, loc.region, loc.country].filter(Boolean).join(', ') 
          : 'Approx. Location Unavailable';

        return (
          <div className="text-xs">
            <div className="font-mono font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Globe size={12} className="text-slate-400 shrink-0" />
              <span>{item.ip || 'Unavailable'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate max-w-xs">
              <MapPin size={10} className="shrink-0 text-slate-400" />
              <span title={locString}>{locString}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {formatRelativeTime(item.timestamp)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {formatDate(item.timestamp)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      align: 'right',
      render: (item) => (
        <button
          onClick={() => setViewingLog(item)}
          className="text-xs font-semibold px-2.5 py-1 rounded bg-[#0b57d0]/10 text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#0b57d0]/20 transition-colors"
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
              Device & Login Activity
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              AUDIT TRAIL
            </span>
          </div>
          <p className={cn('text-xs sm:text-sm mt-1', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Production security logs with server-observed IP, hardware category, and geolocation verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Server Auditing Active</span>
          </div>
        </div>
      </div>

      {/* Action Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
        {[
          { key: 'all', label: 'All Activity' },
          { key: 'logins', label: 'Successful Logins' },
          { key: 'blocked', label: 'Failed / Blocked' },
          { key: 'new_devices', label: 'New Devices' },
          { key: 'LOGOUT', label: 'Sign Outs' },
        ].map((f) => (
          <M3Chip
            key={f.key}
            label={f.label}
            selected={actionFilter === f.key}
            onClick={() => setActionFilter(f.key)}
          />
        ))}
      </div>

      {/* Main Table */}
      <M3DataTable
        title="Security Telemetry Log"
        subtitle={`${filteredLogs.length} verified events recorded`}
        data={filteredLogs}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search email, IP, browser, or location..."
        searchFields={['email', 'ip', 'action', 'device', 'browser']}
        emptyMessage="No security events match criteria"
      />

      {/* Detailed Inspection Dialog */}
      <M3Dialog
        isOpen={Boolean(viewingLog)}
        onClose={() => setViewingLog(null)}
        title="Security Event Inspection"
        subtitle={`Audit ID: ${viewingLog?.id || ''}`}
        icon={ShieldAlert}
        iconTone={viewingLog?.action.includes('DENIED') || viewingLog?.action.includes('FAILED') ? 'rose' : 'primary'}
        maxWidth="lg"
        actions={
          <M3Button variant="filled" onClick={() => setViewingLog(null)}>
            Close Inspection
          </M3Button>
        }
      >
        {viewingLog && (
          <div className="space-y-4 text-xs">
            {/* Top Highlight Summary */}
            <div className={cn(
              'p-3 rounded-xl border flex items-center justify-between',
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            )}>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{viewingLog.email}</div>
                <div className="text-slate-400 text-[11px] font-mono mt-0.5">UID: {viewingLog.uid || 'N/A'}</div>
              </div>
              <div className="text-right">
                <span className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1',
                  getActionInfo(viewingLog.action).className
                )}>
                  {getActionInfo(viewingLog.action).label}
                </span>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {formatRelativeTime(viewingLog.timestamp)}
                </div>
              </div>
            </div>

            {/* Grid of Verified Forensic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Network & IP Card */}
              <div className={cn('p-3 rounded-xl border', isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Globe size={13} />
                  <span>Network & IP Origin</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Observed IP:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingLog.ip || 'Unavailable'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Approx. Country:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingLog.location?.country || 'Unavailable'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Region / City:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {[viewingLog.location?.city, viewingLog.location?.region].filter(Boolean).join(', ') || 'Unavailable'}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 italic">
                    * Location derived strictly via server-side IP geolocation (no GPS permission requested).
                  </div>
                </div>
              </div>

              {/* Hardware & Browser Card */}
              <div className={cn('p-3 rounded-xl border', isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Laptop size={13} />
                  <span>Device & Client Signature</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingLog.deviceInfo?.category || 'Desktop'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Browser:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {viewingLog.deviceInfo?.browser || viewingLog.browser || 'Unavailable'} {viewingLog.deviceInfo?.browserVersion && viewingLog.deviceInfo.browserVersion !== 'Unavailable' ? `(${viewingLog.deviceInfo.browserVersion})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operating System:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {viewingLog.deviceInfo?.os || 'Unavailable'} {viewingLog.deviceInfo?.osVersion && viewingLog.deviceInfo.osVersion !== 'Unavailable' ? `(${viewingLog.deviceInfo.osVersion})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Model:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingLog.deviceInfo?.model || 'Unavailable'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Decision & Flags */}
            <div className={cn('p-3 rounded-xl border', isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200')}>
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Shield size={13} />
                <span>Security Assessment & Context</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] text-slate-400">New Device</div>
                  <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">
                    {viewingLog.newDevice ? '⚠️ Yes' : 'No'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] text-slate-400">Auth Method</div>
                  <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-200 uppercase">
                    {viewingLog.authProvider || 'Standard'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] text-slate-400">Decision</div>
                  <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-200">
                    {viewingLog.authorizationResult === 'admin' ? 'Admin Access' : viewingLog.authorizationResult === 'denied' ? 'Access Denied' : 'Authorized'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] text-slate-400">Session ID</div>
                  <div className="font-mono text-[11px] mt-0.5 text-slate-800 dark:text-slate-200 truncate">
                    {viewingLog.sessionId ? viewingLog.sessionId.slice(0, 10) : 'N/A'}
                  </div>
                </div>
              </div>

              {viewingLog.details && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-400 mr-1">Audit Details:</span>
                  {viewingLog.details}
                </div>
              )}
            </div>

            {/* Raw JSON Audit Payload */}
            <div>
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <FileCode size={13} />
                <span>Authoritative Raw Payload</span>
              </div>
              <pre className={cn(
                'p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border',
                isDark ? 'bg-black/60 text-[#a8c7fa] border-[#3c4043]' : 'bg-[#f0f4f9] text-[#001d35] border-[#c4c7c5]'
              )}>
                {JSON.stringify(viewingLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </M3Dialog>
    </div>
  );
}
