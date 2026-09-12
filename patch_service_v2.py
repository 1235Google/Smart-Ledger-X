import sys

with open('src/lib/securityService.ts', 'r') as f:
    code = f.read()

# I will just append the new functions at the end!
new_funcs = """

// --- ADDED BY SECURITY UPDATE ---
export async function emergencyLockdown(): Promise<boolean> {
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

export async function fetchAuditLogs(): Promise<any[]> {
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

export async function revokeAllSessionsBackend(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/security/revoke-all-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    return res.ok;
  } catch (err) {
    console.warn('[Security] Failed revoke all:', err);
    return false;
  }
}

export async function revokeDeviceBackend(sessionId: string): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/security/revoke-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ sessionId })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Security] Failed revoke device:', err);
    return false;
  }
}
"""

if "emergencyLockdown" not in code:
    code += new_funcs

with open('src/lib/securityService.ts', 'w') as f:
    f.write(code)
print("done")
