import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import type { Request } from 'express';
import { db, isFirebaseAdminReady } from './db';
import { extractClientIp, parseDeviceAndBrowser, verifyFirebaseIdToken } from './security-service';

export interface QrLoginSessionDoc {
  sessionId: string;
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
  status: 'WAITING' | 'SCANNED' | 'AUTHENTICATED' | 'COMPLETED' | 'EXPIRED';
  desktopSessionId: string;
  desktopMetadata: {
    browser: string;
    os: string;
    ip: string;
    location: string;
    deviceType: string;
    userAgent: string;
    requestedAt: number;
  };
  mobileMetadata?: {
    browser?: string;
    os?: string;
    ip?: string;
    scannedAt?: number;
    userAgent?: string;
  };
  userId?: string;
  email?: string;
  mobileAuthenticatedUser?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    authenticatedAt: number;
  };
  authGrant?: string;
  customToken?: string;
  completedAt?: number;
}

const QR_COLLECTION = 'qr_login_sessions';
const SESSION_TTL_MS = 120 * 1000; // 2 minutes (120 seconds)
const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'smartledgerx_quantum_qr_auth_secret_2026';

// Persistent fallback store for serverless or local environments
const inMemorySessions = new Map<string, QrLoginSessionDoc>();
const tokenToSessionMap = new Map<string, string>(); // tokenHash -> sessionId
const ipRateLimiter = new Map<string, { count: number; resetAt: number }>();

// Load firebase config for API key
let firebaseApiKey = "AIzaSyBGtChtK6JEwE7gTfSSQUkv1JD7px0Bep0";
try {
  const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    if (cfg.apiKey) firebaseApiKey = cfg.apiKey;
  }
} catch {}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createAuthGrant(session: QrLoginSessionDoc, user: { uid: string; email: string }): string {
  const payload = `${session.sessionId}:${user.uid}:${user.email}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

function verifyAuthGrant(grant: string, sessionId: string): { valid: boolean; uid?: string; email?: string } {
  try {
    const jsonStr = Buffer.from(grant, 'base64url').toString('utf-8');
    const { payload, signature } = JSON.parse(jsonStr);
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return { valid: false };

    const [grantSessionId, uid, email, timestampStr] = payload.split(':');
    if (grantSessionId !== sessionId) return { valid: false };

    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp > 120000) return { valid: false }; // 2-min grant lifetime

    return { valid: true, uid, email };
  } catch {
    return { valid: false };
  }
}

/**
 * 1. Create a new secure QR Login Session
 */
export async function createQrLoginSession(req: Request, clientOrigin?: string): Promise<{
  success: boolean;
  sessionId: string;
  secureToken: string;
  qrUrl: string;
  qrCodeDataUrl: string;
  expiresAt: number;
  expiresInSeconds: number;
  desktopMetadata: any;
  error?: string;
}> {
  const ip = extractClientIp(req);

  // Rate Limiting: Max 20 QR creations per 5 minutes per IP
  const now = Date.now();
  const rate = ipRateLimiter.get(ip) || { count: 0, resetAt: now + 300000 };
  if (now > rate.resetAt) {
    rate.count = 0;
    rate.resetAt = now + 300000;
  }
  rate.count++;
  ipRateLimiter.set(ip, rate);

  if (rate.count > 30) {
    throw new Error('Too many QR login attempts. Please wait a few minutes.');
  }

  const sessionId = crypto.randomUUID();
  const secureToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(secureToken);
  const desktopSessionId = crypto.randomBytes(16).toString('hex');
  const createdAt = now;
  const expiresAt = now + SESSION_TTL_MS;

  const parsedDevice = parseDeviceAndBrowser(req);
  const desktopMetadata = {
    browser: parsedDevice.browser,
    os: parsedDevice.os,
    ip,
    location: 'Desktop Client',
    deviceType: parsedDevice.category.toLowerCase(),
    userAgent: parsedDevice.userAgent,
    requestedAt: createdAt
  };

  const sessionDoc: QrLoginSessionDoc = {
    sessionId,
    tokenHash,
    createdAt,
    expiresAt,
    status: 'WAITING',
    desktopSessionId,
    desktopMetadata
  };

  // 1. Save in local memory map
  inMemorySessions.set(sessionId, sessionDoc);
  tokenToSessionMap.set(tokenHash, sessionId);

  // 2. Persist to Firestore if Admin SDK is ready
  if (isFirebaseAdminReady) {
    try {
      await db.collection(QR_COLLECTION).doc(sessionId).set(sessionDoc);
    } catch (err) {
      console.warn('[QRLoginService] Firestore write failed, using memory state:', err);
    }
  }

  // 3. Resolve QR Target URL (official SmartLedgerX mobile web production URL)
  const qrUrl = `https://smartledgerx.vercel.app/auth/mobile-login?session=${sessionId}`;

  // 4. Generate high-resolution aesthetic QR Code data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    success: true,
    sessionId,
    secureToken,
    qrUrl,
    qrCodeDataUrl,
    expiresAt,
    expiresInSeconds: 120,
    desktopMetadata
  };
}

