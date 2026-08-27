import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Clock, ArrowDownLeft, FileText, CheckCircle2, 
  Send, AlertTriangle, Sparkles, RefreshCw, X, ChevronRight, Inbox
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate } from '../../lib/utils';

interface HUDNotification {
  id: string;
  type: 'due' | 'received' | 'report' | 'anomaly';
  title: string;
  subtitle: string;
  amount?: number;
  timeAgo: string;
  statusBadge: string;
  badgeColor: string;
  actionLabel: string;
  linkTo?: string;
}

export default function SmartReminderHUD() {
  const { transactions } = useStore();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Build real notifications from actual store transactions & reminders
  const realNotifications = useMemo<HUDNotification[]>(() => {
    const list: HUDNotification[] = [];

    // Pending / Due items
    const pendingTxs = transactions.filter((t) => t.type === 'pending');
    pendingTxs.slice(0, 3).forEach((t) => {
      list.push({
        id: `pending-${t.id}`,
        type: 'due',
        title: `Payment pending for ${t.personName}`,
        subtitle: (t as any).reason || (t as any).purpose || 'Payment awaiting collection or confirmation',
        amount: t.amount,
        timeAgo: t.dueDate ? `Due ${formatDate(t.dueDate)}` : 'Pending settlement',
        statusBadge: 'Pending Payment',
        badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        actionLabel: 'View Details',
        linkTo: '/pending',
      });
    });

    // Recent received items
    const receivedTxs = transactions.filter((t) => t.type === 'received');
    receivedTxs.slice(0, 2).forEach((t) => {
      list.push({
        id: `received-${t.id}`,
        type: 'received',
        title: `${formatCurrency(t.amount)} received`,
        subtitle: `From ${t.personName} • ${t.purpose || 'Payment verified'}`,
        amount: t.amount,
        timeAgo: t.date ? formatDate(t.date) : 'Recently logged',
        statusBadge: 'Received',
        badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        actionLabel: 'View Entry',
        linkTo: '/received',
      });
    });

    return list;
  }, [transactions]);

  const activeNotifications = realNotifications.filter(
    (n) => !dismissedIds.includes(n.id)
  );

  const handleAction = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleReset = () => {
    setDismissedIds([]);
  };

  return (
    <section className="relative py-20 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background ambient illumination */}
      <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <Bell size={14} className="text-amber-400" />
          Smart Payment Reminders
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Proactive Reminders That <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-400">
            Keep Your Cashflow On Schedule
          </span>
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-400 font-medium">
          Instant alerts for incoming settlements, overdue balances, and payment reminders directly from your ledger.
        </p>
      </div>

      {/* Futuristic Glass Terminal Box */}
      <div className="relative rounded-[36px] bg-gradient-to-b from-[#080d1a]/95 via-[#060a14]/98 to-[#03060c]/100 border border-white/[0.14] shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.15)] p-6 md:p-10 backdrop-blur-3xl overflow-hidden z-10">
        {/* Animated Accent Bar */}
        <motion.div
          animate={{ y: ['-100%', '600%'] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none shadow-[0_0_15px_#38bdf8]"
        />

        {/* Top Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Live Ledger Stream
            </div>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
              Encrypted Local Storage • Real-Time Sync
            </span>
          </div>

          <div className="flex items-center gap-3">
            {dismissedIds.length > 0 && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw size={12} /> Restore Feed
              </button>
            )}
            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/20">
              {activeNotifications.length} Active Notice{activeNotifications.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        {activeNotifications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {activeNotifications.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)', transition: { duration: 0.25 } }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative rounded-2xl md:rounded-[24px] bg-[#0c1222]/80 hover:bg-[#10182e]/90 border border-white/[0.08] hover:border-cyan-500/40 p-5 md:p-6 transition-all shadow-xl backdrop-blur-xl flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle Corner Accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/40 group-hover:border-cyan-400 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/40 group-hover:border-cyan-400 transition-colors" />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider border ${item.badgeColor}`}>
                        {item.statusBadge}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {item.timeAgo}
                      </span>
                    </div>

                    <div className="flex items-start gap-3.5 my-2">
                      <div className={`p-3 rounded-2xl flex-shrink-0 ${
                        item.type === 'due' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        item.type === 'received' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {item.type === 'due' ? <AlertTriangle size={20} /> :
                         item.type === 'received' ? <ArrowDownLeft size={20} /> :
                         <FileText size={20} />}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    {item.amount ? (
                      <div className="text-lg font-black text-white tracking-tight font-mono">
                        {formatCurrency(item.amount)}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-slate-400">Verified Notice</div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(item.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                      >
                        {item.actionLabel} <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty state when no transactions added yet */
          <div className="text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Inbox size={26} />
            </div>
            <h4 className="text-lg font-bold text-white">No transactions added yet</h4>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Smart payment reminders and settlement notices will appear here once you log pending or completed entries.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
