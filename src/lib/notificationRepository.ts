import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  AppNotification, 
  NotificationType, 
  NotificationPriority, 
  NotificationSettings 
} from '../types';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  duePayments: true,
  upcomingBills: true,
  backupAlerts: true,
  securityAlerts: true,
  dailySummary: true,
  weeklyReport: true,
  pushEnabled: false,
  emailNotifications: false,
  emailToggles: {
    duePayments: true,
    upcomingBills: true,
    backupAlerts: true,
    securityAlerts: true,
    dailySummary: false,
    weeklyReport: true,
  },
  emailAddress: '',
  updatedAt: new Date().toISOString(),
};

/**
 * Determines notification category from its type.
 */
export function deriveCategory(type: NotificationType): 'finance' | 'security' | 'backup' | 'bills' | 'system' {
  if (type === 'due_payment' || type.startsWith('ledger_') || type.startsWith('pending_') || type === 'daily_summary' || type === 'weekly_report') {
    return 'finance';
  }
  if (type === 'bill_reminder') {
    return 'bills';
  }
  if (type.startsWith('backup_') || type === 'admin_db_backup' || type === 'admin_db_restore') {
    return 'backup';
  }
  if (type.startsWith('security_') || type.startsWith('auth_') || type.startsWith('admin_')) {
    return 'security';
  }
  return 'system';
}

/**
 * Derives default action URL and label if not explicitly provided.
 */
export function deriveAction(type: NotificationType): { url: string; label: string } {
  switch (type) {
    case 'due_payment':
    case 'pending_created':
    case 'pending_updated':
      return { url: '/pending', label: 'View Payment' };
    case 'bill_reminder':
      return { url: '/notifications?tab=bills', label: 'Manage Bills' };
    case 'backup_success':
    case 'backup_failed':
    case 'admin_db_backup':
      return { url: '/backup', label: 'Backup Vault' };
    case 'security_alert':
    case 'security_new_device':
    case 'security_password_changed':
    case 'security_pin_changed':
    case 'security_backup_restored':
    case 'security_failed_login':
      return { url: '/security', label: 'Security Center' };
    case 'daily_summary':
      return { url: '/analytics', label: 'View Analytics' };
    case 'weekly_report':
    case 'report_generated':
      return { url: '/reports', label: 'Weekly Report' };
    case 'ledger_income_added':
      return { url: '/received', label: 'View Income' };
    case 'ledger_expense_added':
      return { url: '/sent', label: 'View Sent Money' };
    default:
      return { url: '/', label: 'Open Ledger' };
  }
}

/**
 * Creates a real notification in Firestore under users/{uid}/notifications.
 * Includes automatic deduplication check by eventKey / referenceId to prevent duplicate spam.
 */
