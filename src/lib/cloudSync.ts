import { doc, getDoc, setDoc, collection, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { AppState, Transaction } from '../types';

export const subscribeToState = (userId: string, onUpdate: (state: AppState) => void) => {
  const stateDocRef = doc(db, 'users', userId, 'app', 'state');
  const txCollectionRef = collection(db, 'users', userId, 'transactions');
  
  let state: AppState | null = null;
  let transactions: Transaction[] = [];

  const unsubState = onSnapshot(stateDocRef, (doc) => {
    if (doc.exists()) {
      state = doc.data() as AppState;
      onUpdate({ ...state, transactions });
    }
  });

  const unsubTx = onSnapshot(txCollectionRef, (snapshot) => {
    transactions = snapshot.docs.map(d => d.data() as Transaction);
    if (state) {
      onUpdate({ ...state, transactions });
    }
  });

  return () => {
    unsubState();
    unsubTx();
  };
};

export const loadStateFromCloud = async (userId: string, defaultState: AppState): Promise<AppState> => {
  try {
    const docRef = doc(db, 'users', userId, 'app', 'state');
    const docSnap = await getDoc(docRef);

    let state = defaultState;
    if (docSnap.exists()) {
      state = { ...defaultState, ...docSnap.data() } as AppState;
    }

    const txRef = collection(db, 'users', userId, 'transactions');
    const txSnap = await getDocs(txRef);
    if (!txSnap.empty) {
      const transactions = txSnap.docs.map(d => d.data() as Transaction);
      state.transactions = transactions;
    } else {
      state.transactions = state.transactions || [];
    }

    return state;
  } catch (error) {
    console.error("Error loading state from cloud:", error);
    return defaultState;
  }
};

export const syncStateToCloud = async (userId: string, previousState: AppState, currentState: AppState): Promise<void> => {
  try {
    // Check if transactions changed to sync only those
    if (JSON.stringify(previousState.transactions) !== JSON.stringify(currentState.transactions)) {
      const txRef = collection(db, 'users', userId, 'transactions');
      let batch = writeBatch(db);
      let count = 0;
      
      for (const tx of currentState.transactions) {
        batch.set(doc(txRef, tx.id), tx, { merge: true });
        count++;
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

    // Check if the rest of state changed
    const stateToSave = { ...currentState };
    delete (stateToSave as any).transactions;
    
    if (JSON.stringify(previousState) !== JSON.stringify(currentState)) {
        const docRef = doc(db, 'users', userId, 'app', 'state');
        await setDoc(docRef, stateToSave, { merge: true });
    }
  } catch (error) {
    console.error("Error syncing state to cloud:", error);
  }
};
