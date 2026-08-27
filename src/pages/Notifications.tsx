import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Filter, 
  Settings as SettingsIcon, 
  Receipt, 
  Shield, 
  ShieldAlert, 
  Cloud, 
  Clock, 
  Wallet, 
  FileText, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle2, 
  Sparkles, 
  Inbox, 
  Plus, 
  RefreshCw,
  Search
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { AppNotification, NotificationCategory, NotificationType } from '../types';
import NotificationSettingsModal from '../components/notifications/NotificationSettingsModal';
import BillManagerModal from '../components/notifications/BillManagerModal';
import AddBillModal from '../components/notifications/AddBillModal';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 10) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getNotificationVisuals(type: NotificationType) {
  if (type === 'due_payment' || type.startsWith('pending_')) {
    return {
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      label: 'Due Payment',
    };
  }
  if (type === 'bill_reminder') {
    return {
      icon: Receipt,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      label: 'Upcoming Bill',
    };
  }
  if (type.startsWith('backup_') || type === 'admin_db_backup' || type === 'admin_db_restore') {
    return {
      icon: Cloud,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      label: 'Cloud Backup',
    };
  }
  if (type.startsWith('security_') || type.startsWith('auth_') || type.startsWith('admin_')) {
    return {
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      label: 'Security Alert',
    };
  }
  if (type === 'daily_summary' || type === 'weekly_report' || type.startsWith('report_')) {
    return {
      icon: FileText,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      label: 'Financial Digest',
    };
  }
  return {
    icon: Wallet,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    label: 'Ledger Activity',
  };
}

