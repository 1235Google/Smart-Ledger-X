import { auth } from './firebase';

export interface ClientGeoLocation {
  country: string;
  region: string;
  city: string;
  source: string;
}

export interface ClientParsedDeviceInfo {
  category: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  model: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  clientHints?: Record<string, any>;
}

export interface SecurityEventRecord {
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
  timestamp: string;
  serverTimestampMs?: number;
  ip: string;
  location: ClientGeoLocation;
  device: ClientParsedDeviceInfo;
  sessionId: string;
  newDevice: boolean;
  authorizationResult: 'admin' | 'user' | 'denied';
  details?: string;
}

// Manage privacy-conscious session/device identifier in sessionStorage
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  let sId = sessionStorage.getItem('smartledger_security_session_id');
  if (!sId) {
    sId = `sl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('smartledger_security_session_id', sId);
  }
  return sId;
}

// Safely gather standard Client Hints without prompting the user or requesting GPS
async function gatherClientHints(): Promise<Record<string, any>> {
  if (typeof window === 'undefined' || !navigator) return {};
  
  const hints: Record<string, any> = {
    userAgent: navigator.userAgent || '',
  };

  const navUAData = (navigator as any).userAgentData;
  if (navUAData) {
    hints.mobile = navUAData.mobile;
    hints.brands = navUAData.brands;
    hints.platform = navUAData.platform;

    // High entropy hints only if supported, no permission prompt required
    if (typeof navUAData.getHighEntropyValues === 'function') {
      try {
        const highEntropy = await navUAData.getHighEntropyValues([
          'model',
          'platformVersion',
          'architecture'
        ]);
        if (highEntropy.model) hints.model = highEntropy.model;
        if (highEntropy.platformVersion) hints.platformVersion = highEntropy.platformVersion;
        if (highEntropy.architecture) hints.architecture = highEntropy.architecture;
      } catch (e) {
        // High entropy hints unavailable or declined silently
      }
    }
  }

  return hints;
}

/**
 * Record an authoritative successful login event via server verification.
 * Prevents duplicate logging on page reloads.
 */
export async function recordSuccessfulAuthEvent(options: {
  authProvider: 'google' | 'password' | 'other';
  isExplicitAdmin?: boolean;
  force?: boolean;
}): Promise<SecurityEventRecord | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('[SecurityAudit] No authenticated Firebase user present.');
      return null;
    }

    // Check if this session was already audited for this UID to prevent spam on reload
    const lastAuditedUid = sessionStorage.getItem('smartledger_audited_login_uid');
    const lastAuditedTime = Number(sessionStorage.getItem('smartledger_audited_login_time') || '0');
    const now = Date.now();

    // If already logged in within current browser session in the last 15 minutes, skip unless forced
    if (!options.force && lastAuditedUid === user.uid && now - lastAuditedTime < 15 * 60 * 1000) {
      return null;
    }

    const idToken = await user.getIdToken();
    const sessionId = getOrCreateSessionId();
    const clientHints = await gatherClientHints();

    const response = await fetch('/api/security/record-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        authProvider: options.authProvider,
        isExplicitAdmin: Boolean(options.isExplicitAdmin),
        sessionId,
        clientHints
      })
    });

    if (response.ok) {
      const data = await response.json();
      sessionStorage.setItem('smartledger_audited_login_uid', user.uid);
      sessionStorage.setItem('smartledger_audited_login_time', now.toString());
      return data.event as SecurityEventRecord;
    } else {
      const err = await response.json().catch(() => ({}));
      console.warn('[SecurityAudit] Record login server response:', response.status, err);
    }
  } catch (err) {
    console.warn('[SecurityAudit] Network error recording security login:', err);
  }
  return null;
}

/**
 * Record a failed login attempt safely (rate-limited, passwords strictly excluded).
 */
export async function recordFailedAuthEvent(
  email: string,
  reason: string,
  attemptMethod: 'google' | 'password'
): Promise<void> {
  try {
    const clientHints = await gatherClientHints();
    await fetch('/api/security/record-failed-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: (email || '').trim().toLowerCase().slice(0, 150),
        reason: reason.slice(0, 200),
        attemptMethod,
        clientHints
      })
    });
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Record an unauthorized admin access attempt.
 */
export async function recordUnauthorizedAdminAttempt(details?: string): Promise<void> {
  try {
    let idToken = '';
    if (auth.currentUser) {
      idToken = await auth.currentUser.getIdToken().catch(() => '');
    }
    const clientHints = await gatherClientHints();
    const sessionId = getOrCreateSessionId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    await fetch('/api/security/record-unauthorized-attempt', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        details: details || 'Access rejected: Account lacks administrator privileges',
        clientHints
      })
    });
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Record a logout event.
 */
export async function recordLogoutAuthEvent(user?: { uid?: string; email?: string } | null): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const clientHints = await gatherClientHints();

    await fetch('/api/security/record-logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: user?.uid || auth.currentUser?.uid || 'anonymous',
        email: user?.email || auth.currentUser?.email || 'anonymous',
        sessionId,
        clientHints
      })
    });

    // Clear session audit flags
    sessionStorage.removeItem('smartledger_audited_login_uid');
    sessionStorage.removeItem('smartledger_audited_login_time');
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Fetch authoritative security logs from server API.
 */
export async function fetchAuthoritativeSecurityLogs(): Promise<SecurityEventRecord[]> {
  try {
    let idToken = '';
    if (auth.currentUser) {
      idToken = await auth.currentUser.getIdToken().catch(() => '');
    }
    const adminToken = sessionStorage.getItem('smartledger_admin_token') || '';

    const headers: Record<string, string> = {};
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch('/api/security/logs?limit=100', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        return data.logs;
      }
    }
  } catch (err) {
    console.warn('[SecurityAudit] Failed to fetch server security logs:', err);
  }
  return [];
}
