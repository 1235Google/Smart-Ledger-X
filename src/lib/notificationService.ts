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
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppNotification, NotificationType } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Notification Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Creates a real notification in Firestore.
 */
export async function createNotification(params: {
  title: string;
  message: string;
  type: NotificationType;
  userId?: string;
  referenceId?: string;
}): Promise<string | null> {
  const targetUserId = params.userId || auth.currentUser?.uid || 'all';
  const newNotif = {
    title: params.title,
    message: params.message,
    type: params.type,
    createdAt: new Date().toISOString(),
    read: false,
    userId: targetUserId,
    referenceId: params.referenceId || ''
  };

  const collectionPath = 'notifications';
  try {
    const docRef = await addDoc(collection(db, collectionPath), newNotif);
    return docRef.id;
  } catch (err) {
    console.warn('Could not save notification to Firestore:', err);
    return null;
  }
}

/**
 * Subscribes to real-time notification updates for a user.
 */
export function subscribeNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void
): () => void {
  if (!userId || !auth.currentUser) {
    onData([]);
    return () => {};
  }

  const collectionPath = 'notifications';
  let unsubscribePrimary: (() => void) | null = null;
  let unsubscribeFallback: (() => void) | null = null;

  try {
    const primaryQuery = query(
      collection(db, collectionPath),
      where('userId', 'in', [userId, 'all']),
      limit(50)
    );

    const processSnapshot = (snapshot: any) => {
      const notifs: AppNotification[] = [];
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        const createdAtMillis = new Date(data.createdAt).getTime();

        if (createdAtMillis > 0 && createdAtMillis < ninetyDaysAgo) {
          deleteNotification(docSnap.id).catch(() => {});
          return;
        }

        notifs.push({
          id: docSnap.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type as NotificationType,
          createdAt: data.createdAt || new Date().toISOString(),
          read: !!data.read,
          userId: data.userId || userId,
          referenceId: data.referenceId || ''
        });
      });

      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(notifs);
    };

    unsubscribePrimary = onSnapshot(
      primaryQuery,
      processSnapshot,
      (error) => {
        if (!auth.currentUser) return;
        console.warn('Notification primary listener issue, trying simple fallback:', error);
        const fallbackQuery = query(
          collection(db, collectionPath),
          where('userId', '==', userId),
          limit(50)
        );
        unsubscribeFallback = onSnapshot(
          fallbackQuery,
          processSnapshot,
          (fallbackError) => {
            if (auth.currentUser) {
              console.warn('Notification fallback listener notice:', fallbackError);
            }
          }
        );
      }
    );

    return () => {
      if (unsubscribePrimary) unsubscribePrimary();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  } catch (error) {
    console.error('Failed to subscribe to notifications:', error);
    return () => {};
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const docPath = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    console.warn('Could not mark notification as read:', error);
  }
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const collectionPath = 'notifications';
  try {
    const q = query(
      collection(db, collectionPath),
      where('userId', 'in', [userId, 'all']),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.warn('Could not mark all notifications as read:', error);
  }
}

/**
 * Deletes a notification from Firestore.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const docPath = `notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.warn('Could not delete notification:', error);
  }
}
