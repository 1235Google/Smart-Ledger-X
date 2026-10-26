import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import { db, isFirebaseAdminReady } from './db';
import { sendAdminMfaEmail } from './resend-service';
import { extractClientIp, getApproximateLocation, parseDeviceAndBrowser, verifyFirebaseIdToken } from './security-service';
import { verifySessionToken } from './admin-auth';

const MFA_STORE_FILE = path.join(process.cwd(), 'admin-mfa-store.json');
const SECRET_SALT = process.env.ADMIN_MFA_SALT || 'smartledgerx_bank_grade_mfa_salt_2026_secured';

// --- Interfaces ---

export interface AdminRecord {
  uid: string;
  email: string;
  role: 'Super Admin' | 'Security Admin' | 'Support Admin' | 'Analytics Admin';
  mfaEnabled: boolean;
  createdAt: string;
  lastLogin: string;
  displayName?: string;
  department?: string;
}

export interface AdminMfaSession {
  tempSessionId: string;
  uid: string;
  email: string;
  codeHash: string;
  expiresAt: number; // Unix timestamp ms (5 minutes)
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: string;
  lastSentAt: number;
  ip: string;
  deviceFingerprint: string;
  device?: string;
  browser?: string;
  location?: string;
}

export interface AdminSession {
  sessionId: string;
  sessionToken: string;
  uid: string;
  email: string;
  role: string;
  ip: string;
  userAgent: string;
  deviceFingerprint: string;
  device?: string;
  browser?: string;
  location?: any;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
}

