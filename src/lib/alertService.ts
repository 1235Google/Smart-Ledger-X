import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from './firebase';

export interface AdminAlert {
  id?: string;
  type: string;
  title: string;
  description: string;
  severity: 'Critical' | 'Warning' | 'Success' | 'Information';
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  userId?: string;
  metadata?: any;
  source?: string;
}

export class AlertService {
  /**
   * Create a new alert in 'admin_alerts' collection in Firestore
   */
  public static async createAlert(alert: Omit<AdminAlert, 'createdAt' | 'resolved'> & { createdAt?: string }) {
    try {
      const colRef = collection(db, 'admin_alerts');
      const payload = {
        ...alert,
        createdAt: alert.createdAt || new Date().toISOString(),
        resolved: false,
        resolvedAt: null,
        resolvedBy: null
      };
      const docRef = await addDoc(colRef, payload);
      await updateDoc(docRef, { id: docRef.id });
      console.log(`[AlertService] Created alert: ${alert.title} (ID: ${docRef.id})`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('[AlertService] Error creating alert:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Mark alert as resolved
   */
  public static async resolveAlert(alertId: string, resolvedBy: string) {
    try {
      const docRef = doc(db, 'admin_alerts', alertId);
      await updateDoc(docRef, {
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy
      });
      console.log(`[AlertService] Resolved alert ${alertId} by ${resolvedBy}`);
      return { success: true };
    } catch (err) {
      console.error('[AlertService] Error resolving alert:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Live real-time snapshot subscription
   */
  public static subscribeToAlerts(onUpdate: (alerts: AdminAlert[]) => void) {
    const colRef = collection(db, 'admin_alerts');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const alerts: AdminAlert[] = [];
      snapshot.forEach((docSnap) => {
        alerts.push({
          id: docSnap.id,
          ...docSnap.data()
        } as AdminAlert);
      });
      onUpdate(alerts);
    }, (err) => {
      console.error('[AlertService] Subscription error:', err);
    });
  }
}
