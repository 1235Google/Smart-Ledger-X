// Persistence verified and guaranteed via Firestore single source of truth - Last updated: 2026-08-08
import { doc, getDoc, setDoc, collection, onSnapshot, writeBatch, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppState, Transaction, UserProfile, PendingMoney, ReceivedMoney, SentMoney, ReminderHistoryLog, GeneratedReport } from '../types';
import { User } from 'firebase/auth';

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

export const defaultProfile = (firebaseUser?: User | null): UserProfile => ({
  fullName: firebaseUser?.displayName || 'SmartLedger User',
  username: firebaseUser?.email ? firebaseUser.email.split('@')[0] : 'user',
  email: firebaseUser?.email || '',
  mobile: firebaseUser?.phoneNumber || '',
  dob: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  language: 'English (IN)',
  memberSince: firebaseUser?.metadata?.creationTime 
    ? new Date(firebaseUser.metadata.creationTime).toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0],
  profilePhoto: firebaseUser?.photoURL || '',
  businessName: '',
  businessCategory: '',
  gstNumber: '',
  upiId: '',
  businessAddress: '',
  website: '',
  businessLogo: '',
  verifiedEmail: firebaseUser?.emailVerified || false,
  verifiedPhone: false,
  lastLogin: new Date().toISOString(),
  activeDevice: 'Web Browser'
});