export async function createNotification(params: {
  title: string;
  message: string;
  type: NotificationType;
  userId?: string;
  priority?: NotificationPriority;
  category?: 'finance' | 'security' | 'backup' | 'bills' | 'system';
  actionUrl?: string;
  actionLabel?: string;
  referenceId?: string;
  eventKey?: string;
  metadata?: Record<string, any>;
}): Promise<string | null> {
  const currentUid = params.userId || auth.currentUser?.uid;
  if (!currentUid) {
    console.log('[NotificationRepository] Skipping: No authenticated user.');
    return null;
  }

  const category = params.category || deriveCategory(params.type);
  const action = deriveAction(params.type);
  const actionUrl = params.actionUrl || action.url;
  const actionLabel = params.actionLabel || action.label;
  const priority = params.priority || (params.type === 'due_payment' || params.type.startsWith('security_') ? 'high' : 'medium');
  const nowIso = new Date().toISOString();

  // Deduplication check: Check if an active notification with identical eventKey already exists
  if (params.eventKey) {
    try {
      const userNotifsCol = collection(db, 'users', currentUid, 'notifications');
      const dupQuery = query(userNotifsCol, where('eventKey', '==', params.eventKey), limit(1));
      const existing = await getDocs(dupQuery);
      if (!existing.empty) {
        // Already exists
        return existing.docs[0].id;
      }
    } catch (e) {
      // Fall through to creation if query fails
    }
  }

  const notifPayload = {
    userId: currentUid,
    type: params.type,
    category,
    title: params.title,
    message: params.message,
    createdAt: nowIso,
    timestamp: Date.now(),
    read: false,
    actionUrl,
    actionLabel,
    priority,
    referenceId: params.referenceId || '',
    eventKey: params.eventKey || '',
    metadata: params.metadata || {},
  };

  try {
    // 1. Primary path: users/{uid}/notifications
    const userNotifsRef = collection(db, 'users', currentUid, 'notifications');
    const docRef = await addDoc(userNotifsRef, notifPayload);

    // Also write to global notifications collection for backward compatibility if needed
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notifPayload,
        id: docRef.id
      });
    } catch (e) {
      // Non-blocking
    }

    // 2. Dispatch Push Notification if enabled & supported
    triggerBrowserPushIfAllowed(params.title, params.message, actionUrl);

    // 3. Dispatch Email Notification if enabled
    triggerEmailNotificationIfEnabled(currentUid, {
      type: params.type,
      title: params.title,
      message: params.message,
      category,
      metadata: params.metadata,
    });

    return docRef.id;
  } catch (error) {
    console.error('[NotificationRepository Error] Failed to create notification:', error);
    return null;
  }
}

/**
 * Subscribes to real-time notification updates for a user.
 */
export function subscribeUserNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const userNotifsRef = collection(db, 'users', userId, 'notifications');
  const q = query(userNotifsRef, limit(100));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: data.userId || userId,
          type: data.type as NotificationType,
          category: data.category || deriveCategory(data.type),
          title: data.title || '',
          message: data.message || '',
          createdAt: data.createdAt || new Date().toISOString(),
          timestamp: data.timestamp || new Date(data.createdAt || Date.now()).getTime(),
          read: !!data.read,
          actionUrl: data.actionUrl || deriveAction(data.type).url,
          actionLabel: data.actionLabel || deriveAction(data.type).label,
          priority: data.priority || 'medium',
          referenceId: data.referenceId || '',
          eventKey: data.eventKey || '',
          metadata: data.metadata || {},
        });
      });

      // Sort newest first
      items.sort((a, b) => {
        const tB = b.timestamp || new Date(b.createdAt).getTime();
        const tA = a.timestamp || new Date(a.createdAt).getTime();
        return tB - tA;
      });

      onData(items);
    },
    (error) => {
      console.warn('[NotificationRepository] Primary listener error:', error?.message);
      // Fallback query without custom index
      const fallbackUnsub = onSnapshot(
        userNotifsRef,
        (snap) => {
          const items: AppNotification[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              userId: data.userId || userId,
              type: data.type as NotificationType,
              category: data.category || deriveCategory(data.type),
              title: data.title || '',
              message: data.message || '',
              createdAt: data.createdAt || new Date().toISOString(),
              timestamp: data.timestamp || new Date(data.createdAt || Date.now()).getTime(),
              read: !!data.read,
              actionUrl: data.actionUrl,
              actionLabel: data.actionLabel,
              priority: data.priority || 'medium',
              referenceId: data.referenceId || '',
              eventKey: data.eventKey || '',
              metadata: data.metadata || {},
            });
          });
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onData(items);
        },
        (err2) => {
          console.error('[NotificationRepository] Fallback listener failed:', err2);
        }
      );
      return fallbackUnsub;
    }
  );

  return () => unsubscribe();
}

/**
 * Marks a notification as read.
 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) return;
  try {
    const ref = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  } catch (error) {
    console.error('[NotificationRepository] Error marking as read:', error);
  }
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const userNotifsCol = collection(db, 'users', userId, 'notifications');
    const q = query(userNotifsCol, where('read', '==', false), limit(100));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('[NotificationRepository] Error marking all as read:', error);
  }
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) return;
  try {
    const ref = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('[NotificationRepository] Error deleting notification:', error);
  }
}

/**
 * Clears all read notifications for a user.
 */
