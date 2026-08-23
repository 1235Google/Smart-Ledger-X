import { 
  signInWithPopup, 
  signInWithRedirect, 
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

// Verify or bootstrap admin user in Firestore
export async function verifyOrBootstrapAdminUser(user: User): Promise<{
  authorized: boolean;
  adminUser?: AdminUser;
  error?: string;
}> {
  try {
    const userEmail = (user.email || '').trim().toLowerCase();
    const userUid = user.uid;

    // 1. Check if direct doc exists with UID
    const directDocRef = doc(db, 'adminUsers', userUid);
    const directDocSnap = await getDoc(directDocRef);

    if (directDocSnap.exists()) {
      const data = directDocSnap.data() as AdminUser;
      if (data.status === 'Disabled') {
        await logAdminSecurityEvent('LOGIN_DENIED_DISABLED', userEmail, userUid, 'Attempted login with disabled account');
        return {
          authorized: false,
          error: 'Your admin account has been disabled. Please contact the Owner.'
        };
      }

      // Update lastLogin and profile fields
      const updatedData: Partial<AdminUser> = {
        lastLogin: new Date().toISOString(),
        displayName: user.displayName || data.displayName || userEmail,
        photoURL: user.photoURL || data.photoURL || ''
      };
      await updateDoc(directDocRef, updatedData);

      const resolvedAdmin: AdminUser = {
        ...data,
        ...updatedData,
        uid: userUid,
        email: userEmail
      };

      await logAdminSecurityEvent('LOGIN_SUCCESS', userEmail, userUid, `Google Sign-in: Role ${resolvedAdmin.role}`);
      return { authorized: true, adminUser: resolvedAdmin };
    }

    // 2. Check by email if document was created prior to first Google login
    const q = query(collection(db, 'adminUsers'), where('email', '==', userEmail));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      const data = firstDoc.data() as AdminUser;

      if (data.status === 'Disabled') {
        await logAdminSecurityEvent('LOGIN_DENIED_DISABLED', userEmail, userUid, 'Attempted login with disabled account');
        return {
          authorized: false,
          error: 'Your admin account has been disabled. Please contact the Owner.'
        };
      }

      // Migrate / link doc to user.uid
      const updatedAdmin: AdminUser = {
        ...data,
        uid: userUid,
        email: userEmail,
        displayName: user.displayName || data.displayName || userEmail,
        photoURL: user.photoURL || data.photoURL || '',
        lastLogin: new Date().toISOString()
      };

      // Set the UID document and remove old doc if key differed
      await setDoc(doc(db, 'adminUsers', userUid), updatedAdmin);
      if (firstDoc.id !== userUid) {
        try {
          await deleteDoc(doc(db, 'adminUsers', firstDoc.id));
        } catch (e) {}
      }

      await logAdminSecurityEvent('LOGIN_SUCCESS', userEmail, userUid, `Linked Google account: Role ${updatedAdmin.role}`);
      return { authorized: true, adminUser: updatedAdmin };
    }

    // 3. Check for Initial Owner Bootstrap
    // Check if adminUsers collection is completely empty OR if user is in INITIAL_BOOTSTRAP_EMAILS
    const allAdminsSnap = await getDocs(collection(db, 'adminUsers'));
    const isFirstAdmin = allAdminsSnap.empty;
    const isDesignatedOwner = INITIAL_BOOTSTRAP_EMAILS.includes(userEmail);

    if (isFirstAdmin || isDesignatedOwner) {
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

      await setDoc(doc(db, 'adminUsers', userUid), newOwner);
      await logAdminSecurityEvent('ADMIN_ADDED', userEmail, userUid, 'Initial Owner bootstrap account provisioned');
      await logAdminSecurityEvent('LOGIN_SUCCESS', userEmail, userUid, 'Owner Initial Sign-in Success');

      return { authorized: true, adminUser: newOwner };
    }

    // 4. Unauthorized User
    await logAdminSecurityEvent('LOGIN_DENIED_UNAUTHORIZED', userEmail, userUid, 'Google account not in admin whitelist');
    return {
      authorized: false,
      error: 'You are not authorized to access the Smart Ledger Admin Panel.'
    };
  } catch (err: any) {
    console.error('[AdminAuth] Verification error:', err);
    handleFirestoreError(err, OperationType.GET, 'adminUsers');
    return {
      authorized: false,
      error: err?.message || 'Database error during authorization check.'
    };
  }
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
      console.warn('[AdminAuth] Popup sign-in error, trying fallback:', popupErr);
      if (
        popupErr?.code === 'auth/popup-blocked' ||
        popupErr?.code === 'auth/cancelled-popup-request' ||
        popupErr?.code === 'auth/popup-closed-by-user'
      ) {
        // Fallback to redirect flow if supported
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

    const verification = await verifyOrBootstrapAdminUser(authResult.user);
    if (!verification.authorized) {
      // User is not an authorized admin, sign out immediately
      await signOut(auth);
      return {
        success: false,
        error: verification.error || 'You are not authorized to access the Smart Ledger Admin Panel.'
      };
    }

    // Set local session flags
    sessionStorage.setItem('smartledger-admin-auth', 'true');
    sessionStorage.setItem('smartledger-admin-email', verification.adminUser!.email);
    sessionStorage.setItem('smartledger-admin-role', verification.adminUser!.role);

    return {
      success: true,
      adminUser: verification.adminUser
    };
  } catch (err: any) {
    console.error('[AdminAuth] Google sign-in failed:', err);
    try {
      await signOut(auth);
    } catch (e) {}
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during Google sign in.'
    };
  }
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
      const verification = await verifyOrBootstrapAdminUser(result.user);
      if (!verification.authorized) {
        await signOut(auth);
        return {
          success: false,
          error: verification.error || 'You are not authorized to access the Smart Ledger Admin Panel.'
        };
      }
      sessionStorage.setItem('smartledger-admin-auth', 'true');
      return { success: true, adminUser: verification.adminUser };
    }
    return null;
  } catch (err: any) {
    console.warn('[AdminAuth] Check redirect result error:', err);
    return null;
  }
}

// Real-time listener for current Admin User doc
export function subscribeToAdminUser(
  uid: string,
  onUpdate: (admin: AdminUser | null) => void
): () => void {
  const docRef = doc(db, 'adminUsers', uid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as AdminUser);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('[AdminAuth] Admin subscription error:', err);
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
      console.error('[AdminAuth] Fetch all admins error:', err);
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
  return onSnapshot(
    q,
    (snap) => {
      const logs: AdminSecurityLog[] = [];
      snap.forEach((d) => {
        logs.push(d.data() as AdminSecurityLog);
      });
      onUpdate(logs);
    },
    (err) => {
      console.error('[AdminAuth] Fetch admin logs error:', err);
      // Fallback query without orderBy if index is still building
      getDocs(colRef).then((fallbackSnap) => {
        const logs: AdminSecurityLog[] = [];
        fallbackSnap.forEach((d) => logs.push(d.data() as AdminSecurityLog));
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(logs.slice(0, logLimit));
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
