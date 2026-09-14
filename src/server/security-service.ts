import type { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---
export interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  source: 'gps' | 'ip' | 'approximate_ip';
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  accuracyRadiusKm?: number;
  status: 'success' | 'failed' | 'unresolvable';
  reason?: string;
}

/**
 * Backend Unit Test Case Verification List:
 * 1. Private IP (e.g. 192.168.1.50, 10.0.0.1, 127.0.0.1): Returns { status: "unresolvable", reason: "private_or_local_ip", lat: null, lng: null } without external API call.
 * 2. Valid Public IP (e.g. 8.8.8.8): Returns { status: "success", lat: ..., lng: ..., city: "Mountain View", ... } after successful upstream response.
 * 3. Provider Timeout: Aborts request after 3000ms, returning { status: "failed", reason: "timeout", lat: null, lng: null }.
 * 4. Provider Returns 0,0 (Null Island): Rejects coordinates and returns { status: "failed", reason: "null_island_from_provider", lat: null, lng: null }.
 * 5. Provider Returns Valid City: Successfully resolves and normalizes city, region, country and coordinates.
 */

export interface ParsedDeviceInfo {
  category: 'Desktop' | 'Mobile' | 'Tablet' | 'TV' | 'Wearable' | 'Unknown';
  model: string;
  manufacturer?: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  clientHints?: Record<string, any>;
  hasBattery?: boolean;
}

export interface AuthoritativeSecurityEvent {
  id: string;
  uid: string;
  email: string;
  eventType: 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILED' 
    | 'GOOGLE_LOGIN' 
    | 'PASSWORD_LOGIN' 
    | 'ADMIN_LOGIN' 
    | 'LOGIN_DENIED_UNAUTHORIZED' 
    | 'LOGOUT' 
    | 'NEW_DEVICE_DETECTED' 
    | 'SESSION_REVOKED';
  authProvider: 'google' | 'password' | 'other' | 'none';
  timestamp: string; // Server ISO timestamp
  serverTimestampMs: number;
  ip: string;
  location: GeoLocation;
  device: ParsedDeviceInfo;
  sessionId: string;
  newDevice: boolean;
  authorizationResult: 'admin' | 'user' | 'denied';
  details?: string;
}

// In-memory caches and rate limiting
const geoCache = new Map<string, GeoLocation>();
const userKnownDevices = new Map<string, Set<string>>(); // uid -> Set of device signatures
const failedLoginRateLimiter = new Map<string, { count: number; resetAt: number }>();
const inMemorySecurityLogs: AuthoritativeSecurityEvent[] = [];

// Persistent backup log file path
const AUDIT_LOG_FILE = path.join(process.cwd(), 'audit-security-events.json');

// Initialize persistent log store from disk if exists
try {
  if (fs.existsSync(AUDIT_LOG_FILE)) {
    const raw = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemorySecurityLogs.push(...parsed.slice(-200)); // keep recent 200 in memory
      // Re-populate known device signatures
      for (const event of parsed) {
        if (event.uid && event.device) {
          const sig = generateDeviceSignature(event.device);
          if (!userKnownDevices.has(event.uid)) {
            userKnownDevices.set(event.uid, new Set());
          }
          userKnownDevices.get(event.uid)!.add(sig);
        }
      }
    }
  }
} catch (e) {
  console.warn('[SecurityService] Note: Initializing fresh audit log store');
}

function saveAuditLogsToDisk() {
  try {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(inMemorySecurityLogs.slice(-500), null, 2), 'utf-8');
  } catch (err) {
    console.error('[SecurityService] Error saving audit logs to disk:', err);
  }
}

