import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SECURITY_FILE = path.join(process.cwd(), 'admin_security.json');
const SALT = 'smartledger_central_admin_salt_2026';

interface AttemptTracker {
  count: number;
  lockUntil: number;
}

const failedAttemptsMap: Map<string, AttemptTracker> = new Map();
const activeSessions: Set<string> = new Set();

export function hashPassword(pass: string): string {
  return crypto.pbkdf2Sync(pass, SALT, 10000, 64, 'sha512').toString('hex');
}

// Initial default password is 'admin123'
let storedAdminHash = hashPassword('admin123');

// Load stored hash from disk on startup if available
try {
  if (fs.existsSync(SECURITY_FILE)) {
    const raw = fs.readFileSync(SECURITY_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.passwordHash === 'string' && parsed.passwordHash.length > 0) {
      storedAdminHash = parsed.passwordHash;
    }
  } else {
    fs.writeFileSync(
      SECURITY_FILE,
      JSON.stringify({ passwordHash: storedAdminHash, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  }
} catch (e) {
  console.warn('[AdminAuth] Error reading security file:', e);
}

export function getStoredHash(): string {
  return storedAdminHash;
}

export function updateStoredHash(newHash: string): void {
  storedAdminHash = newHash;
  try {
    fs.writeFileSync(
      SECURITY_FILE,
      JSON.stringify({ passwordHash: newHash, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.warn('[AdminAuth] Error saving security file:', e);
  }
}

export function checkRateLimit(ipKey: string): { locked: boolean; remainingMins?: number; remainingSecs?: number } {
  const tracker = failedAttemptsMap.get(ipKey);
  if (!tracker) return { locked: false };

  const now = Date.now();
  if (tracker.lockUntil > now) {
    const remainingMs = tracker.lockUntil - now;
    const remainingSecs = Math.ceil(remainingMs / 1000);
    const remainingMins = Math.ceil(remainingSecs / 60);
    return { locked: true, remainingMins, remainingSecs };
  } else if (tracker.lockUntil !== 0 && tracker.lockUntil <= now) {
    failedAttemptsMap.delete(ipKey);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedAttempt(ipKey: string): { locked: boolean; remainingAttempts: number; remainingMins?: number } {
  const now = Date.now();
  let tracker = failedAttemptsMap.get(ipKey) || { count: 0, lockUntil: 0 };
  
  if (tracker.lockUntil > 0 && tracker.lockUntil <= now) {
    tracker = { count: 0, lockUntil: 0 };
  }

  tracker.count += 1;

  if (tracker.count >= 5) {
    tracker.lockUntil = now + 5 * 60 * 1000; // 5 minutes lockout
    failedAttemptsMap.set(ipKey, tracker);
    return { locked: true, remainingAttempts: 0, remainingMins: 5 };
  } else {
    failedAttemptsMap.set(ipKey, tracker);
    return { locked: false, remainingAttempts: 5 - tracker.count };
  }
}

export function resetFailedAttempts(ipKey: string): void {
  failedAttemptsMap.delete(ipKey);
}

export function createSessionToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.add(token);
  return token;
}

export function verifySessionToken(token: string): boolean {
  if (!token) return false;
  return activeSessions.has(token);
}

export function invalidateSessionToken(token: string): void {
  if (token) activeSessions.delete(token);
}
