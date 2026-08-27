import { auth, googleProvider } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, signInWithRedirect } from 'firebase/auth';

export type AuthStatusState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  canRetry: boolean;
  actionLabel?: string;
}

/**
 * Classifies raw Firebase/Storage/Network errors into user-friendly error messages
 */
export function classifyBackupError(error: any): AuthErrorInfo {
  const code = (error?.code || '').toLowerCase();
  const rawMsg = (error?.message || String(error || '')).toLowerCase();

  // Network unavailable
  if (!navigator.onLine || code.includes('network') || rawMsg.includes('network') || rawMsg.includes('offline') || rawMsg.includes('failed to fetch')) {
    return {
      code: 'NETWORK_UNAVAILABLE',
      title: 'Network Unavailable',
      message: 'Internet connection appears offline or unstable. Please check your connection and retry.',
      canRetry: true,
      actionLabel: 'Retry Connection',
    };
  }

  // Google authentication cancelled
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request') || rawMsg.includes('popup closed')) {
    return {
      code: 'AUTH_CANCELLED',
      title: 'Sign In Cancelled',
      message: 'Google authentication was cancelled before completing. Click Sign In to resume.',
      canRetry: true,
      actionLabel: 'Sign In with Google',
    };
  }

  // Session expired / Not authenticated
  if (
    code.includes('unauthenticated') ||
    code.includes('auth/user-token-expired') ||
    code.includes('auth/invalid-user-token') ||
    code.includes('auth/user-not-found') ||
    rawMsg.includes('session expired') ||
    rawMsg.includes('authentication required') ||
    rawMsg.includes('unauthenticated')
  ) {
    return {
      code: 'SESSION_EXPIRED',
      title: 'Session Expired',
      message: 'Your secure session has expired or is not recognized. Please sign in again.',
      canRetry: true,
      actionLabel: 'Sign In Again',
    };
  }

  // Cloud permission denied
  if (code.includes('permission-denied') || rawMsg.includes('permission denied') || code.includes('storage/unauthorized')) {
    return {
      code: 'PERMISSION_DENIED',
      title: 'Cloud Permission Denied',
      message: 'Access to this secure backup vault was denied by security rules for your user ID.',
      canRetry: true,
      actionLabel: 'Verify Permissions',
    };
  }

  // Storage quota exceeded
  if (code.includes('quota-exceeded') || rawMsg.includes('quota exceeded') || code.includes('storage/quota-exceeded')) {
    return {
      code: 'QUOTA_EXCEEDED',
      title: 'Storage Quota Exceeded',
      message: 'Your cloud storage quota has been reached. Please delete older backups to free space.',
      canRetry: true,
      actionLabel: 'Manage Backups',
    };
  }

  // Backup upload failed
  if (code.includes('storage/retry-limit-exceeded') || code.includes('storage/canceled') || rawMsg.includes('upload failed') || rawMsg.includes('storage upload')) {
    return {
      code: 'UPLOAD_FAILED',
      title: 'Backup Upload Failed',
      message: 'Cloud Storage upload did not complete within the timeout limit. Please retry.',
      canRetry: true,
      actionLabel: 'Retry Upload',
    };
  }

  // Generic fallback
  return {
    code: 'UNKNOWN_ERROR',
    title: 'Backup Operation Notice',
    message: error?.message || 'An unexpected error occurred during the backup operation.',
    canRetry: true,
    actionLabel: 'Try Again',
  };
}

/**
 * Global promise-based helper that resolves the currently authenticated user
 * with up to `maxRetries` (1 second apart) to completely eliminate false "not logged in" flashes.
 */
export async function getAuthenticatedUser(maxRetries = 5, retryDelayMs = 1000): Promise<User> {
  // Step 1: Immediate check
  if (auth.currentUser) {
    try {
      // Step 2: Validate or fetch fresh token
      await auth.currentUser.getIdToken(false);
      return auth.currentUser;
    } catch (tokenErr) {
      console.warn('[BackupAuth] Initial token validation notice:', tokenErr);
    }
  }

  // Step 2: Wait for authStateReady if available in Firebase SDK
  if (typeof (auth as any).authStateReady === 'function') {
    try {
      await (auth as any).authStateReady();
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(false);
        return auth.currentUser;
      }
    } catch (readyErr) {
      console.warn('[BackupAuth] authStateReady notice:', readyErr);
    }
  }

  // Step 3: Loop with auto-retry up to maxRetries
  return new Promise<User>((resolve, reject) => {
    let resolved = false;
    let attempt = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user && !resolved) {
          resolved = true;
          unsubscribe();
          try {
            await user.getIdToken(false);
          } catch (tErr) {
            console.warn('[BackupAuth] onAuthStateChanged token refresh warning:', tErr);
          }
          resolve(user);
        }
      },
      (authErr) => {
        console.error('[BackupAuth] onAuthStateChanged stream error:', authErr);
      }
    );

    const intervalId = setInterval(async () => {
      attempt++;
      if (auth.currentUser) {
        resolved = true;
        clearInterval(intervalId);
        unsubscribe();
        try {
          await auth.currentUser.getIdToken(false);
        } catch {}
        resolve(auth.currentUser);
        return;
      }

      console.log(`[BackupAuth] Checking auth status... (Attempt ${attempt}/${maxRetries})`);

      if (attempt >= maxRetries) {
        clearInterval(intervalId);
        unsubscribe();
        if (!resolved) {
          const classified = classifyBackupError(new Error('Session expired. Please sign in again.'));
          const err = new Error(classified.message);
          (err as any).code = 'SESSION_EXPIRED';
          reject(err);
        }
      }
    }, retryDelayMs);
  });
}

/**
 * Ensures valid ID token or force-refreshes if needed
 */
export async function ensureValidIdToken(forceRefresh = false): Promise<string> {
  const user = await getAuthenticatedUser(3, 800);
  return await user.getIdToken(forceRefresh);
}

/**
 * Trigger Google sign in directly with fallback
 */
export async function signInGoogleUser(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked') {
      console.warn('[BackupAuth] Popup blocked, falling back to redirect...');
      await signInWithRedirect(auth, googleProvider);
    }
    throw err;
  }
}
