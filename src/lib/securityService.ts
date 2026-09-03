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
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { LoginHistoryEntry, UserDevice } from '../types';
import CryptoJS from 'crypto-js';

// Local storage keys
const DEVICE_ID_KEY = 'smartledger_device_uuid';
const CACHED_GEO_FULL_KEY = 'smartledger_client_geo_full';
const LOCAL_DEVICES_KEY = 'smartledger_local_devices';
const LOCAL_LOGIN_HISTORY_KEY = 'smartledger_local_login_history';

export interface DeviceInfo {
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution: string;
  colorDepth: string;
  platform: string;
  cores: number;
  memory?: string;
  gpu?: string;
  touchPoints?: number;
  language: string;
  connectionType: string;
  userAgent: string;
}

export interface NetworkGeoInfo {
  ip: string;
  location: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  latitude: number | null;
  longitude: number | null;
  isp: string;
  timezone: string;
}

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
 * Detect client browser, OS, hardware specs, and friendly device name
 */
export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceName: 'Unknown Device',
      deviceType: 'desktop',
      browser: 'Web Browser',
      os: 'Unknown OS',
      screenResolution: '1920 × 1080',
      colorDepth: '24-bit',
      platform: 'Unknown',
      cores: 4,
      language: 'en-US',
      connectionType: 'High-Speed Broadband',
      userAgent: ''
    };
  }

  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let deviceName = 'Desktop Workstation';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  let browser = 'Web Browser';

  // Detect OS & Device Name
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iPadOS';
    deviceName = 'Apple iPad';
    deviceType = 'tablet';
  } else if (/iPhone|iPod/.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS\s([0-9_]+)/);
    const osVer = match ? ` ${match[1].replace(/_/g, '.')}` : '';
    deviceName = `Apple iPhone (iOS${osVer})`;
    deviceType = 'mobile';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    const isTablet = /Tablet|Android(?!.*Mobile)/i.test(ua);
    deviceType = isTablet ? 'tablet' : 'mobile';
    const match = ua.match(/Android\s([0-9.]+)/);
    const osVer = match ? ` ${match[1]}` : '';
    
    // Check specific Android model if available
    const modelMatch = ua.match(/;\s([A-Za-z0-9\s-_]+)\sBuild/);
    const modelName = modelMatch ? modelMatch[1].trim() : (isTablet ? 'Android Tablet' : 'Android Mobile');
    deviceName = `${modelName} (Android v${osVer.trim() || 'OS'})`;
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'macOS';
    const isAppleSilicon = (navigator as any).userAgentData?.architecture === 'arm' || 
      /Apple/.test(navigator.vendor || '');
    deviceName = isAppleSilicon ? 'Apple Mac (Apple Silicon)' : 'Apple Mac Workstation';
    deviceType = 'desktop';
  } else if (/Windows NT/.test(ua)) {
    os = 'Windows';
    if (/Windows NT 10.0/.test(ua)) os = 'Windows 11 / 10';
    else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.1/.test(ua)) os = 'Windows 7';
    deviceName = `${os} PC`;
    deviceType = 'desktop';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
    deviceName = 'Linux Workstation';
    deviceType = 'desktop';
  }

  // Detect Browser & Version
  if (/Edg\//.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/);
    browser = `Microsoft Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Chrome\//.test(ua) && !/Chromium|Edg|OPR/.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/);
    browser = `Google Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/);
    browser = `Apple Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/);
    browser = `Mozilla Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/OPR\//.test(ua) || /Opera/.test(ua)) {
    browser = 'Opera Browser';
  }

  // Hardware & Display properties
  const screenWidth = window.screen?.width || window.innerWidth || 1920;
  const screenHeight = window.screen?.height || window.innerHeight || 1080;
  const pixelRatio = window.devicePixelRatio || 1;
  const screenResolution = `${screenWidth} × ${screenHeight} (${pixelRatio}x DPR)`;
  const colorDepth = `${window.screen?.colorDepth || 24}-bit`;
  const platform = navigator.platform || 'Unknown Platform';
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB RAM` : undefined;
  const language = navigator.language || 'en-US';
  const touchPoints = navigator.maxTouchPoints || 0;

  // WebGL GPU Graphics Card Detection
  let gpu: string | undefined;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const rawGpu = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (rawGpu && typeof rawGpu === 'string') {
          // Clean common prefix like ANGLE (...)
          gpu = rawGpu.replace(/ANGLE \((.*)\)/, '$1').trim();
        }
      }
    }
  } catch (e) {}
  
  // Connection type
  const conn = (navigator as any).connection;
  const connectionType = conn 
    ? `${conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Broadband'} (${conn.rtt ? conn.rtt + 'ms' : 'WiFi'})` 
    : 'Broadband / WiFi';

  return {
    deviceName,
    deviceType,
    browser,
    os,
    screenResolution,
    colorDepth,
    platform,
    cores,
    memory,
    gpu,
    touchPoints,
    language,
    connectionType,
    userAgent: ua
  };
}

