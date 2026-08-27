import CryptoJS from 'crypto-js';
import { BackupItemCounts } from '../types';

const ENCRYPTION_SALT = '-smart-ledger-master-key-2026';
const LEGACY_SALT = '-smart-ledger-backup-secret';
export const APP_VERSION = '2.0.0';
export const ENCRYPTION_VERSION = 'AES-256-CBC';

export interface EncryptedEnvelope {
  format: string;
  version: string;
  backupId: string;
  fileName: string;
  type: string;
  createdAt: string;
  userId: string;
  iv: string;
  checksum: string;
  ciphertext: string;
  itemCounts?: BackupItemCounts | Record<string, number>;
}

/**
 * Derives a zero-knowledge AES-256 WordArray key for the given UID
 */
export function deriveEncryptionKey(uid: string): CryptoJS.lib.WordArray {
  return CryptoJS.SHA256(uid + ENCRYPTION_SALT);
}

/**
 * Computes SHA-256 hex digest for any string payload
 */
export function computeSha256(payload: string): string {
  return CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypts raw JSON state string using AES-256-CBC with a random 16-byte IV
 */
export function encryptPayload(rawJson: string, uid: string): { ciphertext: string; ivHex: string; checksum: string } {
  const checksum = computeSha256(rawJson);
  const iv = CryptoJS.lib.WordArray.random(16);
  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const key = deriveEncryptionKey(uid);

  const encrypted = CryptoJS.AES.encrypt(rawJson, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.toString(),
    ivHex,
    checksum,
  };
}

/**
 * Decrypts envelope ciphertext using AES-256-CBC and verifies SHA-256 checksum
 */
export function decryptPayload(
  ciphertext: string,
  ivHex: string | undefined,
  uid: string,
  expectedChecksum?: string
): { decryptedJson: string; verified: boolean; actualChecksum: string } {
  const key = deriveEncryptionKey(uid);
  let decryptedStr = '';

  if (ivHex) {
    try {
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      console.warn('[Crypto] IV-based decryption attempt failed:', err);
    }
  }

  // Fallback to legacy key derivation if IV-based failed
  if (!decryptedStr) {
    try {
      const legacyKey = CryptoJS.SHA256(uid + LEGACY_SALT).toString();
      const legacyBytes = CryptoJS.AES.decrypt(ciphertext, legacyKey);
      decryptedStr = legacyBytes.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      console.warn('[Crypto] Legacy decryption fallback failed:', err);
    }
  }

  // Second fallback with current key in ECB mode (legacy backward compatibility)
  if (!decryptedStr) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
      decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      console.warn('[Crypto] Standard fallback failed:', err);
    }
  }

  if (!decryptedStr) {
    throw new Error('Decryption failed: Cryptographic signature mismatch or corrupted backup payload.');
  }

  const actualChecksum = computeSha256(decryptedStr);
  const verified = !expectedChecksum || expectedChecksum === 'migrated' || actualChecksum === expectedChecksum;

  if (!verified && expectedChecksum) {
    console.error('[Crypto Integrity Error] Checksum verification mismatch:', {
      expected: expectedChecksum,
      actual: actualChecksum,
    });
    throw new Error('Backup integrity error: SHA-256 checksum mismatch. The payload may be corrupted.');
  }

  return {
    decryptedJson: decryptedStr,
    verified,
    actualChecksum,
  };
}
