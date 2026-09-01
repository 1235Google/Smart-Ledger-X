import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  doc, 
  setDoc,
  getDoc,
  getDocFromServer 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import rawConfig from '../../firebase-applet-config.json';

// Validated Firebase Configuration object
export const firebaseConfig = {
  apiKey: rawConfig.apiKey || (import.meta.env?.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: rawConfig.authDomain || (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || `${rawConfig.projectId}.firebaseapp.com`,
  projectId: rawConfig.projectId || (import.meta.env?.VITE_FIREBASE_PROJECT_ID as string) || '',
  storageBucket: rawConfig.storageBucket || (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || `${rawConfig.projectId}.firebasestorage.app`,
  messagingSenderId: rawConfig.messagingSenderId || (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  appId: rawConfig.appId || (import.meta.env?.VITE_FIREBASE_APP_ID as string) || '',
  measurementId: rawConfig.measurementId || '',
};

console.log('[Firebase Init] Initializing Firebase App for project:', firebaseConfig.projectId);

// Initialize Firebase App singleton cleanly
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const firestoreDbId = (rawConfig as any).firestoreDatabaseId && (rawConfig as any).firestoreDatabaseId !== '(default)'
  ? (rawConfig as any).firestoreDatabaseId 
  : undefined;
const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
console.log('[Firebase Init] Firestore instance ready. DB ID:', firestoreDbId || '(default)');

const auth = getAuth(app);
console.log('[Firebase Init] Auth instance ready');

// Enable browser local persistence to maintain session across reloads
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('[Firebase Auth] Persistence set to browserLocalPersistence');
    })
    .catch((err) => {
      console.warn('[Firebase Auth] Persistence notice:', err);
    });
}

const storage = getStorage(app);
console.log('[Firebase Init] Storage instance ready');

// Enable Firestore offline IndexedDB persistence safely without crashing on multi-tab
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Firestore multi-tab persistence notice: Multiple tabs open simultaneously.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Firestore persistence notice: Browser environment does not support full IndexedDB persistence.');
    }
  });
}

// Auth Provider Setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ 
  prompt: 'select_account' 
});

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
  const errCode = (error as any)?.code || 'unknown';
  const errMsg = error instanceof Error ? error.message : String(error);
  const currentUid = auth.currentUser?.uid || null;
  const authStatus = auth.currentUser ? 'authenticated' : 'unauthenticated';

  const errInfo = {
    currentUserId: currentUid,
    firestorePath: path,
    authStatus,
    operationType,
    errorCode: errCode,
    errorMessage: errMsg,
    timestamp: new Date().toISOString()
  };

  console.error('[Firestore Detailed Error]', JSON.stringify(errInfo, null, 2));
}

/**
 * Human-friendly error translation for Firebase Auth error codes
 */
export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected authentication error occurred.';
  const code = err.code || '';
  const message = err.message || String(err);

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address format (e.g. user@example.com).';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact system support.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please try again in a few minutes or reset your password.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is disabled in your Firebase console. Please enable Google Sign-In and Email/Password in Firebase Authentication settings.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site or use redirect.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled before completing.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations. Please add this domain to Authorized Domains in Firebase Console.';
    case 'auth/internal-error':
      return 'Authentication encountered an internal error. Please check your network connection and verify your credentials.';
    default:
      if (message.includes('auth/')) {
        const cleanMsg = message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '');
        return cleanMsg || 'Authentication failed. Please check your credentials and try again.';
      }
      return message || 'Authentication failed. Please try again.';
  }
}

/**
 * Connection check - safe non-throwing check
 */
export async function testConnection() {
  console.log('[Firebase Connection] Firebase ready. Online status:', navigator.onLine);
}

/**
 * Ensures user profile and initial app records exist in Firestore after login
 * Task 5: Store uid, name, email, photoURL, createdAt without failing login on temporary errors
 */
export async function ensureUserProfileDoc(user: User, customFullName?: string): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      const displayName = customFullName || user.displayName || user.email?.split('@')[0] || 'Ledger User';
      const initialProfile = {
        uid: user.uid,
        name: displayName,
        fullName: displayName,
        email: user.email || '',
        photoURL: user.photoURL || '',
        businessName: '',
        mobile: user.phoneNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, initialProfile, { merge: true });
      console.log('[Firebase Auth] User profile document successfully created for:', user.uid);
    } else {
      console.log('[Firebase Auth] User profile document already exists for:', user.uid);
    }
  } catch (err) {
    // Non-fatal: Do not block authentication if Firestore document creation encounters temporary issue
    console.warn('[Firebase Auth] User profile document notice (non-fatal):', err);
  }
}

