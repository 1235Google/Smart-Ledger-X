import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  AppNotification, 
  Bill, 
  NotificationSettings, 
  NotificationCategory 
} from '../types';
import { 
  subscribeUserNotifications, 
  markAsRead as repoMarkAsRead, 
  markAllAsRead as repoMarkAllAsRead, 
  deleteNotification as repoDeleteNotification, 
  clearAllRead as repoClearAllRead, 
  getNotificationSettings, 
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS 
} from '../lib/notificationRepository';
import { 
  subscribeBills, 
  createBill as repoCreateBill, 
  updateBill as repoUpdateBill, 
  deleteBill as repoDeleteBill, 
  markBillAsPaid as repoMarkBillAsPaid 
} from '../lib/billService';
import { 
  evaluateDuePayments, 
  evaluateUpcomingBills, 
  evaluateDailySummary, 
  evaluateWeeklyReport 
} from '../lib/notificationEngine';
import { useStore } from './StoreContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  bills: Bill[];
  settings: NotificationSettings;
  isLoading: boolean;
  activeFilter: NotificationCategory;
  setActiveFilter: (filter: NotificationCategory) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllRead: () => Promise<void>;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  addBill: (bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'isPaid'>) => Promise<string | null>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  markBillAsPaid: (id: string) => Promise<void>;
  triggerManualCheck: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<NotificationCategory>('all');

  const { transactions } = useStore();

  // Listen to Auth state changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Subscribe to real-time Notifications & Bills
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setBills([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch initial settings
    getNotificationSettings(currentUser.uid).then((s) => {
      setSettings(s);
    });

    // Sub to notifications
    const unsubNotifs = subscribeUserNotifications(currentUser.uid, (data) => {
      setNotifications(data);
      setIsLoading(false);
    });

    // Sub to bills
    const unsubBills = subscribeBills(currentUser.uid, (data) => {
      setBills(data);
    });

    return () => {
      unsubNotifs();
      unsubBills();
    };
  }, [currentUser]);

  // Periodic and Event-Driven Evaluation of Real Ledger Events
  const runEvaluation = useCallback(async () => {
    if (!currentUser || !transactions) return;
    try {
      // 1. Due Payments
      await evaluateDuePayments(currentUser.uid, transactions, settings);
      // 2. Upcoming Bills
      await evaluateUpcomingBills(currentUser.uid, bills, settings);
      // 3. Daily Summary (runs once per day if transactions occurred)
      await evaluateDailySummary(currentUser.uid, transactions, settings);
      // 4. Weekly Report (runs once every 7 days)
      await evaluateWeeklyReport(currentUser.uid, transactions, settings);
    } catch (e) {
      console.warn('[NotificationEngine] Evaluation error:', e);
    }
  }, [currentUser, transactions, bills, settings]);

  // Run evaluation when transactions, bills, or settings change
  useEffect(() => {
    if (currentUser) {
      // Debounce slight delay to avoid multi-execution on rapid store updates
      const timer = setTimeout(() => {
        runEvaluation();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentUser, transactions, bills, settings, runEvaluation]);

  // Actions
  const markAsRead = useCallback(async (id: string) => {
    if (!currentUser) return;
    // Optimistic UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await repoMarkAsRead(currentUser.uid, id);
  }, [currentUser]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    // Optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await repoMarkAllAsRead(currentUser.uid);
  }, [currentUser]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!currentUser) return;
    // Optimistic UI
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await repoDeleteNotification(currentUser.uid, id);
  }, [currentUser]);

  const clearAllRead = useCallback(async () => {
    if (!currentUser) return;
    // Optimistic UI
    setNotifications((prev) => prev.filter((n) => !n.read));
    await repoClearAllRead(currentUser.uid);
  }, [currentUser]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!currentUser) return;
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await saveNotificationSettings(currentUser.uid, merged);
  }, [currentUser, settings]);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Push notifications are not supported in your browser.');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      if (currentUser) {
        await updateSettings({ pushEnabled: granted });
      }
      return granted;
    } catch (e) {
      console.error('[Push Notifications] Permission request error:', e);
      return false;
    }
  }, [currentUser, updateSettings]);

  const addBill = useCallback(async (billData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'isPaid'>) => {
    if (!currentUser) return null;
    const id = await repoCreateBill(currentUser.uid, billData);
    return id;
  }, [currentUser]);

  const updateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    if (!currentUser) return;
    await repoUpdateBill(currentUser.uid, id, updates);
  }, [currentUser]);

  const deleteBill = useCallback(async (id: string) => {
    if (!currentUser) return;
    await repoDeleteBill(currentUser.uid, id);
  }, [currentUser]);

  const markBillAsPaid = useCallback(async (id: string) => {
    if (!currentUser) return;
    await repoMarkBillAsPaid(currentUser.uid, id);
  }, [currentUser]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    bills,
    settings,
    isLoading,
    activeFilter,
    setActiveFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllRead,
    updateSettings,
    requestPushPermission,
    addBill,
    updateBill,
    deleteBill,
    markBillAsPaid,
    triggerManualCheck: runEvaluation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
