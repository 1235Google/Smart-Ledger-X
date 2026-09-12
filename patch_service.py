import sys

with open('src/lib/securityService.ts', 'r') as f:
    code = f.read()

revoke_device_old = """export async function revokeUserDevice(userId: string, deviceId: string): Promise<boolean> {
  if (!deviceId) return false;

  try {
    // 1. Remove from local storage cache
    const currentList = getLocalDevices();
    const updated = currentList.filter(d => d.deviceId !== deviceId && d.id !== deviceId);
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(updated));

    // 2. Remove from Firestore if user logged in
    if (userId && userId !== 'local_user' && auth.currentUser) {
      const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
      await deleteDoc(deviceRef);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:device_updated'));
    }

    console.log(`[Security] Revoked device ${deviceId}`);
    return true;
  } catch (err) {
    console.warn('[Security] Failed to revoke device:', err);
    return false;
  }
}"""

revoke_device_new = """export async function revokeUserDevice(userId: string, deviceId: string): Promise<boolean> {
  if (!deviceId) return false;

  try {
    const currentList = getLocalDevices();
    const updated = currentList.filter(d => d.deviceId !== deviceId && d.id !== deviceId);
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(updated));

    if (userId && userId !== 'local_user' && auth.currentUser) {
      const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
      await deleteDoc(deviceRef);
      
      // Backend call to revoke real session
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/security/revoke-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ sessionId: deviceId })
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:device_updated'));
    }

    console.log(`[Security] Revoked device ${deviceId}`);
    return true;
  } catch (err) {
    console.warn('[Security] Failed to revoke device:', err);
    return false;
  }
}"""

revoke_all_old = """export async function revokeAllOtherDevices(userId: string): Promise<boolean> {
  try {
    const currentDeviceId = getOrCreateDeviceId();
    
    // 1. Update local cache
    const currentList = getLocalDevices();
    const currentDevice = currentList.find(d => d.deviceId === currentDeviceId || d.id === currentDeviceId);
    
    if (currentDevice) {
      localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify([currentDevice]));
    } else {
      localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify([]));
    }

    // 2. Remove from Firestore
    if (userId && userId !== 'local_user' && auth.currentUser) {
      const devicesRef = collection(db, 'users', userId, 'devices');
      const q = query(devicesRef);
      const snapshot = await getDocs(q);
      
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach(d => {
        if (d.id !== currentDeviceId) {
          deletePromises.push(deleteDoc(d.ref));
        }
      });
      
      await Promise.all(deletePromises);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:device_updated'));
    }

    console.log(`[Security] Revoked all other devices for user ${userId}`);
    return true;
  } catch (err) {
    console.warn('[Security] Failed to revoke all other devices:', err);
    return false;
  }
}"""

revoke_all_new = """export async function revokeAllOtherDevices(userId: string): Promise<boolean> {
  try {
    const currentDeviceId = getOrCreateDeviceId();
    
    const currentList = getLocalDevices();
    const currentDevice = currentList.find(d => d.deviceId === currentDeviceId || d.id === currentDeviceId);
    if (currentDevice) {
      localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify([currentDevice]));
    } else {
      localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify([]));
    }

    if (userId && userId !== 'local_user' && auth.currentUser) {
      const devicesRef = collection(db, 'users', userId, 'devices');
      const q = query(devicesRef);
      const snapshot = await getDocs(q);
      
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach(d => {
        if (d.id !== currentDeviceId) {
          deletePromises.push(deleteDoc(d.ref));
        }
      });
      await Promise.all(deletePromises);
      
      // Backend call to revoke real session tokens
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/security/revoke-all-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartledger:device_updated'));
    }

    console.log(`[Security] Revoked all other devices for user ${userId}`);
    return true;
  } catch (err) {
    console.warn('[Security] Failed to revoke all other devices:', err);
    return false;
  }
}

export async function emergencyLockdown(userId: string): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/security/lockdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    return res.ok;
  } catch (err) {
    console.warn('[Security] Failed emergency lockdown:', err);
    return false;
  }
}

export async function fetchAuditLogs(): Promise<AuthoritativeSecurityEvent[]> {
  if (!auth.currentUser) return [];
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/security/get-audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.warn('[Security] Failed fetching audit logs:', err);
    return [];
  }
}
"""

code = code.replace(revoke_device_old, revoke_device_new)
code = code.replace(revoke_all_old, revoke_all_new)

with open('src/lib/securityService.ts', 'w') as f:
    f.write(code)

print("done")
