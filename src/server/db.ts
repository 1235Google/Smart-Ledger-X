import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export let isFirebaseAdminReady = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey || privateKey.includes('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC')) {
  console.warn(
    '[FirebaseAdmin] WARNING: Missing or placeholder service account credentials. Backend Firestore features (backups, scheduled jobs) are DISABLED until FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are set.'
  );
  isFirebaseAdminReady = false;
} else {
  if (!getApps().length) {
    try {
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      isFirebaseAdminReady = true;
      console.log('[FirebaseAdmin] Initialized Firestore Admin SDK successfully.');
    } catch (e) {
      console.warn('[FirebaseAdmin] Initialization failed:', e);
      isFirebaseAdminReady = false;
    }
  } else {
    isFirebaseAdminReady = true;
  }
}

class DummyFirestore {
  collection() {
    return {
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => {},
        delete: async () => {}
      }),
      get: async () => ({ docs: [] }),
      limit: function() { return this; }
    };
  }
  doc() {
    return {
      get: async () => ({ exists: false, data: () => ({}) }),
      set: async () => {},
      delete: async () => {}
    };
  }
}

export const db: any = isFirebaseAdminReady ? getFirestore() : new DummyFirestore();