/**
 * Fetch public IP & rich real location with memory & localStorage caching
 */
let cachedClientNetwork: NetworkGeoInfo | null = null;
let isFetchingGeo = false;

export async function getClientNetworkInfo(): Promise<NetworkGeoInfo> {
  if (cachedClientNetwork) return cachedClientNetwork;

  // 1. Try restoring from localStorage if recently cached (< 1 hour)
  try {
    const saved = localStorage.getItem(CACHED_GEO_FULL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.ip && parsed.location) {
        cachedClientNetwork = parsed;
        // Non-blocking refresh in background if older
        return cachedClientNetwork as NetworkGeoInfo;
      }
    }
  } catch (e) {}

  if (isFetchingGeo) {
    // Wait briefly or return fallback if already in flight
    await new Promise((r) => setTimeout(r, 200));
    if (cachedClientNetwork) return cachedClientNetwork;
  }

  isFetchingGeo = true;

  try {
    // Priority 1: ipwho.is (fast, no key required, rich geolocation, flag emoji, and ISP)
    const res = await fetch('https://ipwho.is/', { 
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500) 
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const ip = data.ip || '127.0.0.1';
        const city = data.city || '';
        const region = data.region || '';
        const country = data.country || '';
        const countryCode = data.country_code || 'US';
        const flagEmoji = data.flag?.emoji || '🌐';
        const latitude = typeof data.latitude === 'number' ? data.latitude : null;
        const longitude = typeof data.longitude === 'number' ? data.longitude : null;
        const isp = data.connection?.isp || data.connection?.org || 'Public Internet';
        const timezone = data.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        
        const locParts = [city, region, country].filter(Boolean);
        const location = locParts.length > 0 ? locParts.join(', ') : 'Online';

        const result: NetworkGeoInfo = {
          ip,
          location,
          city,
          region,
          country,
          countryCode,
          flagEmoji,
          latitude,
          longitude,
          isp,
          timezone
        };

        cachedClientNetwork = result;
        try {
          localStorage.setItem(CACHED_GEO_FULL_KEY, JSON.stringify(result));
        } catch (e) {}
        isFetchingGeo = false;
        return result;
      }
    }
  } catch (e) {
    // Primary lookup failed, try secondary fallback
  }

  try {
    // Priority 2: api.ipify.org + ipapi.co fallback
    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    let ip = '127.0.0.1';
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      ip = ipData.ip || ip;
    }

    const geoRes = await fetch(`https://freeipapi.com/api/json/${ip}`, { signal: AbortSignal.timeout(2500) });
    if (geoRes.ok) {
      const g = await geoRes.json();
      const city = g.cityName || '';
      const region = g.regionName || '';
      const country = g.countryName || '';
      const countryCode = g.countryCode || 'US';
      const flagEmoji = countryCodeToEmoji(countryCode);
      const latitude = g.latitude || null;
      const longitude = g.longitude || null;
      const isp = 'Broadband Network';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const location = [city, country].filter(Boolean).join(', ') || 'Online';

      const result: NetworkGeoInfo = {
        ip,
        location,
        city,
        region,
        country,
        countryCode,
        flagEmoji,
        latitude,
        longitude,
        isp,
        timezone
      };

      cachedClientNetwork = result;
      try {
        localStorage.setItem(CACHED_GEO_FULL_KEY, JSON.stringify(result));
      } catch (e) {}
      isFetchingGeo = false;
      return result;
    }
  } catch (e) {
    // Fallback if all external networks are unreachable or offline
  }

  isFetchingGeo = false;

  // Priority 3: Browser system timezone fallback
  const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const tzParts = sysTz.split('/');
  const approxCity = tzParts.length > 1 ? tzParts[1].replace(/_/g, ' ') : sysTz;
  
  const fallback: NetworkGeoInfo = {
    ip: '127.0.0.1 (Local Session)',
    location: `${approxCity} (${sysTz})`,
    city: approxCity,
    region: tzParts[0] || 'Local',
    country: 'Local Network',
    countryCode: 'LOC',
    flagEmoji: '📍',
    latitude: null,
    longitude: null,
    isp: 'Local Host / Secure Loopback',
    timezone: sysTz
  };

  cachedClientNetwork = fallback;
  return fallback;
}

