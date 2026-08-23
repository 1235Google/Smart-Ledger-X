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
  Shield
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
        return {
          label: 'Google Login Success',
          icon: ShieldCheck,
          className: isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]',
        };
      case 'PASSWORD_LOGIN':
        return {
          label: 'Password Login',
          icon: Key,
          className: isDark ? 'bg-[#004a77]/50 text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]',
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
      case 'LOGOUT':
        return {
          label: 'Sign Out',
          icon: LogOut,
          className: isDark ? 'bg-[#282a2d] text-[#c4c7c5]' : 'bg-[#f0f4f9] text-[#444746]',
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

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    return true;
  });

  const columns: Column<AdminSecurityLog>[] = [
    {
      key: 'action',
      header: 'Security Event',
      render: (item) => {
        const info = getActionInfo(item.action);
        const Icon = info.icon;
        return (
          <div className="flex items-center gap-2.5">
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5', info.className)}>
              <Icon size={13} />
              <span>{info.label}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: 'Account / Actor',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <div className="font-bold text-sm tracking-tight">{item.email || (item as any).adminEmail || 'Unknown Account'}</div>
          <div className="text-[11px] text-slate-400 font-mono">UID: {(item.uid || (item as any).adminUid)?.slice(0, 12) || 'N/A'}...</div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Audit Context',
      render: (item) => (
        <div className="text-xs max-w-xs truncate text-slate-300">
          {item.details ? (
            <span>{typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}</span>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <div className="font-medium">{formatDate(item.timestamp)}</div>
          <div className="text-[10px] text-slate-400">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Inspect',
      align: 'right',
      render: (item) => (
        <button
          onClick={() => setViewingLog(item)}
          className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:underline"
        >
          View JSON
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Security & Audit Telemetry
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Immutable forensic trail of all authentication events, privilege elevations, and policy blocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
            <ShieldCheck size={14} /> Live Ingestion Active
          </span>
        </div>
      </div>

      {/* Action Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Event:</span>
        {[
          { key: 'all', label: 'All Events' },
          { key: 'LOGIN_SUCCESS', label: 'Logins' },
          { key: 'LOGIN_DENIED_UNAUTHORIZED', label: 'Blocked' },
          { key: 'ADMIN_ADDED', label: 'Invited' },
          { key: 'ADMIN_ROLE_UPDATED', label: 'Role Changes' },
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
        title="Security Audit Trail"
        subtitle={`${filteredLogs.length} logged forensic entries`}
        data={filteredLogs}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search email, action type, IP..."
        searchFields={['adminEmail', 'action']}
        emptyMessage="No audit logs match criteria"
      />

      {/* JSON Viewer Dialog */}
      <M3Dialog
        isOpen={Boolean(viewingLog)}
        onClose={() => setViewingLog(null)}
        title="Forensic Audit Payload"
        subtitle={`Log Event ID: ${viewingLog?.id || ''}`}
        icon={FileCode}
        iconTone="primary"
        maxWidth="lg"
        actions={
          <M3Button variant="filled" onClick={() => setViewingLog(null)}>
            Close
          </M3Button>
        }
      >
        <div className="space-y-3">
          <pre className={cn(
            'p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-80 border',
            isDark ? 'bg-black/60 text-[#a8c7fa] border-[#3c4043]' : 'bg-[#f0f4f9] text-[#001d35] border-[#c4c7c5]'
          )}>
            {JSON.stringify(viewingLog, null, 2)}
          </pre>
        </div>
      </M3Dialog>
    </div>
  );
}
