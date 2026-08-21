import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Cloud, 
  Sparkles,
  FlaskConical,
  Clock,
  ChevronRight
} from 'lucide-react';
import { BackupTimelineEvent } from '../../types';
import { BackupService } from '../../lib/backupService';

interface BackupTimelineProps {
  events: BackupTimelineEvent[];
  onSelectSnapshot?: (snapshotId: string) => void;
}

export default function BackupTimeline({ events, onSelectSnapshot }: BackupTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'backup' | 'restore' | 'verify'>('all');

  const filteredEvents = events.filter((ev) => {
    if (filter === 'all') return true;
    if (filter === 'backup') return ev.type === 'backup_auto' || ev.type === 'backup_manual';
    if (filter === 'restore') return ev.type === 'restore';
    if (filter === 'verify') return ev.type === 'verify' || ev.type === 'test_recovery';
    return true;
  });

  const getEventBadge = (event: BackupTimelineEvent) => {
    switch (event.type) {
      case 'backup_auto':
        return {
          icon: Cloud,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
          dot: 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]',
          label: 'Auto 24h Backup'
        };
      case 'backup_manual':
        return {
          icon: Sparkles,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          dot: 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
          label: 'Manual Backup'
        };
      case 'restore':
        return {
          icon: RotateCcw,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          label: 'Restore Point Applied'
        };
      case 'verify':
        return {
          icon: ShieldCheck,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
          dot: 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]',
          label: 'Integrity Verification'
        };
      case 'test_recovery':
        return {
          icon: FlaskConical,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          dot: 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]',
          label: 'Recovery Test (Dry-Run)'
        };
      case 'failed':
      default:
        return {
          icon: AlertTriangle,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
          label: 'Operation Alert'
        };
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0c0e18]/90 via-[#0a0b12]/90 to-[#07080d]/90 border border-white/10 p-6 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <History size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Audit & Operations Timeline</h3>
            <p className="text-xs text-slate-400">Chronological ledger backup & restore lifecycle events</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'all' ? 'bg-blue-500 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilter('backup')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'backup' ? 'bg-blue-500 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Backups
          </button>
          <button
            onClick={() => setFilter('restore')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'restore' ? 'bg-blue-500 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Restores
          </button>
          <button
            onClick={() => setFilter('verify')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'verify' ? 'bg-blue-500 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Verifications
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="mt-6 relative">
        {/* Continuous vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500/40 via-indigo-500/20 to-transparent pointer-events-none" />

        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 text-sm">
            No timeline events matching the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filteredEvents.slice(0, 15).map((event, idx) => {
                const badge = getEventBadge(event);
                const IconComponent = badge.icon;
                const dateObj = new Date(event.timestamp);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative pl-10 group"
                  >
                    {/* Node Dot */}
                    <div className={`absolute left-[11px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-[#090a12] ${badge.dot} transition-transform group-hover:scale-125 z-10`} />

                    {/* Content Box */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.color}`}>
                            <IconComponent size={12} />
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-xs font-semibold text-white truncate">{event.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock size={11} className="text-slate-500" />
                          <span>{BackupService.formatRelativeTime(event.timestamp)}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-500">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>

                      {/* Snapshot ID link if applicable */}
                      {event.snapshotId && onSelectSnapshot && (
                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[240px]">
                            ID: {event.snapshotId}
                          </span>
                          <button
                            onClick={() => onSelectSnapshot(event.snapshotId!)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>Inspect Snapshot</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