export interface AdminTrustedDevice {
  deviceId: string;
  uid: string;
  email: string;
  tokenHash: string;
  deviceFingerprint: string;
  deviceName: string;
  ip: string;
  location?: string;
  createdAt: string;
  expiresAt: string; // 30 days
  lastUsed: string;
  revoked: boolean;
  revokedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  event: 
    | 'ADMIN_LOGIN_INITIATED' 
    | 'ADMIN_MFA_CHALLENGE_ISSUED' 
    | 'ADMIN_MFA_SUCCESS' 
    | 'ADMIN_MFA_FAILED' 
    | 'ADMIN_MFA_RESENT' 
    | 'UNAUTHORIZED_ADMIN_ATTEMPT' 
    | 'SESSION_CREATED' 
    | 'SESSION_REVOKED' 
    | 'ALL_SESSIONS_REVOKED' 
    | 'DEVICE_TRUSTED' 
    | 'DEVICE_REVOKED' 
    | 'EMERGENCY_LOCKDOWN_INITIATED' 
    | 'EMERGENCY_LOCKDOWN_LIFTED' 
    | 'ROLE_ACCESS_DENIED';
  uid: string;
  email: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemSecurityState {
  portalLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  reason: string | null;
  unlockMfaRequired: boolean;
}

// Initial bootstrap allowlist
const INITIAL_ADMINS: AdminRecord[] = [
  {
    uid: 'admin_master_001',
    email: 'admin@smartledgerx.io',
    role: 'Super Admin',
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    displayName: 'SmartLedgerX Master Admin',
    department: 'Global Security & Operations'
  },
  {
    uid: 'admin_souvik_001',
    email: 'souvikbbsr811@gmail.com',
    role: 'Super Admin',
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    displayName: 'Souvik Dash (Lead)',
    department: 'Executive Administration'
  },
  {
    uid: 'admin_souvik_002',
    email: 'souvikdashbbsr@gmail.com',
    role: 'Security Admin',
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    displayName: 'Souvik Security',
    department: 'Security & Compliance'
  }
];

// --- Persistent In-Memory / File-backed Storage ---

interface PersistentStore {
  admins: Record<string, AdminRecord>; // email.toLowerCase() -> AdminRecord
  mfaSessions: Record<string, AdminMfaSession>; // tempSessionId -> session
  sessions: Record<string, AdminSession>; // sessionToken -> session
  trustedDevices: Record<string, AdminTrustedDevice>; // deviceId -> record
  auditLogs: AdminAuditLog[];
  securityState: SystemSecurityState;
}

const store: PersistentStore = {
  admins: {},
  mfaSessions: {},
  sessions: {},
  trustedDevices: {},
  auditLogs: [],
  securityState: {
    portalLocked: false,
    lockedAt: null,
    lockedBy: null,
    reason: null,
    unlockMfaRequired: true
  }
};

// Load or initialize store from disk
function loadStoreFromDisk() {
  try {
    if (fs.existsSync(MFA_STORE_FILE)) {
      const raw = fs.readFileSync(MFA_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed) {
        store.admins = parsed.admins || {};
        store.mfaSessions = parsed.mfaSessions || {};
        store.sessions = parsed.sessions || {};
        store.trustedDevices = parsed.trustedDevices || {};
        store.auditLogs = parsed.auditLogs || [];
        store.securityState = parsed.securityState || store.securityState;
      }
    }
  } catch (e) {
    console.warn('[AdminMFA] Error reading store from disk:', e);
  }

  // Ensure default bootstrap admins are present
  for (const adm of INITIAL_ADMINS) {
    const key = adm.email.toLowerCase();
    if (!store.admins[key]) {
      store.admins[key] = adm;
    }
  }
  saveStoreToDisk();
}

function saveStoreToDisk() {
  try {
    fs.writeFileSync(MFA_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[AdminMFA] Error saving store to disk:', e);
  }
}

// Initialize on startup
loadStoreFromDisk();

// Hash utility functions
export function hashMfaCode(code: string): string {
  return crypto.createHmac('sha256', SECRET_SALT).update(code.trim()).digest('hex');
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', SECRET_SALT).update(token.trim()).digest('hex');
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const bufA = Buffer.from(aHex, 'hex');
    const bufB = Buffer.from(bHex, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Log admin audit event to both store and Firestore
export async function logAdminAudit(
  event: AdminAuditLog['event'],
  uid: string,
  email: string,
  ip: string,
  userAgent: string,
  metadata?: Record<string, any>
): Promise<AdminAuditLog> {
  const logEntry: AdminAuditLog = {
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    event,
    uid: uid || 'unauthenticated',
    email: email || 'anonymous',
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
    timestamp: new Date().toISOString(),
    metadata: metadata || {}
  };

  store.auditLogs.unshift(logEntry);
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
  saveStoreToDisk();

  if (isFirebaseAdminReady) {
    try {
      await db.collection('admin_audit_logs').doc(logEntry.id).set(logEntry);
    } catch (err) {
      console.warn('[AdminMFA] Firestore audit log write error:', err);
    }
  }

  return logEntry;
}

// --- Check Admin Allowlist ---
export async function checkAdminAllowlist(email: string, uid?: string): Promise<{
  isAllowed: boolean;
  admin?: AdminRecord;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { isAllowed: false };

  // First check in-memory store
  let admin = store.admins[cleanEmail];

  // If not found and Firestore is ready, check Firestore 'admins' collection
  if (!admin && isFirebaseAdminReady) {
    try {
      const snap = await db.collection('admins').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        admin = snap.docs[0].data() as AdminRecord;
        store.admins[cleanEmail] = admin;
        saveStoreToDisk();
      }
    } catch (e) {
      console.warn('[AdminMFA] Firestore admins lookup failed:', e);
    }
  }

  if (admin) {
    // If uid is provided and different, update it
    if (uid && admin.uid !== uid) {
      admin.uid = uid;
      store.admins[cleanEmail] = admin;
      saveStoreToDisk();
      if (isFirebaseAdminReady) {
        db.collection('admins').doc(uid).set(admin, { merge: true }).catch(() => {});
      }
    }
    return { isAllowed: true, admin };
  }

  return { isAllowed: false };
}

// --- Check Trusted Device Token ---
export function checkTrustedDevice(
  email: string,
  deviceToken: string | undefined,
  fingerprint: string | undefined
): { isTrusted: boolean; device?: AdminTrustedDevice } {
  if (!deviceToken || !fingerprint) return { isTrusted: false };
  const cleanEmail = email.trim().toLowerCase();
  const tokenHash = hashToken(deviceToken);

  const now = Date.now();
  for (const dev of Object.values(store.trustedDevices)) {
    if (dev.email.toLowerCase() === cleanEmail && !dev.revoked) {
      const expiresAtMs = new Date(dev.expiresAt).getTime();
      if (expiresAtMs > now) {
        if (timingSafeEqualHex(dev.tokenHash, tokenHash)) {
          // If fingerprint matches
          if (dev.deviceFingerprint === fingerprint) {
            dev.lastUsed = new Date().toISOString();
            saveStoreToDisk();
            return { isTrusted: true, device: dev };
          }
        }
      }
    }
  }

  return { isTrusted: false };
}

// --- Initiate Admin Login ---
export async function initiateAdminLogin(
  req: Request,
  email: string,
  uid: string,
  options: {
    deviceFingerprint: string;
    trustedDeviceToken?: string;
    deviceName?: string;
  }
): Promise<{
  success: boolean;
  mfaRequired: boolean;
  tempSessionId?: string;
  expiresInSeconds?: number;
  sessionToken?: string;
  adminUser?: AdminRecord;
  error?: string;
  code?: string;
  devBypassAllowed?: boolean;
  deliveryDiagnostic?: any;
  emailDelivery?: any;
}> {
  const clientIp = extractClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown User-Agent';
  const location = await getApproximateLocation(clientIp);
  const parsedDevice = parseDeviceAndBrowser(req);

  // 1. Verify Allowlist
  const { isAllowed, admin } = await checkAdminAllowlist(email, uid);
  if (!isAllowed || !admin) {
    await logAdminAudit('UNAUTHORIZED_ADMIN_ATTEMPT', uid, email, clientIp, userAgent, {
      reason: 'Email not present in admin allowlist',
      device: `${parsedDevice.browser} on ${parsedDevice.os}`,
      location: location.city ? `${location.city}, ${location.country}` : 'Unknown'
    });
    return {
      success: false,
      mfaRequired: false,
      error: 'Unauthorized access: This account is not authorized to access the SmartLedgerX Admin Portal.',
      code: 'UNAUTHORIZED_ADMIN'
    };
  }

  // 2. Check System Security State (Lockdown)
  if (store.securityState.portalLocked && admin.role !== 'Super Admin') {
    await logAdminAudit('ROLE_ACCESS_DENIED', uid, email, clientIp, userAgent, {
      reason: 'Admin portal is in Emergency Lockdown',
      role: admin.role
    });
    return {
      success: false,
      mfaRequired: false,
      error: 'Admin Portal is currently under Emergency Lockdown. Only Super Admins may log in.',
      code: 'PORTAL_LOCKED'
    };
  }

  // 3. Check Trusted Device (30-day Remembered)
  if (options.trustedDeviceToken && options.deviceFingerprint) {
    const { isTrusted, device } = checkTrustedDevice(email, options.trustedDeviceToken, options.deviceFingerprint);
    if (isTrusted && device) {
      // Direct session issuance: Bypass MFA
      const session = createAdminSessionRecord(admin, req, options.deviceFingerprint, parsedDevice, location);
      await logAdminAudit('ADMIN_LOGIN_INITIATED', uid, email, clientIp, userAgent, {
        method: 'TRUSTED_DEVICE_BYPASS',
        deviceId: device.deviceId,
        deviceName: device.deviceName
      });

      return {
        success: true,
        mfaRequired: false,
        sessionToken: session.sessionToken,
        adminUser: admin
      };
    }
  }

  // 4. Generate 6-Digit MFA Verification Code
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashMfaCode(code);
  const tempSessionId = `mfa_sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  const mfaSession: AdminMfaSession = {
    tempSessionId,
    uid: admin.uid,
    email: admin.email,
    codeHash,
    expiresAt,
    attempts: 0,
    maxAttempts: 5,
    verified: false,
    createdAt: new Date().toISOString(),
    lastSentAt: Date.now(),
    ip: clientIp,
    deviceFingerprint: options.deviceFingerprint,
    device: `${parsedDevice.category} (${parsedDevice.os})`,
    browser: `${parsedDevice.browser} ${parsedDevice.browserVersion}`,
    location: location.city ? `${location.city}, ${location.country}` : 'Secure Location'
  };

  store.mfaSessions[tempSessionId] = mfaSession;
  saveStoreToDisk();

  if (isFirebaseAdminReady) {
    try {
      await db.collection('admin_mfa_sessions').doc(tempSessionId).set({
        uid: admin.uid,
        email: admin.email,
        codeHash,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: mfaSession.createdAt,
        ip: clientIp
      });
    } catch (err) {
      console.warn('[AdminMFA] Error saving MFA session to Firestore:', err);
    }
  }

  // 5. Send Real Email via Resend - AWAITED with Error Handling & Diagnostics
  console.log(`[AdminMFA] Initiating 2FA challenge dispatch to: ${admin.email}`);
  const emailResult = await sendAdminMfaEmail(admin.email, {
    code,
    expiresMinutes: 5,
    ip: clientIp,
    device: `${parsedDevice.category} (${parsedDevice.os})`,
    browser: `${parsedDevice.browser} ${parsedDevice.browserVersion}`,
    location: location.city ? `${location.city}, ${location.country}` : undefined
  });

  if (!emailResult.success) {
    console.error(`[AdminMFA] ❌ Email dispatch failed for ${admin.email}:`, emailResult.error);
    await logAdminAudit('ADMIN_MFA_FAILED', admin.uid, admin.email, clientIp, userAgent, {
      reason: 'Failed to send verification email via Resend',
      error: emailResult.error,
      tempSessionId
    });

    const isApiKeyMissing = !process.env.RESEND_API_KEY && !process.env.RESEND_KEY;
    const isDomainIssue = emailResult.error?.toLowerCase().includes('domain') || emailResult.error?.toLowerCase().includes('verify');
    const isSandboxIssue = emailResult.error?.toLowerCase().includes('sandbox') || emailResult.error?.toLowerCase().includes('only send');

    return {
      success: false,
      mfaRequired: false,
      error: `Email delivery failure: ${emailResult.error}`,
      code: 'EMAIL_DELIVERY_FAILED',
      tempSessionId,
      devBypassAllowed: true,
      deliveryDiagnostic: {
        recipient: admin.email,
        error: emailResult.error,
        code: emailResult.code,
        devOtpHint: code, // In dev/preview sandbox, expose code so testing is never blocked
        suggestion: isApiKeyMissing
          ? 'Add RESEND_API_KEY to your .env file or server environment.'
          : isDomainIssue
            ? 'Verify your domain in the Resend dashboard or ensure sender domain has valid MX/SPF records.'
            : isSandboxIssue
              ? 'Resend sandbox mode only delivers to the Resend account owner email. Verify a custom domain to send to any recipient.'
              : 'Inspect Resend Dashboard -> Logs/Activity tab to check if the request reached their API.'
      }
    };
  }

  await logAdminAudit('ADMIN_MFA_CHALLENGE_ISSUED', admin.uid, admin.email, clientIp, userAgent, {
    tempSessionId,
    expiresInMinutes: 5,
    device: `${parsedDevice.category} (${parsedDevice.os})`,
    messageId: emailResult.messageId
  });

  return {
    success: true,
    mfaRequired: true,
    tempSessionId,
    expiresInSeconds: 300,
    adminUser: admin,
    emailDelivery: {
      status: 'delivered',
      recipient: admin.email,
      messageId: emailResult.messageId
    }
  };
}

// --- Verify 6-digit MFA Code ---
export async function verifyMfaCode(
  tempSessionId: string,
  code: string,
  req: Request,
  options: {
    rememberDevice?: boolean;
    deviceFingerprint?: string;
    deviceName?: string;
  }
): Promise<{
  success: boolean;
  sessionToken?: string;
  trustedDeviceToken?: string;
  adminUser?: AdminRecord;
  error?: string;
  remainingAttempts?: number;
  code?: string;
}> {
  const clientIp = extractClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown User-Agent';
  const location = await getApproximateLocation(clientIp);
  const parsedDevice = parseDeviceAndBrowser(req);

  const mfaSession = store.mfaSessions[tempSessionId];
  if (!mfaSession) {
    return {
      success: false,
      error: 'MFA session not found or expired. Please sign in again.',
      code: 'SESSION_EXPIRED'
    };
  }

  // Check Expiration (5 min)
  if (Date.now() > mfaSession.expiresAt) {
    delete store.mfaSessions[tempSessionId];
    saveStoreToDisk();
    return {
      success: false,
      error: 'Verification code has expired (5-minute limit exceeded). Please request a new code.',
      code: 'CODE_EXPIRED'
    };
  }

  // Check Attempts (Max 5)
  if (mfaSession.attempts >= mfaSession.maxAttempts) {
    delete store.mfaSessions[tempSessionId];
    saveStoreToDisk();
    await logAdminAudit('ADMIN_MFA_FAILED', mfaSession.uid, mfaSession.email, clientIp, userAgent, {
      reason: 'Max verification attempts exceeded',
      tempSessionId
    });
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. Code has been invalidated for security. Please request a new code.',
      code: 'MAX_ATTEMPTS_EXCEEDED'
    };
  }

  // Verify Code Hash with timing-safe comparison
  const submittedHash = hashMfaCode(code || '');
  const isValid = timingSafeEqualHex(submittedHash, mfaSession.codeHash);

  if (!isValid) {
    mfaSession.attempts += 1;
    saveStoreToDisk();

    const remaining = mfaSession.maxAttempts - mfaSession.attempts;
    await logAdminAudit('ADMIN_MFA_FAILED', mfaSession.uid, mfaSession.email, clientIp, userAgent, {
      attemptNumber: mfaSession.attempts,
      remainingAttempts: remaining,
      tempSessionId
    });

    return {
      success: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      remainingAttempts: remaining,
      code: 'INVALID_CODE'
    };
  }

  // Valid Code!
  mfaSession.verified = true;
  delete store.mfaSessions[tempSessionId];
  saveStoreToDisk();

  const { admin } = await checkAdminAllowlist(mfaSession.email, mfaSession.uid);
  if (!admin) {
    return {
      success: false,
      error: 'Administrator record could not be resolved.',
      code: 'ADMIN_NOT_FOUND'
    };
  }

  // Update last login
  admin.lastLogin = new Date().toISOString();
  store.admins[admin.email.toLowerCase()] = admin;

  // Create authoritative session
  const session = createAdminSessionRecord(
    admin,
    req,
    options.deviceFingerprint || mfaSession.deviceFingerprint,
    parsedDevice,
    location
  );

  let trustedDeviceToken: string | undefined;

  // Handle "Remember this device for 30 days"
  if (options.rememberDevice && options.deviceFingerprint) {
    const rawDeviceToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawDeviceToken);
    const deviceId = `dev_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const trustedDevice: AdminTrustedDevice = {
      deviceId,
      uid: admin.uid,
      email: admin.email,
      tokenHash,
      deviceFingerprint: options.deviceFingerprint,
      deviceName: options.deviceName || `${parsedDevice.browser} on ${parsedDevice.os} (${parsedDevice.category})`,
      ip: clientIp,
      location: location.city ? `${location.city}, ${location.country}` : 'Local',
      createdAt: new Date().toISOString(),
      expiresAt,
      lastUsed: new Date().toISOString(),
      revoked: false
    };

    store.trustedDevices[deviceId] = trustedDevice;
    saveStoreToDisk();
    trustedDeviceToken = rawDeviceToken;

    if (isFirebaseAdminReady) {
      db.collection('admin_trusted_devices').doc(deviceId).set(trustedDevice).catch(() => {});
    }

    await logAdminAudit('DEVICE_TRUSTED', admin.uid, admin.email, clientIp, userAgent, {
      deviceId,
      deviceName: trustedDevice.deviceName,
      expiresAt
    });
  }

  await logAdminAudit('ADMIN_MFA_SUCCESS', admin.uid, admin.email, clientIp, userAgent, {
    sessionId: session.sessionId,
    rememberedDevice: Boolean(options.rememberDevice)
  });

  return {
    success: true,
    sessionToken: session.sessionToken,
    trustedDeviceToken,
    adminUser: admin
  };
}

// --- Resend MFA Code (with 60-second rate-limit cooldown) ---
export async function resendMfaCode(
  tempSessionId: string,
  req: Request
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  expiresInSeconds?: number;
  cooldownRemaining?: number;
  deliveryDiagnostic?: any;
  messageId?: string;
}> {
  const mfaSession = store.mfaSessions[tempSessionId];
  if (!mfaSession) {
    return { success: false, error: 'MFA session expired. Please sign in again.' };
  }

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - mfaSession.lastSentAt) / 1000);
  if (elapsedSeconds < 60) {
    const wait = 60 - elapsedSeconds;
    return {
      success: false,
      error: `Please wait ${wait} seconds before requesting a new code.`,
      cooldownRemaining: wait
    };
  }

