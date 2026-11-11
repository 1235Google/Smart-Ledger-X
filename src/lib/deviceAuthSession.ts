import { User } from 'firebase/auth';

export interface DeviceSession {
  userId: string;
  uid?: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  providerId?: string;
  provider?: string;
  rememberedAt: number;
  lastActiveAt: number;
  deviceId: string;
  keepLoggedIn: boolean;
}

export const STORAGE_KEY_QR_USER = 'smartledger_qr_user';
const STORAGE_KEY_SESSION = 'smartledger_device_session';
const STORAGE_KEY_AUTH = 'smartledger_authenticated';
const STORAGE_KEY_USER_ID = 'lastAuthUserId';
const STORAGE_KEY_USER_EMAIL = 'lastAuthUserEmail';
const STORAGE_KEY_DEVICE_ID = 'smartledger_device_id';
const STORAGE_KEY_DEVICE_UNLOCKED = 'smartledger_device_unlocked';

/**
 * Returns or generates a persistent device UUID
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  try {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'fallback-device-id';
  }
}

/**
 * Retrieves the verified QR user profile from localStorage if present
 */
export function getQrUserSession(): DeviceSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawQr = localStorage.getItem(STORAGE_KEY_QR_USER);
    if (rawQr) {
      const parsed = JSON.parse(rawQr);
      const uid = parsed?.uid || parsed?.userId;
      if (uid) {
        const email = parsed.email || '';
        const displayName =
          parsed.displayName || parsed.fullName || (email ? email.split('@')[0] : 'User');
        return {
          userId: uid,
          uid,
          email,
          displayName,
          photoURL: parsed.photoURL || parsed.profilePhoto || null,
          providerId: parsed.provider || parsed.providerId || 'google.com',
          provider: parsed.provider || parsed.providerId || 'google.com',
          rememberedAt: parsed.rememberedAt || Date.now(),
          lastActiveAt: parsed.lastActiveAt || Date.now(),
          deviceId: parsed.deviceId || getOrCreateDeviceId(),
          keepLoggedIn: true,
        };
      }
    }
  } catch (err) {
    console.warn('[DeviceAuthSession] Error reading QR user session:', err);
  }
  return null;
}

/**
 * Retrieves the persistent device session from localStorage (prioritizing verified QR session)
 */
export function getDeviceSession(): DeviceSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check verified QR user session first
    const qrSession = getQrUserSession();
    if (qrSession && qrSession.userId) {
      return qrSession;
    }

    // 2. Check standard device session
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw) as DeviceSession;
      const resolvedUid = parsed?.userId || parsed?.uid;
      if (parsed && resolvedUid && parsed.keepLoggedIn !== false) {
        return {
          ...parsed,
          userId: resolvedUid,
          uid: resolvedUid,
        };
      }
    }

    // 3. Fallback: Check if previously authenticated via smartledger_authenticated flag
    const isAuth = localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    const userId = localStorage.getItem(STORAGE_KEY_USER_ID);
    const userEmail = localStorage.getItem(STORAGE_KEY_USER_EMAIL) || '';

    if (isAuth && userId) {
      const fallbackSession: DeviceSession = {
        userId,
        uid: userId,
        email: userEmail,
        displayName: userEmail ? userEmail.split('@')[0] : 'User',
        rememberedAt: Date.now(),
        lastActiveAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
        keepLoggedIn: true,
      };
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(fallbackSession));
      return fallbackSession;
    }
  } catch (err) {
    console.warn('[DeviceAuthSession] Error reading device session:', err);
  }
  return null;
}

/**
 * Persists the user's session permanently to this device (and updates smartledger_qr_user)
 */
export function saveDeviceSession(
  user: Partial<User> & { uid: string; provider?: string },
  keepLoggedIn = true,
  isQrSession = false
): DeviceSession {
  const deviceId = getOrCreateDeviceId();
  const cleanEmail = user.email || '';
  const cleanDisplayName =
    user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User');
  const cleanPhotoURL = user.photoURL || null;
  const cleanProvider =
    user.provider || user.providerData?.[0]?.providerId || 'google.com';

  const session: DeviceSession = {
    userId: user.uid,
    uid: user.uid,
    email: cleanEmail,
    displayName: cleanDisplayName,
    photoURL: cleanPhotoURL,
    providerId: cleanProvider,
    provider: cleanProvider,
    rememberedAt: Date.now(),
    lastActiveAt: Date.now(),
    deviceId,
    keepLoggedIn,
  };

  try {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    if (isQrSession || cleanProvider === 'google.com' || localStorage.getItem(STORAGE_KEY_QR_USER)) {
      localStorage.setItem(
        STORAGE_KEY_QR_USER,
        JSON.stringify({
          uid: session.userId,
          userId: session.userId,
          email: session.email,
          displayName: session.displayName,
          photoURL: session.photoURL,
          provider: cleanProvider,
          rememberedAt: session.rememberedAt,
          lastActiveAt: session.lastActiveAt,
          deviceId: session.deviceId,
        })
      );
    }
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    localStorage.setItem(STORAGE_KEY_USER_ID, session.userId);
    if (session.email) {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, session.email);
    }
    // Also mark device unlocked so user is not prompted for daily PIN on trusted device
    localStorage.setItem(STORAGE_KEY_DEVICE_UNLOCKED, 'true');
    sessionStorage.setItem('isUnlocked', 'true');
    console.log('[DeviceAuthSession] Saved persistent device session for user:', session.userId, session.email);
  } catch (err) {
    console.warn('[DeviceAuthSession] Failed to persist device session to localStorage:', err);
  }

  return session;
}

