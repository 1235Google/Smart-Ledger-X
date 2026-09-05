import type { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// --- Types ---
export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  source: string;
}

export interface ParsedDeviceInfo {
  category: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  model: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  clientHints?: Record<string, any>;
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
export function extractClientIp(req: Request): string {
  // Respect Google Cloud Run, Nginx reverse proxy, and Cloudflare headers
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cleanIp(cfConnectingIp.trim());
  }

  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return cleanIp(xRealIp.trim());
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    // In Cloud Run / standard proxies, the leftmost address is the client address
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return cleanIp(firstIp);
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    const firstIp = forwarded[0].split(',')[0].trim();
    if (firstIp) return cleanIp(firstIp);
  }

  const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return cleanIp(rawIp);
}

function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  // Strip IPv6-mapped IPv4 prefix (::ffff:)
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

// Helper: Check if IP is private or local
function isPrivateOrLocalIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
}

// --- 2. Real Approximate IP Geolocation ---
export async function getApproximateLocation(ip: string): Promise<GeoLocation> {
  const defaultLocation: GeoLocation = {
    country: 'Unknown',
    region: 'Unavailable',
    city: 'Unavailable',
    source: 'Approximate location based on IP'
  };

  if (!ip || isPrivateOrLocalIp(ip)) {
    return {
      country: 'Local Network / Cloud Sandbox',
      region: 'Development Environment',
      city: 'Container Ingress',
      source: 'Approximate location based on IP'
    };
  }

  if (geoCache.has(ip)) {
    return geoCache.get(ip)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    // Use ip-api.com json endpoint (reliable, fast, no credentials required)
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const loc: GeoLocation = {
          country: data.country || 'Unknown',
          region: data.regionName || 'Unavailable',
          city: data.city || 'Unavailable',
          source: 'Approximate location based on IP'
        };
        geoCache.set(ip, loc);
        return loc;
      }
    }
  } catch (err) {
    // Network timeout or blocked lookup - graceful fallback
  }

  return defaultLocation;
}

// --- 3. Real Device & Browser Detection (ua-parser-js + Client Hints) ---
export function parseDeviceAndBrowser(req: Request, clientHintsPayload?: Record<string, any>): ParsedDeviceInfo {
  const userAgent = req.headers['user-agent'] || (clientHintsPayload?.userAgent as string) || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Browser Name & Version
  let browser = result.browser.name || 'Unknown Browser';
  let browserVersion = result.browser.version || 'Unavailable';

  // OS Name & Version
  let os = result.os.name || 'Unknown OS';
  let osVersion = result.os.version || 'Unavailable';

  // Device Category
  let category: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = 'Unknown';
  const rawType = result.device.type?.toLowerCase();
  if (rawType === 'mobile') {
    category = 'Mobile';
  } else if (rawType === 'tablet') {
    category = 'Tablet';
  } else if (!rawType) {
    // If no mobile/tablet flag in user agent, check OS and sec-ch-ua-mobile
    const chMobile = req.headers['sec-ch-ua-mobile'] || clientHintsPayload?.mobile;
    if (chMobile === '?1' || chMobile === true) {
      category = 'Mobile';
    } else if (/windows|macintosh|mac os|linux|cros/i.test(userAgent) || /windows|mac os|linux/i.test(os)) {
      category = 'Desktop';
    } else if (/android/i.test(userAgent) || /iphone/i.test(userAgent)) {
      category = 'Mobile';
    } else if (/ipad/i.test(userAgent)) {
      category = 'Tablet';
    } else {
      category = 'Desktop';
    }
  }

  // Client Hints Overrides (Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Model)
  const secChUaPlatform = req.headers['sec-ch-ua-platform'] as string;
  if (secChUaPlatform) {
    const cleanPlatform = secChUaPlatform.replace(/['"]/g, '').trim();
    if (cleanPlatform && cleanPlatform.toLowerCase() !== 'unknown') {
      os = cleanPlatform;
    }
  }

  // Device Model: ONLY if reliably supplied by Client Hints or verified parser, NEVER guessed!
  let deviceModel = 'Unavailable';
  const secChUaModel = (req.headers['sec-ch-ua-model'] as string) || (clientHintsPayload?.model as string);
  if (secChUaModel && typeof secChUaModel === 'string') {
    const cleanModel = secChUaModel.replace(/['"]/g, '').trim();
    if (cleanModel && cleanModel.toLowerCase() !== 'unknown' && cleanModel !== '""') {
      deviceModel = cleanModel;
    }
  } else if (result.device.model && result.device.model.trim()) {
    deviceModel = result.device.model.trim();
  }

  // Client Hints platform version
  const chPlatformVersion = (req.headers['sec-ch-ua-platform-version'] as string) || (clientHintsPayload?.platformVersion as string);
  if (chPlatformVersion && osVersion === 'Unavailable') {
    osVersion = chPlatformVersion.replace(/['"]/g, '').trim();
  }

  return {
    category,
    model: deviceModel,
    os,
    osVersion,
    browser,
    browserVersion,
    userAgent,
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
            country: { stringValue: event.location.country },
            region: { stringValue: event.location.region },
            city: { stringValue: event.location.city },
            source: { stringValue: event.location.source }
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