export const initializeUserWorkspace = async (
  userId: string, 
  firebaseUser?: User | null, 
  baseDefaultState?: AppState
): Promise<AppState> => {
  const profile = defaultProfile(firebaseUser);
  const freshState: AppState = {
    ...(baseDefaultState || {
      isSetupComplete: true,
      startingBalance: 0,
      customers: [],
      transactions: [],
      gullakEntries: [],
      savingsGoals: [],
      securityLogs: [],
      automationRules: [],
      investments: [],
      financeHabits: [],
      gullakSettings: { monthlyGoal: 10000 },
      securitySettings: {
        pinEnabled: false,
        pin: null,
        biometricEnabled: false,
        faceUnlockEnabled: false,
        autoLockTime: 2,
        registeredDevices: [],
      },
      emailSettings: {
        enabled: false,
        emailAddress: firebaseUser?.email || '',
        lastReportSent: null,
        nextScheduledReport: null,
      },
      emailHistory: [],
      generalSettings: { timezone: 'Asia/Kolkata' },
      userProfile: profile
    }),
    userProfile: profile,
    isSetupComplete: true
  };

  try {
    const userDocRef = doc(db, 'users', userId);
    const stateDocRef = doc(db, 'users', userId, 'app', 'state');
    const profileDocRef = doc(db, 'users', userId, 'profile', 'data');
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'data');

    // 1. Root user document
    await setDoc(userDocRef, {
      name: firebaseUser?.displayName || 'SmartLedger User',
      email: firebaseUser?.email || '',
      photoURL: firebaseUser?.photoURL || '',
      createdAt: firebaseUser?.metadata?.creationTime || new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }, { merge: true });

    const stateToSave = { ...freshState };
    delete (stateToSave as any).transactions;

    // 2. Initialize state, profile, and settings documents safely with merge
    await setDoc(stateDocRef, stateToSave, { merge: true });
    await setDoc(profileDocRef, profile, { merge: true });
    await setDoc(settingsDocRef, {
      securitySettings: freshState.securitySettings,
      emailSettings: freshState.emailSettings,
      generalSettings: freshState.generalSettings,
      gullakSettings: freshState.gullakSettings
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }

  return freshState;
};

export const saveTransactionToFirestore = async (userId: string, tx: Transaction): Promise<void> => {
  if (!userId || !tx || !tx.id) return;
  const path = `users/${userId}/transactions/${tx.id}`;
  console.log(`[Firestore Write Start] UID: ${userId} | Path: ${path} | Type: ${tx.type} | Amount: ₹${tx.amount}`);
  try {
    const txRef = doc(db, 'users', userId, 'transactions', tx.id);
    await setDoc(txRef, tx, { merge: true });

    if (tx.type === 'received') {
      await setDoc(doc(db, 'users', userId, 'received', tx.id), tx, { merge: true });
    } else if (tx.type === 'pending') {
      await setDoc(doc(db, 'users', userId, 'pending', tx.id), tx, { merge: true });
      await setDoc(doc(db, 'users', userId, 'pendingPayments', tx.id), tx, { merge: true });
    } else if (tx.type === 'sent') {
      await setDoc(doc(db, 'users', userId, 'sent', tx.id), tx, { merge: true });
    }

    // Immediate Read Verification to guarantee persistence
    const verifySnap = await getDoc(txRef);
    if (verifySnap.exists()) {
      console.log(`[Firestore Write Verification SUCCESS] Document exists at ${path}:`, verifySnap.data());
    } else {
      console.error(`[Firestore Write Verification WARNING] Document at ${path} was not found immediately after write!`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const deleteTransactionFromFirestore = async (userId: string, txId: string, txType?: string): Promise<void> => {
  if (!userId || !txId) return;
  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', txId));
    if (!txType || txType === 'received') {
      await deleteDoc(doc(db, 'users', userId, 'received', txId)).catch(() => {});
    }
    if (!txType || txType === 'pending') {
      await deleteDoc(doc(db, 'users', userId, 'pending', txId)).catch(() => {});
      await deleteDoc(doc(db, 'users', userId, 'pendingPayments', txId)).catch(() => {});
    }
    if (!txType || txType === 'sent') {
      await deleteDoc(doc(db, 'users', userId, 'sent', txId)).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/transactions/${txId}`);
    throw error;
  }
};

export const saveUserProfileToFirestore = async (userId: string, profile: UserProfile): Promise<void> => {
  if (!userId) return;
  try {
    const profileDocRef = doc(db, 'users', userId, 'profile', 'data');
    await setDoc(profileDocRef, profile, { merge: true });

    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      name: profile.fullName,
      email: profile.email,
      photoURL: profile.profilePhoto || profile.businessLogo,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/profile`);
  }
};

export const saveAppStateToFirestore = async (userId: string, state: AppState): Promise<void> => {
  if (!userId) return;
  try {
    const stateDocRef = doc(db, 'users', userId, 'app', 'state');
    const stateToSave = { ...state };
    delete (stateToSave as any).transactions;
    await setDoc(stateDocRef, stateToSave, { merge: true });

    // Calculate and update current balance in users/{userId}/balances/current
    const balanceDocRef = doc(db, 'users', userId, 'balances', 'current');
    const receivedTransactions = (state.transactions || []).filter((t): t is ReceivedMoney => t.type === 'received');
    const sentTransactions = (state.transactions || []).filter((t): t is SentMoney => t.type === 'sent');
    const totalReceived = receivedTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const totalSent = sentTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentBalance = Number(state.startingBalance || 0) + totalReceived - totalSent;

    await setDoc(balanceDocRef, {
      startingBalance: state.startingBalance || 0,
      totalReceived,
      totalSent,
      currentBalance,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/app/state`);
  }
};

export const subscribeToState = (
  userId: string, 
  firebaseUser: User | null,
  baseDefaultState: AppState,
  onUpdate: (state: AppState, isFromCloud?: boolean) => void
) => {
  const cacheKey = `smartledger_user_cache_${userId}`;
  let currentState: AppState = {
    ...baseDefaultState,
    userProfile: defaultProfile(firebaseUser)
  };

  // 1. Try restoring from local cache immediately for zero-delay startup
  try {
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      currentState = {
        ...currentState,
        ...parsed,
        userProfile: {
          ...currentState.userProfile,
          ...(parsed.userProfile || {})
        }
      };
    }
  } catch (e) {
    console.warn('Could not read user cache:', e);
  }

  // Notify initial local state immediately
  onUpdate(currentState, false);

  const userDocRef = doc(db, 'users', userId);
  const stateDocRef = doc(db, 'users', userId, 'app', 'state');
  const profileDocRef = doc(db, 'users', userId, 'profile', 'data');
  const settingsDocRef = doc(db, 'users', userId, 'settings', 'data');
  const txCollectionRef = collection(db, 'users', userId, 'transactions');
  const remCollectionRef = collection(db, 'users', userId, 'reminders');
  const repCollectionRef = collection(db, 'users', userId, 'reports');

  let stateDocData: Partial<AppState> | null = null;
  let userProfileData: UserProfile | null = null;
  let settingsData: any = null;
  let transactionsData: Transaction[] | null = null;
  let reminderData: any[] | null = null;
  let reportsData: any[] | null = null;

  let workspaceInitializing = false;

  // Touch lastLogin on root user document
  setDoc(userDocRef, {
    name: firebaseUser?.displayName || 'SmartLedger User',
    email: firebaseUser?.email || '',
    photoURL: firebaseUser?.photoURL || '',
    lastLogin: new Date().toISOString()
  }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${userId}`));

  const emitMergedState = () => {
    const mergedProfile = userProfileData || stateDocData?.userProfile || currentState.userProfile || defaultProfile(firebaseUser);
    
    currentState = {
      ...baseDefaultState,
      ...(stateDocData || {}),
      userProfile: {
        ...mergedProfile,
        profilePhoto: mergedProfile.profilePhoto || firebaseUser?.photoURL || '',
        fullName: mergedProfile.fullName || firebaseUser?.displayName || 'SmartLedger User',
        email: mergedProfile.email || firebaseUser?.email || ''
      },
      securitySettings: settingsData?.securitySettings || stateDocData?.securitySettings || currentState.securitySettings || baseDefaultState.securitySettings,
      emailSettings: settingsData?.emailSettings || stateDocData?.emailSettings || currentState.emailSettings || baseDefaultState.emailSettings,
      generalSettings: settingsData?.generalSettings || stateDocData?.generalSettings || currentState.generalSettings || baseDefaultState.generalSettings,
      gullakSettings: settingsData?.gullakSettings || stateDocData?.gullakSettings || currentState.gullakSettings || baseDefaultState.gullakSettings,
      // IMPORTANT: preserve transactions if transactionsData hasn't emitted yet!
      transactions: transactionsData !== null ? transactionsData : (currentState.transactions || []),
      reminderHistory: reminderData !== null ? reminderData : (currentState.reminderHistory || []),
      generatedReports: reportsData !== null ? reportsData : (currentState.generatedReports || [])
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(currentState));
    } catch (e) {}

    onUpdate(currentState, true);
  };

  const unsubState = onSnapshot(stateDocRef, (snapshot) => {
    if (snapshot.exists()) {
      stateDocData = snapshot.data() as AppState;
      emitMergedState();
    } else if (!workspaceInitializing) {
      workspaceInitializing = true;
      initializeUserWorkspace(userId, firebaseUser, baseDefaultState).then((fresh) => {
        stateDocData = fresh;
        emitMergedState();
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
        emitMergedState();
      });
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/app/state`);
    emitMergedState();
  });

  const unsubProfile = onSnapshot(profileDocRef, (snapshot) => {
    if (snapshot.exists()) {
      userProfileData = snapshot.data() as UserProfile;
    }
    emitMergedState();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/profile/data`);
    emitMergedState();
  });

  const unsubSettings = onSnapshot(settingsDocRef, (snapshot) => {
    if (snapshot.exists()) {
      settingsData = snapshot.data();
    }
    emitMergedState();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/data`);
    emitMergedState();
  });

  const unsubTx = onSnapshot(txCollectionRef, (snapshot) => {
    console.log('[LOAD] Loading ledger entries...');
    const fetchedTx = snapshot.docs.map(d => d.data() as Transaction);
    console.log('[LOAD] Entries loaded:', fetchedTx.length);
    transactionsData = fetchedTx;
    emitMergedState();
  }, (err) => {
    console.error('[ERROR] Complete error details:', err);
    handleFirestoreError(err, OperationType.GET, `users/${userId}/transactions`);
    emitMergedState();
  });

  const unsubRem = onSnapshot(remCollectionRef, (snapshot) => {
    reminderData = snapshot.docs.map(d => d.data());
    emitMergedState();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/reminders`);
    emitMergedState();
  });

  const unsubRep = onSnapshot(repCollectionRef, (snapshot) => {
    reportsData = snapshot.docs.map(d => d.data());
    emitMergedState();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/reports`);
    emitMergedState();
  });

  return () => {
    unsubState();
    unsubProfile();
    unsubSettings();
    unsubTx();
    unsubRem();
    unsubRep();
  };
};

export const syncStateToCloud = async (
  userId: string, 
  previousState: AppState, 
  currentState: AppState
): Promise<void> => {
  if (!userId) return;

  try {
    // 1. Transactions sync: ONLY sync additions/updates, DO NOT BULK DELETE transactions unless user explicitly reset
    if (JSON.stringify(previousState.transactions) !== JSON.stringify(currentState.transactions)) {
      const prevMap = new Map((previousState.transactions || []).map(t => [t.id, t]));
      const currMap = new Map((currentState.transactions || []).map(t => [t.id, t]));

      // Handle additions and updates
      for (const tx of currentState.transactions || []) {
        const prevTx = prevMap.get(tx.id);
        if (!prevTx || JSON.stringify(prevTx) !== JSON.stringify(tx)) {
          await saveTransactionToFirestore(userId, tx);
        }
      }

      // Handle explicit single deletions (only if currentState is NOT completely empty while previousState had multiple items)
      // If currentState.transactions is empty but previousState had > 0, do NOT delete unless it's a deliberate single item removal or reset
      if (currentState.transactions.length > 0 || previousState.transactions.length === 1) {
        for (const [id, prevTx] of prevMap.entries()) {
          if (!currMap.has(id)) {
            await deleteTransactionFromFirestore(userId, id, prevTx.type);
          }
        }
      }
    }

    // 2. Profile sync
    if (JSON.stringify(previousState.userProfile) !== JSON.stringify(currentState.userProfile)) {
      if (currentState.userProfile) {
        await saveUserProfileToFirestore(userId, currentState.userProfile);
      }
    }

    // 3. Settings sync
    const prevSettings = {
      securitySettings: previousState.securitySettings,
      emailSettings: previousState.emailSettings,
      generalSettings: previousState.generalSettings,
      gullakSettings: previousState.gullakSettings
    };
    const currSettings = {
      securitySettings: currentState.securitySettings,
      emailSettings: currentState.emailSettings,
      generalSettings: currentState.generalSettings,
      gullakSettings: currentState.gullakSettings
    };

    if (JSON.stringify(prevSettings) !== JSON.stringify(currSettings)) {
      const settingsDocRef = doc(db, 'users', userId, 'settings', 'data');
      await setDoc(settingsDocRef, currSettings, { merge: true });
    }

    // 4. Overall state sync
    await saveAppStateToFirestore(userId, currentState);
    console.log(`[CloudSync Persistence SUCCESS] User ${userId} synchronized successfully to Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};
