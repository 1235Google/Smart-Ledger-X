import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SystemMode, SystemConfig, SystemSafetyReport } from '../types';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  mode: 'normal',
  reason: '',
  changedAt: new Date().toISOString(),
  changedBy: 'System',
  expectedEndAt: null,
  autoRestore: false,
  previousMode: 'normal'
};

class SystemModeService {
  private currentConfig: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG };
  private listeners: Set<(config: SystemConfig) => void> = new Set();
  private isListening = false;
  private unsubscribeSnapshot: (() => void) | null = null;
  private pollTimer: any = null;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isListening) return;
    this.isListening = true;

    // 1. Initial immediate fetch from backend API
    this.fetchFromApi().catch(() => {});

    // 2. Real-time listener on Firestore /system/config
    try {
      const configDocRef = doc(db, 'system', 'config');
      this.unsubscribeSnapshot = onSnapshot(
        configDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && ['normal', 'readonly', 'maintenance'].includes(data.mode)) {
              this.updateConfig({
                mode: data.mode as SystemMode,
                reason: data.reason || '',
                changedAt: data.changedAt || new Date().toISOString(),
                changedBy: data.changedBy || 'Admin',
                expectedEndAt: data.expectedEndAt || null,
                autoRestore: !!data.autoRestore,
                previousMode: data.previousMode || 'normal'
              });
            }
          } else {
            // If document doesn't exist yet, fallback to server API
            this.fetchFromApi().catch(() => {});
          }
        },
        (error) => {
          // Fallback to polling API if firestore listener encounters an error
          console.warn('[SystemModeService] Firestore listener notice, using API polling fallback:', error);
          this.fetchFromApi().catch(() => {});
        }
      );
    } catch (err) {
      console.warn('[SystemModeService] Could not establish Firestore listener:', err);
    }

    // 3. Periodic API fallback poll every 10 seconds to keep synced with server auto-restore
    this.pollTimer = setInterval(() => {
      this.fetchFromApi().catch(() => {});
    }, 10000);
  }

  public async fetchFromApi(): Promise<SystemConfig> {
    try {
      const res = await fetch('/api/system/mode');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.config) {
          this.updateConfig(data.config);
          return data.config;
        }
      }
    } catch (e) {
      // Offline fallback
    }
    return this.currentConfig;
  }

  private updateConfig(newConfig: SystemConfig) {
    const changed = 
      this.currentConfig.mode !== newConfig.mode ||
      this.currentConfig.reason !== newConfig.reason ||
      this.currentConfig.expectedEndAt !== newConfig.expectedEndAt ||
      this.currentConfig.autoRestore !== newConfig.autoRestore;

    this.currentConfig = { ...newConfig };

    if (changed) {
      this.notifyListeners();
    }
  }

  public getConfig(): SystemConfig {
    return { ...this.currentConfig };
  }

  public getCurrentConfig(): SystemConfig {
    return this.getConfig();
  }

  public getMode(): SystemMode {
    return this.currentConfig.mode;
  }

  public isNormal(): boolean {
    return this.currentConfig.mode === 'normal';
  }

  public isReadOnly(): boolean {
    return this.currentConfig.mode === 'readonly';
  }

  public isMaintenance(): boolean {
    return this.currentConfig.mode === 'maintenance';
  }

  public subscribe(listener: (config: SystemConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.getConfig());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const cfg = this.getConfig();
    this.listeners.forEach((listener) => {
      try {
        listener(cfg);
      } catch (err) {
        console.error('[SystemModeService] Listener error:', err);
      }
    });
  }

  /**
   * Admin: Change System Mode with safety checks and dual-layer write (Firestore + Server API)
   */
  public async setSystemMode(
    mode: SystemMode,
    reason: string,
    expectedEndAt: string | null = null,
    autoRestore: boolean = false,
    adminToken?: string,
    adminEmail?: string
  ): Promise<{ success: boolean; config: SystemConfig; message: string }> {
    const token = adminToken || sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '';

    const newConfigData: SystemConfig = {
      mode,
      reason,
      changedAt: new Date().toISOString(),
      changedBy: adminEmail || 'Admin',
      expectedEndAt,
      autoRestore: mode === 'normal' ? false : autoRestore,
      previousMode: this.currentConfig.mode
    };

    // 1. Write to server API (authoritative audit logging + file storage + auto-restore cron)
    let apiSuccess = false;
    let returnedConfig: SystemConfig = newConfigData;
    let message = `System mode updated to ${mode.toUpperCase()}.`;

    try {
      const response = await fetch('/api/admin/system/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          mode,
          reason,
          expectedEndAt,
          autoRestore
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.config) {
          apiSuccess = true;
          returnedConfig = result.config;
          message = result.message || message;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server rejected system mode change');
      }
    } catch (err: any) {
      console.warn('[SystemModeService] Server API update notice:', err);
      if (!apiSuccess) {
        throw err;
      }
    }

    // 2. Also write to Firestore /system/config for instant real-time sync across connected clients
    try {
      const configDocRef = doc(db, 'system', 'config');
      await setDoc(configDocRef, {
        mode,
        reason,
        changedAt: returnedConfig.changedAt,
        changedBy: returnedConfig.changedBy,
        expectedEndAt,
        autoRestore: Boolean(autoRestore),
        previousMode: returnedConfig.previousMode || 'normal',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.warn('[SystemModeService] Firestore doc update notice (server API succeeded):', fsErr);
    }

    this.updateConfig(returnedConfig);
    return { success: true, config: returnedConfig, message };
  }

  /**
   * Admin: Run pre-flight safety check
   */
  public async getSafetyCheck(adminToken?: string): Promise<SystemSafetyReport> {
    const token = adminToken || sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '';
    const res = await fetch('/api/admin/system/safety-check', {
      headers: { 'x-admin-token': token }
    });
    if (!res.ok) {
      throw new Error('Failed to run safety inspection');
    }
    const data = await res.json();
    return data.report;
  }

  /**
   * Admin: Trigger immediate disaster-recovery backup prior to maintenance
   */
  public async createSafetyBackup(adminToken?: string): Promise<{ success: boolean; message: string; run: any }> {
    const token = adminToken || sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '';
    const res = await fetch('/api/admin/system/create-safety-backup', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': token 
      }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Safety backup generation failed');
    }
    return await res.json();
  }

  public destroy() {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.listeners.clear();
    this.isListening = false;
  }
}

export const systemModeService = new SystemModeService();
