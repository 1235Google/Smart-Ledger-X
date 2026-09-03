import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Clock, ArrowDownLeft, FileText, CheckCircle2, 
  Send, AlertTriangle, Sparkles, RefreshCw, X, ChevronRight, Inbox
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
        badgeColor: 'text-[#ffd60a] bg-[#ffd60a]/10 border-[#ffd60a]/30',
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
        badgeColor: 'text-[#30d158] bg-[#30d158]/10 border-[#30d158]/30',
        actionLabel: 'View Entry',
        linkTo: '/received',
      });
    });

    return list;
  }, [transactions]);

  const activeNotifications = realNotifications.filter(
    (n) => !dismissedIds.includes(n.id)
  );

  const handleAction = (item: HUDNotification) => {
    if (item.linkTo) {
      navigate(item.linkTo);
    }
    setDismissedIds((prev) => [...prev, item.id]);
  };

  const handleReset = () => {
    setDismissedIds([]);
  };

  return (
    <div className="relative rounded-[32px] vision-glass-elevated p-6 sm:p-8 md:p-10 backdrop-blur-3xl overflow-hidden z-10 select-none">
      {/* Specular Top Rim */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#30d158]/10 border border-[#30d158]/25 text-[#30d158] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158] animate-pulse" />
            Active Ledger HUD
          </div>
          <span className="text-xs text-[#86868b] font-medium hidden sm:inline-block">
            Encrypted Client-Side Vault • Real-Time Stream
          </span>
        </div>

        <div className="flex items-center gap-3">
          {dismissedIds.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-[#a1a1a6] font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={12} /> Restore Feed
            </motion.button>
          )}
          <span className="text-xs font-bold text-[#64d2ff] bg-[#64d2ff]/10 px-3 py-1 rounded-full border border-[#64d2ff]/25">
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
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, filter: 'blur(8px)', transition: { duration: 0.25 } }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className="group relative rounded-[24px] vision-glass p-5 md:p-6 transition-all flex flex-col justify-between overflow-hidden shadow-lg"
              >
                {/* Top Specular Line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.badgeColor}`}>
                      {item.statusBadge}
                    </span>
                    <span className="text-xs text-[#86868b] flex items-center gap-1">
                      <Clock size={12} /> {item.timeAgo}
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5 my-2">
                    <div className={`p-3 rounded-2xl flex-shrink-0 border ${
                      item.type === 'due' ? 'bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30' :
                      item.type === 'received' ? 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30' :
                      'bg-[#64d2ff]/15 text-[#64d2ff] border-[#64d2ff]/30'
                    }`}>
                      {item.type === 'due' ? <AlertTriangle size={20} /> :
                       item.type === 'received' ? <ArrowDownLeft size={20} /> :
                       <FileText size={20} />}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight group-hover:text-[#64d2ff] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#86868b] mt-1 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                  {item.amount ? (
                    <div className="text-xl font-extrabold text-white tracking-tight font-tabular">
                      {formatCurrency(item.amount)}
                    </div>
                  ) : (
                    <div className="text-xs text-[#86868b]">Verified Notice</div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleAction(item)}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] text-white font-bold text-xs shadow-md shadow-[#0a84ff]/30 transition-all flex items-center gap-1.5"
                  >
                    {item.actionLabel} <ChevronRight size={13} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-2xl vision-glass text-[#86868b] flex items-center justify-center mx-auto">
            <Inbox size={26} />
          </div>
          <h4 className="text-base font-bold text-white">No transactions added yet</h4>
          <p className="text-xs text-[#86868b] max-w-md mx-auto">
            Smart payment reminders and settlement notices will appear here once you log pending or completed entries.
          </p>
        </div>
      )}
    </div>
  );
}
