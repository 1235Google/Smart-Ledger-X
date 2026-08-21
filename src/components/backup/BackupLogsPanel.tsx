import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { BackupLog } from '../../types';
import { BackupService } from '../../lib/backupService';
import { useToast } from '../../context/ToastContext';

interface BackupLogsPanelProps {
  logs: BackupLog[];
  onClearLogs: () => void;
  onRefresh?: () => void;
}

export default function BackupLogsPanel({ logs, onClearLogs, onRefresh }: BackupLogsPanelProps) {
  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  const filteredLogs = logs.filter((l) => {
    if (levelFilter === 'all') return true;
    return l.level === levelFilter;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.event}: ${l.details || ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Logs Copied', 'All diagnostic logs copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: BackupLog['level']) => {
    switch (level) {
      case 'success':
        return { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 };
      case 'warning':
        return { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: AlertTriangle };
      case 'error':
        return { color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: AlertTriangle };
      case 'info':
      default:
        return { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: Info };
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Terminal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Live Diagnostic Logs</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Live Stream
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time encryption, compression, and synchronization telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Level Filter */}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
            {(['all', 'info', 'success', 'warning', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-0.5 rounded-lg capitalize transition-colors ${
                  levelFilter === lvl ? 'bg-blue-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyLogs}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Copy Logs"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          <button
            onClick={onClearLogs}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
            title="Clear Logs"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="mt-4 rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2 text-slate-300 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No diagnostic log events available.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getLevelBadge(log.level);
            const Icon = badge.icon;
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 hover:bg-white/[0.03] p-1.5 rounded transition-colors group"
              >
                <span className="text-slate-500 flex-shrink-0 select-none text-[11px]">
                  {timeStr}
                </span>

                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border flex-shrink-0 ${badge.color}`}>
                  <Icon size={10} />
                  <span>{log.level}</span>
                </span>

                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-100">{log.event}: </span>
                  <span className="text-slate-400">{log.details || ''}</span>
                  {log.durationMs && (
                    <span className="text-teal-400 text-[11px] ml-1.5">({log.durationMs}ms)</span>
                  )}
                  {log.size && (
                    <span className="text-indigo-400 text-[11px] ml-1.5">[{BackupService.formatSize(log.size)}]</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