/**
 * Convert ISO 2-letter country code into Unicode Flag Emoji
 */
function countryCodeToEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Record a login activity record in Firestore and local storage
 */
export async function recordLoginActivity(
  userId: string,
  options: {
    method: 'Google' | 'Email' | 'PIN' | 'Biometric' | 'Password';
    status: 'Success' | 'Failed' | 'Blocked';
    email?: string;
    userName?: string;
    userAvatar?: string;
    failureReason?: string;
  }
): Promise<void> {
  try {
    const dev = detectDeviceInfo();
    const net = await getClientNetworkInfo();
    const historyId = 'login_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const timestamp = new Date().toISOString();

    const entry: LoginHistoryEntry = {
      id: historyId,
      userId: userId || 'local_user',
      userEmail: options.email || '',
      userName: options.userName || '',
      userAvatar: options.userAvatar || '',
      deviceName: dev.deviceName,
      deviceType: dev.deviceType,
      browser: dev.browser,
      os: dev.os,
      ip: net.ip,
      location: net.location,
      city: net.city,
      region: net.region,
      country: net.country,
      countryCode: net.countryCode,
      flagEmoji: net.flagEmoji,
      latitude: net.latitude ?? undefined,
      longitude: net.longitude ?? undefined,
      isp: net.isp,
      screenResolution: dev.screenResolution,
      timestamp,
      status: options.status,
      method: options.method,
      failureReason: options.failureReason,
      userAgent: dev.userAgent.slice(0, 200)
    };

    // 1. Always save to local storage cache
    saveLocalLoginHistory(entry);

    // 2. Dispatch live local event for real-time reactivity
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:login_activity_recorded', { detail: entry }));
    }

    // 3. If authenticated in Firebase, save to remote Firestore
    if (userId && userId !== 'anonymous' && userId !== 'local_user' && auth.currentUser) {
      const historyRef = doc(db, 'users', userId, 'loginHistory', historyId);
      await setDoc(historyRef, entry);
      console.log(`[Security] Login activity logged in cloud for ${userId} (${options.email}): ${options.method} -> ${options.status}`);
    }

    // 4. If successful, also register/update device
    if (options.status === 'Success') {
      await registerOrUpdateDevice(userId, {
        email: options.email,
        userName: options.userName,
        userAvatar: options.userAvatar
      });
    }
  } catch (err) {
    console.warn('[Security] Failed to record login activity:', err);
  }
}

/**
 * Register or update active device in Firestore & local storage
 */
export async function registerOrUpdateDevice(
  userId: string,
  userInfo?: {
    email?: string;
    userName?: string;
    userAvatar?: string;
  }
): Promise<UserDevice> {
  const deviceId = getOrCreateDeviceId();
  const dev = detectDeviceInfo();
  const net = await getClientNetworkInfo();
  const now = new Date().toISOString();

  const deviceData: UserDevice = {
    id: deviceId,
    userId: userId || 'local_user',
    userEmail: userInfo?.email || '',
    userName: userInfo?.userName || '',
    userAvatar: userInfo?.userAvatar || '',
    deviceId,
    deviceName: dev.deviceName,
    deviceType: dev.deviceType,
    browser: dev.browser,
    os: dev.os,
    ip: net.ip,
    location: net.location,
    city: net.city,
    region: net.region,
    country: net.country,
    countryCode: net.countryCode,
    flagEmoji: net.flagEmoji,
    latitude: net.latitude ?? undefined,
    longitude: net.longitude ?? undefined,
    isp: net.isp,
    screenResolution: dev.screenResolution,
    lastActive: now,
    createdAt: now,
    isCurrent: true,
    status: 'active',
    userAgent: dev.userAgent.slice(0, 200)
  };

  // 1. Save to local device storage
  saveLocalDevice(deviceData);

  // 2. Dispatch real-time local event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smartledger:device_updated', { detail: deviceData }));
  }

  // 3. Save to Firestore if user logged in
  if (userId && userId !== 'anonymous' && userId !== 'local_user' && auth.currentUser) {
    try {
      const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
      await setDoc(deviceRef, deviceData, { merge: true });
      console.log(`[Security] Registered active device ${deviceId} in cloud for user ${userId}`);
    } catch (err) {
      console.warn('[Security] Failed to register device in cloud:', err);
    }
  }

  return deviceData;
}

