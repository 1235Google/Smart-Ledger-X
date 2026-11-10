import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import type { Request } from 'express';
import { extractClientIp, getApproximateLocation, parseDeviceAndBrowser, verifyFirebaseIdToken, addAuthoritativeEvent } from './security-service';

const QR_STORE_FILE = path.join(process.cwd(), 'qr-pairing-store.json');
const QR_SECRET = process.env.QR_PAIRING_HMAC_SECRET || 'smartledgerx_quantum_device_pairing_secret_2026';
const QR_SESSION_TTL_MS = 120 * 1000; // 120 seconds

export interface QrPairingPayload {
  session: string;
  expires: number;
  nonce: string;
  version: string;
  signature: string;
}

export interface DesktopSessionMetadata {
  sessionId: string;
  desktopName: string;
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  os: string;
  browser: string;
  ip: string;
  location: string;
  city?: string;
  country?: string;
  flagEmoji?: string;
  userAgent: string;
  createdAt: number;
  expiresAt: number;
  status: 'waiting' | 'scanned' | 'authenticating' | 'approved' | 'rejected' | 'expired';
  nonce: string;
  signature: string;
  mobileDeviceScanned?: {
    deviceName?: string;
    os?: string;
    browser?: string;
    scannedAt?: number;
    batteryLevel?: number;
  };
  approvedUser?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    approvedAt: number;
    biometricVerified: boolean;
    authMethod: string;
  };
  rejectionReason?: string;
  issuedToken?: string;
  consumed: boolean;
}

export interface LinkedDeviceRecord {
  deviceId: string;
  uid: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  firstLogin: string;
  lastActive: string;
  status: 'active' | 'revoked';
  isTrusted: boolean;
  trustScore: number; // 0 - 100
  batteryLevel?: number;
  lastUsedSessionId?: string;
}

export interface PairingAuditLog {
  id: string;
  sessionId: string;
  timestamp: string;
  status: 'SUCCESS' | 'REJECTED' | 'EXPIRED' | 'UNAUTHORIZED' | 'PENDING';
  desktopName: string;
  desktopOs: string;
  desktopBrowser: string;
  ip: string;
  country: string;
  location: string;
  userEmail?: string;
  userId?: string;
  biometricUsed?: boolean;
  reason?: string;
}

interface PersistentQrStore {
  activeSessions: Record<string, DesktopSessionMetadata>;
  usedNonces: Record<string, number>; // nonce -> expiry timestamp
  linkedDevices: Record<string, LinkedDeviceRecord[]>; // uid -> devices
  auditLogs: PairingAuditLog[];
}

const store: PersistentQrStore = {
  activeSessions: {},
  usedNonces: {},
  linkedDevices: {},
  auditLogs: []
};

