import { 
  signInWithPopup, 
  signInWithRedirect, 
  signInWithEmailAndPassword,
  getRedirectResult, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { AdminUser, AdminRole, AdminStatus, AdminSecurityLog, AdminSecurityAction } from '../types';
import {
  recordSuccessfulAuthEvent,
  recordFailedAuthEvent,
  recordUnauthorizedAdminAttempt,
  recordLogoutAuthEvent,
  fetchAuthoritativeSecurityLogs
} from './securityAuditService';

const INITIAL_BOOTSTRAP_EMAILS = [
  'souvikbbsr811@gmail.com',
  'souvikdashbbsr@gmail.com',
  'admin@smartledgerx.io'
];

let cachedIp: string | null = null;

// Helper to detect Device & OS Info
export function getDeviceInfo(): { device: string; browser: string } {
  if (typeof window === 'undefined') {
    return { device: 'Unknown Device', browser: 'Unknown Browser' };
  }

  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let device = 'Desktop';

  // Browser detection
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua)) browser = 'Apple Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  // Device / OS detection
  if (/android/i.test(ua)) device = 'Android Device';
  else if (/iphone|ipad|ipod/i.test(ua)) device = 'iOS Device';
  else if (/windows/i.test(ua)) device = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) device = 'MacBook / macOS';
  else if (/linux/i.test(ua)) device = 'Linux Workstation';

  return { device, browser };
}

// Helper to get client IP
export async function getClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch (e) {
    // Fallback if network blocked or offline
  }
  return 'Client Session IP';
}

// Log audit event to Firestore
export async function logAdminSecurityEvent(
  action: AdminSecurityAction,
  email: string,
  uid: string,
  details?: string
): Promise<void> {
  try {
    const ip = await getClientIp();
    const { device, browser } = getDeviceInfo();
    const logId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const logRecord: AdminSecurityLog = {
      id: logId,
      email: email || 'anonymous@smartledger.io',
      uid: uid || 'unauthenticated',
      ip,
      device,
      browser,
      timestamp: new Date().toISOString(),
      action,
      details: details || ''
    };

    const logRef = doc(db, 'adminSecurityLogs', logId);
    await setDoc(logRef, logRecord);
  } catch (err) {
    console.warn('[AdminAuditLog] Error logging security event:', err);
  }
}

// Normalize various role strings (case-insensitive) to recognized AdminRole
export function normalizeAdminRole(roleStr?: string | null): AdminRole | null {
  if (!roleStr || typeof roleStr !== 'string') return null;
  const lower = roleStr.trim().toLowerCase();
  if (lower === 'owner') return 'Owner';
  if (lower === 'super admin' || lower === 'superadmin') return 'Super Admin';
  if (lower === 'admin' || lower === 'administrator') return 'Admin';
  if (lower === 'manager') return 'Manager';
  return null;
}

export interface AdminVerificationResult {
  authorized: boolean;
  role?: AdminRole;
  adminUser?: AdminUser;
  errorType?: 'NOT_ADMIN' | 'ACCOUNT_DISABLED' | 'DATABASE_ERROR' | 'NONE';
  errorMessage?: string;
}

