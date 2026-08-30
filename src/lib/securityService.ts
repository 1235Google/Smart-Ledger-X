import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  Unsubscribe,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { LoginHistoryEntry, UserDevice } from '../types';
import CryptoJS from 'crypto-js';

// Local storage keys
const DEVICE_ID_KEY = 'smartledger_device_uuid';
const CACHED_IP_KEY = 'smartledger_client_ip';
const CACHED_GEO_KEY = 'smartledger_client_geo';

/**
 * Get or generate persistent unique device ID for the current browser session
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return 'dev_browser_default';
  }
}

/**
 * Detect client browser, OS, and friendly device name
 */
export function detectDeviceInfo(): { deviceName: string; browser: string; os: string; userAgent: string } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceName: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS', userAgent: '' };
  }

  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let deviceName = 'Desktop Workstation';
  let browser = 'Web Browser';

  // Detect OS
  if (/iPad|iPhone|iPod/.test(ua)) {
    os = 'iOS';
    deviceName = /iPad/.test(ua) ? 'Apple iPad' : 'Apple iPhone';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s([0-9.]+)/);
    const osVer = match ? ` ${match[1]}` : '';
    deviceName = `Android Device (v${osVer.trim() || 'OS'})`;
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'macOS';
    deviceName = 'Apple Mac';
  } else if (/Windows NT/.test(ua)) {
    os = 'Windows';
    if (/Windows NT 10.0/.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
    deviceName = `${os} PC`;
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
    deviceName = 'Linux Workstation';
  }

  // Detect Browser
  if (/Edg\//.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/);
    browser = `Microsoft Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Chrome\//.test(ua) && !/Chromium|Edg/.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/);
    browser = `Google Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Safari\//.test(ua) && !/Chrome|Chromium/.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/);
    browser = `Apple Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/);
    browser = `Mozilla Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/OPR\//.test(ua) || /Opera/.test(ua)) {
    browser = 'Opera Browser';
  }

  return {
    deviceName,
    browser,
    os,
    userAgent: ua
  };
}

/**
 * Fetch public IP & approximate location (with memory & localStorage cache to avoid spamming)
 */
let cachedClientLocation: { ip: string; location: string } | null = null;

export async function getClientNetworkInfo(): Promise<{ ip: string; location: string }> {
  if (cachedClientLocation) return cachedClientLocation;

  try {
    const savedIp = localStorage.getItem(CACHED_IP_KEY);
    const savedGeo = localStorage.getItem(CACHED_GEO_KEY);
    if (savedIp && savedGeo) {
      cachedClientLocation = { ip: savedIp, location: savedGeo };
      return cachedClientLocation;
    }
  } catch (e) {}

  try {
    // Try lightweight public IP lookup
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const ip = data.ip || '127.0.0.1';
      const city = data.city || '';
      const country = data.country_name || '';
      const location = city && country ? `${city}, ${country}` : country || 'Online';
      
      cachedClientLocation = { ip, location };
      try {
        localStorage.setItem(CACHED_IP_KEY, ip);
        localStorage.setItem(CACHED_GEO_KEY, location);
      } catch (e) {}
      return cachedClientLocation;
    }
  } catch (e) {
    // Fallback if network lookup times out
  }

  const fallback = {
    ip: '127.0.0.1 (Local Session)',
    location: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  };
  cachedClientLocation = fallback;
  return fallback;
}

/**
 * Record a login activity record in Firestore: `users/{userId}/loginHistory/{historyId}`
 */