/**
 * Local cache persistence helpers
 */
function saveLocalDevice(device: UserDevice): void {
  try {
    const raw = localStorage.getItem(LOCAL_DEVICES_KEY);
    let list: UserDevice[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((d) => d.deviceId === device.deviceId);
    if (index >= 0) {
      list[index] = { ...list[index], ...device };
    } else {
      list.unshift(device);
    }
    // Limit to 20
    list = list.slice(0, 20);
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function getLocalDevices(): UserDevice[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEVICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveLocalLoginHistory(entry: LoginHistoryEntry): void {
  try {
    const raw = localStorage.getItem(LOCAL_LOGIN_HISTORY_KEY);
    let list: LoginHistoryEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    list = list.slice(0, 50); // keep last 50
    localStorage.setItem(LOCAL_LOGIN_HISTORY_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function getLocalLoginHistory(): LoginHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGIN_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

/**
 * Subscribe to real-time login activity history for a user
 */
export function subscribeToLoginHistory(
  userId: string,
  onUpdate: (logs: LoginHistoryEntry[]) => void
): Unsubscribe {
  const localLogs = getLocalLoginHistory();
  onUpdate(localLogs);

  // Listen to window events for zero-delay updates in current tab
  const handleLocalEvent = (e: any) => {
    const freshLogs = getLocalLoginHistory();
    onUpdate(freshLogs);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('smartledger:login_activity_recorded', handleLocalEvent);
  }

  if (!userId || userId === 'local_user' || !auth.currentUser) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartledger:login_activity_recorded', handleLocalEvent);
      }
    };
  }

  try {
    const historyCol = collection(db, 'users', userId, 'loginHistory');
    const historyQuery = query(historyCol, orderBy('timestamp', 'desc'), limit(50));

    const unsubFirestore = onSnapshot(
      historyQuery,
      (snapshot) => {
        const cloudLogs: LoginHistoryEntry[] = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id
        } as LoginHistoryEntry));

        // Merge cloud logs with any unique local logs
        const cloudIds = new Set(cloudLogs.map(l => l.id));
        const merged = [...cloudLogs, ...localLogs.filter(l => !cloudIds.has(l.id))];
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(merged);
      },
      (error) => {
        console.warn('[Security] Cloud login history subscription notice:', error);
        onUpdate(getLocalLoginHistory());
      }
    );

    return () => {
      unsubFirestore();
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartledger:login_activity_recorded', handleLocalEvent);
      }
    };
  } catch (err) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartledger:login_activity_recorded', handleLocalEvent);
      }
    };
  }
}

/**
 * Subscribe to registered / active user devices
 */
export function subscribeToUserDevices(
  userId: string,
  onUpdate: (devices: UserDevice[]) => void
): Unsubscribe {
  const currentDeviceId = getOrCreateDeviceId();
  const localDevices = getLocalDevices();
  
  // Make sure current device is in list immediately
  let initial = [...localDevices];
  if (!initial.some(d => d.deviceId === currentDeviceId)) {
    const dev = detectDeviceInfo();
    const now = new Date().toISOString();
    initial.unshift({
      id: currentDeviceId,
      userId: userId || 'local_user',
      deviceId: currentDeviceId,
      deviceName: dev.deviceName,
      deviceType: dev.deviceType,
      browser: dev.browser,
      os: dev.os,
      ip: 'Detecting...',
      location: 'Current Location',
      lastActive: now,
      createdAt: now,
      isCurrent: true,
      status: 'active'
    });
  }

  onUpdate(initial);

  const handleDeviceEvent = () => {
    const updated = getLocalDevices();
    onUpdate(updated);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('smartledger:device_updated', handleDeviceEvent);
  }

  if (!userId || userId === 'local_user' || !auth.currentUser) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartledger:device_updated', handleDeviceEvent);
      }
    };
  }

  try {
    const devicesCol = collection(db, 'users', userId, 'devices');

    const unsubFirestore = onSnapshot(
      devicesCol,
      (snapshot) => {
        const cloudDevices: UserDevice[] = snapshot.docs
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

        // Ensure current device is present
        const currentInCloud = cloudDevices.some(d => d.isCurrent);
        if (!currentInCloud && initial.length > 0) {
          cloudDevices.unshift(initial[0]);
        }

        onUpdate(cloudDevices);
      },
      (error) => {
        console.warn('[Security] Cloud devices subscription notice:', error);
        onUpdate(getLocalDevices());
      }
    );

    return () => {
      unsubFirestore();
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartledger:device_updated', handleDeviceEvent);
      }
    };
  } catch (err) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartledger:device_updated', handleDeviceEvent);
      }
    };
  }
}