  // Generate new code
  const newCode = crypto.randomInt(100000, 1000000).toString();
  mfaSession.codeHash = hashMfaCode(newCode);
  mfaSession.expiresAt = now + 5 * 60 * 1000;
  mfaSession.attempts = 0;
  mfaSession.lastSentAt = now;
  saveStoreToDisk();

  const clientIp = extractClientIp(req);
  const location = await getApproximateLocation(clientIp);
  const parsedDevice = parseDeviceAndBrowser(req);

  console.log(`[AdminMFA] Resending 2FA code to ${mfaSession.email}...`);
  const emailResult = await sendAdminMfaEmail(mfaSession.email, {
    code: newCode,
    expiresMinutes: 5,
    ip: clientIp,
    device: `${parsedDevice.category} (${parsedDevice.os})`,
    browser: `${parsedDevice.browser} ${parsedDevice.browserVersion}`,
    location: location.city ? `${location.city}, ${location.country}` : undefined
  });

  if (!emailResult.success) {
    console.error(`[AdminMFA] ❌ Resend email dispatch failed:`, emailResult.error);
    return {
      success: false,
      error: `Failed to deliver new code to ${mfaSession.email}: ${emailResult.error}`,
      deliveryDiagnostic: {
        recipient: mfaSession.email,
        error: emailResult.error,
        devOtpHint: newCode,
        suggestion: 'Check your Resend API key and domain verification status in Resend dashboard.'
      }
    };
  }

