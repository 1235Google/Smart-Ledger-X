import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

export interface EnterpriseUser {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  role: 'User' | 'Admin' | 'Manager' | 'Owner';
  status: 'Active' | 'Suspended' | 'Disabled';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  providerId?: string;
  phone?: string;
  transactionCount?: number;
  backupStatus?: 'verified' | 'failed' | 'pending' | 'none';
  storageUsed?: number; // in bytes
  deviceCount?: number;
  pendingAmount?: number;
  totalPaid?: number;
  paymentStatus?: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Cancelled';
  lastPaymentDate?: string;
}

export class UserService {
  /**
   * Listen live to all enterprise users in Firestore and attach calculated payments
   */
  public static subscribeToUsers(onUpdate: (users: EnterpriseUser[]) => void) {
    const colRef = collection(db, 'users');
    
    return onSnapshot(colRef, async (snapshot) => {
      const users: EnterpriseUser[] = [];
      
      // Fetch all payments up-front for maximum batch query performance
      let allPayments: any[] = [];
      try {
        const paymentsSnap = await getDocs(collection(db, 'payments'));
        allPayments = paymentsSnap.docs.map(docSnap => docSnap.data());
      } catch (pErr) {
        console.warn('[UserService] Could not fetch up-front payments:', pErr);
      }
      
      for (const userDoc of snapshot.docs) {
        const uid = userDoc.id;
        const rootData = userDoc.data();
        
        // Fetch subcollection profile/info for compatibility
        const profileRef = doc(db, 'users', uid, 'profile', 'info');
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : {};
        
        // Fetch transaction counts & details to be authentic
        const txCol = collection(db, 'users', uid, 'transactions');
        const txSnap = await getDocs(txCol);
        const transactionsList = txSnap.docs.map(d => d.data());
        const activeTx = transactionsList.filter(t => !t.deleted);
        
        // Fetch device counts
        const devCol = collection(db, 'users', uid, 'devices');
        const devSnap = await getDocs(devCol).catch(() => null);
        const deviceCount = devSnap ? devSnap.size : 1;

        // Fetch backup status
        const backupRef = doc(db, 'users', uid, 'backups_schedule', 'config');
        const backupSnap = await getDoc(backupRef).catch(() => null);
        const backupStatus = backupSnap && backupSnap.exists() ? 'verified' : 'none';

        // Match payments
        const userPayments = allPayments.filter(p => p.userId === uid);
        const pendingAmount = userPayments.filter(p => p.status !== 'Cancelled').reduce((sum, p) => sum + (Number(p.pendingAmount) || 0), 0);
        const totalPaid = userPayments.filter(p => p.status !== 'Cancelled').reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);

        let paymentStatus: EnterpriseUser['paymentStatus'] = 'Paid';
        if (userPayments.length > 0) {
          const activePayments = userPayments.filter(p => p.status !== 'Cancelled');
          if (activePayments.length > 0) {
            const hasOverdue = activePayments.some(p => p.status === 'Overdue');
            const hasPartial = activePayments.some(p => p.status === 'Partial');
            const hasPending = activePayments.some(p => p.status === 'Pending');
            
            if (hasOverdue) paymentStatus = 'Overdue';
            else if (hasPartial) paymentStatus = 'Partial';
            else if (hasPending) paymentStatus = 'Pending';
          }
        }

        let lastPaymentDate = '';
        userPayments.forEach(p => {
          if (p.history && Array.isArray(p.history)) {
            p.history.forEach((h: any) => {
              if (h.action === 'Payment Recorded' && (!lastPaymentDate || new Date(h.timestamp).getTime() > new Date(lastPaymentDate).getTime())) {
                lastPaymentDate = h.timestamp;
              }
            });
          }
        });

        // Use root users/{uid} data collected directly from Google Sign-In as authority, fall back to subcollection profileData
        const fullName = rootData.name || profileData.fullName || profileData.displayName || 'SmartLedger User';
        const email = rootData.email || profileData.email || 'user@smartledger.io';
        const photoURL = rootData.photoURL || profileData.photoURL || '';
        const emailVerified = rootData.emailVerified !== undefined ? rootData.emailVerified : !!profileData.emailVerified;
        const createdAt = rootData.createdAt || profileData.createdAt || profileData.memberSince || new Date().toISOString();
        const lastLoginAt = rootData.lastLogin || profileData.lastLogin || profileData.updatedAt || new Date().toISOString();
        const providerId = rootData.provider || profileData.providerId || 'google.com';

        users.push({
          uid,
          fullName,
          email,
          photoURL,
          role: profileData.role || 'User',
          status: rootData.status || profileData.status || 'Active',
          emailVerified,
          createdAt,
          lastLoginAt,
          providerId,
          phone: profileData.mobile || '',
          transactionCount: activeTx.length,
          backupStatus,
          storageUsed: activeTx.length * 1024,
          deviceCount,
          pendingAmount,
          totalPaid,
          paymentStatus,
          lastPaymentDate: lastPaymentDate || undefined
        });
      }
      onUpdate(users);
    }, (err) => {
      console.error('[UserService] Error loading users:', err);
    });
  }

  /**
   * Suspend, Unsuspend, or Disable a user
   */
  public static async updateUserStatus(uid: string, status: 'Active' | 'Suspended' | 'Disabled', adminEmail: string) {
    try {
      const profileRef = doc(db, 'users', uid, 'profile', 'info');
      await updateDoc(profileRef, { status });
      const rootRef = doc(db, 'users', uid);
      await updateDoc(rootRef, { status }).catch(() => {});
      
      console.log(`[UserService] Updated user ${uid} status to ${status}`);
      return { success: true };
    } catch (err) {
      console.error('[UserService] Failed to update user status:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Change user role
   */
  public static async updateUserRole(uid: string, role: 'User' | 'Admin' | 'Manager' | 'Owner') {
    try {
      const profileRef = doc(db, 'users', uid, 'profile', 'info');
      await updateDoc(profileRef, { role });
      const rootRef = doc(db, 'users', uid);
      await updateDoc(rootRef, { role }).catch(() => {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  /**
   * Delete user cleanly
   */
  public static async deleteUser(uid: string) {
    try {
      // Delete user's profile info
      const profileRef = doc(db, 'users', uid, 'profile', 'info');
      await deleteDoc(profileRef);

      const rootRef = doc(db, 'users', uid);
      await deleteDoc(rootRef).catch(() => {});

      // Clean up user's entire app state
      const stateRef = doc(db, 'users', uid, 'app', 'state');
      await deleteDoc(stateRef).catch(() => {});

      // Delete collection documents
      const txCol = collection(db, 'users', uid, 'transactions');
      const txSnap = await getDocs(txCol);
      for (const d of txSnap.docs) {
        await deleteDoc(doc(db, 'users', uid, 'transactions', d.id));
      }

      console.log(`[UserService] Successfully cleaned up and deleted user: ${uid}`);
      return { success: true };
    } catch (err) {
      console.error('[UserService] Failed to delete user:', err);
      return { success: false, error: err };
    }
  }
}
