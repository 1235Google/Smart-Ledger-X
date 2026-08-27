import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  X, 
  Wallet, 
  Clock, 
  FileText, 
  ShieldAlert, 
  Receipt,
  Cloud,
  ArrowRight,
  Inbox,
  Settings
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { cn } from '../lib/utils';

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

function getNotificationIcon(type: NotificationType) {
  if (type === 'due_payment' || type.startsWith('pending_')) {
    return { icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  }
  if (type === 'bill_reminder') {
    return { icon: Receipt, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
  }
  if (type.startsWith('backup_') || type === 'admin_db_backup') {
    return { icon: Cloud, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  }
  if (type.startsWith('security_') || type.startsWith('auth_') || type.startsWith('admin_')) {
    return { icon: ShieldAlert, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  }
  if (type === 'daily_summary' || type === 'weekly_report' || type.startsWith('report_')) {
    return { icon: FileText, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
  }
  return { icon: Wallet, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
}

export interface NotificationDropdownRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const NotificationDropdown = forwardRef<NotificationDropdownRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  }));

  // Outside click & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const displayNotifications = notifications.slice(0, 7);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white relative rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#05060a] shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="region"
            aria-label="Notification list"
            className="absolute right-0 top-full mt-2 w-[340px] sm:w-[400px] bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[82vh] max-w-[calc(100vw-2rem)]"
          >
            {/* Panel Header */}
            <div className="p-4 px-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-indigo-400" />
                <h3 className="font-bold text-white text-base">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-1 px-2 rounded-lg hover:bg-white/5 font-medium"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notification List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[420px]">
              {displayNotifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-400">
                    <Inbox size={26} />
                  </div>
                  <p className="text-white font-bold text-base">No Notifications</p>
                  <p className="text-indigo-300 text-xs font-semibold mt-1">You're all caught up.</p>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-[240px] leading-relaxed">
                    Real notifications will appear here as you record ledger activity, receive bill reminders, and sync cloud data.
                  </p>
                </div>
              ) : (
                displayNotifications.map((notif) => {
                  const { icon: Icon, color } = getNotificationIcon(notif.type);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={cn(
                        "p-3.5 px-4 flex gap-3 cursor-pointer transition-colors group relative hover:bg-white/5",
                        !notif.read ? "bg-indigo-500/[0.05]" : ""
                      )}
                    >
                      {!notif.read && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      )}

                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm", color)}>
                        <Icon size={16} />
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className={cn("text-xs truncate font-medium", !notif.read ? "text-white font-bold" : "text-slate-300")}>
                            {notif.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          {notif.priority === 'high' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(e, notif.id)}
                        title="Delete notification"
                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 px-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span>View All Notifications ({notifications.length})</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications?tab=bills');
                }}
                className="text-xs text-slate-400 hover:text-white py-1 px-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Bills
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default NotificationDropdown;
