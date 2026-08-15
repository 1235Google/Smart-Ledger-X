import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  writeBatch, 
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { AppState, Transaction, UserProfile } from '../types';
import { User } from 'firebase/auth';

export type SyncStatus = 
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'auth_error'
  | 'permission_error'
  | 'network_error';

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
  if (currentSyncStatus !== status) {
    currentSyncStatus = status;
    console.log(`[Firebase Sync Status] -> ${status}`);
    syncListeners.forEach((l) => {
      try { l(status); } catch (e) { console.error(e); }
    });
  }
}

// Window online/offline event handlers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Firebase Sync] Network online detected. Triggering immediate queue flush.');
    setSyncStatus('syncing');
    queueManager.triggerFlush();
  });
  window.addEventListener('offline', () => {
    console.log('[Firebase Sync] Network offline detected.');
    setSyncStatus('offline');
  });
}

/**
 * Deep sanitization to ensure Firestore compatibility.
 * Removes undefined fields, functions, and non-serializable objects.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) return data;
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (value === undefined) return null;
    return value;
  }));
}

/**
 * Synchronize user profile to `/users/{uid}/profile/info`
 */
export async function syncUserProfile(user: User, profileData?: Partial<UserProfile>): Promise<void> {
  if (!user || !user.uid) {
    console.warn('[Firebase Sync] syncUserProfile skipped: No authenticated user.');
    return;
  }

  const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
  try {
    const payload = sanitizeForFirestore({
      uid: user.uid,
      fullName: profileData?.fullName || user.displayName || '',
      email: user.email || '',
      photoURL: profileData?.profilePhoto || user.photoURL || '',
      businessName: profileData?.businessName || '',
      mobile: profileData?.mobile || user.phoneNumber || '',
      updatedAt: new Date().toISOString(),
    });
    console.log('[Firestore Write] Updating user profile for:', user.uid);
    await setDoc(profileRef, payload, { merge: true });
    console.log('[Firestore Write] User profile updated successfully.');
  } catch (err: any) {
    console.error('[Firestore Write Error] Failed to sync user profile:', err);
    classifyAndSetError(err, OperationType.UPDATE, `users/${user.uid}/profile/info`);
  }
}

/**
 * Classify Firestore error into specific sync status
 */
function classifyAndSetError(
  err: any, 
  operationType: OperationType = OperationType.WRITE, 
  path: string | null = null
) {
  const currentUid = auth.currentUser?.uid || null;
  const authStatus = auth.currentUser ? 'authenticated' : 'unauthenticated';
  const code = err?.code || 'unknown';
  const message = err?.message || String(err);

  console.error('[Firestore Error Diagnostic]', {
    currentUserId: currentUid,
    firestorePath: path,
    authStatus,
    operationType,
    errorCode: code,
    errorMessage: message,
    timestamp: new Date().toISOString(),
  });

  if (!navigator.onLine) {
    setSyncStatus('offline');
    return;
  }

  if (code === 'permission-denied' || message.includes('permission')) {
    setSyncStatus('permission_error');
  } else if (code === 'unauthenticated' || message.includes('auth')) {
    setSyncStatus('auth_error');
  } else if (code === 'unavailable' || message.includes('network') || message.includes('offline')) {
    setSyncStatus('network_error');
  } else {
    setSyncStatus('network_error');
  }
}

/**
 * Robust Sync Queue Manager with Exponential Backoff
 */