// Load persistent data
function loadStore() {
  try {
    if (fs.existsSync(QR_STORE_FILE)) {
      const raw = fs.readFileSync(QR_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed) {
        store.activeSessions = parsed.activeSessions || {};
        store.usedNonces = parsed.usedNonces || {};
        store.linkedDevices = parsed.linkedDevices || {};
        store.auditLogs = parsed.auditLogs || [];
      }
    }
  } catch (err) {
    console.warn('[QrPairingService] Error reading store from disk:', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(QR_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[QrPairingService] Error saving store to disk:', err);
  }
}

// Initial load
loadStore();

// Prune expired sessions and nonces every 60s
setInterval(() => {
  const now = Date.now();
  let modified = false;

  for (const [id, sess] of Object.entries(store.activeSessions)) {
    if (now > sess.expiresAt && sess.status === 'waiting') {
      sess.status = 'expired';
      store.auditLogs.unshift({
        id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        sessionId: sess.sessionId,
        timestamp: new Date().toISOString(),
        status: 'EXPIRED',
        desktopName: sess.desktopName,
        desktopOs: sess.os,
        desktopBrowser: sess.browser,
        ip: sess.ip,
        country: sess.country || 'Unknown',
        location: sess.location,
        reason: 'Session timed out after 120 seconds without mobile scan'
      });
      modified = true;
    }
    // Remove completed/expired sessions older than 15 minutes
    if (now - sess.createdAt > 15 * 60 * 1000) {
      delete store.activeSessions[id];
      modified = true;
    }
  }

  for (const [nonce, exp] of Object.entries(store.usedNonces)) {
    if (now > exp) {
      delete store.usedNonces[nonce];
      modified = true;
    }
  }

  if (modified) {
    saveStore();
  }
}, 30000);

/**
 * Sign payload cryptographically using server HMAC-SHA256
 */
export function signQrPayload(sessionId: string, expires: number, nonce: string, version: string = '1'): string {
  const data = `${sessionId}:${expires}:${nonce}:${version}`;
  return crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
}

/**
 * Verify HMAC signature with timing-safe comparison
 */
export function verifyQrSignature(sessionId: string, expires: number, nonce: string, version: string, signature: string): boolean {
  try {
    const expected = signQrPayload(sessionId, expires, nonce, version);
    const bufA = Buffer.from(signature, 'hex');
    const bufB = Buffer.from(expected, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Creates an enterprise-grade pairing session for Desktop Login.
 * Does NOT encode any private credentials or tokens inside the QR code.
 */
export async function createQrPairingSession(req: Request): Promise<{
  sessionId: string;
  qrPayload: QrPairingPayload;
  qrCodeDataUrl: string;
  qrCodeSvg: string;
  expiresAt: number;
  expiresInSeconds: number;
  desktopMetadata: {
    desktopName: string;
    os: string;
    browser: string;
    location: string;
    ip: string;
  };
}> {
  const sessionId = crypto.randomUUID();
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const expiresAt = now + QR_SESSION_TTL_MS;
  const version = '1';
  const signature = signQrPayload(sessionId, expiresAt, nonce, version);

  const clientIp = extractClientIp(req);
  const location = await getApproximateLocation(clientIp);
  const parsed = parseDeviceAndBrowser(req);

  const desktopName = parsed.model && parsed.model !== 'Unavailable' 
    ? parsed.model 
    : `${parsed.os} ${parsed.category === 'Desktop' ? 'PC' : parsed.category}`;

  const locString = location.city 
    ? `${location.city}, ${location.country || ''}` 
    : 'Local Secured Network';

  const sessionMeta: DesktopSessionMetadata = {
    sessionId,
    desktopName,
    deviceType: parsed.category === 'Desktop' ? 'desktop' : parsed.category === 'Mobile' ? 'mobile' : 'laptop',
    os: `${parsed.os} ${parsed.osVersion}`.trim(),
    browser: `${parsed.browser} ${parsed.browserVersion}`.trim(),
    ip: clientIp,
    location: locString,
    city: location.city || undefined,
    country: location.country || undefined,
    flagEmoji: location.country === 'India' ? '🇮🇳' : location.country === 'United States' ? '🇺🇸' : '🌐',
    userAgent: req.headers['user-agent'] || '',
    createdAt: now,
    expiresAt,
    status: 'waiting',
    nonce,
    signature,
    consumed: false
  };

  store.activeSessions[sessionId] = sessionMeta;
  saveStore();

  const qrPayload: QrPairingPayload = {
    session: sessionId,
    expires: expiresAt,
    nonce,
    version,
    signature
  };

  const payloadString = JSON.stringify(qrPayload);

  // Generate high-resolution crisp DataURL for rendering in UI
  const qrCodeDataUrl = await QRCode.toDataURL(payloadString, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 380,
    color: {
      dark: '#030712',
      light: '#ffffff'
    }
  });

  const qrCodeSvg = await QRCode.toString(payloadString, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    sessionId,
    qrPayload,
    qrCodeDataUrl,
    qrCodeSvg,
    expiresAt,
    expiresInSeconds: 120,
    desktopMetadata: {
      desktopName,
      os: sessionMeta.os,
      browser: sessionMeta.browser,
      location: sessionMeta.location,
      ip: clientIp
    }
  };
}

/**
 * Mobile device signals that it has scanned the QR code.
 */
export function recordQrScanned(
  sessionId: string,
  mobileInfo?: { deviceName?: string; os?: string; browser?: string; batteryLevel?: number }
): {
  success: boolean;
  status?: string;
  error?: string;
  desktopMetadata?: {
    desktopName: string;
    os: string;
    browser: string;
    location: string;
    ip: string;
    loginTime: string;
    expiresInSeconds: number;
  };
} {
  const session = store.activeSessions[sessionId];
  if (!session) {
    return { success: false, error: 'Pairing session does not exist or has expired.' };
  }

  if (Date.now() > session.expiresAt || session.status === 'expired') {
    session.status = 'expired';
    saveStore();
    return { success: false, error: 'QR Code has expired. Please refresh the desktop screen.' };
  }

  if (session.consumed) {
    return { success: false, error: 'This QR session has already been used and cannot be replayed.' };
  }

  session.status = 'scanned';
  session.mobileDeviceScanned = {
    ...mobileInfo,
    scannedAt: Date.now()
  };
  saveStore();

  const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));

  return {
    success: true,
    status: 'scanned',
    desktopMetadata: {
      desktopName: session.desktopName,
      os: session.os,
      browser: session.browser,
      location: session.location,
      ip: session.ip,
      loginTime: new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      expiresInSeconds: remaining
    }
  };
}

/**
 * Approves a scanned QR login request with authenticated mobile user identity & biometric proof.
 */
export async function approveQrSession(
  sessionId: string,
  userData: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    idToken?: string;
  },
  approvalDetails: {
    biometricVerified: boolean;
    authMethod: 'Face Unlock' | 'Fingerprint' | 'Biometric Passkey' | 'Device PIN' | 'SmartLedger Secure Key';
    rememberDevice?: boolean;
    mobileDeviceName?: string;
    mobileBatteryLevel?: number;
  }
): Promise<{
  success: boolean;
  error?: string;
  sessionToken?: string;
  user?: any;
}> {
  const session = store.activeSessions[sessionId];
  if (!session) {
    return { success: false, error: 'Pairing session not found or expired.' };
  }

  const now = Date.now();
  if (now > session.expiresAt) {
    session.status = 'expired';
    saveStore();
    return { success: false, error: 'Pairing session expired before approval.' };
  }

  if (session.consumed || session.status === 'approved') {
    return { success: false, error: 'Security alert: Single-use pairing session was already used.' };
  }

  // Nonce replay protection check
  if (store.usedNonces[session.nonce]) {
    return { success: false, error: 'Replay attempt detected! Nonce has already been consumed.' };
  }
  store.usedNonces[session.nonce] = session.expiresAt + 3600000; // retain nonce record for 1 hour

  // Mandatory Biometric Requirement
  if (!approvalDetails.biometricVerified) {
    return { success: false, error: 'Biometric authorization is strictly required to approve device pairing.' };
  }

  // Generate authoritative issued desktop session token
  const issuedToken = 'slx_sess_' + crypto.randomBytes(32).toString('hex');
  const cleanEmail = userData.email.toLowerCase().trim();

  session.status = 'approved';
  session.consumed = true;
  session.issuedToken = issuedToken;
  session.approvedUser = {
    uid: userData.uid,
    email: cleanEmail,
    displayName: userData.displayName || cleanEmail.split('@')[0],
    photoURL: userData.photoURL,
    approvedAt: now,
    biometricVerified: approvalDetails.biometricVerified,
    authMethod: approvalDetails.authMethod
  };

  // Record into Linked Devices for the user
  const userDevices = store.linkedDevices[userData.uid] || [];
  const existingDevIdx = userDevices.findIndex(d => d.os === session.os && d.browser === session.browser);

  const deviceId = existingDevIdx >= 0 
    ? userDevices[existingDevIdx].deviceId 
    : 'dev_' + crypto.randomBytes(8).toString('hex');

  const newDeviceRecord: LinkedDeviceRecord = {
    deviceId,
    uid: userData.uid,
    deviceName: session.desktopName,
    deviceType: session.deviceType,
    browser: session.browser,
    os: session.os,
    ip: session.ip,
    location: session.location,
    firstLogin: existingDevIdx >= 0 ? userDevices[existingDevIdx].firstLogin : new Date().toISOString(),
    lastActive: new Date().toISOString(),
    status: 'active',
    isTrusted: Boolean(approvalDetails.rememberDevice),
    trustScore: approvalDetails.rememberDevice ? 98 : 88,
    batteryLevel: approvalDetails.mobileBatteryLevel,
    lastUsedSessionId: sessionId
  };

  if (existingDevIdx >= 0) {
    userDevices[existingDevIdx] = newDeviceRecord;
  } else {
    userDevices.unshift(newDeviceRecord);
  }
  store.linkedDevices[userData.uid] = userDevices;

  // Log authoritative security audit log
  store.auditLogs.unshift({
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    sessionId,
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
    desktopName: session.desktopName,
    desktopOs: session.os,
    desktopBrowser: session.browser,
    ip: session.ip,
    country: session.country || 'Global',
    location: session.location,
    userEmail: cleanEmail,
    userId: userData.uid,
    biometricUsed: approvalDetails.biometricVerified
  });

  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }

  saveStore();

  addAuthoritativeEvent({
    id: `auth_qr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    uid: userData.uid,
    email: cleanEmail,
    eventType: 'LOGIN_SUCCESS',
    authProvider: 'other',
    timestamp: new Date().toISOString(),
    serverTimestampMs: now,
    ip: session.ip,
    location: {
      city: session.city || null,
      country: session.country || null,
      region: null,
      source: 'approximate_ip',
      status: 'success'
    },
    device: {
      category: 'Desktop',
      model: session.desktopName,
      os: session.os,
      osVersion: '',
      browser: session.browser,
      browserVersion: '',
      userAgent: session.userAgent
    },
    sessionId,
    newDevice: existingDevIdx < 0,
    authorizationResult: 'user',
    details: `Authenticated via Secure QR Mobile Device Pairing (${approvalDetails.authMethod})`
  });

  return {
    success: true,
    sessionToken: issuedToken,
    user: {
      uid: userData.uid,
      email: cleanEmail,
      displayName: session.approvedUser.displayName,
      photoURL: userData.photoURL
    }
  };
}

/**
 * Mobile user explicitly rejects or cancels the login request.
 */
export function rejectQrSession(sessionId: string, reason: string = 'User rejected authorization request'): {
  success: boolean;
  error?: string;
} {
  const session = store.activeSessions[sessionId];
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  session.status = 'rejected';
  session.rejectionReason = reason;
  session.consumed = true;

  store.auditLogs.unshift({
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    sessionId,
    timestamp: new Date().toISOString(),
    status: 'REJECTED',
    desktopName: session.desktopName,
    desktopOs: session.os,
    desktopBrowser: session.browser,
    ip: session.ip,
    country: session.country || 'Unknown',
    location: session.location,
    reason
  });

  saveStore();
  return { success: true };
}

/**
 * Poll or check session status for desktop client.
 */
export function getQrSessionStatus(sessionId: string): {
  status: 'waiting' | 'scanned' | 'authenticating' | 'approved' | 'rejected' | 'expired';
  expiresInSeconds: number;
  mobileDeviceScanned?: any;
  approvedUser?: any;
  issuedToken?: string;
  rejectionReason?: string;
  error?: string;
} {
  const session = store.activeSessions[sessionId];
  if (!session) {
    return { status: 'expired', expiresInSeconds: 0, error: 'Session expired or not found' };
  }

  const now = Date.now();
  if (now > session.expiresAt && session.status !== 'approved') {
    session.status = 'expired';
    saveStore();
    return { status: 'expired', expiresInSeconds: 0 };
  }

  const expiresInSeconds = Math.max(0, Math.floor((session.expiresAt - now) / 1000));

  return {
    status: session.status,
    expiresInSeconds,
    mobileDeviceScanned: session.mobileDeviceScanned,
    approvedUser: session.approvedUser,
    issuedToken: session.status === 'approved' ? session.issuedToken : undefined,
    rejectionReason: session.rejectionReason
  };
}

/**
 * Retrieve linked devices for user
 */
export function getUserLinkedDevices(uid: string): LinkedDeviceRecord[] {
  return store.linkedDevices[uid] || [];
}

/**
 * Rename, revoke or trust a linked device
 */
export function modifyLinkedDevice(
  uid: string,
  deviceId: string,
  action: 'rename' | 'revoke' | 'trust' | 'untrust',
  value?: string
): boolean {
  const devices = store.linkedDevices[uid];
  if (!devices) return false;

  const target = devices.find(d => d.deviceId === deviceId);
  if (!target) return false;

  if (action === 'rename' && value) {
    target.deviceName = value.trim();
  } else if (action === 'revoke') {
    target.status = 'revoked';
  } else if (action === 'trust') {
    target.isTrusted = true;
    target.trustScore = 98;
  } else if (action === 'untrust') {
    target.isTrusted = false;
    target.trustScore = 75;
  }

  saveStore();
  return true;
}

/**
 * Get device pairing audit logs with filtering
 */
export function getPairingAuditLogs(filter?: { status?: string; uid?: string; limit?: number }): PairingAuditLog[] {
  let logs = store.auditLogs;
  if (filter?.status && filter.status !== 'ALL') {
    logs = logs.filter(l => l.status === filter.status);
  }
  if (filter?.uid) {
    logs = logs.filter(l => l.userId === filter.uid);
  }
  return logs.slice(0, filter?.limit || 100);
}