export default function Notifications() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const { 
    notifications, 
    unreadCount, 
    bills,
    isLoading, 
    activeFilter, 
    setActiveFilter, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllRead,
    triggerManualCheck 
  } = useNotifications();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBillManagerOpen, setIsBillManagerOpen] = useState(() => searchParams.get('tab') === 'bills');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync tab searchParam
  React.useEffect(() => {
    if (searchParams.get('tab') === 'bills') {
      setIsBillManagerOpen(true);
    }
  }, [searchParams]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerManualCheck();
      showSuccess('Evaluated latest financial & security events');
    } catch (e) {
      showError('Check failed');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleActionClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    if (notif.actionUrl) {
      if (notif.actionUrl === '/notifications?tab=bills') {
        setIsBillManagerOpen(true);
      } else {
        navigate(notif.actionUrl);
      }
    }
  };

  // Filter & Search Logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // 1. Filter Category
      if (activeFilter === 'unread' && notif.read) return false;
      if (activeFilter === 'finance' && notif.category !== 'finance') return false;
      if (activeFilter === 'security' && notif.category !== 'security') return false;
      if (activeFilter === 'backup' && notif.category !== 'backup') return false;
      if (activeFilter === 'bills' && notif.category !== 'bills') return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = notif.title.toLowerCase().includes(q);
        const matchMsg = notif.message.toLowerCase().includes(q);
        return matchTitle || matchMsg;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  // Group notifications by date: Today, Yesterday, Earlier
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groups: {
      today: AppNotification[];
      yesterday: AppNotification[];
      earlier: AppNotification[];
    } = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    filteredNotifications.forEach((notif) => {
      const dateStr = (notif.createdAt || '').split('T')[0];
      if (dateStr === todayStr) {
        groups.today.push(notif);
      } else if (dateStr === yesterdayStr) {
        groups.yesterday.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });

    return groups;
  }, [filteredNotifications]);

  const filterTabs: { id: NotificationCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'finance', label: 'Finance', count: notifications.filter(n => n.category === 'finance').length },
    { id: 'security', label: 'Security', count: notifications.filter(n => n.category === 'security').length },
    { id: 'backup', label: 'Backup', count: notifications.filter(n => n.category === 'backup').length },
    { id: 'bills', label: 'Bills', count: notifications.filter(n => n.category === 'bills').length },
  ];

  return (
    <div className="min-h-screen bg-[#05060a] text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900/60 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Bell size={28} className={unreadCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Notification Center
                </h1>
                {unreadCount > 0 && (
                  <span className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Real-time alerts generated from verified ledger, billing, backup, and security events.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Re-evaluate application events"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setIsBillManagerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Receipt size={15} className="text-indigo-400" />
              Manage Bills ({bills.filter(b => !b.isPaid).length})
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <CheckCheck size={15} />
                Mark All Read
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              title="Notification Settings"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Horizontal Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full md:w-auto scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                  : 'bg-neutral-900/60 hover:bg-neutral-800 text-slate-400 hover:text-white border-white/5'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeFilter === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input & Clear Read */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {notifications.some(n => n.read) && (
            <button
              onClick={clearAllRead}
              title="Clear all read notifications"
              className="p-2 rounded-2xl bg-neutral-900/60 hover:bg-rose-500/10 border border-white/10 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Notifications Content Area */}
      <div className="space-y-6">
        {isLoading ? (
          /* Loading Skeletons */
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-neutral-900/40 border border-white/5 animate-pulse p-4 flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="w-1/3 h-4 bg-white/10 rounded-md" />
                  <div className="w-2/3 h-3 bg-white/5 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State Illustration */
          <div className="p-16 text-center rounded-3xl bg-neutral-900/40 border border-white/5 backdrop-blur-xl flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-inner">
              <Inbox size={36} />
            </div>
            <h3 className="text-xl font-bold text-white">No Notifications</h3>
            <p className="text-sm text-slate-400 mt-1.5 max-w-md">
              {activeFilter === 'unread'
                ? "You're all caught up! No unread notifications at the moment."
                : activeFilter !== 'all'
                ? `No ${activeFilter} notifications match your criteria.`
                : 'Real alerts will automatically appear here as financial due dates, backup events, and security triggers occur.'}
            </p>
            {activeFilter === 'bills' && (
              <button
                onClick={() => setIsBillManagerOpen(true)}
                className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all"
              >
                <Plus size={15} /> Schedule a Bill
              </button>
            )}
          </div>
        ) : (
          /* Grouped Notification Lists */
          <div className="space-y-8">
            {/* 1. Today Group */}
            {groupedNotifications.today.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Today</h3>
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {groupedNotifications.today.length} alerts
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedNotifications.today.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      onActionClick={handleActionClick}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Yesterday Group */}
            {groupedNotifications.yesterday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yesterday</h3>
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {groupedNotifications.yesterday.length} alerts
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedNotifications.yesterday.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      onActionClick={handleActionClick}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Earlier Group */}
            {groupedNotifications.earlier.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Earlier</h3>
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {groupedNotifications.earlier.length} alerts
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedNotifications.earlier.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      onActionClick={handleActionClick}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Bill Manager Modal */}
      <BillManagerModal
        isOpen={isBillManagerOpen}
        onClose={() => setIsBillManagerOpen(false)}
      />
    </div>
  );
}

/**
 * Individual Notification Card Component
 */
interface NotificationCardProps {
  notification: AppNotification;
  onActionClick: (n: AppNotification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationCard({ notification: n, onActionClick, onMarkRead, onDelete }: NotificationCardProps) {
  const visuals = getNotificationVisuals(n.type);
  const Icon = visuals.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        !n.read
          ? 'bg-gradient-to-r from-neutral-900/90 to-neutral-900/60 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
          : 'bg-neutral-900/40 border-white/5 hover:border-white/10 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Unread Glow Indicator */}
      {!n.read && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/80 animate-pulse" />
      )}

      {/* Left Details */}
      <div className="flex items-start gap-4 pl-3 sm:pl-4 min-w-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-inner ${visuals.bgColor} ${visuals.borderColor} ${visuals.color}`}>
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${visuals.badgeBg}`}>
              {visuals.label}
            </span>

            {n.priority === 'high' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                High Priority
              </span>
            )}

            <span className="text-[11px] text-slate-500 font-medium ml-auto sm:ml-0">
              {formatRelativeTime(n.createdAt)}
            </span>
          </div>

          <h4 className={`text-sm sm:text-base font-semibold truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>
            {n.title}
          </h4>

          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2">
            {n.message}
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2 self-end sm:self-center pl-3 sm:pl-0 flex-shrink-0">
        {n.actionUrl && (
          <button
            onClick={() => onActionClick(n)}
            className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            {n.actionLabel || 'View'}
            <ArrowUpRight size={14} />
          </button>
        )}

        {!n.read && (
          <button
            onClick={() => onMarkRead(n.id)}
            title="Mark as read"
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors"
          >
            <CheckCircle2 size={17} />
          </button>
        )}

        <button
          onClick={() => onDelete(n.id)}
          title="Delete notification"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </motion.div>
  );
}
