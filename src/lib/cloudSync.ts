import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  writeBatch, 
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AppState, Transaction } from '../types';
import { User } from 'firebase/auth';

export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'reconnecting' | 'error';

type SyncListener = (status: SyncStatus) => void;
const syncListeners = new Set<SyncListener>();
let currentSyncStatus: SyncStatus = navigator.onLine ? 'synced' : 'offline';

export function subscribeToSyncStatus(listener: SyncListener) {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    syncListeners.delete(listener);
  };
}

export function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  syncListeners.forEach((l) => l(status));
}

// Window online/offline event bindings
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setSyncStatus('reconnecting');
    setTimeout(() => {
      setSyncStatus('synced');
    }, 1500);
  });
  window.addEventListener('offline', () => {
    setSyncStatus('offline');
  });
}

/**
 * Sync user profile to Firestore `/users/{uid}/profile`
 */
export async function syncUserProfile(user: User, profileData?: Partial<AppState['userProfile']>) {
  if (!user || !user.uid) return;
  const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
  try {
    const payload = {
      uid: user.uid,
      name: profileData?.fullName || user.displayName || '',
      email: user.email || '',
      photoURL: profileData?.profilePhoto || user.photoURL || '',
      businessName: profileData?.businessName || '',
      mobile: profileData?.mobile || user.phoneNumber || '',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(profileRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/profile/info`);
  }
}

/**
 * Real-time state subscription for the authenticated user
 */
export const subscribeToState = (
  userId: string, 
  onUpdate: (state: AppState) => void,
  onError?: (err: any) => void
) => {
  if (!userId) return () => {};

  const stateDocRef = doc(db, 'users', userId, 'app', 'state');
  const txCollectionRef = collection(db, 'users', userId, 'transactions');
  
  let currentState: AppState | null = null;
  let currentTransactions: Transaction[] = [];
  let isInitialTxLoaded = false;
  let isInitialStateLoaded = false;

  setSyncStatus('syncing');

  const notifyUpdate = () => {
    if (currentState) {
      onUpdate({ ...currentState, transactions: currentTransactions });
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('synced');
      }
    }
  };

  const unsubState = onSnapshot(
    stateDocRef,
    { includeMetadataChanges: true },
    (docSnap) => {
      if (docSnap.exists()) {
        currentState = docSnap.data() as AppState;
        isInitialStateLoaded = true;
        if (isInitialTxLoaded) {
          notifyUpdate();
        }
      } else {
        isInitialStateLoaded = true;
      }
    },
    (error) => {
      console.warn('Firestore state subscription error:', error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `users/${userId}/app/state`);
    }
  );

  const unsubTx = onSnapshot(
    txCollectionRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      currentTransactions = snapshot.docs.map((d) => d.data() as Transaction);
      // Sort newest first by default if date/createdAt exists
      currentTransactions.sort((a, b) => {
        const dateA = (a as any).date || (a as any).dueDate || '';
        const dateB = (b as any).date || (b as any).dueDate || '';
        return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
      });
      isInitialTxLoaded = true;
      if (isInitialStateLoaded && currentState) {
        notifyUpdate();
      }
    },
    (error) => {
      console.warn('Firestore transactions subscription error:', error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/transactions`);
    }
  );

  return () => {
    unsubState();
    unsubTx();
  };
};

/**
 * Migration helper: Detects any existing local data in localStorage on login and uploads it safely.
 */
