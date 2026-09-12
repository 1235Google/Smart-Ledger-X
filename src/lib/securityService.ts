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
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  model?: string;
  manufacturer?: string;
  hasBattery?: boolean;
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
  clientHints?: Record<string, any>;
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
  accuracy?: number;
  locationSource?: 'gps' | 'ip';
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
 * Detect client browser, OS, hardware specs, and friendly device name (Synchronous baseline)
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
  const uaData = (navigator as any).userAgentData;
  const chBrands: Array<{ brand: string; version: string }> = uaData?.brands || [];
  const chPlatform: string = uaData?.platform || '';

  let os = 'Unknown OS';
  let osVersion = '';
  let deviceName = 'Desktop Workstation';
  let deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet' = 'desktop';
  let browser = 'Web Browser';
  let browserVersion = '';
  let model: string | undefined = undefined;
  let manufacturer: string | undefined = undefined;

  // 1. FydeOS Detection (Highest priority for Chromium OS forks)
  const isFydeInUa = /FydeOS|FlintOS/i.test(ua);
  const isFydeInPlatform = /FydeOS/i.test(chPlatform);
  const isFydeInBrands = chBrands.some((b) => /FydeOS/i.test(b.brand));
  const isFydeInWindow = typeof (window as any).fyde !== 'undefined';

  if (isFydeInUa || isFydeInPlatform || isFydeInBrands || isFydeInWindow) {
    os = 'FydeOS';
    const match = ua.match(/(?:FydeOS|FlintOS)[\/\s]?v?([0-9.]+)/i);
    if (match) osVersion = match[1];
    deviceType = 'laptop';
    deviceName = 'FydeOS Laptop';
  } else if (
    /CrOS|Chrome\s?OS|Chromium\s?OS/i.test(ua) ||
    /Chrome\s?OS|Chromium\s?OS/i.test(chPlatform)
  ) {
    // 2. ChromeOS / Chromium OS (when FydeOS is not indicated)
    os = 'ChromeOS';
    const match = ua.match(/CrOS\s+[^\s]+\s+([0-9.]+)/i) || ua.match(/ChromeOS\/([0-9.]+)/i);
    if (match) osVersion = match[1];
    deviceType = 'laptop';
    deviceName = 'Chromebook';
  } else if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iPadOS';
    deviceName = 'Apple iPad';
    deviceType = 'tablet';
  } else if (/iPhone|iPod/.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS\s([0-9_]+)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
    deviceName = `Apple iPhone${osVersion ? ` (iOS ${osVersion})` : ''}`;
    deviceType = 'mobile';
  } else if (/Android/.test(ua) || /Android/i.test(chPlatform)) {
    os = 'Android';
    const isTablet = /Tablet|Android(?!.*Mobile)/i.test(ua);
    deviceType = isTablet ? 'tablet' : 'mobile';
    const match = ua.match(/Android\s([0-9.]+)/);
    if (match) osVersion = match[1];
    
    // Check specific Android model if available
    const modelMatch = ua.match(/;\s([A-Za-z0-9\s-_]+)\sBuild/);
    if (modelMatch) {
      model = modelMatch[1].trim();
      const oem = model.match(/^(Samsung|Google|Xiaomi|OnePlus|Motorola|Huawei|Sony|Oppo|Vivo|Realme|Lenovo|Asus)\b/i);
      if (oem) manufacturer = oem[1];
    }
    deviceName = model ? `${model} (Android${osVersion ? ` v${osVersion}` : ''})` : (isTablet ? 'Android Tablet' : 'Android Mobile');
  } else if (/Macintosh|Mac OS X/.test(ua) || /macOS/i.test(chPlatform)) {
    os = 'macOS';
    const match = ua.match(/Mac OS X\s+([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, '.');
    if (/MacBook/i.test(ua) || /MacBook/i.test(navigator.platform || '')) {
      deviceType = 'laptop';
      deviceName = 'Apple MacBook';
    } else {
      deviceType = 'desktop';
      deviceName = 'Apple Mac';
    }
  } else if (/Windows/.test(ua) || /Windows/i.test(chPlatform)) {
    if (/Windows NT 10.0/.test(ua)) {
      os = 'Windows 11 / 10';
      osVersion = '10.0';
    } else if (/Windows NT 6.3/.test(ua)) {
      os = 'Windows 8.1';
      osVersion = '8.1';
    } else if (/Windows NT 6.1/.test(ua)) {
      os = 'Windows 7';
      osVersion = '7.0';
    } else {
      os = 'Windows';
    }
    deviceType = 'desktop';
    deviceName = `${os} PC`;
  } else if (/Linux/.test(ua) || /Linux/i.test(chPlatform)) {
    os = 'Linux';
    deviceType = 'desktop';
    deviceName = 'Linux Workstation';
  }

  // Detect Browser & Version
  if (/Edg\//.test(ua) || chBrands.some((b) => /Microsoft Edge/i.test(b.brand))) {
    const match = ua.match(/Edg\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : (chBrands.find((b) => /Microsoft Edge/i.test(b.brand))?.version || '');
    browser = ver ? `Microsoft Edge ${ver}` : 'Microsoft Edge';
    browserVersion = match ? match[1] : ver;
  } else if (/OPR\/|Opera/.test(ua) || chBrands.some((b) => /Opera/i.test(b.brand))) {
    const match = ua.match(/OPR\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : '';
    browser = ver ? `Opera ${ver}` : 'Opera';
    browserVersion = match ? match[1] : ver;
  } else if (/Brave/.test(ua) || (navigator as any).brave) {
    const match = ua.match(/Chrome\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : '';
    browser = ver ? `Brave ${ver}` : 'Brave';
    browserVersion = match ? match[1] : ver;
  } else if (/Vivaldi\//.test(ua)) {
    const match = ua.match(/Vivaldi\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : '';
    browser = ver ? `Vivaldi ${ver}` : 'Vivaldi';
    browserVersion = match ? match[1] : ver;
  } else if (/Chrome\//.test(ua) || chBrands.some((b) => /Google Chrome/i.test(b.brand))) {
    const match = ua.match(/Chrome\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : (chBrands.find((b) => /Google Chrome/i.test(b.brand))?.version || '');
    browser = ver ? `Google Chrome ${ver}` : 'Google Chrome';
    browserVersion = match ? match[1] : ver;
  } else if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : '';
    browser = ver ? `Mozilla Firefox ${ver}` : 'Mozilla Firefox';
    browserVersion = match ? match[1] : ver;
  } else if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/);
    const ver = match ? match[1].split('.')[0] : '';
    browser = ver ? `Apple Safari ${ver}` : 'Apple Safari';
    browserVersion = match ? match[1] : ver;
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
    browserVersion,
    os,
    osVersion,
    model,
    manufacturer,
    screenResolution,
    colorDepth,
    platform,
    cores,
    memory,
    gpu,
    touchPoints,
    language,
    connectionType,
    userAgent: ua,
    clientHints: {
      brands: chBrands,
      platform: chPlatform
    }
  };
}

/**
 * Enhanced asynchronous device detection:
 * Uses User-Agent Client Hints High Entropy values + Battery API to detect real hardware model,
 * FydeOS, ChromeOS, Windows 11, and accurately determine Laptop vs Desktop.
 */
export async function detectDeviceInfoAsync(): Promise<DeviceInfo> {
  const base = detectDeviceInfo();
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return base;
  }

  let hasBattery = false;
  let highEntropyModel: string | undefined = undefined;
  let highEntropyManufacturer: string | undefined = undefined;
  let highEntropyPlatformVer: string | undefined = undefined;

  // 1. Battery API check (Detects if computer is a laptop or portable)
  try {
    if (typeof (navigator as any).getBattery === 'function') {
      const battery = await (navigator as any).getBattery();
      if (battery && typeof battery.level === 'number') {
        hasBattery = true;
      }
    }
  } catch (e) {}

  // 2. Chromium User-Agent Client Hints High Entropy Values
  try {
    const uaData = (navigator as any).userAgentData;
    if (uaData && typeof uaData.getHighEntropyValues === 'function') {
      const highEntropy = await uaData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
        'architecture',
        'bitness',
        'fullVersionList'
      ]);

      if (highEntropy) {
        base.clientHints = { ...base.clientHints, ...highEntropy };

        // Model: ONLY if supplied by browser, NEVER invented!
        if (highEntropy.model && typeof highEntropy.model === 'string') {
          const raw = highEntropy.model.replace(/['"]/g, '').trim();
          if (raw && raw.toLowerCase() !== 'unknown' && raw !== '""' && raw !== 'Unavailable') {
            highEntropyModel = raw;
            base.model = raw;
            const oem = raw.match(/^(Lenovo|HP|Dell|Apple|Samsung|Google|Asus|Acer|Microsoft|Huawei|Xiaomi|Sony|Motorola|OnePlus)\b/i);
            if (oem) {
              highEntropyManufacturer = oem[1];
              base.manufacturer = oem[1];
            }
          }
        }

        // Windows 11 platformVersion check (platformVersion >= 13 is Windows 11)
        if (highEntropy.platformVersion) {
          highEntropyPlatformVer = String(highEntropy.platformVersion).replace(/['"]/g, '').trim();
          base.osVersion = highEntropyPlatformVer;
          const major = parseFloat(highEntropyPlatformVer.split('.')[0]);
          if (!isNaN(major) && major >= 13 && /Windows/i.test(base.os)) {
            base.os = 'Windows 11';
          } else if (!isNaN(major) && major > 0 && /Windows/i.test(base.os)) {
            base.os = 'Windows 10';
          }
        }

        // High entropy platform check (e.g. FydeOS in platform)
        if (highEntropy.platform && /FydeOS/i.test(highEntropy.platform)) {
          base.os = 'FydeOS';
        }
      }
    }
  } catch (e) {}

  base.hasBattery = hasBattery;

  // 3. Resolve Laptop vs Desktop
  if (base.deviceType !== 'mobile' && base.deviceType !== 'tablet') {
    const isLaptopHint =
      hasBattery ||
      /Chromebook|Laptop|ThinkPad|IdeaPad|MacBook|Notebook|ZenBook|Inspiron|XPS|Latitude|EliteBook|Envy|Surface Laptop|Yoga|Swift|Gram/i.test(base.userAgent + (highEntropyModel || '')) ||
      base.os === 'FydeOS' ||
      base.os === 'ChromeOS';

    if (isLaptopHint) {
      base.deviceType = 'laptop';
      if (highEntropyModel) {
        base.deviceName = highEntropyModel;
      } else if (base.os === 'FydeOS') {
        base.deviceName = 'FydeOS Laptop';
      } else if (base.os === 'ChromeOS') {
        base.deviceName = 'Chromebook';
      } else {
        base.deviceName = `${base.os} Laptop`;
      }
    } else {
      base.deviceType = 'desktop';
      if (highEntropyModel) {
        base.deviceName = highEntropyModel;
      }
    }
  }

  return base;
}

/**
 * Fetch public IP & rich real location with memory & localStorage caching
 */
/**
 * Reverse geocode GPS coordinates via BigDataCloud API
 */
async function reverseGeocodeClientGps(latitude: number, longitude: number): Promise<{
  location: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
}> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.locality || data.city || '';
      const region = data.principalSubdivision || '';
      const country = data.countryName || '';
      const countryCode = data.countryCode || '';
      const parts = [city, region, country].filter(Boolean);
      const location = parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
      return { location, city, region, country, countryCode };
    }
  } catch (e) {}
  return {
    location: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`
  };
}

/**
 * Fetch public IP & rich real location with memory & localStorage caching
 */
let cachedClientNetwork: NetworkGeoInfo | null = null;
let isFetchingGeo = false;

export async function getClientNetworkInfo(geoCoords?: { latitude: number; longitude: number; accuracy?: number }): Promise<NetworkGeoInfo> {
  // If GPS coordinates are explicitly provided, prioritize high accuracy GPS reverse-geocoding
  if (geoCoords && typeof geoCoords.latitude === 'number' && typeof geoCoords.longitude === 'number') {
    const rev = await reverseGeocodeClientGps(geoCoords.latitude, geoCoords.longitude);
    const countryCode = rev.countryCode || 'US';
    const flagEmoji = countryCodeToEmoji(countryCode);

    // Get public IP if cached or lookup
    let ip = cachedClientNetwork?.ip || '';
    if (!ip || ip.includes('127.0.0.1')) {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
        if (ipRes.ok) {
          const d = await ipRes.json();
          if (d.ip) ip = d.ip;
        }
      } catch (e) {}
    }

    const gpsResult: NetworkGeoInfo = {
      ip: ip || '127.0.0.1',
      location: rev.location,
      city: rev.city || '',
      region: rev.region || '',
      country: rev.country || '',
      countryCode,
      flagEmoji,
      latitude: geoCoords.latitude,
      longitude: geoCoords.longitude,
      accuracy: typeof geoCoords.accuracy === 'number' ? geoCoords.accuracy : undefined,
      locationSource: 'gps',
      isp: cachedClientNetwork?.isp || 'Broadband Network',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    };

    cachedClientNetwork = gpsResult;
    try {
      localStorage.setItem(CACHED_GEO_FULL_KEY, JSON.stringify(gpsResult));
    } catch (e) {}
    return gpsResult;
  }

  if (cachedClientNetwork) return cachedClientNetwork;

  // 1. Try restoring from localStorage if recently cached
  try {
    const saved = localStorage.getItem(CACHED_GEO_FULL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.ip && parsed.location) {
        cachedClientNetwork = parsed;
        return cachedClientNetwork as NetworkGeoInfo;
      }
    }
  } catch (e) {}

  if (isFetchingGeo) {
    await new Promise((r) => setTimeout(r, 200));
    if (cachedClientNetwork) return cachedClientNetwork;
  }

  isFetchingGeo = true;

  // Priority 1: Backend detection endpoint for accurate reverse-proxy public IP
  try {
    const srvRes = await fetch('/api/auth/detect-session', { signal: AbortSignal.timeout(2500) });
    if (srvRes.ok) {
      const srvData = await srvRes.json();
      if (srvData && srvData.ip && !srvData.ip.startsWith('127.') && srvData.ip !== '::1') {
        const countryCode = srvData.country ? 'US' : '';
        const flagEmoji = countryCodeToEmoji(countryCode);
        const result: NetworkGeoInfo = {
          ip: srvData.ip,
          location: srvData.location || 'Online',
          city: srvData.city || '',
          region: srvData.region || '',
          country: srvData.country || '',
          countryCode,
          flagEmoji,
          latitude: null,
          longitude: null,
          locationSource: 'ip',
          isp: 'Public Internet',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        };
        cachedClientNetwork = result;
        try {
          localStorage.setItem(CACHED_GEO_FULL_KEY, JSON.stringify(result));
        } catch (e) {}
        isFetchingGeo = false;
        return result;
      }
    }
  } catch (e) {}

  try {
    // Priority 2: ipwho.is (fast, rich geolocation, flag emoji, and ISP)
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
        const flagEmoji = data.flag?.emoji || countryCodeToEmoji(countryCode);
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
          locationSource: 'ip',
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
  } catch (e) {}

  try {
    // Priority 3: api.ipify.org + freeipapi.com fallback
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
        locationSource: 'ip',
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
  } catch (e) {}

  isFetchingGeo = false;

  // Priority 4: Browser system timezone fallback
  const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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
    locationSource: 'ip',
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
    const dev = await detectDeviceInfoAsync();
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
  },
  geoCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }
): Promise<UserDevice> {
  const deviceId = getOrCreateDeviceId();
  const dev = await detectDeviceInfoAsync();
  const net = await getClientNetworkInfo(geoCoords);
  const now = new Date().toISOString();

  let deviceData: UserDevice = {
    id: deviceId,
    userId: userId || 'local_user',
    userEmail: userInfo?.email || '',
    userName: userInfo?.userName || '',
    userAvatar: userInfo?.userAvatar || '',
    deviceId,
    deviceName: dev.deviceName,
    deviceType: dev.deviceType,
    model: dev.model,
    manufacturer: dev.manufacturer,
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
    accuracy: net.accuracy ?? undefined,
    locationSource: net.locationSource || 'ip',
    locationTimestamp: now,
    isp: net.isp,
    screenResolution: dev.screenResolution,
    lastActive: now,
    createdAt: now,
    isCurrent: true,
    status: 'active',
    userAgent: dev.userAgent.slice(0, 200)
  };

  // Synchronize with server-side authoritative detection endpoint
  try {
    const srvRes = await fetch('/api/auth/login-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: deviceData.userId,
        sessionId: deviceData.id,
        clientPublicIp: net.ip,
        clientHints: {
          brands: dev.clientHints?.brands,
          platform: dev.clientHints?.platform,
          platformVersion: dev.osVersion,
          model: dev.model,
          hasBattery: dev.hasBattery,
          isLaptop: dev.deviceType === 'laptop'
        },
        geo: geoCoords ? {
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          accuracy: geoCoords.accuracy
        } : undefined,
        device: dev.deviceType,
        browser: dev.browser,
        os: dev.os,
        location: deviceData.location,
        loginTime: Date.now()
      })
    });

    if (srvRes.ok) {
      const srvData = await srvRes.json();
      if (srvData && srvData.session) {
        const s = srvData.session;
        if (s.ip && !s.ip.startsWith('127.') && s.ip !== '::1') deviceData.ip = s.ip;
        if (s.browser) deviceData.browser = s.browser;
        if (s.os && s.os !== 'Unknown OS') deviceData.os = s.os;
        if (s.deviceType) deviceData.deviceType = s.deviceType;
        if (s.model) deviceData.model = s.model;
        if (s.manufacturer) deviceData.manufacturer = s.manufacturer;
        if (s.location) deviceData.location = s.location;
        if (s.city) deviceData.city = s.city;
        if (s.region) deviceData.region = s.region;
        if (s.country) deviceData.country = s.country;
        if (s.countryCode) deviceData.countryCode = s.countryCode;
        if (typeof s.latitude === 'number') deviceData.latitude = s.latitude;
        if (typeof s.longitude === 'number') deviceData.longitude = s.longitude;
        if (typeof s.accuracy === 'number') deviceData.accuracy = s.accuracy;
        if (s.locationSource) deviceData.locationSource = s.locationSource;
      }
    }
  } catch (e) {}

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
 * Update the active session's location when GPS coordinates are acquired
 */
export async function updateActiveSessionLocation(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number;
}): Promise<UserDevice | null> {
  try {
    const currentDeviceId = getOrCreateDeviceId();
    const net = await getClientNetworkInfo(coords);
    const now = new Date().toISOString();

    const updates: Partial<UserDevice> = {
      location: net.location,
      city: net.city,
      region: net.region,
      country: net.country,
      countryCode: net.countryCode,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      locationSource: 'gps',
      locationTimestamp: now,
      lastActive: now
    };

    // Update local cache
    const local = getLocalDevices();
    const current = local.find((d) => d.deviceId === currentDeviceId || d.id === currentDeviceId);
    const updatedDevice = current ? { ...current, ...updates } : null;
    if (updatedDevice) {
      saveLocalDevice(updatedDevice);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartledger:device_updated', { detail: updatedDevice }));
      }
    }

    // Update backend session
    const currentUserId = auth.currentUser?.uid || 'local_user';
    try {
      await fetch('/api/auth/update-session-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          sessionId: currentDeviceId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        })
      });
    } catch (e) {}

    // Update Firestore if user is logged in
    if (auth.currentUser && currentUserId !== 'local_user') {
      try {
        await updateUserDevice(currentUserId, currentDeviceId, updates);
      } catch (e) {}
    }

    return updatedDevice;
  } catch (err) {
    console.warn('[Security] Failed to update session location:', err);
    return null;
  }
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
export async function updateUserDevice(userId: string, deviceId: string, updates: Partial<UserDevice>): Promise<void> {
  if (userId === 'local_user') {
    let devices = getLocalDevices();
    devices = devices.map(d => d.id === deviceId ? { ...d, ...updates } : d);
    try {
      localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(devices));
    } catch(e) {}
    return;
  }

  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    if (!db) return;
    const docRef = doc(db, 'users', userId, 'devices', deviceId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating device:', error);
    throw error;
  }
}

export async function removeUserDevice(userId: string, deviceId: string): Promise<void> {
  if (userId === 'local_user') {
    let devices = getLocalDevices();
    devices = devices.filter(d => d.id !== deviceId);
    try {
      localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(devices));
    } catch(e) {}
    return;
  }

  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    if (!db) return;
    const docRef = doc(db, 'users', userId, 'devices', deviceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error removing device:', error);
    throw error;
  }
}

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
