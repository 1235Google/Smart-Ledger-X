import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

function getEncryptionKey() {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('CONFIG_MISSING: Two-factor authentication is not configured on the server.');
  }
  return key.substring(0, 32);
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(getEncryptionKey()), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(getEncryptionKey()), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function hashRecoveryCode(code: string): string {
  return crypto.scryptSync(code, 'salt', 64).toString('hex');
}

const getFirestoreUrl = (userId: string, updateMasks?: string[]) => {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'studio-3200340687-9f052';
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/private_security/totp`;
  if (updateMasks && updateMasks.length > 0) {
    url += '?' + updateMasks.map(m => `updateMask.fieldPaths=${m}`).join('&');
  }
  return url;
};

export async function setupMfa(userId: string, email: string, idToken: string) {
  const secret = generateSecret();
  const label = email || userId;
  const issuer = 'SmartLedger';
  const uri = generateURI({ secret, label, issuer }) + '&algorithm=SHA1&digits=6&period=30';
  
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await (QRCode.toDataURL || (QRCode as any).default.toDataURL)(uri);
  } catch(e) {
    qrCodeDataUrl = await (QRCode as any).default.toDataURL(uri);
  }
  
  const encryptedSecret = encrypt(secret);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  const payload = {
    fields: {
      pendingSecret: { stringValue: encryptedSecret },
      pendingExpiresAt: { integerValue: expiresAt.getTime().toString() }
    }
  };

  const response = await fetch(getFirestoreUrl(userId, ['pendingSecret', 'pendingExpiresAt']), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to save pending TOTP secret to Firestore: ' + await response.text());
  }
  
  return {
    success: true,
    qrCodeDataUrl,
    manualEntryKey: secret,
    issuer,
    accountName: label,
    expiresAt: expiresAt.toISOString(),
    secret: secret,
    qrCodeUrl: qrCodeDataUrl
  };
}

export async function confirmMfa(userId: string, code: string, idToken: string) {
  const response = await fetch(getFirestoreUrl(userId), {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  
  if (!response.ok) throw new Error("No pending TOTP setup found.");
  const doc = await response.json();
  const fields = doc.fields || {};
  
  if (!fields.pendingSecret?.stringValue || !fields.pendingExpiresAt?.integerValue) {
    throw new Error("TOTP setup expired or not started.");
  }
  if (parseInt(fields.pendingExpiresAt.integerValue) < Date.now()) {
    throw new Error("TOTP setup expired.");
  }
  
  const secret = decrypt(fields.pendingSecret.stringValue);
  const isValid = verifySync({ token: code, secret });
  
  if (!isValid) return { success: false, code: 'INVALID_CODE', message: 'Invalid or expired authentication code.' };
  
  const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').substring(0, 8).toUpperCase());
  const hashedCodes = recoveryCodes.map(hashRecoveryCode);
  
  const payload = {
    fields: {
      enabled: { booleanValue: true },
      secret: { stringValue: fields.pendingSecret.stringValue },
      recoveryCodes: { arrayValue: { values: hashedCodes.map(c => ({ stringValue: c })) } },
      confirmedAt: { stringValue: new Date().toISOString() }
    }
  };
  
  const updateRes = await fetch(getFirestoreUrl(userId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!updateRes.ok) throw new Error("Failed to save confirmed MFA state.");
  
  return { success: true, recoveryCodes };
}

export async function verifyMfa(userId: string, code: string, idToken: string) {
  const response = await fetch(getFirestoreUrl(userId), {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  if (!response.ok) throw new Error("MFA not enabled.");
  const doc = await response.json();
  const fields = doc.fields || {};
  
  if (!fields.enabled?.booleanValue) throw new Error("MFA not enabled.");
  
  if (fields.lockoutUntil?.integerValue && parseInt(fields.lockoutUntil.integerValue) > Date.now()) {
    return { success: false, error: "Too many failed attempts. Try again later.", lockout: true };
  }
  
  let isValid = false;
  const secret = decrypt(fields.secret.stringValue);
  if (verifySync({ token: code, secret })) {
    isValid = true;
  }
  
  if (!isValid && fields.recoveryCodes?.arrayValue?.values) {
    const hashedCode = hashRecoveryCode(code);
    const codes = fields.recoveryCodes.arrayValue.values.map((v: any) => v.stringValue);
    const index = codes.indexOf(hashedCode);
    if (index !== -1) {
      isValid = true;
      codes.splice(index, 1);
      fields.recoveryCodes.arrayValue.values = codes.map((c: string) => ({ stringValue: c }));
    }
  }
  
  if (isValid) {
    const payload = {
      fields: {
        ...fields,
        failedAttempts: { integerValue: "0" },
        lastUsedAt: { integerValue: Date.now().toString() }
      }
    };
    delete payload.fields.lockoutUntil;
    
    await fetch(getFirestoreUrl(userId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    
    return { success: true, customToken: 'FAKE_TOKEN_BECAUSE_NO_ADMIN_SDK' };
  } else {
    const attempts = parseInt(fields.failedAttempts?.integerValue || "0") + 1;
    let lockout = null;
    if (attempts >= 5) {
      lockout = Date.now() + 15 * 60 * 1000;
    }
    
    const payload = {
      fields: {
        ...fields,
        failedAttempts: { integerValue: attempts.toString() }
      }
    };
    if (lockout) payload.fields.lockoutUntil = { integerValue: lockout.toString() };
    
    await fetch(getFirestoreUrl(userId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    
    return { success: false, error: 'Invalid code' };
  }
}

export async function disableMfa(userId: string, code: string, idToken: string) {
  const response = await fetch(getFirestoreUrl(userId), {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  if (!response.ok) return { success: true };
  const doc = await response.json();
  const fields = doc.fields || {};
  
  if (!fields.enabled?.booleanValue) return { success: true };
  
  const secret = decrypt(fields.secret.stringValue);
  if (!verifySync({ token: code, secret })) return { success: false, error: 'Invalid code' };
  
  await fetch(getFirestoreUrl(userId), {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  
  return { success: true };
}

export async function checkMfaStatus(userId: string, idToken?: string) {
  if (!idToken) return { enabled: false };
  const response = await fetch(getFirestoreUrl(userId), {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  if (!response.ok) return { enabled: false };
  const doc = await response.json();
  return {
    enabled: doc.fields?.enabled?.booleanValue === true
  };
}
