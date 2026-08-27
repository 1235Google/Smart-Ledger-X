import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot, 
  getDocs, 
  setDoc 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Bill } from '../types';
import { dismissBillNotification } from './notificationRepository';

/**
 * Subscribes to real-time bills for a user.
 */
export function subscribeBills(
  userId: string,
  onData: (bills: Bill[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const billsCol = collection(db, 'users', userId, 'bills');
  const unsubscribe = onSnapshot(
    billsCol,
    (snapshot) => {
      const items: Bill[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || '',
          amount: Number(data.amount) || 0,
          dueDate: data.dueDate || '',
          category: data.category || 'utilities',
          frequency: data.frequency || 'monthly',
          isPaid: !!data.isPaid,
          paidAt: data.paidAt,
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId,
        });
      });

      // Sort by Due Date ascending
      items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      onData(items);
    },
    (error) => {
      console.warn('[BillService] Error subscribing to bills:', error);
    }
  );

  return () => unsubscribe();
}

/**
 * Creates a new bill in Firestore.
 */
export async function createBill(
  userId: string, 
  bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'isPaid'>
): Promise<string | null> {
  if (!userId) return null;
  const nowIso = new Date().toISOString();
  try {
    const billsCol = collection(db, 'users', userId, 'bills');
    const docRef = await addDoc(billsCol, {
      ...bill,
      isPaid: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      userId,
    });
    return docRef.id;
  } catch (error) {
    console.error('[BillService] Create bill failed:', error);
    return null;
  }
}

/**
 * Updates an existing bill.
 */
export async function updateBill(
  userId: string, 
  billId: string, 
  updates: Partial<Bill>
): Promise<void> {
  if (!userId || !billId) return;
  try {
    const billRef = doc(db, 'users', userId, 'bills', billId);
    await updateDoc(billRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[BillService] Update bill failed:', error);
  }
}

/**
 * Marks a bill as paid and dismisses its due reminder.
 */
export async function markBillAsPaid(
  userId: string, 
  billId: string
): Promise<void> {
  if (!userId || !billId) return;
  try {
    const billRef = doc(db, 'users', userId, 'bills', billId);
    await updateDoc(billRef, {
      isPaid: true,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // Dismiss pending bill notification
    await dismissBillNotification(userId, billId);
  } catch (error) {
    console.error('[BillService] Mark paid failed:', error);
  }
}

/**
 * Deletes a bill.
 */
export async function deleteBill(
  userId: string, 
  billId: string
): Promise<void> {
  if (!userId || !billId) return;
  try {
    const billRef = doc(db, 'users', userId, 'bills', billId);
    await deleteDoc(billRef);
    await dismissBillNotification(userId, billId);
  } catch (error) {
    console.error('[BillService] Delete bill failed:', error);
  }
}
