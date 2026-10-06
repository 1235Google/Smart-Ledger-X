import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ShieldCheck,
  Power
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { SystemMode, SystemConfig } from '../../types';
import { cn } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminSystemMode() {
  const { systemConfig, setSystemMode, adminUser } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [expectedHours, setExpectedHours] = useState('1');

  useEffect(() => {
    setReason(systemConfig.reason || '');
  }, [systemConfig]);

  const handleToggleMode = async (targetMode: SystemMode) => {
    if (targetMode === systemConfig.mode) {
      showInfo('Status Notice', `System is already operating in ${targetMode.toUpperCase()} mode.`);
      return;
    }

    setIsLoading(true);
    try {
      let expectedEndAt: string | null = null;
      if (targetMode === 'maintenance' || targetMode === 'readonly') {
        const hours = parseFloat(expectedHours) || 1;
        const end = new Date();
        end.setMinutes(end.getMinutes() + Math.round(hours * 60));
        expectedEndAt = end.toISOString();
      }

      const res = await setSystemMode(
        targetMode,
        reason.trim() || (targetMode === 'maintenance' ? 'Scheduled system upgrades' : 'Audit frozen'),
        expectedEndAt,
        targetMode !== 'normal'
      );

      if (res.success) {
        showSuccess(
          `System Mode Switched`,
          `SmartLedger successfully switched to ${targetMode.toUpperCase()} mode.`
        );
      }
    } catch (err: any) {
      showError('Mode Toggle Failed', err?.message || 'Server rejected system mode change.');
    } finally {
      setIsLoading(false);
    }
  };

  const getModeDetails = (mode: SystemMode) => {
    switch (mode) {
      case 'normal':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-500',
          label: '🟢 Normal Mode',
          desc: 'All user accounts and ledger writing features fully operational.'
        };
      case 'readonly':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-500',
          label: '🟡 Read-Only Mode',
          desc: 'Database state frozen. Users can browse but cannot write any transactions.'
        };
      case 'maintenance':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dot: 'bg-rose-500',
          label: '🔴 Maintenance Mode',
          desc: 'Standard users blocked. Fully reactive Maintenance Screen active.'
        };
    }
  };

  const currentBadge = getModeDetails(systemConfig.mode);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
          System Control & Availability Mode
        </h1>
        <p className={cn('text-xs sm:text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Control standard application availability, read-only freezing, and maintenance windows instantly.
        </p>
      </div>

      <M3Card variant="elevated">
        <div className="p-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Server size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Current Application State</span>
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5', currentBadge.bg)}>
                  <span className={cn('w-2 h-2 rounded-full animate-pulse', currentBadge.dot)} />
                  {currentBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentBadge.desc}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-slate-400 text-xs font-mono space-y-1">
            <div><span className="text-slate-500">Last Changed By:</span> {systemConfig.changedBy || 'System'}</div>
            <div><span className="text-slate-500">Timestamp:</span> {new Date(systemConfig.changedAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Configure Mode Settings
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">Reason / Banner Message</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Scheduled infrastructure maintenance and database optimization"
                  className="w-full text-xs bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">Estimated Duration (hours)</span>
                <select
                  value={expectedHours}
                  onChange={(e) => setExpectedHours(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="0.25">15 Minutes</option>
                  <option value="0.5">30 Minutes</option>
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="12">12 Hours</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <M3Button
              variant="text"
              onClick={() => handleToggleMode('normal')}
              disabled={isLoading}
              icon={CheckCircle2}
              className={cn(
                "py-3 font-bold rounded-xl transition-all",
                systemConfig.mode === 'normal'
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
              )}
            >
              Bring Online (Normal)
            </M3Button>

            <M3Button
              variant="text"
              onClick={() => handleToggleMode('readonly')}
              disabled={isLoading}
              icon={AlertTriangle}
              className={cn(
                "py-3 font-bold rounded-xl transition-all",
                systemConfig.mode === 'readonly'
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
              )}
            >
              Freeze (Read-Only)
            </M3Button>

            <M3Button
              variant="text"
              onClick={() => handleToggleMode('maintenance')}
              disabled={isLoading}
              icon={Power}
              className={cn(
                "py-3 font-bold rounded-xl transition-all",
                systemConfig.mode === 'maintenance'
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
              )}
            >
              Start Maintenance
            </M3Button>
          </div>
        </div>
      </M3Card>
    </div>
  );
}