// Helper: Generate a deterministic signature of device characteristics
export function generateDeviceSignature(device: ParsedDeviceInfo): string {
  const raw = `${device.category}_${device.os}_${device.browser}_${device.model}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

// --- 1. Real Server-Side IP Extraction ---
export function cleanIp(ip: string): string {
  let cleaned = (ip || '').trim();
  // Strip IPv6-mapped IPv4 prefix (::ffff:)
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

export function isValidPublicIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = cleanIp(ip);
  if (!trimmed || trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') {
    return false;
  }

  // IPv4 validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = trimmed.match(ipv4Regex);
  if (match) {
    const o1 = parseInt(match[1], 10);
    const o2 = parseInt(match[2], 10);
    const o3 = parseInt(match[3], 10);
    const o4 = parseInt(match[4], 10);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return false;

    // Check private & reserved ranges
    if (o1 === 0) return false; // 0.0.0.0/8
    if (o1 === 10) return false; // 10.0.0.0/8
    if (o1 === 127) return false; // 127.0.0.0/8 loopback
    if (o1 === 169 && o2 === 254) return false; // 169.254.0.0/16 link-local
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return false; // 172.16.0.0/12
    if (o1 === 192 && o2 === 168) return false; // 192.168.0.0/16
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return false; // 100.64.0.0/10 CGNAT
    if (o1 >= 224) return false; // Multicast & broadcast

    return true;
  }

  // IPv6 validation
  if (trimmed.includes(':')) {
    const lower = trimmed.toLowerCase();
    if (lower === '::1' || lower === '::') return false;
    if (lower.startsWith('fe80:')) return false; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return false; // unique local
    return true;
  }

  return false;
}

export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const cleaned = cleanIp(ip);
  if (!cleaned || cleaned === '127.0.0.1' || cleaned === '::1' || cleaned === 'localhost') {
    return true;
  }
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleaned.match(ipv4Regex);
  if (match) {
    const o1 = parseInt(match[1], 10);
    const o2 = parseInt(match[2], 10);
    if (o1 === 0) return true; // 0.0.0.0/8
    if (o1 === 10) return true; // 10.0.0.0/8
    if (o1 === 127) return true; // 127.0.0.0/8 loopback
    if (o1 === 169 && o2 === 254) return true; // link-local
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
    if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true; // CGNAT
    if (o1 >= 224) return true;
    return false;
  }
  if (cleaned.includes(':')) {
    const lower = cleaned.toLowerCase();
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
  }
  return false;
}

export function extractClientIp(req: Request, clientReportedPublicIp?: string): string {
  // BUG FIX: Read X-Forwarded-For header first (take leftmost IP, which is the original client)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const rawList = (Array.isArray(forwarded) ? forwarded.join(',') : forwarded)
      .split(',')
      .map(s => cleanIp(s.trim()))
      .filter(Boolean);

    if (rawList.length > 0) {
      const leftmostIp = rawList[0];
      if (isValidPublicIp(leftmostIp)) {
        console.log(`[SecurityService] Extracted real client IP from leftmost X-Forwarded-For: ${leftmostIp}`);
        return leftmostIp;
      }
      // Check any other valid public IP in the chain
      for (const ip of rawList) {
        if (isValidPublicIp(ip)) {
          console.log(`[SecurityService] Extracted real client IP from X-Forwarded-For chain: ${ip}`);
          return ip;
        }
      }
    }
  }

  // Fall back to client reported public IP if provided and valid
  if (clientReportedPublicIp && isValidPublicIp(clientReportedPublicIp)) {
    const cleaned = cleanIp(clientReportedPublicIp);
    console.log(`[SecurityService] Extracted real client IP from clientReportedPublicIp: ${cleaned}`);
    return cleaned;
  }

  // Fall back to req.socket.remoteAddress or req.ip only if no forwarded header exists
  const rawSocketIp = cleanIp(req.ip || req.socket?.remoteAddress || '');
  console.log(`[SecurityService] Extracted client IP from socket remoteAddress: ${rawSocketIp}`);
  return rawSocketIp || '127.0.0.1';
}

// --- 2. Reverse Geocoding for GPS & Approximate IP Geolocation ---
export async function reverseGeocodeGps(lat: number, lon: number): Promise<{
  location: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || '';
      const region = data.principalSubdivision || '';
      const country = data.countryName || '';
      const countryCode = data.countryCode || '';
      if (!lat || !lon || (lat === 0 && lon === 0)) {
        return { location: 'Coordinates unavailable' };
      }
      const parts = [city, region, country].filter(Boolean);
      return {
        location: parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        city: city || undefined,
        region: region || undefined,
        country: country || undefined,
        countryCode: countryCode || undefined
      };
    }
  } catch (e) {}

  return {
    location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  };
}

export async function getApproximateLocation(ip: string): Promise<GeoLocation> {
  const cleanedIp = cleanIp(ip);

  // BUG FIX: Check private / loopback / reserved IPs before calling any geo provider
  if (isPrivateOrLocalIp(cleanedIp)) {
    console.log(`[SecurityService] IP ${cleanedIp} is private or local. Bypassing Geo-IP API.`);
    return {
      status: 'unresolvable',
      reason: 'private_or_local_ip',
      lat: null,
      lng: null,
      city: null,
      region: null,
      country: null,
      source: 'approximate_ip'
    };
  }

  if (geoCache.has(cleanedIp)) {
    return geoCache.get(cleanedIp)!;
  }

  // 1. ipwho.is with 3000ms AbortController timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanedIp)}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude);
        const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude);

        // BUG FIX: Explicitly validate provider response against Null Island (0,0)
        if (!lat || !lng || (lat === 0 && lng === 0)) {
          return {
            status: 'failed',
            reason: 'null_island_from_provider',
            lat: null,
            lng: null,
            city: null,
            region: null,
            country: null,
            source: 'approximate_ip'
          };
        }

        const successResult: GeoLocation = {
          status: 'success',
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          country: data.country || 'Unknown',
          accuracyRadiusKm: 25,
          source: 'ip'
        };
        geoCache.set(cleanedIp, successResult);
        return successResult;
      }
    }
  } catch (err: any) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'provider_error');
    console.warn(`[SecurityService] ipwho.is geo lookup failed for IP ${cleanedIp}:`, reason);
  }

  // 2. ip-api.com fallback with 3000ms AbortController timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanedIp)}?fields=status,message,lat,lon,country,regionName,city`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const lat = typeof data.lat === 'number' ? data.lat : parseFloat(data.lat);
        const lng = typeof data.lon === 'number' ? data.lon : parseFloat(data.lon);

        if (!lat || !lng || (lat === 0 && lng === 0)) {
          return {
            status: 'failed',
            reason: 'null_island_from_provider',
            lat: null,
            lng: null,
            city: null,
            region: null,
            country: null,
            source: 'approximate_ip'
          };
        }

        const successResult: GeoLocation = {
          status: 'success',
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          city: data.city || 'Unknown',
          region: data.regionName || 'Unknown',
          country: data.country || 'Unknown',
          accuracyRadiusKm: 25,
          source: 'ip'
        };
        geoCache.set(cleanedIp, successResult);
        return successResult;
      }
    }
  } catch (err: any) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'provider_error');
    console.warn(`[SecurityService] ip-api.com geo lookup failed for IP ${cleanedIp}:`, reason);
  }

  return {
    status: 'failed',
    reason: 'provider_unavailable',
    lat: null,
    lng: null,
    city: null,
    region: null,
    country: null,
    source: 'approximate_ip'
  };
}