// Dedicated authorization check using secure sources of truth
export async function verifyAdminAuthorization(user: User): Promise<AdminVerificationResult> {
  const userEmail = (user.email || '').trim().toLowerCase();
  const userUid = user.uid;

  // Development-only console logging for auditing
  console.log('[AdminAuth Debug] Authenticated UID:', userUid);
  console.log('[AdminAuth Debug] Authenticated Email:', userEmail);

  let databaseErrorOccurred = false;
  let databaseErrorMessage = '';

  // 1. Check Custom Claims in Firebase Auth ID Token
  try {
    const tokenResult = await user.getIdTokenResult(true);
    const claims = tokenResult?.claims || {};
    if (claims.admin === true || claims.role) {
      const normalized = normalizeAdminRole(String(claims.role || 'Admin')) || 'Admin';
      console.log('[AdminAuth Debug] Role lookup succeeded via Custom Claims. Resolved role:', normalized);
      const adminObj: AdminUser = {
        uid: userUid,
        email: userEmail,
        displayName: user.displayName || userEmail.split('@')[0] || 'Administrator',
        photoURL: user.photoURL || '',
        role: normalized,
        status: 'Active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      return {
        authorized: true,
        role: normalized,
        adminUser: adminObj,
        errorType: 'NONE'
      };
    }
  } catch (claimErr: any) {
    console.warn('[AdminAuth Debug] Could not fetch ID token result claims:', claimErr?.message);
  }

  // 2. Check adminUsers/{uid} in Firestore
  try {
    const directDocRef = doc(db, 'adminUsers', userUid);
    const directDocSnap = await getDoc(directDocRef);
    if (directDocSnap.exists()) {
      const data = directDocSnap.data() as AdminUser;
      if (data.status === 'Disabled') {
        console.log('[AdminAuth Debug] Account found in adminUsers but is Disabled.');
        return {
          authorized: false,
          errorType: 'ACCOUNT_DISABLED',
          errorMessage: 'Your administrator account has been disabled. Please contact the Owner.'
        };
      }

      const normalized = normalizeAdminRole(data.role);
      if (normalized || data.status === 'Active' || (data as any).isAdmin === true) {
        const resolvedRole = normalized || 'Admin';
        console.log('[AdminAuth Debug] Role lookup succeeded via adminUsers/{uid}. Resolved role:', resolvedRole);

        const updatedData: Partial<AdminUser> = {
          lastLogin: new Date().toISOString(),
          displayName: user.displayName || data.displayName || userEmail,
          photoURL: user.photoURL || data.photoURL || ''
        };
        // Update non-blocking
        updateDoc(directDocRef, updatedData).catch(() => {});

        const resolvedAdmin: AdminUser = {
          ...data,
          ...updatedData,
          uid: userUid,
          email: userEmail || data.email,
          role: resolvedRole,
          status: 'Active'
        };
        return {
          authorized: true,
          role: resolvedRole,
          adminUser: resolvedAdmin,
          errorType: 'NONE'
        };
      }
    }
  } catch (directErr: any) {
    console.warn('[AdminAuth Debug] Error reading adminUsers direct doc:', directErr?.code, directErr?.message);
    if (directErr?.code === 'unavailable') {
      databaseErrorOccurred = true;
      databaseErrorMessage = directErr.message;
    }
  }

  // 3. Check users/{uid} in Firestore (Source of truth: users/{uid}.role === "admin" or isAdmin: true)
  try {
    const userDocRef = doc(db, 'users', userUid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const uData = userDocSnap.data();
      const normalized = normalizeAdminRole(uData?.role);
      if (normalized || uData?.isAdmin === true) {
        const resolvedRole = normalized || 'Admin';
        console.log('[AdminAuth Debug] Role lookup succeeded via users/{uid}. Resolved role:', resolvedRole);

        const adminObj: AdminUser = {
          uid: userUid,
          email: userEmail || uData?.email || '',
          displayName: user.displayName || uData?.fullName || uData?.displayName || userEmail.split('@')[0] || 'Admin',
          photoURL: user.photoURL || uData?.photoURL || '',
          role: resolvedRole,
          status: 'Active',
          createdAt: uData?.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        // Mirror in adminUsers for admin management views
        setDoc(doc(db, 'adminUsers', userUid), adminObj, { merge: true }).catch(() => {});

        return {
          authorized: true,
          role: resolvedRole,
          adminUser: adminObj,
          errorType: 'NONE'
        };
      }
    }
  } catch (uErr: any) {
    console.warn('[AdminAuth Debug] Error reading users doc:', uErr?.code, uErr?.message);
    if (uErr?.code === 'unavailable') {
      databaseErrorOccurred = true;
      databaseErrorMessage = uErr.message;
    }
  }

  // 4. Check users/{uid}/profile/info in Firestore
  try {
    const profileRef = doc(db, 'users', userUid, 'profile', 'info');
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const pData = profileSnap.data();
      const normalized = normalizeAdminRole(pData?.role);
      if (normalized || pData?.isAdmin === true) {
        const resolvedRole = normalized || 'Admin';
        console.log('[AdminAuth Debug] Role lookup succeeded via profile/info. Resolved role:', resolvedRole);

        const adminObj: AdminUser = {
          uid: userUid,
          email: userEmail || pData?.email || '',
          displayName: user.displayName || pData?.fullName || userEmail.split('@')[0] || 'Admin',
          photoURL: user.photoURL || pData?.photoURL || '',
          role: resolvedRole,
          status: 'Active',
          createdAt: pData?.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        setDoc(doc(db, 'adminUsers', userUid), adminObj, { merge: true }).catch(() => {});

        return {
          authorized: true,
          role: resolvedRole,
          adminUser: adminObj,
          errorType: 'NONE'
        };
      }
    }
  } catch (pErr: any) {
    console.warn('[AdminAuth Debug] Error reading users profile/info:', pErr?.code, pErr?.message);
  }

  // 5. Check for Pre-added / Pending Admin by email
  if (userEmail) {
    try {
      const pendingDocId = `pending_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const pendingRef = doc(db, 'adminUsers', pendingDocId);
      const pendingSnap = await getDoc(pendingRef);
      if (pendingSnap.exists()) {
        const pendingData = pendingSnap.data() as AdminUser;
        if (pendingData.status === 'Disabled') {
          return {
            authorized: false,
            errorType: 'ACCOUNT_DISABLED',
            errorMessage: 'Your administrator account has been disabled. Please contact the Owner.'
          };
        }
        const resolvedRole = normalizeAdminRole(pendingData.role) || 'Admin';
        console.log('[AdminAuth Debug] Found pending admin record for email. Migrating to UID:', userUid);

        const linkedAdmin: AdminUser = {
          ...pendingData,
          uid: userUid,
          email: userEmail,
          displayName: user.displayName || pendingData.displayName || userEmail.split('@')[0] || 'Admin',
          photoURL: user.photoURL || pendingData.photoURL || '',
          role: resolvedRole,
          status: 'Active',
          lastLogin: new Date().toISOString()
        };

        await setDoc(doc(db, 'adminUsers', userUid), linkedAdmin);
        try {
          await deleteDoc(pendingRef);
        } catch (e) {}

        return {
          authorized: true,
          role: resolvedRole,
          adminUser: linkedAdmin,
          errorType: 'NONE'
        };
      }
    } catch (pendingErr: any) {
      console.warn('[AdminAuth Debug] Error checking pending doc:', pendingErr?.code, pendingErr?.message);
    }
  }

  // 6. Initial Bootstrap Owners
  if (INITIAL_BOOTSTRAP_EMAILS.includes(userEmail)) {
    console.log('[AdminAuth Debug] User matched initial bootstrap owner list:', userEmail);
    const newOwner: AdminUser = {
      uid: userUid,
      email: userEmail,
      displayName: user.displayName || 'System Owner',
      photoURL: user.photoURL || '',
      role: 'Owner',
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      createdById: userUid,
      createdByEmail: 'system'
    };

    try {
      await setDoc(doc(db, 'adminUsers', userUid), newOwner);
    } catch (bootstrapErr) {
      console.warn('[AdminAuth Debug] Bootstrap setDoc warning:', bootstrapErr);
    }

    return {
      authorized: true,
      role: 'Owner',
      adminUser: newOwner,
      errorType: 'NONE'
    };
  }

  // If there was a database network failure (not just missing document)
  if (databaseErrorOccurred) {
    console.error('[AdminAuth Debug] Database connection error during role lookup:', databaseErrorMessage);
    return {
      authorized: false,
      errorType: 'DATABASE_ERROR',
      errorMessage: 'Database connection error during authorization check. Please check your network and try again.'
    };
  }

  // 7. Not Authorized: All sources verified, account has NO administrator role
  console.log('[AdminAuth Debug] Role lookup failed: Account has no admin role. UID:', userUid, 'Email:', userEmail);
  return {
    authorized: false,
    errorType: 'NOT_ADMIN',
    errorMessage: 'This account does not have administrator access.'
  };
}

// Wrapper for backwards compatibility
export async function verifyOrBootstrapAdminUser(user: User): Promise<{
  authorized: boolean;
  adminUser?: AdminUser;
  error?: string;
}> {
  const result = await verifyAdminAuthorization(user);
  return {
    authorized: result.authorized,
    adminUser: result.adminUser,
    error: result.errorMessage
  };
}

// Google Sign-In with popup + automatic redirect fallback
export async function signInAdminWithGoogle(): Promise<{
  success: boolean;
  adminUser?: AdminUser;
  error?: string;
}> {
  try {
    let authResult;
    try {
      authResult = await signInWithPopup(auth, googleProvider);
    } catch (popupErr: any) {
      console.warn('[AdminAuth Debug] Popup sign-in error, trying fallback:', popupErr);
      if (
        popupErr?.code === 'auth/popup-blocked' ||
        popupErr?.code === 'auth/cancelled-popup-request' ||
        popupErr?.code === 'auth/popup-closed-by-user'
      ) {
        if (popupErr?.code === 'auth/popup-closed-by-user') {
          return { success: false, error: 'Google sign-in popup was closed before completing.' };
        }
        try {
          await signInWithRedirect(auth, googleProvider);
          return { success: false, error: 'Redirecting to Google Sign-In...' };
        } catch (redirectErr: any) {
          return {
            success: false,
            error: 'Google Sign-In popup was blocked. Please allow popups for this site or open in a new tab.'
          };
        }
      }
      return {
        success: false,
        error: popupErr?.message || 'Failed to authenticate with Google.'
      };
    }

    if (!authResult || !authResult.user) {
      return { success: false, error: 'Authentication returned no user credentials.' };
    }

    const authUser = authResult.user;

    // Verify Admin Role Authorization
    const verification = await verifyAdminAuthorization(authUser);
    console.log('[AdminAuth Debug] Role lookup succeeded:', verification.authorized);
    console.log('[AdminAuth Debug] Resolved role:', verification.role || 'None');

    if (!verification.authorized) {
      // Authenticated but not an admin: sign out immediately
      await signOut(auth);
      try {
        await recordUnauthorizedAdminAttempt('Google sign-in rejected: Account lacks administrator privileges');
        await logAdminSecurityEvent(
          'LOGIN_DENIED_UNAUTHORIZED', 
          authUser.email || '', 
          authUser.uid, 
          'Google sign-in rejected: Account lacks administrator privileges'
        );
      } catch (e) {}

      return {
        success: false,
        error: verification.errorMessage || 'This account does not have administrator access.'
      };
    }

    // Set local session flags
    sessionStorage.setItem('smartledger-admin-auth', 'true');
    sessionStorage.setItem('smartledger-admin-email', verification.adminUser!.email);
    sessionStorage.setItem('smartledger-admin-role', verification.adminUser!.role);

    try {
      await recordSuccessfulAuthEvent({ authProvider: 'google', isExplicitAdmin: true, force: true });
      await logAdminSecurityEvent(
        'LOGIN_SUCCESS', 
        authUser.email || '', 
        authUser.uid, 
        `Google Sign-in: Role ${verification.adminUser!.role}`
      );
    } catch (e) {}

    return {
      success: true,
      adminUser: verification.adminUser
    };
  } catch (err: any) {
    console.error('[AdminAuth Debug] Google sign-in failed:', err?.code, err?.message);
    try {
      await signOut(auth);
    } catch (e) {}
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during Google sign in.'
    };
  }
}

// Password sign-in using Firebase Authentication with separate authentication & authorization
export async function signInAdminWithPassword(
  email: string,
  pass: string
): Promise<{
  success: boolean;
  adminUser?: AdminUser;
  error?: string;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();

  if (!cleanEmail) {
    return { success: false, error: 'Please enter your admin email address.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Please enter your admin password.' };
  }

  // Step 1: Authenticate with Firebase Authentication
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
  } catch (authErr: any) {
    const code = authErr?.code || '';
    console.error('[AdminAuth Debug] Firebase error code:', code, authErr?.message);

    if (
      code === 'auth/invalid-credential' || 
      code === 'auth/wrong-password' || 
      code === 'auth/user-not-found'
    ) {
      recordFailedAuthEvent(cleanEmail, 'Invalid email address or password', 'password').catch(() => {});
      return { 
        success: false, 
        error: 'Invalid email address or password. Please verify your credentials.' 
      };
    }
    if (code === 'auth/invalid-email') {
      return { success: false, error: 'Please enter a valid email address format.' };
    }
    if (code === 'auth/user-disabled') {
      return { success: false, error: 'This administrator account has been disabled in Firebase Auth.' };
    }
    if (code === 'auth/too-many-requests') {
      return { 
        success: false, 
        error: 'Access temporarily disabled due to multiple failed login attempts. Please try again later.' 
      };
    }

    return { 
      success: false, 
      error: authErr?.message || 'Authentication failed. Please verify your credentials.' 
    };
  }

  const authUser = userCredential.user;

  // Step 2: Verify Admin Role Authorization
  const verification = await verifyAdminAuthorization(authUser);
  console.log('[AdminAuth Debug] Role lookup succeeded:', verification.authorized);
  console.log('[AdminAuth Debug] Resolved role:', verification.role || 'None');

  if (!verification.authorized) {
    // Valid credentials in Firebase Auth, but account lacks administrator role
    await signOut(auth);
    try {
      await recordUnauthorizedAdminAttempt('Password sign-in rejected: Account lacks administrator privileges');
      await logAdminSecurityEvent(
        'LOGIN_DENIED_UNAUTHORIZED', 
        cleanEmail, 
        authUser.uid, 
        'Password sign-in rejected: Account lacks administrator privileges'
      );
    } catch (e) {}

    return {
      success: false,
      error: verification.errorMessage || 'This account does not have administrator access.'
    };
  }

  // Set local session flags
  sessionStorage.setItem('smartledger-admin-auth', 'true');
  sessionStorage.setItem('smartledger-admin-email', verification.adminUser!.email);
  sessionStorage.setItem('smartledger-admin-role', verification.adminUser!.role);

  try {
    await recordSuccessfulAuthEvent({ authProvider: 'password', isExplicitAdmin: true, force: true });
    await logAdminSecurityEvent(
      'LOGIN_SUCCESS', 
      cleanEmail, 
      authUser.uid, 
      `Password Sign-in: Role ${verification.adminUser!.role}`
    );
  } catch (e) {}

  return {
    success: true,
    adminUser: verification.adminUser
  };
}

// Check redirect sign-in result on page load
export async function checkAdminRedirectAuth(): Promise<{
  success: boolean;
  adminUser?: AdminUser;
  error?: string;
} | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const authUser = result.user;
      const verification = await verifyAdminAuthorization(authUser);
      if (!verification.authorized) {
        await signOut(auth);
        return {
          success: false,
          error: verification.errorMessage || 'This account does not have administrator access.'
        };
      }
      sessionStorage.setItem('smartledger-admin-auth', 'true');
      sessionStorage.setItem('smartledger-admin-email', verification.adminUser!.email);
      sessionStorage.setItem('smartledger-admin-role', verification.adminUser!.role);
      try {
        await recordSuccessfulAuthEvent({ authProvider: 'google', isExplicitAdmin: true });
      } catch (e) {}
      return { success: true, adminUser: verification.adminUser };
    }
    return null;
  } catch (err: any) {
    console.warn('[AdminAuth Debug] Check redirect result error:', err);
    return null;
  }
}

// Real-time listener for current Admin User doc
export function subscribeToAdminUser(
  uid: string,
  onUpdate: (admin: AdminUser | null) => void
): () => void {
  if (!uid || typeof uid !== 'string' || uid.startsWith('admin_local') || uid.startsWith('admin_server')) {
    return () => {};
  }
  const docRef = doc(db, 'adminUsers', uid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...snap.data(), uid: snap.id } as AdminUser);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('[AdminAuth] Admin subscription notice:', err?.message || err);
    }
  );
}

// Real-time listener for all Admin Users
export function subscribeToAllAdmins(
  onUpdate: (admins: AdminUser[]) => void
): () => void {
  const colRef = collection(db, 'adminUsers');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: AdminUser[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), uid: d.id } as AdminUser);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('[AdminAuth] Fetch all admins notice:', err?.message || err);
    }
  );
}

// Real-time listener for Admin Security Audit Logs
export function subscribeToAdminLogs(
  onUpdate: (logs: AdminSecurityLog[]) => void,
  logLimit = 50
): () => void {
  const colRef = collection(db, 'adminSecurityLogs');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(logLimit));

  let firestoreLogs: AdminSecurityLog[] = [];
  let serverLogs: AdminSecurityLog[] = [];

  const mergeAndNotify = () => {
    const combinedMap = new Map<string, AdminSecurityLog>();
    for (const log of serverLogs) {
      combinedMap.set(log.id, log);
    }
    for (const log of firestoreLogs) {
      combinedMap.set(log.id, { ...combinedMap.get(log.id), ...log });
    }
    const combined = Array.from(combinedMap.values());
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    onUpdate(combined.slice(0, logLimit));
  };

  // Fetch server authoritative logs
  fetchAuthoritativeSecurityLogs().then((sLogs) => {
    serverLogs = sLogs.map(s => ({
      id: s.id,
      email: s.email,
      uid: s.uid,
      ip: s.ip,
      device: `${s.device?.browser || 'Browser'} on ${s.device?.os || 'OS'} (${s.device?.category || 'Device'})`,
      browser: s.device?.browser || 'Unknown',
      timestamp: s.timestamp,
      action: (s.eventType || 'LOGIN_SUCCESS') as AdminSecurityAction,
      details: s.details || '',
      location: s.location,
      deviceInfo: s.device,
      newDevice: s.newDevice,
      sessionId: s.sessionId,
      authorizationResult: s.authorizationResult
    }));
    mergeAndNotify();
  }).catch(() => {});

  return onSnapshot(
    q,
    (snap) => {
      firestoreLogs = [];
      snap.forEach((d) => {
        const data = d.data() as AdminSecurityLog;
        firestoreLogs.push({ ...data, id: data.id || d.id });
      });
      mergeAndNotify();
    },
    (err) => {
      console.warn('[AdminAuth] Fetch admin logs notice:', err?.message || err);
      // Fallback query without orderBy if index is still building
      getDocs(colRef).then((fallbackSnap) => {
        firestoreLogs = [];
        fallbackSnap.forEach((d) => {
          const data = d.data() as AdminSecurityLog;
          firestoreLogs.push({ ...data, id: data.id || d.id });
        });
        mergeAndNotify();
      }).catch(() => {});
    }
  );
}

// Add new Admin User by Email
export async function addAdminUser(
  email: string,
  displayName: string,
  role: AdminRole,
  currentAdmin: AdminUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Check if already exists
    const q = query(collection(db, 'adminUsers'), where('email', '==', trimmedEmail));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return { success: false, error: 'An admin account with this email already exists.' };
    }

    const docId = `pending_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newAdmin: AdminUser = {
      uid: docId,
      email: trimmedEmail,
      displayName: displayName.trim() || trimmedEmail.split('@')[0],
      role,
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: 'Never',
      createdById: currentAdmin.uid,
      createdByEmail: currentAdmin.email
    };

    await setDoc(doc(db, 'adminUsers', docId), newAdmin);
    await logAdminSecurityEvent(
      'ADMIN_ADDED', 
      currentAdmin.email, 
      currentAdmin.uid, 
      `Added new admin: ${trimmedEmail} (${role})`
    );

    return { success: true };
  } catch (err: any) {
    console.error('[AdminAuth] Add admin error:', err);
    return { success: false, error: err?.message || 'Failed to add admin user.' };
  }
}

// Update Admin Role
export async function updateAdminUserRole(
  targetUid: string,
  newRole: AdminRole,
  currentAdmin: AdminUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'adminUsers', targetUid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'Admin user record not found.' };
    }

    const targetUser = snap.data() as AdminUser;
    
    // Prevent non-owners from changing owner roles
    if (targetUser.role === 'Owner' && currentAdmin.role !== 'Owner') {
      return { success: false, error: 'Only an Owner can modify another Owner.' };
    }

    await updateDoc(docRef, { role: newRole });
    await logAdminSecurityEvent(
      'ADMIN_ROLE_UPDATED',
      currentAdmin.email,
      currentAdmin.uid,
      `Updated ${targetUser.email} role from ${targetUser.role} to ${newRole}`
    );

    return { success: true };
  } catch (err: any) {
    console.error('[AdminAuth] Update role error:', err);
    return { success: false, error: err?.message || 'Failed to update admin role.' };
  }
}

