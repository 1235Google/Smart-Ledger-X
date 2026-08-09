import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  limit, 
  onSnapshot, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppNotification, NotificationType } from '../types';

export async function createNotification(params: {
  title: string;
  message: string;
  type: NotificationType;
  userId?: string;
  referenceId?: string;
}): Promise<string | null> {
  const currentUid = auth.currentUser?.uid;
  const targetUserId = params.userId || currentUid;
  
  const newNotif = {
    title: params.title,
    message: params.message,
    type: params.type,
    createdAt: new Date().toISOString(),
    read: false,
    userId: targetUserId || '',
    referenceId: params.referenceId || ''
  };

  try {
    if (targetUserId) {
      const userNotifRef = collection(db, 'users', targetUserId, 'notifications');
      const docRef = await addDoc(userNotifRef, newNotif);
      return docRef.id;
    }
    return null;
  } catch (err) {
    console.warn('Could not save notification to Firestore:', err);
    return null;
  }
}

export function subscribeNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  try {
    const userNotifRef = collection(db, 'users', userId, 'notifications');
    const notifQuery = query(userNotifRef, limit(50));

    const unsubscribe = onSnapshot(
      notifQuery,
      (snapshot) => {
        const notifs: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
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
      },
      (error) => {
        console.warn('User notification listener notice:', error);
        onData([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Failed to subscribe to notifications:', error);
    onData([]);
    return () => {};
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;

  try {
    await updateDoc(doc(db, 'users', currentUid, 'notifications', notificationId), { read: true });
  } catch (error) {
    console.warn('Could not mark notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) return;

  try {
    const userNotifRef = collection(db, 'users', currentUid, 'notifications');
    const snap = await getDocs(userNotifRef);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      if (!docSnap.data().read) {
        batch.update(docSnap.ref, { read: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.warn('Could not mark all notifications as read:', error);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;

  try {
    await deleteDoc(doc(db, 'users', currentUid, 'notifications', notificationId));
  } catch (error) {
    console.warn('Could not delete notification:', error);
  }
}