export async function recordLoginActivity(
  userId: string,
  options: {
    method: 'Google' | 'Email' | 'PIN' | 'Biometric' | 'Password';
    status: 'Success' | 'Failed' | 'Blocked';
    email?: string;
  }
): Promise<void> {
  if (!userId) return;

  try {
    const { deviceName, browser, os, userAgent } = detectDeviceInfo();
    const { ip, location } = await getClientNetworkInfo();
    const historyId = 'login_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const timestamp = new Date().toISOString();

    const historyRef = doc(db, 'users', userId, 'loginHistory', historyId);
    const entry: LoginHistoryEntry = {
      id: historyId,
      userId,
      deviceName,
      browser,
      os,
      ip,
      location,
      timestamp,
      status: options.status,
      method: options.method,
      userAgent: userAgent.slice(0, 200)
    };

    await setDoc(historyRef, entry);
    console.log(`[Security] Login activity logged for user ${userId}: ${options.method} -> ${options.status}`);

    // If successful login, also register/update device
    if (options.status === 'Success') {
      await registerOrUpdateDevice(userId);
    }
  } catch (err) {
    console.warn('[Security] Failed to record login activity:', err);
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/loginHistory`);
  }
}

/**
 * Register or update active device in Firestore: `users/{userId}/devices/{deviceId}`
 */
export async function registerOrUpdateDevice(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const deviceId = getOrCreateDeviceId();
    const { deviceName, browser, os, userAgent } = detectDeviceInfo();
    const { ip, location } = await getClientNetworkInfo();
    const now = new Date().toISOString();

    const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
    const deviceData: UserDevice = {
      id: deviceId,
      userId,
      deviceId,
      deviceName,
      browser,
      os,
      ip,
      location,
      lastActive: now,
      createdAt: now,
      isCurrent: true,
      status: 'active',
      userAgent: userAgent.slice(0, 200)
    };

    await setDoc(deviceRef, deviceData, { merge: true });
    console.log(`[Security] Registered active device ${deviceId} for user ${userId}`);
  } catch (err) {
    console.warn('[Security] Failed to register device:', err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/devices`);
  }
}

/**
 * Subscribe to real-time login activity history for a user
 */
export function subscribeToLoginHistory(
  userId: string,
  onUpdate: (logs: LoginHistoryEntry[]) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const historyCol = collection(db, 'users', userId, 'loginHistory');
    const historyQuery = query(historyCol, orderBy('timestamp', 'desc'), limit(50));

    return onSnapshot(
      historyQuery,
      (snapshot) => {
        const logs: LoginHistoryEntry[] = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id
        } as LoginHistoryEntry));
        onUpdate(logs);
      },
      (error) => {
        console.warn('[Security] Login history subscription error:', error);
        handleFirestoreError(error, OperationType.LIST, `users/${userId}/loginHistory`);
      }
    );
  } catch (err) {
    console.error('[Security] Failed to initialize login history subscription:', err);
    return () => {};
  }
}

/**
 * Subscribe to registered / active user devices
 */
export function subscribeToUserDevices(
  userId: string,
  onUpdate: (devices: UserDevice[]) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const currentDeviceId = getOrCreateDeviceId();

  try {
    const devicesCol = collection(db, 'users', userId, 'devices');

    return onSnapshot(
      devicesCol,
      (snapshot) => {
        const devices: UserDevice[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as UserDevice;
            return {
              ...data,
              id: docSnap.id,
              isCurrent: docSnap.id === currentDeviceId || data.deviceId === currentDeviceId
            };
          })
          .filter((d) => d.status !== 'revoked')
          .sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());

        onUpdate(devices);
      },
      (error) => {
        console.warn('[Security] User devices subscription error:', error);
        handleFirestoreError(error, OperationType.LIST, `users/${userId}/devices`);
      }
    );
  } catch (err) {
    console.error('[Security] Failed to initialize devices subscription:', err);
    return () => {};
  }
}

/**
 * Revoke or remove an active device from user's account
 */
export async function revokeUserDevice(userId: string, deviceId: string): Promise<boolean> {
  if (!userId || !deviceId) return false;

  try {
    const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
    await deleteDoc(deviceRef);
    console.log(`[Security] Revoked and removed device ${deviceId} for user ${userId}`);
    return true;
  } catch (err) {
    console.error('[Security] Failed to revoke device:', err);
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/devices/${deviceId}`);
    return false;
  }
}

/**
 * Hash raw 4 or 6 digit PIN using SHA-256 with consistent application salt
 */
const PIN_SALT = 'smart_ledger_pin_salt_2026_secure';

export function hashPin(rawPin: string): string {
  if (!rawPin) return '';
  return CryptoJS.SHA256(rawPin + PIN_SALT).toString();
}

/**
 * Verify user PIN against configured hash or legacy raw value
 */
export function verifyPin(enteredPin: string, storedHashOrPin: string | null): boolean {
  if (!enteredPin || !storedHashOrPin) return false;
  
  // 1. Check with SHA-256 salted hash
  const saltedHash = hashPin(enteredPin);
  if (storedHashOrPin === saltedHash) return true;

  // 2. Check standard SHA-256 hash (legacy compatibility)
  const plainHash = CryptoJS.SHA256(enteredPin).toString();
  if (storedHashOrPin === plainHash) return true;

  // 3. Fallback check raw string (if previously stored raw)
  if (storedHashOrPin === enteredPin) return true;

  return false;
}
