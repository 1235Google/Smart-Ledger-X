import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';

const STORAGE_DEVICE_FP_KEY = 'smartledger_admin_device_fingerprint';
const STORAGE_TRUSTED_DEVICE_KEY = 'smartledger_admin_trusted_device_token';
const STORAGE_ADMIN_SESSION_KEY = 'smartledger-admin-session';

/**
 * Generates or retrieves a deterministic device fingerprint based on browser environment
 */
export function getOrCreateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server_side_stub';

  try {
    const existing = localStorage.getItem(STORAGE_DEVICE_FP_KEY);
    if (existing) return existing;

    const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const lang = navigator.language || 'en';
    const ua = navigator.userAgent;
    const raw = `${ua}_${screenData}_${tz}_${lang}_${navigator.hardwareConcurrency || 4}`;

    // Simple robust hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const fp = `fp_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
    localStorage.setItem(STORAGE_DEVICE_FP_KEY, fp);
    return fp;
  } catch {
    return `fp_fallback_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function getStoredTrustedDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_TRUSTED_DEVICE_KEY);
  } catch {
    return null;
  }
}

export function setStoredTrustedDeviceToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(STORAGE_TRUSTED_DEVICE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_TRUSTED_DEVICE_KEY);
    }
  } catch {}
}

export function getStoredAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      sessionStorage.getItem(STORAGE_ADMIN_SESSION_KEY) ||
      localStorage.getItem(STORAGE_ADMIN_SESSION_KEY) ||
      sessionStorage.getItem('smartledger_admin_token') ||
      localStorage.getItem('smartledger_admin_token') ||
      null
    );
  } catch {
    return null;
  }
}

export function setStoredAdminSessionToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(STORAGE_ADMIN_SESSION_KEY, token);
      localStorage.setItem(STORAGE_ADMIN_SESSION_KEY, token);
      sessionStorage.setItem('smartledger-admin-auth', 'true');
    } else {
      sessionStorage.removeItem(STORAGE_ADMIN_SESSION_KEY);
      localStorage.removeItem(STORAGE_ADMIN_SESSION_KEY);
      sessionStorage.removeItem('smartledger_admin_token');
      localStorage.removeItem('smartledger_admin_token');
      sessionStorage.removeItem('smartledger-admin-auth');
      sessionStorage.removeItem('smartledger-admin-email');
      sessionStorage.removeItem('smartledger-admin-role');
    }
  } catch {}
}

/**
 * Resolves authoritative admin token for API requests:
 * 1. Stored session token (sessionStorage/localStorage)
 * 2. Active Firebase Auth ID token (via getIdToken)
 */
export async function resolveAdminAuthToken(): Promise<string | null> {
  const local = getStoredAdminSessionToken();
  if (local) return local;

  // Fallback to Firebase current user token if signed in
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) return idToken;
    } catch (e) {
      console.warn('[AdminMFA] Could not obtain Firebase ID token:', e);
    }
  }

  return null;
}

export function getFriendlyDeviceName(): string {
  if (typeof window === 'undefined') return 'Web Workstation';
  const ua = navigator.userAgent;
  let os = 'Windows';
  if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
}

export interface AdminMfaInitResult {
  success: boolean;
  mfaRequired: boolean;
  tempSessionId?: string;
  email?: string;
  expiresInSeconds?: number;
  sessionToken?: string;
  adminUser?: any;
  error?: string;
  code?: string;
  deliveryDiagnostic?: any;
  emailDelivery?: any;
  devBypassAllowed?: boolean;
}

/**
 * Step 1-3: Google OAuth + Backend Allowlist & MFA Initiation
 */
export async function startAdminGoogleAuth(): Promise<AdminMfaInitResult> {
  let userCredential;
  try {
    userCredential = await signInWithPopup(auth, googleProvider);
  } catch (popupErr: any) {
    if (
      popupErr?.code === 'auth/popup-blocked' ||
      popupErr?.code === 'auth/cancelled-popup-request' ||
      popupErr?.code === 'auth/popup-closed-by-user'
    ) {
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        return { success: false, mfaRequired: false, error: 'Google sign-in popup closed by user.' };
      }
      try {
        await signInWithRedirect(auth, googleProvider);
        return { success: false, mfaRequired: false, error: 'Redirecting to Google Sign-In...' };
      } catch {
        return {
          success: false,
          mfaRequired: false,
          error: 'Google Sign-In popup was blocked by browser. Please allow popups.'
        };
      }
    }
    return {
      success: false,
      mfaRequired: false,
      error: popupErr?.message || 'Google authentication failed.'
    };
  }

  const user = userCredential.user;
  if (!user || !user.email) {
    return { success: false, mfaRequired: false, error: 'No email found in Google account.' };
  }

  const idToken = await user.getIdToken();
  const deviceFingerprint = getOrCreateDeviceFingerprint();
  const trustedDeviceToken = getStoredTrustedDeviceToken() || undefined;
  const deviceName = getFriendlyDeviceName();

  // Call Backend to verify allowlist & check trusted device or issue MFA challenge
  try {
    const res = await fetch('/api/admin/auth/google-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        uid: user.uid,
        idToken,
        deviceFingerprint,
        trustedDeviceToken,
        deviceName
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (data.code === 'EMAIL_DELIVERY_FAILED') {
        return {
          success: false,
          mfaRequired: false,
          error: data.error || 'Failed to dispatch verification email.',
          code: data.code,
          deliveryDiagnostic: data.deliveryDiagnostic,
          tempSessionId: data.tempSessionId,
          devBypassAllowed: Boolean(data.devBypassAllowed),
          email: user.email
        };
      }

      // User is authenticated with Google, but NOT an approved admin
      await signOut(auth);
      return {
        success: false,
        mfaRequired: false,
        error: data.error || 'Unauthorized access: This Google account is not on the admin allowlist.',
        code: data.code || 'UNAUTHORIZED_ADMIN'
      };
    }

    // If trusted device bypassed MFA, store session
    if (!data.mfaRequired && data.sessionToken) {
      setStoredAdminSessionToken(data.sessionToken);
      if (data.adminUser) {
        sessionStorage.setItem('smartledger-admin-email', data.adminUser.email);
        sessionStorage.setItem('smartledger-admin-role', data.adminUser.role);
      }
    }

    return {
      success: true,
      mfaRequired: Boolean(data.mfaRequired),
      tempSessionId: data.tempSessionId,
      email: user.email,
      expiresInSeconds: data.expiresInSeconds || 300,
      sessionToken: data.sessionToken,
      adminUser: data.adminUser,
      emailDelivery: data.emailDelivery
    };
  } catch (err: any) {
    return {
      success: false,
      mfaRequired: false,
      error: err?.message || 'Network error verifying administrator privileges.'
    };
  }
}

/**
 * Diagnostic helper to query live email service state
 */
export async function checkEmailServiceStatus(): Promise<any> {
  try {
    const res = await fetch('/api/admin/auth/email-service-status');
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to reach diagnostic endpoint' };
  }
}

/**
 * Step 4: Verify 6-digit MFA Code
 */
export async function verifyAdminMfaCode(
  tempSessionId: string,
  code: string,
  rememberDevice: boolean = false
): Promise<{
  success: boolean;
  adminUser?: any;
  error?: string;
  remainingAttempts?: number;
  code?: string;
}> {
  const deviceFingerprint = getOrCreateDeviceFingerprint();
  const deviceName = getFriendlyDeviceName();

  try {
    const res = await fetch('/api/admin/auth/verify-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempSessionId,
        code,
        rememberDevice,
        deviceFingerprint,
        deviceName
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid verification code.',
        remainingAttempts: data.remainingAttempts,
        code: data.code
      };
    }

    // Store Session Token & Trusted Device Token
    if (data.sessionToken) {
      setStoredAdminSessionToken(data.sessionToken);
    }
    if (data.trustedDeviceToken) {
      setStoredTrustedDeviceToken(data.trustedDeviceToken);
    }
    if (data.adminUser) {
      sessionStorage.setItem('smartledger-admin-email', data.adminUser.email);
      sessionStorage.setItem('smartledger-admin-role', data.adminUser.role);
    }

    return {
      success: true,
      adminUser: data.adminUser
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Verification network failure.'
    };
  }
}

/**
 * Resend 6-digit MFA Code
 */
export async function resendAdminMfaCode(tempSessionId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  cooldownRemaining?: number;
  deliveryDiagnostic?: any;
}> {
  try {
    const res = await fetch('/api/admin/auth/resend-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempSessionId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to resend code.',
        cooldownRemaining: data.cooldownRemaining,
        deliveryDiagnostic: data.deliveryDiagnostic
      };
    }

    return {
      success: true,
      message: data.message || 'Verification code resent successfully.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error requesting new code.'
    };
  }
}

/**
 * Helper to construct unified headers with token
 */
async function buildAdminHeaders(): Promise<{ headers: Record<string, string>; token: string | null }> {
  const token = await resolveAdminAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-session'] = token;
    headers['x-admin-token'] = token;
  }
  return { headers, token };
}

/**
 * Fetch Security Dashboard Overview Data
 */
export async function fetchAdminSecurityOverview(): Promise<{
  success: boolean;
  overview?: any;
  currentAdmin?: any;
  error?: string;
}> {
  const { headers, token } = await buildAdminHeaders();
  
  try {
    const res = await fetch('/api/admin/security/overview', {
      method: 'GET',
      headers,
      credentials: 'include' // Ensures httpOnly admin_session cookie is sent
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch security overview' };
    }

    // If backend authenticated via ID token or session and returned a currentAdmin, cache session state
    if (data.currentAdmin && token && !sessionStorage.getItem(STORAGE_ADMIN_SESSION_KEY)) {
      setStoredAdminSessionToken(token);
    }

    return { success: true, overview: data.overview, currentAdmin: data.currentAdmin };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error loading security dashboard' };
  }
}

/**
 * Revoke Active Admin Session
 */
export async function revokeAdminSession(sessionId: string): Promise<boolean> {
  const { headers } = await buildAdminHeaders();
  try {
    const res = await fetch('/api/admin/security/revoke-session', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ sessionId })
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/**
 * Revoke Trusted Device
 */
export async function revokeAdminTrustedDevice(deviceId: string): Promise<boolean> {
  const { headers } = await buildAdminHeaders();
  try {
    const res = await fetch('/api/admin/security/revoke-trusted-device', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ deviceId })
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/**
 * Trigger Emergency Lockdown
 */
export async function triggerEmergencyLockdown(reason: string): Promise<{
  success: boolean;
  sessionsRevoked?: number;
  devicesRevoked?: number;
  error?: string;
}> {
  const { headers } = await buildAdminHeaders();
  try {
    const res = await fetch('/api/admin/security/lockdown', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to initiate lockdown' };
    }
    return {
      success: true,
      sessionsRevoked: data.sessionsRevoked,
      devicesRevoked: data.devicesRevoked
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error initiating lockdown' };
  }
}

/**
 * Lift Emergency Lockdown (Super Admin Only)
 */
export async function liftEmergencyLockdown(reason: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { headers } = await buildAdminHeaders();
  try {
    const res = await fetch('/api/admin/security/unlock', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to unlock portal' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error unlocking portal' };
  }
}