// Toggle Admin Status (Active / Disabled)
export async function toggleAdminUserStatus(
  targetUid: string,
  newStatus: AdminStatus,
  currentAdmin: AdminUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'adminUsers', targetUid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'Admin user record not found.' };
    }

    const targetUser = snap.data() as AdminUser;

    // Prevent disabling the last owner or oneself if owner
    if (targetUser.role === 'Owner' && newStatus === 'Disabled') {
      const allAdmins = await getDocs(collection(db, 'adminUsers'));
      const activeOwners = allAdmins.docs
        .map(d => d.data() as AdminUser)
        .filter(u => u.role === 'Owner' && u.status === 'Active');
      
      if (activeOwners.length <= 1) {
        return { success: false, error: 'Cannot disable the primary or sole Owner account.' };
      }
    }

    await updateDoc(docRef, { status: newStatus });
    await logAdminSecurityEvent(
      'ADMIN_STATUS_CHANGED',
      currentAdmin.email,
      currentAdmin.uid,
      `Changed ${targetUser.email} status to ${newStatus}`
    );

    return { success: true };
  } catch (err: any) {
    console.error('[AdminAuth] Toggle status error:', err);
    return { success: false, error: err?.message || 'Failed to change admin status.' };
  }
}

// Remove Admin Account
export async function removeAdminUser(
  targetUid: string,
  currentAdmin: AdminUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'adminUsers', targetUid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'Admin record not found.' };
    }

    const targetUser = snap.data() as AdminUser;

    if (targetUser.role === 'Owner') {
      const allAdmins = await getDocs(collection(db, 'adminUsers'));
      const activeOwners = allAdmins.docs
        .map(d => d.data() as AdminUser)
        .filter(u => u.role === 'Owner');
      
      if (activeOwners.length <= 1) {
        return { success: false, error: 'Cannot delete the sole Owner account.' };
      }
    }

    await deleteDoc(docRef);
    await logAdminSecurityEvent(
      'ADMIN_REMOVED',
      currentAdmin.email,
      currentAdmin.uid,
      `Removed admin access for ${targetUser.email} (${targetUser.role})`
    );

    return { success: true };
  } catch (err: any) {
    console.error('[AdminAuth] Delete admin error:', err);
    return { success: false, error: err?.message || 'Failed to delete admin account.' };
  }
}

// Complete Admin Sign Out
export async function performAdminLogout(currentAdmin?: AdminUser | null): Promise<void> {
  try {
    await recordLogoutAuthEvent({ uid: currentAdmin?.uid, email: currentAdmin?.email });
    if (currentAdmin) {
      await logAdminSecurityEvent('LOGOUT', currentAdmin.email, currentAdmin.uid, 'Admin logged out');
    }
    await signOut(auth);
  } catch (e) {
    console.warn('[AdminAuth] SignOut error:', e);
  } finally {
    sessionStorage.removeItem('smartledger-admin-auth');
    sessionStorage.removeItem('smartledger-admin-email');
    sessionStorage.removeItem('smartledger-admin-role');
    sessionStorage.removeItem('smartledger-admin-session');
  }
}