export async function clearAllRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const userNotifsCol = collection(db, 'users', userId, 'notifications');
    const q = query(userNotifsCol, where('read', '==', true), limit(100));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('[NotificationRepository] Error clearing read notifications:', error);
  }
}

/**
 * Automatically dismisses/resolves due payment notifications when marked as Paid.
 */
export async function dismissDuePaymentNotification(userId: string, transactionId: string): Promise<void> {
  if (!userId || !transactionId) return;
  try {
    const userNotifsCol = collection(db, 'users', userId, 'notifications');
    const q = query(
      userNotifsCol, 
      where('type', '==', 'due_payment'),
      where('referenceId', '==', transactionId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (e) {
    console.warn('[NotificationRepository] Could not dismiss payment notification:', e);
  }
}

/**
 * Automatically dismisses/resolves bill notifications when bill is marked Paid.
 */
export async function dismissBillNotification(userId: string, billId: string): Promise<void> {
  if (!userId || !billId) return;
  try {
    const userNotifsCol = collection(db, 'users', userId, 'notifications');
    const q = query(
      userNotifsCol, 
      where('type', '==', 'bill_reminder'),
      where('referenceId', '==', billId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (e) {
    console.warn('[NotificationRepository] Could not dismiss bill notification:', e);
  }
}

/**
 * Fetches Notification Settings for a user.
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  if (!userId) return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const settingsDoc = doc(db, 'users', userId, 'settings', 'notifications');
    const snap = await getDoc(settingsDoc);
    if (snap.exists()) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...snap.data() } as NotificationSettings;
    }
  } catch (e) {
    console.warn('[NotificationRepository] Fetch settings failed, using defaults:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * Saves Notification Settings for a user.
 */
export async function saveNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
  if (!userId) return;
  try {
    const settingsDoc = doc(db, 'users', userId, 'settings', 'notifications');
    await setDoc(settingsDoc, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[NotificationRepository] Save settings failed:', e);
  }
}

/**
 * Browser Push Notification Trigger (Standard Web Notifications API).
 */
function triggerBrowserPushIfAllowed(title: string, message: string, actionUrl?: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const push = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: title,
      });

      if (actionUrl) {
        push.onclick = () => {
          window.focus();
          if (window.location.pathname !== actionUrl) {
            window.location.href = actionUrl;
          }
          push.close();
        };
      }
    }
  } catch (e) {
    // Non-blocking
  }
}

/**
 * Server Email Trigger (Invokes /api/send-notification-email if email alerts are configured).
 */
async function triggerEmailNotificationIfEnabled(
  userId: string, 
  payload: { type: NotificationType; title: string; message: string; category: string; metadata?: any }
) {
  try {
    const settings = await getNotificationSettings(userId);
    if (!settings.emailNotifications) return;

    // Check individual toggles
    let shouldSend = false;
    if (payload.type === 'due_payment' && settings.emailToggles.duePayments) shouldSend = true;
    else if (payload.type === 'bill_reminder' && settings.emailToggles.upcomingBills) shouldSend = true;
    else if ((payload.type.startsWith('backup_') || payload.type === 'admin_db_backup') && settings.emailToggles.backupAlerts) shouldSend = true;
    else if ((payload.type.startsWith('security_') || payload.type.startsWith('auth_')) && settings.emailToggles.securityAlerts) shouldSend = true;
    else if (payload.type === 'daily_summary' && settings.emailToggles.dailySummary) shouldSend = true;
    else if (payload.type === 'weekly_report' && settings.emailToggles.weeklyReport) shouldSend = true;

    if (!shouldSend) return;

    const emailRecipient = settings.emailAddress || auth.currentUser?.email;
    if (!emailRecipient) return;

    // Send to backend endpoint
    fetch('/api/send-notification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: emailRecipient,
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata,
      }),
    }).catch((err) => console.warn('[Notification Email Trigger Warning]:', err));
  } catch (e) {
    // Non-blocking
  }
}