// --- 3. Real Device & Browser Detection (User-Agent + Client Hints) ---
export function parseDeviceAndBrowser(req: Request, clientHintsPayload?: Record<string, any>): ParsedDeviceInfo {
  const userAgent = req.headers['user-agent'] || (clientHintsPayload?.userAgent as string) || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const secChUaPlatform = req.headers['sec-ch-ua-platform'] as string;
  const chPlatformVersion = (req.headers['sec-ch-ua-platform-version'] as string) || (clientHintsPayload?.platformVersion as string);
  const chBrands = clientHintsPayload?.brands || [];

  // --- Operating System Detection ---
  let os = 'Unknown OS';
  let osVersion = 'Unavailable';

  // 1. FydeOS Check (Highest precedence for Chromium OS forks)
  const isFydeInUa = /FydeOS|FlintOS/i.test(userAgent);
  const isFydeInPlatform = /FydeOS/i.test(secChUaPlatform || '') || /FydeOS/i.test(clientHintsPayload?.platform || '');
  const isFydeInBrands = Array.isArray(chBrands) && chBrands.some((b: any) => /FydeOS/i.test(b?.brand || ''));

  if (isFydeInUa || isFydeInPlatform || isFydeInBrands) {
    os = 'FydeOS';
    const match = userAgent.match(/(?:FydeOS|FlintOS)[\/\s]?v?([0-9.]+)/i);
    if (match) {
      osVersion = match[1];
    } else if (chPlatformVersion && chPlatformVersion !== 'Unavailable') {
      osVersion = chPlatformVersion.replace(/['"]/g, '').trim();
    }
  } else if (
    /CrOS|Chrome\s?OS|Chromium\s?OS/i.test(userAgent) ||
    /Chrome\s?OS|Chromium\s?OS/i.test(secChUaPlatform || '') ||
    /Chrome\s?OS|Chromium\s?OS/i.test(clientHintsPayload?.platform || '')
  ) {
    // 2. ChromeOS / Chromium OS (per guidelines: if FydeOS cannot be distinguished reliably, show ChromeOS)
    os = 'ChromeOS';
    const match = userAgent.match(/CrOS\s+[^\s]+\s+([0-9.]+)/i) || userAgent.match(/ChromeOS\/([0-9.]+)/i);
    if (match) {
      osVersion = match[1];
    } else if (chPlatformVersion && chPlatformVersion !== 'Unavailable') {
      osVersion = chPlatformVersion.replace(/['"]/g, '').trim();
    }
  } else if (
    /Windows/i.test(userAgent) ||
    /Windows/i.test(secChUaPlatform || '') ||
    /Windows/i.test(clientHintsPayload?.platform || '')
  ) {
    // 3. Windows (distinguish Windows 11 vs Windows 10 via Client Hints platformVersion >= 13)
    const cleanPlatVer = (chPlatformVersion || '').replace(/['"]/g, '').trim();
    const platMajor = parseFloat(cleanPlatVer.split('.')[0]);
    if (!isNaN(platMajor) && platMajor >= 13) {
      os = 'Windows 11';
      osVersion = cleanPlatVer;
    } else if (!isNaN(platMajor) && platMajor > 0) {
      os = 'Windows 10';
      osVersion = cleanPlatVer;
    } else if (/Windows NT 10.0/i.test(userAgent)) {
      os = 'Windows 11 / 10';
      osVersion = '10.0';
    } else if (/Windows NT 6.3/i.test(userAgent)) {
      os = 'Windows 8.1';
      osVersion = '8.1';
    } else if (/Windows NT 6.2/i.test(userAgent)) {
      os = 'Windows 8';
      osVersion = '8.0';
    } else if (/Windows NT 6.1/i.test(userAgent)) {
      os = 'Windows 7';
      osVersion = '7.0';
    } else {
      os = 'Windows';
    }
  } else if (
    /Macintosh|Mac OS X/i.test(userAgent) ||
    /macOS/i.test(secChUaPlatform || '') ||
    /macOS/i.test(clientHintsPayload?.platform || '')
  ) {
    // 4. macOS
    if (/iPad/i.test(userAgent) || clientHintsPayload?.isIPad) {
      os = 'iPadOS';
    } else {
      os = 'macOS';
      const match = userAgent.match(/Mac OS X\s+([0-9_]+)/i);
      if (match) osVersion = match[1].replace(/_/g, '.');
    }
  } else if (
    /Android/i.test(userAgent) ||
    /Android/i.test(secChUaPlatform || '') ||
    /Android/i.test(clientHintsPayload?.platform || '')
  ) {
    // 5. Android
    os = 'Android';
    const match = userAgent.match(/Android\s+([0-9.]+)/i);
    if (match) osVersion = match[1];
  } else if (/iPhone|iPod/i.test(userAgent)) {
    // 6. iOS
    os = 'iOS';
    const match = userAgent.match(/OS\s+([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (/iPad/i.test(userAgent)) {
    // 7. iPadOS
    os = 'iPadOS';
    const match = userAgent.match(/OS\s+([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (
    /Linux/i.test(userAgent) ||
    /Linux/i.test(secChUaPlatform || '') ||
    /Linux/i.test(clientHintsPayload?.platform || '')
  ) {
    // 8. Linux
    os = 'Linux';
    if (result.os.name && result.os.name !== 'Linux' && result.os.name !== 'Unknown') {
      os = result.os.name;
    }
  } else if (result.os.name && result.os.name !== 'Unknown') {
    os = result.os.name;
    if (result.os.version) osVersion = result.os.version;
  }

  // --- Browser Detection ---
  let browser = 'Web Browser';
  let browserVersion = result.browser.version || 'Unavailable';

  if (/Edg\//i.test(userAgent) || (Array.isArray(chBrands) && chBrands.some((b: any) => /Microsoft Edge/i.test(b?.brand)))) {
    const match = userAgent.match(/Edg\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Microsoft Edge ${ver}` : 'Microsoft Edge';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (/OPR\/|Opera/i.test(userAgent) || (Array.isArray(chBrands) && chBrands.some((b: any) => /Opera/i.test(b?.brand)))) {
    const match = userAgent.match(/OPR\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Opera ${ver}` : 'Opera';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (/Brave/i.test(userAgent) || clientHintsPayload?.isBrave) {
    const match = userAgent.match(/Chrome\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Brave ${ver}` : 'Brave';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (/Vivaldi\//i.test(userAgent)) {
    const match = userAgent.match(/Vivaldi\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Vivaldi ${ver}` : 'Vivaldi';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (/Chrome\//i.test(userAgent) || (Array.isArray(chBrands) && chBrands.some((b: any) => /Google Chrome/i.test(b?.brand)))) {
    const match = userAgent.match(/Chrome\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Google Chrome ${ver}` : 'Google Chrome';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (/Firefox\//i.test(userAgent)) {
    const match = userAgent.match(/Firefox\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Mozilla Firefox ${ver}` : 'Mozilla Firefox';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (/Safari\//i.test(userAgent) && !/Chrome|Chromium|Edg|OPR/i.test(userAgent)) {
    const match = userAgent.match(/Version\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : (result.browser.version?.split('.')[0] || '');
    browser = ver ? `Apple Safari ${ver}` : 'Apple Safari';
    browserVersion = match ? match[1] : (result.browser.version || 'Unavailable');
  } else if (result.browser.name) {
    browser = result.browser.version ? `${result.browser.name} ${result.browser.version.split('.')[0]}` : result.browser.name;
  }

  // --- Device Category ---
  // BUG FIX: removed unreliable "Laptop" guess, replaced with formFactors-based detection
  let category: 'Desktop' | 'Mobile' | 'Tablet' | 'TV' | 'Wearable' | 'Unknown' = 'Unknown';
  const chFormFactors = req.headers['sec-ch-ua-form-factors'] as string || clientHintsPayload?.formFactors;

  if (chFormFactors) {
    const ffStr = Array.isArray(chFormFactors) ? chFormFactors.join(',').toLowerCase() : String(chFormFactors).toLowerCase();
    if (ffStr.includes('desktop')) category = 'Desktop';
    else if (ffStr.includes('mobile')) category = 'Mobile';
    else if (ffStr.includes('tablet')) category = 'Tablet';
    else if (ffStr.includes('xr') || ffStr.includes('wearable')) category = 'Wearable';
    else if (ffStr.includes('tv')) category = 'TV';
  }

  if (category === 'Unknown') {
    if (/iPad|Tablet/i.test(userAgent) || clientHintsPayload?.isIPad || result.device.type === 'tablet') {
      category = 'Tablet';
    } else if (
      /iPhone|iPod/i.test(userAgent) ||
      (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) ||
      result.device.type === 'mobile' ||
      clientHintsPayload?.mobile === true
    ) {
      category = 'Mobile';
    } else if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
      category = 'Tablet';
    } else if (/Windows|Macintosh|Mac OS X|Linux|CrOS|ChromeOS/i.test(userAgent)) {
      category = 'Desktop';
    } else {
      category = 'Unknown';
    }
  }

  // Migration/update script to correct EXISTING session records currently mislabeled "Laptop":
  // UPDATE sessions SET device_type = 'Unknown' WHERE device_type = 'Laptop' AND form_factor_confirmed = false;

  // --- Model & Manufacturer: ONLY if legitimately supplied, NEVER fabricated! ---
  let deviceModel = 'Unavailable';
  let manufacturer: string | undefined = undefined;

  const rawModel = (req.headers['sec-ch-ua-model'] as string) || (clientHintsPayload?.model as string);
  if (rawModel && typeof rawModel === 'string') {
    const clean = rawModel.replace(/['"]/g, '').trim();
    if (clean && clean.toLowerCase() !== 'unknown' && clean !== '""' && clean !== 'Unavailable') {
      deviceModel = clean;
    }
  } else if (result.device.model && result.device.model.trim()) {
    deviceModel = result.device.model.trim();
  }

  if (result.device.vendor && result.device.vendor.trim()) {
    manufacturer = result.device.vendor.trim();
  } else if (deviceModel !== 'Unavailable') {
    const oemMatch = deviceModel.match(/^(Lenovo|HP|Dell|Apple|Samsung|Google|Asus|Acer|Microsoft|Huawei|Xiaomi|Sony|Motorola|OnePlus)\b/i);
    if (oemMatch) {
      manufacturer = oemMatch[1];
    }
  }

  return {
    category,
    model: deviceModel,
    manufacturer,
    os,
    osVersion,
    browser,
    browserVersion,
    userAgent,
    hasBattery: clientHintsPayload?.hasBattery,
    clientHints: {
      secChUa: req.headers['sec-ch-ua'] || clientHintsPayload?.brands,
      secChUaMobile: req.headers['sec-ch-ua-mobile'] || clientHintsPayload?.mobile,
      secChUaPlatform: req.headers['sec-ch-ua-platform'] || clientHintsPayload?.platform,
      secChUaModel: req.headers['sec-ch-ua-model'] || clientHintsPayload?.model,
      secChUaPlatformVersion: req.headers['sec-ch-ua-platform-version'] || clientHintsPayload?.platformVersion,
    }
  };
}

// --- 4. Firebase ID Token Verification with Google Identity Toolkit API ---
export async function verifyFirebaseIdToken(
  idToken: string, 
  apiKey: string
): Promise<{ valid: boolean; uid?: string; email?: string; emailVerified?: boolean; error?: string }> {
  if (!idToken || typeof idToken !== 'string') {
    return { valid: false, error: 'Missing ID token' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { 
        valid: false, 
        error: errData?.error?.message || `Token verification rejected (${res.status})` 
      };
    }

    const data = await res.json();
    const user = data?.users?.[0];
    if (!user || !user.localId) {
      return { valid: false, error: 'User record not found in token validation response' };
    }

    return {
      valid: true,
      uid: user.localId,
      email: user.email || '',
      emailVerified: user.emailVerified || false
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification network failure' };
  }
}

// --- 5. New Device Detection Logic ---
export function checkAndRegisterDevice(uid: string, device: ParsedDeviceInfo): boolean {
  if (!uid) return false;
  const signature = generateDeviceSignature(device);

  if (!userKnownDevices.has(uid)) {
    userKnownDevices.set(uid, new Set());
    userKnownDevices.get(uid)!.add(signature);
    return true; // First recorded device for this user
  }

  const knownSet = userKnownDevices.get(uid)!;
  if (!knownSet.has(signature)) {
    knownSet.add(signature);
    return true; // New or unrecognized device!
  }

  return false; // Recognized existing device
}

// --- 6. Write Authoritative Security Event to Firestore REST API ---
export async function writeSecurityEventToFirestore(
  event: AuthoritativeSecurityEvent,
  projectId: string,
  apiKey: string,
  idToken?: string
): Promise<boolean> {
  try {
    const docId = event.id;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/adminSecurityLogs?documentId=${docId}&key=${apiKey}`;

    // Convert event object to Firestore REST fields format
    const fields: Record<string, any> = {
      id: { stringValue: event.id },
      uid: { stringValue: event.uid },
      email: { stringValue: event.email },
      action: { stringValue: event.eventType },
      eventType: { stringValue: event.eventType },
      authProvider: { stringValue: event.authProvider },
      timestamp: { stringValue: event.timestamp },
      serverTimestampMs: { integerValue: event.serverTimestampMs.toString() },
      ip: { stringValue: event.ip },
      sessionId: { stringValue: event.sessionId },
      newDevice: { booleanValue: event.newDevice },
      authorizationResult: { stringValue: event.authorizationResult },
      device: { stringValue: `${event.device.browser} on ${event.device.os} (${event.device.category})` },
      browser: { stringValue: event.device.browser },
      details: { stringValue: event.details || '' },
      location: {
        mapValue: {
          fields: {
            country: { stringValue: event.location.country || 'Unknown' },
            region: { stringValue: event.location.region || 'Unavailable' },
            city: { stringValue: event.location.city || 'Unavailable' },
            source: { stringValue: event.location.source },
            status: { stringValue: event.location.status || 'success' },
            reason: { stringValue: event.location.reason || '' },
            lat: event.location.lat != null ? { doubleValue: event.location.lat } : { nullValue: null },
            lng: event.location.lng != null ? { doubleValue: event.location.lng } : { nullValue: null }
          }
        }
      },
      deviceInfo: {
        mapValue: {
          fields: {
            category: { stringValue: event.device.category },
            model: { stringValue: event.device.model },
            os: { stringValue: event.device.os },
            osVersion: { stringValue: event.device.osVersion },
            browser: { stringValue: event.device.browser },
            browserVersion: { stringValue: event.device.browserVersion },
            userAgent: { stringValue: event.device.userAgent }
          }
        }
      }
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[SecurityService] Firestore REST write response:', res.status, err?.error?.message || err);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[SecurityService] Error writing security event to Firestore:', err);
    return false;
  }
}

// --- 7. Security Alert Email Notification (New / Unrecognized Device) ---
export async function sendNewDeviceSecurityAlert(
  event: AuthoritativeSecurityEvent
): Promise<void> {
  const email = event.email;
  if (!email || !email.includes('@')) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(`[SecurityAlert] [Simulated/Logged Alert] New device login for ${email} from IP ${event.ip} (${event.location.city}, ${event.location.country}). (RESEND_API_KEY not configured)`);
    return;
  }

  try {
    const timeFormatted = new Date(event.timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #1a73e8; margin-top: 0;">New SmartLedger Login Alert</h2>
        <p style="color: #3c4043; font-size: 14px; line-height: 1.5;">
          A login from a <strong>new or unrecognized device</strong> was detected for your SmartLedger account (<strong>${email}</strong>).
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #5f6368; width: 35%;">Time:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #202124; font-weight: bold;">${timeFormatted} IST</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #5f6368;">Device:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #202124;">${event.device.browser} on ${event.device.os}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #5f6368;">Device Type:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #202124;">${event.device.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #5f6368;">Approximate Location:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #202124;">${event.location.city}, ${event.location.region}, ${event.location.country} <span style="font-size: 11px; color: #80868b;">(${event.location.source})</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #5f6368;">Public IP Address:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; color: #202124; font-family: monospace;">${event.ip}</td>
          </tr>
        </table>

        <p style="color: #d93025; font-size: 13px; margin-top: 24px;">
          If this was you, no action is needed. If you did not sign in from this device, please change your password and secure your administrator credentials immediately.
        </p>

        <hr style="border: none; border-top: 1px solid #f1f3f4; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9aa0a6; text-align: center;">
          SmartLedger Production Security Telemetry • Immutable Forensic Logging
        </p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SmartLedger Security <onboarding@resend.dev>',
        to: [email],
        subject: 'Security Alert: New SmartLedger Login Detected',
        html: bodyHtml
      })
    });
    console.log(`[SecurityAlert] Security alert email successfully sent to ${email}`);
  } catch (err) {
    console.warn('[SecurityAlert] Failed to dispatch security alert email:', err);
  }
}

// --- 8. In-Memory / Disk Store API ---
export function addAuthoritativeEvent(event: AuthoritativeSecurityEvent) {
  // Prepend so newest is first
  inMemorySecurityLogs.unshift(event);
  if (inMemorySecurityLogs.length > 500) {
    inMemorySecurityLogs.pop();
  }
  saveAuditLogsToDisk();
}

export function getAuthoritativeEvents(limit = 100): AuthoritativeSecurityEvent[] {
  return inMemorySecurityLogs.slice(0, limit);
}

// --- 9. Rate Limiter for Failed Logins ---
export function checkFailedLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = failedLoginRateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    failedLoginRateLimiter.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }
  if (entry.count >= 10) {
    return false; // Rate limit exceeded (10 failed attempts / minute / IP)
  }
  entry.count++;
  return true;
}