/**
 * Updates the last active timestamp for this device session
 */
export function touchDeviceSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const session = getDeviceSession();
    if (session) {
      session.lastActiveAt = Date.now();
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      if (localStorage.getItem(STORAGE_KEY_QR_USER)) {
        localStorage.setItem(STORAGE_KEY_QR_USER, JSON.stringify(session));
      }
    }
  } catch {}
}

/**
 * Clears the persistent session and QR user session on explicit user logout
 */
export function clearDeviceSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_QR_USER);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem(STORAGE_KEY_USER_ID);
    localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
    localStorage.removeItem(STORAGE_KEY_DEVICE_UNLOCKED);
    localStorage.removeItem('smartledger_cached_id_token');
    sessionStorage.removeItem('isUnlocked');
    console.log('[DeviceAuthSession] Cleared device and QR session.');
  } catch (err) {
    console.warn('[DeviceAuthSession] Error clearing device session:', err);
  }
}

/**
 * Check if the device is currently in unlocked state
 */
export function isDeviceUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      localStorage.getItem(STORAGE_KEY_DEVICE_UNLOCKED) === 'true' ||
      sessionStorage.getItem('isUnlocked') === 'true'
    );
  } catch {
    return false;
  }
}

/**
 * Set the device unlock state
 */
export function setDeviceUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      localStorage.setItem(STORAGE_KEY_DEVICE_UNLOCKED, 'true');
      sessionStorage.setItem('isUnlocked', 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_DEVICE_UNLOCKED);
      sessionStorage.removeItem('isUnlocked');
    }
  } catch {}
}

/**
 * Synthesizes a fully-compliant Firebase User object from a persistent DeviceSession / QR Session
 * so the app can function immediately with the user's real Google profile.
 */
export function createSyntheticUser(session: DeviceSession): User {
  const getCachedOrFallbackToken = () => {
    try {
      return localStorage.getItem('smartledger_cached_id_token') || '';
    } catch {
      return '';
    }
  };

  const resolvedUid = session.uid || session.userId;
  const resolvedEmail = session.email || null;
  const resolvedDisplayName =
    session.displayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'User');
  const resolvedPhotoURL = session.photoURL || null;
  const resolvedProvider = session.provider || session.providerId || 'google.com';

  const synthetic: any = {
    uid: resolvedUid,
    email: resolvedEmail,
    displayName: resolvedDisplayName,
    photoURL: resolvedPhotoURL,
    emailVerified: true,
    isAnonymous: false,
    phoneNumber: null,
    tenantId: null,
    metadata: {
      creationTime: new Date(session.rememberedAt || Date.now()).toISOString(),
      lastSignInTime: new Date(session.lastActiveAt || Date.now()).toISOString(),
    },
    providerData: [
      {
        uid: resolvedUid,
        email: resolvedEmail,
        displayName: resolvedDisplayName,
        photoURL: resolvedPhotoURL,
        phoneNumber: null,
        providerId: resolvedProvider,
      },
    ],
    providerId: 'firebase',
    getIdToken: async (_forceRefresh?: boolean) => {
      return getCachedOrFallbackToken();
    },
    getIdTokenResult: async () => ({
      token: getCachedOrFallbackToken(),
      signInProvider: resolvedProvider,
      claims: {},
      authTime: new Date(session.rememberedAt || Date.now()).toISOString(),
      issuedAtTime: new Date(session.lastActiveAt || Date.now()).toISOString(),
      expirationTime: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    }),
    reload: async () => {},
    toJSON: () => ({
      uid: resolvedUid,
      email: resolvedEmail,
      displayName: resolvedDisplayName,
      photoURL: resolvedPhotoURL,
    }),
    delete: async () => {
      clearDeviceSession();
    },
  };

  return synthetic as User;
}