/**
 * 2. Validate token when Phone Camera scans QR and opens URL
 * Transitions status from WAITING -> SCANNED
 */
export async function verifyAndScanQrToken(
  token: string, 
  sessionIdHint?: string, 
  req?: Request
): Promise<{
  success: boolean;
  session?: QrLoginSessionDoc;
  error?: string;
  expired?: boolean;
}> {
  const tokenHash = hashToken(token);
  let sessionId = sessionIdHint || tokenToSessionMap.get(tokenHash);

  let session: QrLoginSessionDoc | undefined = sessionId ? inMemorySessions.get(sessionId) : undefined;

  // Check Firestore if not found in memory
  if (!session && sessionId && isFirebaseAdminReady) {
    try {
      const snap = await db.collection(QR_COLLECTION).doc(sessionId).get();
      if (snap.exists) {
        session = snap.data() as QrLoginSessionDoc;
      }
    } catch {}
  }

  if (!session) {
    return { success: false, error: 'Invalid or unknown QR session.' };
  }

  if (session.tokenHash !== tokenHash) {
    return { success: false, error: 'Security token mismatch. Possible forgery.' };
  }

  if (Date.now() > session.expiresAt || session.status === 'EXPIRED') {
    session.status = 'EXPIRED';
    return { success: false, expired: true, error: 'QR Code has expired. Please refresh the QR code on your desktop.' };
  }

  if (session.status === 'COMPLETED') {
    return { success: false, error: 'This QR session has already been used and completed.' };
  }

  // Record Mobile Scan metadata
  let mobileMeta = session.mobileMetadata;
  if (req) {
    const mobileDevice = parseDeviceAndBrowser(req);
    mobileMeta = {
      browser: mobileDevice.browser,
      os: mobileDevice.os,
      ip: extractClientIp(req),
      scannedAt: Date.now(),
      userAgent: mobileDevice.userAgent
    };
  }

  // Advance status to SCANNED if currently WAITING
  if (session.status === 'WAITING') {
    session.status = 'SCANNED';
    session.mobileMetadata = mobileMeta;

    inMemorySessions.set(session.sessionId, session);

    if (isFirebaseAdminReady) {
      try {
        await db.collection(QR_COLLECTION).doc(session.sessionId).update({
          status: 'SCANNED',
          mobileMetadata: mobileMeta
        });
      } catch (e) {}
    }
  }

  return {
    success: true,
    session
  };
}

/**
 * 3. Authorize QR Session after Phone completes Google OAuth
 * Transitions status from SCANNED -> AUTHENTICATED
 */