/**
 * Google Sign-In with automatic error classification and debug logging
 * Task 1, 4, 7: Audit Google auth flow, handle popup-closed-by-user, log details
 */
export async function loginWithGoogle(): Promise<{ user: User }> {
  console.log('[Firebase Auth] Launching signInWithPopup for Google...');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Debug logging as required by Task 7
    console.log('[Auth Debug] Google Login Success');
    console.log('[Auth Debug] Firebase currentUser:', auth.currentUser?.email);
    console.log('[Auth Debug] UID:', user.uid);
    console.log('[Auth Debug] Email:', user.email);
    console.log('[Auth Debug] Display Name:', user.displayName);
    console.log('[Auth Debug] Provider:', user.providerData?.[0]?.providerId || 'google.com');

    // Create user profile in Firestore if needed (asynchronous & non-blocking)
    ensureUserProfileDoc(user).catch((err) => {
      console.warn('[Firebase Auth] Background profile creation notice:', err);
    });

    return { user };
  } catch (popupError: any) {
    const code = popupError?.code || '';
    console.warn('[Firebase Auth] signInWithPopup encountered code:', code, popupError?.message);

    // If the user deliberately closed the popup window, do NOT trigger redirect loop
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.log('[Firebase Auth] User cancelled Google Sign-In popup.');
      throw popupError;
    }

    // If popup was blocked by browser security or iframe sandboxing, fall back to redirect
    if (code === 'auth/popup-blocked') {
      console.log('[Firebase Auth] Popup blocked by browser. Falling back to signInWithRedirect...');
      try {
        await signInWithRedirect(auth, googleProvider);
        return new Promise(() => {}); // Wait for browser redirect
      } catch (redirectError: any) {
        console.error('[Firebase Auth] signInWithRedirect error:', redirectError);
        throw redirectError;
      }
    }

    throw popupError;
  }
}

/**
 * Check if the user is returning from a Google redirect sign-in
 */
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('[Firebase Auth] Successfully processed redirect sign-in for:', result.user.uid);
      console.log('[Auth Debug] Redirect User UID:', result.user.uid);
      console.log('[Auth Debug] Redirect User Email:', result.user.email);
      ensureUserProfileDoc(result.user).catch((err) => {
        console.warn('[Firebase Auth] Background profile creation notice on redirect:', err);
      });
      return result.user;
    }
  } catch (err: any) {
    console.warn('[Firebase Auth] getRedirectResult notice:', err?.code, err?.message);
  }
  return null;
}

/**
 * Email & Password sign in
 */
export async function loginWithEmail(email: string, pass: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const error: any = new Error('Please enter a valid email address format.');
    error.code = 'auth/invalid-email';
    throw error;
  }
  if (!cleanPass || cleanPass.length < 6) {
    const error: any = new Error('Password must be at least 6 characters long.');
    error.code = 'auth/weak-password';
    throw error;
  }

  const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
  if (cred.user) {
    await ensureUserProfileDoc(cred.user);
  }
  return cred;
}

/**
 * Email & Password registration
 */
export async function registerWithEmail(email: string, pass: string, fullName?: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  const cleanName = fullName?.trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const error: any = new Error('Please enter a valid email address format.');
    error.code = 'auth/invalid-email';
    throw error;
  }
  if (!cleanPass || cleanPass.length < 6) {
    const error: any = new Error('Password must be at least 6 characters long.');
    error.code = 'auth/weak-password';
    throw error;
  }

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
  if (cred.user) {
    if (cleanName) {
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (profileErr) {
        console.warn('[Firebase Auth] Failed to update displayName:', profileErr);
      }
    }
    await ensureUserProfileDoc(cred.user, cleanName);
  }
  return cred;
}

/**
 * Password Reset request
 */
export async function requestPasswordReset(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const error: any = new Error('Please enter a valid email address format.');
    error.code = 'auth/invalid-email';
    throw error;
  }
  return await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  return await signOut(auth);
}

// App Check Helper
let appCheckInstance: any = null;
export async function initAppCheck(siteKey?: string) {
  if (typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;
  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    const key = siteKey || (window as any).FIREBASE_APPCHECK_KEY_RECAPTCHA_V3;
    if (key) {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(key),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('[Firebase AppCheck] App Check initialized successfully');
      return appCheckInstance;
    }
  } catch (err) {
    console.warn('[Firebase AppCheck] Notice on App Check init:', err);
  }
  return null;
}

export { app, db, auth, storage };