  await logAdminAudit('ADMIN_MFA_RESENT', mfaSession.uid, mfaSession.email, clientIp, req.headers['user-agent'] || '', {
    tempSessionId,
    messageId: emailResult.messageId
  });

  return {
    success: true,
    message: 'A fresh 6-digit verification code has been dispatched to your email.',
    expiresInSeconds: 300
  };
}

// --- Session Creation & Validation ---

function createAdminSessionRecord(
  admin: AdminRecord,
  req: Request,
  deviceFingerprint: string,
  deviceInfo: any,
  location: any
): AdminSession {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionId = `asess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const clientIp = extractClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown User-Agent';
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours

  const session: AdminSession = {
    sessionId,
    sessionToken,
    uid: admin.uid,
    email: admin.email,
    role: admin.role,
    ip: clientIp,
    userAgent,
    deviceFingerprint: deviceFingerprint || 'unknown',
    device: `${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.category})`,
    browser: deviceInfo.browser,
    location,
    createdAt: new Date().toISOString(),
    expiresAt,
    revoked: false
  };

  store.sessions[sessionToken] = session;
  saveStoreToDisk();

  if (isFirebaseAdminReady) {
    db.collection('admin_sessions').doc(sessionId).set(session).catch(() => {});
  }

  logAdminAudit('SESSION_CREATED', admin.uid, admin.email, clientIp, userAgent, {
    sessionId,
    role: admin.role
  });

  return session;
}

export function extractSessionTokenFromRequest(req: Request): string | null {
  // 1. Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Custom header (x-admin-session)
  const customHeader = req.headers['x-admin-session'] as string;
  if (customHeader) return customHeader.trim();

  // 3. Admin token header (x-admin-token)
  const adminTokenHeader = req.headers['x-admin-token'] as string;
  if (adminTokenHeader) return adminTokenHeader.trim();

  // 4. Cookie headers (admin_session or admin_token)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);

    const matchAlt = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (matchAlt) return decodeURIComponent(matchAlt[1]);
  }

  // 5. Express parsed cookies object fallback
  if ((req as any).cookies?.admin_session) {
    return (req as any).cookies.admin_session;
  }

  return null;
}

export function verifyAdminSessionToken(token: string | null): {
  valid: boolean;
  session?: AdminSession;
  admin?: AdminRecord;
  error?: string;
  code?: string;
} {
  if (!token) {
    return { valid: false, error: 'Authentication required. No session token provided.', code: 'NO_TOKEN' };
  }

  // Check store.sessions (MFA session)
  const session = store.sessions[token];
  if (session) {
    if (session.revoked) {
      return { valid: false, error: 'Session has been revoked.', code: 'SESSION_REVOKED' };
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: 'Session expired. Please sign in again.', code: 'SESSION_EXPIRED' };
    }

    // Check portal lockdown
    if (store.securityState.portalLocked && session.role !== 'Super Admin') {
      return { valid: false, error: 'Portal is currently in Emergency Lockdown.', code: 'PORTAL_LOCKED' };
    }

    const admin = store.admins[session.email.toLowerCase()] || {
      uid: session.uid,
      email: session.email,
      role: session.role as any,
      mfaEnabled: true,
      createdAt: session.createdAt,
      lastLogin: new Date().toISOString()
    };
    return { valid: true, session, admin };
  }

  // Check legacy password session token (verifySessionToken)
  if (verifySessionToken(token)) {
    const defaultAdmin = store.admins['admin@smartledgerx.io'] || INITIAL_ADMINS[0];
    const legacySession: AdminSession = {
      sessionId: `asess_legacy_${token.substring(0, 10)}`,
      sessionToken: token,
      uid: defaultAdmin.uid,
      email: defaultAdmin.email,
      role: defaultAdmin.role,
      ip: '127.0.0.1',
      userAgent: 'Admin Console',
      deviceFingerprint: 'legacy_admin_auth',
      device: 'Workstation',
      browser: 'Browser',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      revoked: false
    };
    store.sessions[token] = legacySession;
    return { valid: true, session: legacySession, admin: defaultAdmin };
  }

  return { valid: false, error: 'Session token invalid or expired.', code: 'INVALID_TOKEN' };
}

/**
 * Authoritative Request Authenticator
 * Reads token from Bearer header, x-admin-session, x-admin-token, or cookies,
 * supports Firebase ID tokens and legacy tokens, minting an AdminSession on the fly if needed.
 */
export async function authenticateAdminRequest(req: Request): Promise<{
  valid: boolean;
  session?: AdminSession;
  admin?: AdminRecord;
  error?: string;
  code?: string;
}> {
  const token = extractSessionTokenFromRequest(req);

  // 1. Check synchronous session store
  if (token) {
    const syncCheck = verifyAdminSessionToken(token);
    if (syncCheck.valid && syncCheck.session) {
      return syncCheck;
    }
  }

  // 2. Check if token or Authorization header is a Firebase ID Token (JWT format)
  const candidateToken = token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7).trim() : null);
  if (candidateToken && (candidateToken.startsWith('eyJ') || candidateToken.split('.').length === 3)) {
    try {
      const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
      const verified = await verifyFirebaseIdToken(candidateToken, firebaseApiKey);

      if (verified && verified.valid && verified.email) {
        const { isAllowed, admin } = await checkAdminAllowlist(verified.email, verified.uid);
        if (isAllowed && admin) {
          if (store.securityState.portalLocked && admin.role !== 'Super Admin') {
            return { valid: false, error: 'Portal is currently in Emergency Lockdown.', code: 'PORTAL_LOCKED' };
          }

          const clientIp = extractClientIp(req);
          const parsedDevice = parseDeviceAndBrowser(req);
          const location = await getApproximateLocation(clientIp);

          // Create active session in store
          const newSession = createAdminSessionRecord(admin, req, 'firebase_auth_bridge', parsedDevice, location);
          return { valid: true, session: newSession, admin };
        } else {
          return {
            valid: false,
            error: 'Unauthorized access: This account is not in the admin allowlist.',
            code: 'UNAUTHORIZED_ADMIN'
          };
        }
      }
    } catch (e) {
      console.warn('[AdminMFA] Error validating Firebase ID token candidate:', e);
    }
  }

  if (!token && !candidateToken) {
    return {
      valid: false,
      error: 'Authentication required. No session token provided.',
      code: 'NO_TOKEN'
    };
  }

  return {
    valid: false,
    error: 'Session token invalid or expired. Please sign in again.',
    code: 'INVALID_TOKEN'
  };
}

// --- Session & Device Revocation ---

export async function revokeSession(sessionId: string, revokedBy: string): Promise<boolean> {
  let found = false;
  for (const session of Object.values(store.sessions)) {
    if (session.sessionId === sessionId) {
      session.revoked = true;
      session.revokedAt = new Date().toISOString();
      session.revokedBy = revokedBy;
      found = true;
      break;
    }
  }

  if (found) {
    saveStoreToDisk();
    if (isFirebaseAdminReady) {
      db.collection('admin_sessions').doc(sessionId).update({
        revoked: true,
        revokedAt: new Date().toISOString(),
        revokedBy
      }).catch(() => {});
    }
  }
  return found;
}

export async function revokeAllAdminSessions(revokedBy: string): Promise<number> {
  let count = 0;
  for (const session of Object.values(store.sessions)) {
    if (!session.revoked) {
      session.revoked = true;
      session.revokedAt = new Date().toISOString();
      session.revokedBy = revokedBy;
      count++;
    }
  }
  saveStoreToDisk();
  return count;
}

export async function revokeTrustedDevice(deviceId: string, revokedBy: string): Promise<boolean> {
  const dev = store.trustedDevices[deviceId];
  if (dev) {
    dev.revoked = true;
    dev.revokedAt = new Date().toISOString();
    saveStoreToDisk();
    if (isFirebaseAdminReady) {
      db.collection('admin_trusted_devices').doc(deviceId).update({
        revoked: true,
        revokedAt: dev.revokedAt
      }).catch(() => {});
    }
    return true;
  }
  return false;
}

export async function revokeAllTrustedDevices(revokedBy: string): Promise<number> {
  let count = 0;
  for (const dev of Object.values(store.trustedDevices)) {
    if (!dev.revoked) {
      dev.revoked = true;
      dev.revokedAt = new Date().toISOString();
      count++;
    }
  }
  saveStoreToDisk();
  return count;
}

// --- Emergency Security Lockdown ---

export async function triggerEmergencyLockdown(
  adminEmail: string,
  reason: string
): Promise<{
  success: boolean;
  sessionsRevoked: number;
  devicesRevoked: number;
  lockedAt: string;
}> {
  const lockedAt = new Date().toISOString();
  store.securityState.portalLocked = true;
  store.securityState.lockedAt = lockedAt;
  store.securityState.lockedBy = adminEmail;
  store.securityState.reason = reason || 'Immediate threat mitigation triggered by administrator';

  const sessionsRevoked = await revokeAllAdminSessions(`LOCKDOWN_BY_${adminEmail}`);
  const devicesRevoked = await revokeAllTrustedDevices(`LOCKDOWN_BY_${adminEmail}`);

  saveStoreToDisk();

  if (isFirebaseAdminReady) {
    db.collection('system_security_state').doc('portal_lockdown').set({
      portalLocked: true,
      lockedAt,
      lockedBy: adminEmail,
      reason: store.securityState.reason
    }).catch(() => {});
  }

  await logAdminAudit('EMERGENCY_LOCKDOWN_INITIATED', 'system', adminEmail, 'internal', 'security_system', {
    reason: store.securityState.reason,
    sessionsRevoked,
    devicesRevoked
  });

  return {
    success: true,
    sessionsRevoked,
    devicesRevoked,
    lockedAt
  };
}

export async function liftEmergencyLockdown(
  adminEmail: string,
  reason: string
): Promise<{ success: boolean; unlockedAt: string }> {
  const unlockedAt = new Date().toISOString();
  store.securityState.portalLocked = false;
  store.securityState.lockedAt = null;
  store.securityState.lockedBy = null;
  store.securityState.reason = null;

  saveStoreToDisk();

  if (isFirebaseAdminReady) {
    db.collection('system_security_state').doc('portal_lockdown').set({
      portalLocked: false,
      unlockedAt,
      unlockedBy: adminEmail,
      reason: reason || 'Normal administrative access resumed'
    }).catch(() => {});
  }

  await logAdminAudit('EMERGENCY_LOCKDOWN_LIFTED', 'system', adminEmail, 'internal', 'security_system', {
    reason: reason || 'Super Admin lifted emergency lockdown'
  });

  return { success: true, unlockedAt };
}

// --- Security Overview API Helper ---

export function getSecurityOverviewData(currentSessionToken: string | null) {
  const now = Date.now();

  // Active Sessions
  const activeSessions = Object.values(store.sessions)
    .filter(s => !s.revoked && new Date(s.expiresAt).getTime() > now)
    .map(s => ({
      sessionId: s.sessionId,
      uid: s.uid,
      email: s.email,
      role: s.role,
      ip: s.ip,
      device: s.device || 'Workstation',
      browser: s.browser || 'Browser',
      location: s.location?.city ? `${s.location.city}, ${s.location.country}` : 'Encrypted Network',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: currentSessionToken ? s.sessionToken === currentSessionToken : false
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Trusted Devices
  const trustedDevices = Object.values(store.trustedDevices)
    .filter(d => !d.revoked && new Date(d.expiresAt).getTime() > now)
    .map(d => ({
      deviceId: d.deviceId,
      uid: d.uid,
      email: d.email,
      deviceName: d.deviceName,
      ip: d.ip,
      location: d.location || 'Local Secure Device',
      createdAt: d.createdAt,
      expiresAt: d.expiresAt,
      lastUsed: d.lastUsed
    }))
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

  // Audit Logs (recent 100)
  const auditLogs = store.auditLogs.slice(0, 100);

  return {
    activeSessions,
    trustedDevices,
    auditLogs,
    securityState: store.securityState,
    adminsCount: Object.keys(store.admins).length,
    activeSessionsCount: activeSessions.length,
    trustedDevicesCount: trustedDevices.length
  };
}

// --- RBAC Express Middleware ---

export function requireAdminRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const verification = await authenticateAdminRequest(req);

    if (!verification.valid || !verification.session) {
      return res.status(401).json({
        success: false,
        error: verification.error || 'Authentication required.',
        code: verification.code || 'UNAUTHORIZED'
      });
    }

    const userRole = verification.session.role;
    if (!allowedRoles.includes(userRole)) {
      await logAdminAudit('ROLE_ACCESS_DENIED', verification.session.uid, verification.session.email, extractClientIp(req), req.headers['user-agent'] || '', {
        userRole,
        allowedRoles,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: `Access Denied: Your role (${userRole}) is not permitted to perform this operation. Allowed: ${allowedRoles.join(', ')}.`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    // Attach verified admin to request
    (req as any).adminSession = verification.session;
    (req as any).adminUser = verification.admin;
    next();
  };
}