export async function authorizeQrLoginSession(params: {
  sessionId: string;
  secureToken: string;
  idToken: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  };
  req?: Request;
}): Promise<{
  success: boolean;
  message?: string;
  authGrant?: string;
  error?: string;
}> {
  const { sessionId, secureToken, idToken, user, req } = params;

  let session: QrLoginSessionDoc | undefined = inMemorySessions.get(sessionId);
  if (!session && isFirebaseAdminReady) {
    try {
      const snap = await db.collection(QR_COLLECTION).doc(sessionId).get();
      if (snap.exists) session = snap.data() as QrLoginSessionDoc;
    } catch {}
  }

  if (!session) {
    return { success: false, error: 'Session not found.' };
  }

  if (session.tokenHash !== hashToken(secureToken)) {
    return { success: false, error: 'Invalid security token for this session.' };
  }

  if (Date.now() > session.expiresAt) {
    session.status = 'EXPIRED';
    return { success: false, error: 'Session has expired.' };
  }

  if (session.status === 'COMPLETED') {
    return { success: false, error: 'Session already consumed.' };
  }

  // 1. Authoritative verification of Google Firebase ID token
  const verified = await verifyFirebaseIdToken(idToken, firebaseApiKey);
  if (!verified.valid || !verified.uid) {
    return { success: false, error: verified.error || 'Google authentication token verification failed.' };
  }

  if (verified.uid !== user.uid) {
    return { success: false, error: 'Authenticated identity does not match token owner.' };
  }

  // 2. Generate secure single-use auth grant
  const authGrant = createAuthGrant(session, { uid: user.uid, email: user.email });

  session.status = 'AUTHENTICATED';
  session.userId = user.uid;
  session.email = user.email;
  session.mobileAuthenticatedUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL,
    authenticatedAt: Date.now()
  };
  session.authGrant = authGrant;

  inMemorySessions.set(sessionId, session);

  if (isFirebaseAdminReady) {
    try {
      await db.collection(QR_COLLECTION).doc(sessionId).update({
        status: 'AUTHENTICATED',
        userId: user.uid,
        email: user.email,
        mobileAuthenticatedUser: session.mobileAuthenticatedUser,
        authGrant
      });
    } catch (e) {
      console.warn('[QRLoginService] Error updating session to AUTHENTICATED in Firestore:', e);
    }
  }

  return {
    success: true,
    message: 'Desktop session successfully authorized.',
    authGrant
  };
}

/**
 * 4. Complete Desktop Session & Mint Login Grant
 * Transitions status from AUTHENTICATED -> COMPLETED (Single-use burn)
 */
export async function completeDesktopSession(params: {
  sessionId: string;
  secureToken: string;
  authGrant: string;
}): Promise<{
  success: boolean;
  user?: any;
  customToken?: string;
  error?: string;
}> {
  const { sessionId, secureToken, authGrant } = params;

  let session: QrLoginSessionDoc | undefined = inMemorySessions.get(sessionId);
  if (!session && isFirebaseAdminReady) {
    try {
      const snap = await db.collection(QR_COLLECTION).doc(sessionId).get();
      if (snap.exists) session = snap.data() as QrLoginSessionDoc;
    } catch {}
  }

  if (!session) {
    return { success: false, error: 'Session not found.' };
  }

  if (session.tokenHash !== hashToken(secureToken)) {
    return { success: false, error: 'Security token mismatch.' };
  }

  if (session.status !== 'AUTHENTICATED') {
    return { success: false, error: `Invalid session state for completion: ${session.status}` };
  }

  const grantCheck = verifyAuthGrant(authGrant, sessionId);
  if (!grantCheck.valid || !grantCheck.uid) {
    return { success: false, error: 'Invalid or expired authorization grant.' };
  }

  // Burn session to COMPLETED (one-time usage guarantee)
  session.status = 'COMPLETED';
  session.completedAt = Date.now();
  inMemorySessions.set(sessionId, session);

  if (isFirebaseAdminReady) {
    try {
      await db.collection(QR_COLLECTION).doc(sessionId).update({
        status: 'COMPLETED',
        completedAt: Date.now()
      });
    } catch (e) {}
  }

  const userPayload = {
    uid: session.mobileAuthenticatedUser?.uid || grantCheck.uid,
    email: session.mobileAuthenticatedUser?.email || grantCheck.email,
    displayName: session.mobileAuthenticatedUser?.displayName || 'SmartLedger User',
    photoURL: session.mobileAuthenticatedUser?.photoURL || '',
    authMethod: 'google_qr_login',
    loginTime: Date.now()
  };

  return {
    success: true,
    user: userPayload
  };
}

/**
 * 5. Get Session Status (Polling fallback for environments without WebSockets)
 */
export async function getQrLoginSessionStatus(sessionId: string): Promise<QrLoginSessionDoc | null> {
  let session = inMemorySessions.get(sessionId) || null;
  if (!session && isFirebaseAdminReady) {
    try {
      const snap = await db.collection(QR_COLLECTION).doc(sessionId).get();
      if (snap.exists) session = snap.data() as QrLoginSessionDoc;
    } catch {}
  }

  if (session && Date.now() > session.expiresAt && session.status === 'WAITING') {
    session.status = 'EXPIRED';
  }

  return session;
}