export async function migrateLocalDataToCloud(userId: string, defaultState: AppState): Promise<boolean> {
  if (!userId) return false;
  try {
    const migrationFlagKey = `smartledger_migrated_${userId}`;
    const alreadyMigrated = localStorage.getItem(migrationFlagKey);
    const localSaved = localStorage.getItem('smart-ledger-data');

    if (!localSaved || alreadyMigrated === 'true') {
      return false;
    }

    const localData = JSON.parse(localSaved) as AppState;
    if (!localData || (!localData.transactions?.length && !localData.startingBalance && !localData.customers?.length)) {
      localStorage.setItem(migrationFlagKey, 'true');
      return false;
    }

    setSyncStatus('syncing');

    // Check if cloud already has transactions
    const txRef = collection(db, 'users', userId, 'transactions');
    const existingCloudTx = await getDocs(txRef);

    if (existingCloudTx.empty && localData.transactions?.length) {
      let batch = writeBatch(db);
      let opCount = 0;

      for (const tx of localData.transactions) {
        const txDoc = doc(txRef, tx.id);
        const ledgerDoc = doc(db, 'users', userId, 'ledger', tx.id);
        batch.set(txDoc, tx, { merge: true });
        batch.set(ledgerDoc, tx, { merge: true });
        opCount += 2;

        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }
    }

    // Save initial state
    const stateDocRef = doc(db, 'users', userId, 'app', 'state');
    const stateToSave = { ...localData };
    delete (stateToSave as any).transactions;
    await setDoc(stateDocRef, stateToSave, { merge: true });

    // Mark as migrated
    localStorage.setItem(migrationFlagKey, 'true');
    setSyncStatus('synced');
    return true;
  } catch (err) {
    console.error('Data migration error:', err);
    setSyncStatus(navigator.onLine ? 'error' : 'offline');
    return false;
  }
}

/**
 * Synchronize any changes to Cloud Firestore
 */
export const syncStateToCloud = async (
  userId: string, 
  previousState: AppState, 
  currentState: AppState
): Promise<void> => {
  if (!userId) return;

  try {
    setSyncStatus('syncing');

    // 1. Synchronize Transactions (Create, Update, Delete)
    const prevTx = previousState.transactions || [];
    const currTx = currentState.transactions || [];

    const prevMap = new Map(prevTx.map((t) => [t.id, t]));
    const currMap = new Map(currTx.map((t) => [t.id, t]));

    const modifiedOrAdded: Transaction[] = [];
    const deletedIds: string[] = [];

    // Find added or modified
    for (const tx of currTx) {
      const prev = prevMap.get(tx.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(tx)) {
        modifiedOrAdded.push(tx);
      }
    }

    // Find deleted
    for (const tx of prevTx) {
      if (!currMap.has(tx.id)) {
        deletedIds.push(tx.id);
      }
    }

    if (modifiedOrAdded.length > 0 || deletedIds.length > 0) {
      const txCollectionRef = collection(db, 'users', userId, 'transactions');
      const ledgerCollectionRef = collection(db, 'users', userId, 'ledger');

      let batch = writeBatch(db);
      let count = 0;

      for (const tx of modifiedOrAdded) {
        const txDoc = doc(txCollectionRef, tx.id);
        const ledgerDoc = doc(ledgerCollectionRef, tx.id);
        batch.set(txDoc, tx, { merge: true });
        batch.set(ledgerDoc, tx, { merge: true });
        count += 2;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const id of deletedIds) {
        const txDoc = doc(txCollectionRef, id);
        const ledgerDoc = doc(ledgerCollectionRef, id);
        batch.delete(txDoc);
        batch.delete(ledgerDoc);
        count += 2;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    }

    // 2. Synchronize App State Document
    const prevWithoutTx = { ...previousState };
    delete (prevWithoutTx as any).transactions;

    const currWithoutTx = { ...currentState };
    delete (currWithoutTx as any).transactions;

    if (JSON.stringify(prevWithoutTx) !== JSON.stringify(currWithoutTx)) {
      const docRef = doc(db, 'users', userId, 'app', 'state');
      await setDoc(docRef, currWithoutTx, { merge: true });
    }

    setSyncStatus(navigator.onLine ? 'synced' : 'offline');
  } catch (error) {
    console.error('Error syncing state to cloud:', error);
    setSyncStatus(navigator.onLine ? 'error' : 'offline');
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/app/state`);
  }
};
