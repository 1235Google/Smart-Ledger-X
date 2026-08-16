import { storage, auth, db } from './firebase';
import { ref, uploadString, getDownloadURL, listAll, deleteObject, getMetadata } from 'firebase/storage';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import JSZip from 'jszip';
import { AppState, Transaction } from '../types';

export interface BackupMetadata {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  status: 'verified' | 'failed' | 'pending';
  version: string;
  type: 'daily' | 'manual' | 'pre-update' | 'pre-restore' | 'pre-import';
}

export class BackupService {
  private static async getEncryptionKey() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return CryptoJS.SHA256(uid + '-smart-ledger-backup-secret').toString();
  }

  static async createBackup(type: BackupMetadata['type'] = 'manual'): Promise<BackupMetadata> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const timestamp = new Date();
    const backupId = `backup-${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    
    // 1. Gather all data
    const data = await this.gatherAllData();
    const jsonString = JSON.stringify(data);

    // 2. Encrypt
    const key = await this.getEncryptionKey();
    const encryptedData = CryptoJS.AES.encrypt(jsonString, key).toString();

    // 3. Compress
    const zip = new JSZip();
    zip.file("data.enc", encryptedData);
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
    
    // Read blob as base64 string for uploadString
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(zipBlob);
    });

    // 4. Upload to Firebase Storage
    const storageRef = ref(storage, `backups/${uid}/${backupId}.zip`);
    
    let retries = 5;
    let delay = 30000;
    
    while (retries > 0) {
      try {
        await uploadString(storageRef, base64Data, 'data_url', {
          customMetadata: {
            status: 'verified',
            type,
            version: '1.0.0',
            originalSize: jsonString.length.toString(),
          }
        });
        break; 
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(res => setTimeout(res, delay));
        if (delay === 30000) delay = 60000;
        else if (delay === 60000) delay = 300000; // 5 min
      }
    }

    const metadata = await getMetadata(storageRef);

    // 5. Enforce Retention Policy
    await this.enforceRetentionPolicy(uid);

    return {
      id: backupId,
      name: backupId,
      createdAt: metadata.timeCreated,
      size: metadata.size,
      status: 'verified',
      version: '1.0.0',
      type
    };
  }

  static async listBackups(): Promise<BackupMetadata[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const listRef = ref(storage, `backups/${uid}`);
    try {
      const res = await listAll(listRef);
      const backups = await Promise.all(res.items.map(async (itemRef) => {
        const meta = await getMetadata(itemRef);
        return {
          id: itemRef.name.replace('.zip', ''),
          name: itemRef.name.replace('.zip', ''),
          createdAt: meta.timeCreated,
          size: meta.size,
          status: (meta.customMetadata?.status as any) || 'verified',
          version: meta.customMetadata?.version || '1.0.0',
          type: (meta.customMetadata?.type as any) || 'manual',
        };
      }));

      return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error: any) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  static async restoreBackup(backupId: string): Promise<boolean> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    // Create pre-restore backup first
    await this.createBackup('pre-restore');

    // Fetch from storage
    const storageRef = ref(storage, `backups/${uid}/${backupId}.zip`);
    const url = await getDownloadURL(storageRef);
    const response = await fetch(url);
    const blob = await response.blob();

    // Decompress
    const zip = await JSZip.loadAsync(blob);
    const encryptedData = await zip.file("data.enc")?.async("string");
    
    if (!encryptedData) throw new Error('Invalid backup format');

    // Decrypt
    const key = await this.getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const jsonString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!jsonString) throw new Error('Decryption failed');

    const data = JSON.parse(jsonString);

    // Restore to Firestore
    await this.restoreAllData(uid, data);
    
    return true;
  }
  
  static async downloadBackup(backupId: string) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    
    const storageRef = ref(storage, `backups/${uid}/${backupId}.zip`);
    const url = await getDownloadURL(storageRef);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${backupId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  static async deleteBackup(backupId: string) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    
    const storageRef = ref(storage, `backups/${uid}/${backupId}.zip`);
    await deleteObject(storageRef);
  }

  private static async gatherAllData() {
    const uid = auth.currentUser?.uid;
    if (!uid) return {};

    const stateDocRef = doc(db, 'users', uid, 'app', 'state');
    const txCollectionRef = collection(db, 'users', uid, 'transactions');
    
    const [stateSnap, txSnap] = await Promise.all([
      getDoc(stateDocRef),
      getDocs(txCollectionRef)
    ]);
    
    const state = stateSnap.exists() ? stateSnap.data() : {};
    const transactions = txSnap.docs.map(d => d.data());

    return { state, transactions };
  }

  private static async restoreAllData(uid: string, data: any) {
    const { state, transactions } = data;
    
    // We should write it securely
    const stateDocRef = doc(db, 'users', uid, 'app', 'state');
    await setDoc(stateDocRef, state || {});
    
    // Clear old transactions and set new ones. In Firestore we can't easily clear collection without listing.
    const oldTxRef = collection(db, 'users', uid, 'transactions');
    const oldTxSnap = await getDocs(oldTxRef);
    
    // We'll write in chunks of 500 (batch limit)
    let batch = writeBatch(db);
    let count = 0;
    
    for (const d of oldTxSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count === 490) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    await batch.commit();
    
    batch = writeBatch(db);
    count = 0;
    
    for (const tx of transactions) {
      const ref = doc(db, 'users', uid, 'transactions', tx.id);
      batch.set(ref, tx);
      count++;
      if (count === 490) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
  }
  
  private static async enforceRetentionPolicy(uid: string) {
    const backups = await this.listBackups();
    // Keep max 42 backups (30 daily + 12 monthly/weekly logic simplified)
    if (backups.length > 42) {
      const toDelete = backups.slice(42);
      for (const b of toDelete) {
        try {
          await this.deleteBackup(b.id);
        } catch(e) {
          console.error('Failed to delete old backup', e);
        }
      }
    }
  }
}