class SyncQueueManager {
  private pendingState: { userId: string; state: AppState } | null = null;
  private lastSyncedHash: string = '';
  private isProcessing = false;
  private retryAttempt = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  public enqueue(userId: string, state: AppState) {
    if (!userId) {
      console.warn('[Sync Queue] enqueue skipped: missing userId.');
      return;
    }

    // 1. Save locally immediately (Zero data loss guarantee)
    try {
      localStorage.setItem('smart-ledger-data', JSON.stringify(state));
    } catch (e) {
      console.warn('[Sync Queue] Local storage cache warning:', e);
    }

    // Compute simple payload signature to avoid redundant uploads
    const currentHash = JSON.stringify({
      txCount: state.transactions?.length || 0,
      startingBalance: state.startingBalance,
      customersCount: state.customers?.length || 0,
      goalsCount: state.savingsGoals?.length || 0,
      gullakCount: state.gullakEntries?.length || 0,
      lastTxId: state.transactions?.[0]?.id || '',
      updatedAt: state.userProfile?.fullName || '',
    });

    if (currentHash === this.lastSyncedHash && !this.pendingState) {
      return;
    }

    this.pendingState = { userId, state };

    // Debounce writes by 400ms to coalesce rapid user interactions
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, 400);
  }

  public triggerFlush() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryAttempt = 0;
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;
    if (!this.pendingState) return;

    if (!auth.currentUser || auth.currentUser.uid !== this.pendingState.userId) {
      console.warn('[Sync Queue] Current auth user does not match pending queue user.');
      setSyncStatus('auth_error');
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    this.isProcessing = true;
    setSyncStatus('syncing');

    const { userId, state } = this.pendingState;
    console.log(`[Sync Queue] Processing batch for user ${userId}. Tx count: ${state.transactions?.length || 0}`);

    try {
      // 1. Prepare transactions & ledger batch
      const txs = state.transactions || [];
      const txCollectionRef = collection(db, 'users', userId, 'transactions');
      const ledgerCollectionRef = collection(db, 'users', userId, 'ledger');

      let batch = writeBatch(db);
      let count = 0;

      for (const tx of txs) {
        if (!tx.id) continue;
        const sanitizedTx = sanitizeForFirestore(tx);
        const txDoc = doc(txCollectionRef, tx.id);
        const ledgerDoc = doc(ledgerCollectionRef, tx.id);
        batch.set(txDoc, sanitizedTx, { merge: true });
        batch.set(ledgerDoc, sanitizedTx, { merge: true });
        count += 2;

        if (count >= 400) {
          console.log(`[Firestore Write] Committing chunk batch of ${count} operations`);
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        console.log(`[Firestore Write] Committing final transactions batch (${count} ops)`);
        await batch.commit();
      }

      // 2. Synchronize App State Document
      const stateToSave = sanitizeForFirestore({ ...state });
      delete (stateToSave as any).transactions;

      const stateDocRef = doc(db, 'users', userId, 'app', 'state');
      console.log('[Firestore Write] Committing app state document');
      await setDoc(stateDocRef, stateToSave, { merge: true });

      // Successful completion
      console.log(`[Firebase Sync] Successfully synchronized all ledger data for user ${userId}`);
      this.lastSyncedHash = JSON.stringify({
        txCount: state.transactions?.length || 0,
        startingBalance: state.startingBalance,
        customersCount: state.customers?.length || 0,
        goalsCount: state.savingsGoals?.length || 0,
        gullakCount: state.gullakEntries?.length || 0,
        lastTxId: state.transactions?.[0]?.id || '',
        updatedAt: state.userProfile?.fullName || '',
      });

      this.pendingState = null;
      this.retryAttempt = 0;
      setSyncStatus('synced');
    } catch (err: any) {
      console.error(`[Sync Queue Error] Sync failed for user ${userId}:`, err);
      classifyAndSetError(err, OperationType.WRITE, `users/${userId}`);

      // Schedule exponential backoff retry
      this.retryAttempt++;
      const backoffMs = Math.min(1500 * Math.pow(1.5, this.retryAttempt), 15000);
      console.log(`[Sync Queue] Scheduling automatic retry #${this.retryAttempt} in ${Math.round(backoffMs)}ms...`);
      
      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        this.processQueue();
      }, backoffMs);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const queueManager = new SyncQueueManager();

/**
 * Public function to queue any state mutation to Firestore
 */
export function queueStateSync(userId: string, state: AppState) {
  queueManager.enqueue(userId, state);
}

/**
 * Real-time state subscription for the authenticated user
 */
export const subscribeToState = (
  userId: string, 
  onUpdate: (state: Partial<AppState>) => void,
  onError?: (err: any) => void
): Unsubscribe => {
  if (!userId) {
    console.warn('[CloudSync] subscribeToState called without userId');
    return () => {};
  }

  console.log('[Firestore Read] Initializing real-time listeners for user:', userId);

  const stateDocRef = doc(db, 'users', userId, 'app', 'state');
  const txCollectionRef = collection(db, 'users', userId, 'transactions');
  
  let currentState: Partial<AppState> | null = null;
  let currentTransactions: Transaction[] = [];
  let isInitialTxLoaded = false;
  let isInitialStateLoaded = false;

  setSyncStatus('syncing');

  const notifyUpdate = () => {
    console.log('[Firestore Read] Dispatching remote state update. State doc loaded:', isInitialStateLoaded, 'Tx count:', currentTransactions.length);
    const mergedState: Partial<AppState> = {
      ...(currentState || {}),
      transactions: currentTransactions
    };
    
    try {
      onUpdate(mergedState);
    } catch (err) {
      console.error('[CloudSync] Exception in onUpdate handler:', err);
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('synced');
    }
  };

  const unsubState = onSnapshot(
    stateDocRef,
    { includeMetadataChanges: true },
    (docSnap) => {
      console.log('[Firestore Read] App state snapshot received. Exists:', docSnap.exists(), 'fromCache:', docSnap.metadata.fromCache);
      if (docSnap.exists()) {
        currentState = docSnap.data() as Partial<AppState>;
      }
      isInitialStateLoaded = true;
      if (isInitialTxLoaded) {
        notifyUpdate();
      }
    },
    (error) => {
      console.warn('[Firestore Read Error] State subscription error:', error);
      classifyAndSetError(error, OperationType.GET, `users/${userId}/app/state`);
      isInitialStateLoaded = true;
      if (onError) {
        try { onError(error); } catch (e) { console.error(e); }
      }
      if (isInitialTxLoaded) {
        notifyUpdate();
      }
    }
  );

  const unsubTx = onSnapshot(
    txCollectionRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      console.log('[Firestore Read] Transactions snapshot received. Count:', snapshot.docs.length, 'fromCache:', snapshot.metadata.fromCache);
      currentTransactions = snapshot.docs.map((d) => d.data() as Transaction);
      // Sort newest first
      currentTransactions.sort((a, b) => {
        const dateA = (a as any).date || (a as any).dueDate || '';
        const dateB = (b as any).date || (b as any).dueDate || '';
        return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
      });
      isInitialTxLoaded = true;
      if (isInitialStateLoaded) {
        notifyUpdate();
      }
    },
    (error) => {
      console.warn('[Firestore Read Error] Transactions subscription error:', error);
      classifyAndSetError(error, OperationType.LIST, `users/${userId}/transactions`);
      isInitialTxLoaded = true;
      if (onError) {
        try { onError(error); } catch (e) { console.error(e); }
      }
      if (isInitialStateLoaded) {
        notifyUpdate();
      }
    }
  );

  return () => {
    console.log('[Firestore Read] Cleaning up snapshot listeners for user:', userId);
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

    console.log('[Migration] Migrating local data to Firestore for user:', userId);
    setSyncStatus('syncing');

    // Check if cloud already has transactions
    const txRef = collection(db, 'users', userId, 'transactions');
    const existingCloudTx = await getDocs(txRef);

    if (existingCloudTx.empty && localData.transactions?.length) {
      let batch = writeBatch(db);
      let opCount = 0;

      for (const tx of localData.transactions) {
        const sanitizedTx = sanitizeForFirestore(tx);
        const txDoc = doc(txRef, tx.id);
        const ledgerDoc = doc(db, 'users', userId, 'ledger', tx.id);
        batch.set(txDoc, sanitizedTx, { merge: true });
        batch.set(ledgerDoc, sanitizedTx, { merge: true });
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
    const stateToSave = sanitizeForFirestore({ ...localData });
    delete (stateToSave as any).transactions;
    await setDoc(stateDocRef, stateToSave, { merge: true });

    // Mark as migrated
    localStorage.setItem(migrationFlagKey, 'true');
    console.log('[Migration] Local data migration completed successfully.');
    setSyncStatus('synced');
    return true;
  } catch (err) {
    console.error('[Migration Error] Data migration error:', err);
    classifyAndSetError(err, OperationType.WRITE, `users/${userId}/migration`);
    return false;
  }
}
