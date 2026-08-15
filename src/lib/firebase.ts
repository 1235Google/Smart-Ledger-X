import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
console.log('[Firebase] Initializing Firebase App with project:', config.projectId);
const app = getApps().length === 0 ? initializeApp(config) : getApp();

const firestoreDbId = (config as any).firestoreDatabaseId && (config as any).firestoreDatabaseId !== '(default)'
  ? (config as any).firestoreDatabaseId 
  : undefined;
const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
console.log('[Firebase] Firestore instance initialized. Database ID:', firestoreDbId || '(default)');

const auth = getAuth(app);
console.log('[Firebase] Auth instance initialized');

// Enable browser local persistence for session memory across reloads/reopens
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence initialization notice:', err);
});

// Enable Firestore offline IndexedDB persistence for multi-device & offline support
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence warning: Multiple tabs open concurrently.');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence warning: Browser lacks complete IndexedDB offline capabilities.');
  }
});

// Auth Provider Setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Standardized Operation Types & Error Handling as required by Firestore Security Specification
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase initialized in offline-first mode.');
    }
  }
}

// Helper Auth API Methods
export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string) {
  return await createUserWithEmailAndPassword(auth, email, pass);
}

export async function requestPasswordReset(email: string) {
  return await sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  return await signOut(auth);
}

export { app, db, auth };