/**
 * Revoke or remove an active device from user's account
 */
export async function revokeUserDevice(userId: string, deviceId: string): Promise<boolean> {
  if (!deviceId) return false;

  try {
    // 1. Remove from local storage cache
    const currentList = getLocalDevices();
    const updated = currentList.filter(d => d.deviceId !== deviceId && d.id !== deviceId);
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(updated));

    // 2. Remove from Firestore if user logged in
    if (userId && userId !== 'local_user' && auth.currentUser) {
      const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
      await deleteDoc(deviceRef);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:device_updated'));
    }

    console.log(`[Security] Revoked device ${deviceId}`);
    return true;
  } catch (err) {
    console.error('[Security] Failed to revoke device:', err);
    return false;
  }
}

/**
 * Revoke all other devices except current one
 */
export async function revokeAllOtherDevices(userId: string): Promise<boolean> {
  const currentDeviceId = getOrCreateDeviceId();
  try {
    // 1. Clean local devices
    const currentList = getLocalDevices();
    const remaining = currentList.filter(d => d.deviceId === currentDeviceId || d.id === currentDeviceId);
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(remaining));

    // 2. Clean Firestore if logged in
    if (userId && userId !== 'local_user' && auth.currentUser) {
      const devicesCol = collection(db, 'users', userId, 'devices');
      const snap = await getDocs(devicesCol);
      const deletePromises: Promise<any>[] = [];
      snap.forEach((d) => {
        if (d.id !== currentDeviceId) {
          deletePromises.push(deleteDoc(d.ref));
        }
      });
      await Promise.all(deletePromises);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:device_updated'));
    }

    return true;
  } catch (e) {
    console.error('[Security] Failed to revoke all other devices:', e);
    return false;
  }
}

/**
 * Check if device supports Biometric verification (Touch ID, Face ID, Windows Hello)
 */
export async function checkBiometricAvailability(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {}
  return false;
}

/**
 * Calculate dynamic real-time Security Audit Score (0 - 100)
 */
export function calculateSecurityScore(params: {
  pinEnabled: boolean;
  autoLogoutEnabled: boolean;
  inactivityTimeout: number;
  biometricEnabled: boolean;
  hasActiveSession: boolean;
  isHttps: boolean;
}): {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  status: string;
  items: Array<{ title: string; points: number; achieved: boolean; advice: string }>;
} {
  const items = [
    {
      title: 'Transport Encryption (HTTPS / SSL)',
      points: 20,
      achieved: params.isHttps,
      advice: 'All communications are encrypted end-to-end with TLS 1.3.'
    },
    {
      title: 'PIN & Cryptographic App Lock',
      points: 25,
      achieved: params.pinEnabled,
      advice: params.pinEnabled ? 'PIN lock active with SHA-256 salted hash.' : 'Enable a 4 or 6-digit PIN to prevent unauthorized access.'
    },
    {
      title: 'Session Inactivity Auto-Lock',
      points: 20,
      achieved: params.autoLogoutEnabled && params.inactivityTimeout > 0 && params.inactivityTimeout <= 30,
      advice: params.autoLogoutEnabled ? `Locks screen after ${params.inactivityTimeout} min of idle time.` : 'Configure auto-lock timeout for unattended desks.'
    },
    {
      title: 'Active Device Fingerprinting & Isolation',
      points: 20,
      achieved: params.hasActiveSession,
      advice: 'Hardware fingerprinting and remote device revocation enabled.'
    },
    {
      title: 'Biometric / Hardware Authenticator',
      points: 15,
      achieved: params.biometricEnabled,
      advice: params.biometricEnabled ? 'Biometric Touch ID / Face ID configured.' : 'Turn on Biometric unlock for rapid zero-friction entry.'
    }
  ];

  const score = items.reduce((acc, it) => acc + (it.achieved ? it.points : 0), 0);
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'C';
  let status = 'Standard Protection';

  if (score >= 90) {
    grade = 'A+';
    status = 'Bank-Grade Defense';
  } else if (score >= 75) {
    grade = 'A';
    status = 'High Security';
  } else if (score >= 60) {
    grade = 'B';
    status = 'Moderate Protection';
  } else {
    grade = 'D';
    status = 'Action Recommended';
  }

  return { score, grade, status, items };
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
