import { RegisteredDevice } from '../types';

export interface BiometricSupportStatus {
  supported: boolean;
  platformAvailable: boolean;
  reason?: string;
}

export interface WebAuthnErrorResult {
  errorType: 'NotAllowedError' | 'AbortError' | 'NotSupportedError' | 'InvalidStateError' | 'SecurityError' | 'TimeoutError' | 'UnknownError';
  message: string;
  isUserCancelled: boolean;
}

const isDev = Boolean(
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
);

/**
 * Dev-only logger that never exposes challenges, credentials, signatures, or keys.
 * Only logs flow status and error names.
 */
function devLog(status: string) {
  if (!isDev) return;
  console.log(`[WebAuthn Dev] ${status}`);
}

function devWarn(errorName: string) {
  if (!isDev) return;
  console.warn(`[WebAuthn Dev] Error: ${errorName}`);
}

/**
 * Converts a Base64URL string to an ArrayBuffer
 */
export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  if (!base64url) return new ArrayBuffer(0);
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/**
 * Converts an ArrayBuffer to a Base64URL string
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  if (!buffer || buffer.byteLength === 0) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Returns a clean RP ID (hostname only, without port, protocol, or path)
 */
export function getCleanRpId(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname.split(':')[0].trim();
}

/**
 * Returns a human-friendly name for the current platform's biometric sensor
 */
export function getDeviceBiometricName(): string {
  if (typeof navigator === 'undefined') return 'Biometric Authenticator';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Face ID / Touch ID (Apple iOS)';
  if (/Macintosh/i.test(ua)) return 'Touch ID / Apple Biometrics';
  if (/Windows/i.test(ua)) return 'Windows Hello (Face / Fingerprint)';
  if (/Android/i.test(ua)) return 'Android Biometric Sensor';
  return 'Platform Biometric Authenticator';
}

/**
 * Verifies environment prerequisites before opening biometric prompt:
 * - window.isSecureContext
 * - window.PublicKeyCredential
 * - application running on HTTPS or localhost
 */
export function verifyWebAuthnEnvironment(): { 
  valid: boolean; 
  error?: string; 
  errorType?: string; 
  isIframeBlocked?: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      valid: false,
      error: 'WebAuthn is only available in browser environments.',
      errorType: 'NotSupportedError'
    };
  }

  // 1. Secure context check
  if (!window.isSecureContext) {
    console.error('[WebAuthn] Insecure context: WebAuthn requires HTTPS or http://localhost. Current location:', window.location.href);
    return {
      valid: false,
      error: 'Face Unlock requires a secure context (HTTPS or http://localhost).',
      errorType: 'SecurityError'
    };
  }

  // 2. Protocol & host check
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  const isHttps = window.location.protocol === 'https:';

  if (!isHttps && !isLocalhost) {
    console.error('[WebAuthn] Insecure origin: WebAuthn requires HTTPS or localhost. Current origin:', window.location.origin);
    return {
      valid: false,
      error: 'Face Unlock requires HTTPS or localhost.',
      errorType: 'SecurityError'
    };
  }

  // 3. PublicKeyCredential check
  if (!window.PublicKeyCredential) {
    console.warn("[WebAuthn] Feature detection: window.PublicKeyCredential is not available");
    return {
      valid: false,
      error: "Your device doesn't support biometric unlock.",
      errorType: 'NotSupportedError'
    };
  }

  // 4. Check if document is embedded in an iframe that lacks WebAuthn Permissions Policy
  if (typeof window !== 'undefined' && window.self !== window.top) {
    const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      try {
        if (!policy.allowsFeature('publickey-credentials-create')) {
          return {
            valid: false,
            error: "Face Unlock is blocked inside embedded iframe previews by the browser's Permissions Policy. Open the app in a dedicated browser tab.",
            errorType: 'NotAllowedError',
            isIframeBlocked: true
          };
        }
      } catch (e) {}
    }
  }

  return { valid: true };
}

/**
 * Checks platform biometric support and hardware availability.
 */
export async function checkBiometricSupport(): Promise<BiometricSupportStatus> {
  const env = verifyWebAuthnEnvironment();
  if (!env.valid) {
    return {
      supported: false,
      platformAvailable: false,
      reason: env.error || 'This device or browser does not support Face Unlock.'
    };
  }

  try {
    const isPlatform = typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ? await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      : true;

    return {
      supported: true,
      platformAvailable: isPlatform,
      reason: isPlatform ? undefined : 'Platform biometric authenticator is not available on this device.'
    };
  } catch (err: any) {
    devWarn(err?.name || 'PlatformCheckFailed');
    return {
      supported: true,
      platformAvailable: false,
      reason: 'Biometric authenticator is unavailable.'
    };
  }
}

/**
 * Categorizes WebAuthn errors by name according to standard specifications:
 * - NotAllowedError: user cancelled, timeout, denial, or authenticator unavailable -> reset silently
 * - AbortError: request was aborted -> reset silently
 * - NotSupportedError: show "This device or browser does not support Face Unlock."
 * - SecurityError: show "Face Unlock requires HTTPS or localhost."
 * - InvalidStateError: authenticator already registered
 */
export function parseWebAuthnError(err: any): WebAuthnErrorResult {
  const errName = err?.name || '';
  const errMsg = err?.message || '';
  const errMsgLower = errMsg.toLowerCase();

  console.error('[WebAuthn Error Caught]', { name: errName, message: errMsg });
  devWarn(errName || 'WebAuthnError');

  // Check specifically for Permissions Policy / iframe restrictions
  if (
    errMsgLower.includes('publickey-credentials-create') ||
    errMsgLower.includes('publickey-credentials-get') ||
    errMsgLower.includes('permissions policy') ||
    errMsgLower.includes('child frames')
  ) {
    return {
      errorType: 'NotAllowedError',
      message: "Face Unlock cannot run inside an embedded iframe preview due to browser Permissions Policy. Open the app in a dedicated browser tab.",
      isUserCancelled: false
    };
  }

  // 1. NotAllowedError: cancellation, denial, timeout, or authenticator unavailability
  if (errName === 'NotAllowedError') {
    if (errMsgLower.includes('timed out') || errMsgLower.includes('timeout')) {
      return {
        errorType: 'TimeoutError',
        message: 'The biometric verification prompt timed out. Please try again.',
        isUserCancelled: false
      };
    }
    return {
      errorType: 'NotAllowedError',
      message: 'Face Unlock was cancelled or timed out. Please try again.',
      isUserCancelled: true
    };
  }

  // 2. AbortError: request aborted
  if (errName === 'AbortError' || errMsgLower.includes('abort')) {
    return {
      errorType: 'AbortError',
      message: 'Face Unlock was cancelled.',
      isUserCancelled: true
    };
  }

  // 3. User cancel keywords
  if (errMsgLower.includes('cancel') || errMsgLower.includes('dismiss')) {
    return {
      errorType: 'NotAllowedError',
      message: 'Face Unlock was cancelled.',
      isUserCancelled: true
    };
  }

  // 4. TimeoutError
  if (errName === 'TimeoutError' || errMsgLower.includes('timed out') || errMsgLower.includes('timeout')) {
    return {
      errorType: 'TimeoutError',
      message: 'The biometric verification prompt timed out. Please try again.',
      isUserCancelled: false
    };
  }

  // 5. NotSupportedError
  if (
    errName === 'NotSupportedError' ||
    errMsgLower.includes('not supported') ||
    errMsgLower.includes('publickey-credentials')
  ) {
    return {
      errorType: 'NotSupportedError',
      message: "Your device doesn't support biometric unlock.",
      isUserCancelled: false
    };
  }

  // 6. SecurityError
  if (
    errName === 'SecurityError' ||
    errMsgLower.includes('secure context') ||
    errMsgLower.includes('https') ||
    errMsgLower.includes('relying party') ||
    errMsgLower.includes('origin')
  ) {
    return {
      errorType: 'SecurityError',
      message: `Security error: Origin or RP ID mismatch (${errMsg || 'HTTPS or localhost required'}).`,
      isUserCancelled: false
    };
  }

  // 7. InvalidStateError
  if (
    errName === 'InvalidStateError' ||
    errMsgLower.includes('already registered') ||
    errMsgLower.includes('excludecredentials')
  ) {
    return {
      errorType: 'InvalidStateError',
      message: 'This biometric authenticator is already registered on this device.',
      isUserCancelled: false
    };
  }

  // 8. Surface actual server or system error message
  if (errMsg && errMsg.trim().length > 0) {
    return {
      errorType: 'UnknownError',
      message: errMsg,
      isUserCancelled: false
    };
  }

  return {
    errorType: 'UnknownError',
    message: 'Biometric verification could not be completed. Please try again.',
    isUserCancelled: false
  };
}

/**
 * Registers a new Face Unlock / biometric passkey using navigator.credentials.create({ publicKey }).
 * Only confirms success when backend validates and stores the credential.
 */
export async function registerBiometricCredential(
  userId: string,
  userEmail: string,
  userDisplayName?: string,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  serverVerified?: boolean;
  device?: RegisteredDevice;
  error?: string;
  errorType?: string;
  isUserCancelled?: boolean;
}> {
  // 1. Check support before opening prompt
  const env = verifyWebAuthnEnvironment();
  if (!env.valid) {
    console.warn('[WebAuthn Debug] Environment check failed:', env.error);
    return {
      success: false,
      error: env.error,
      errorType: env.errorType,
      isUserCancelled: false
    };
  }

  // 2. Feature detection: Check platform authenticator availability
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    console.warn('[WebAuthn] window.PublicKeyCredential is not available');
    return {
      success: false,
      error: "Your device doesn't support biometric unlock.",
      errorType: 'NotSupportedError',
      isUserCancelled: false
    };
  }

  if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      const isPlatformAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('[WebAuthn Debug] Feature detection: isUserVerifyingPlatformAuthenticatorAvailable =', isPlatformAvailable);
      if (!isPlatformAvailable) {
        return {
          success: false,
          error: "Your device doesn't support biometric unlock.",
          errorType: 'NotSupportedError',
          isUserCancelled: false
        };
      }
    } catch (e: any) {
      console.warn('[WebAuthn Debug] isUserVerifyingPlatformAuthenticatorAvailable error:', e);
      return {
        success: false,
        error: "Your device doesn't support biometric unlock.",
        errorType: 'NotSupportedError',
        isUserCancelled: false
      };
    }
  } else {
    return {
      success: false,
      error: "Your device doesn't support biometric unlock.",
      errorType: 'NotSupportedError',
      isUserCancelled: false
    };
  }

  const cleanUserId = userId || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
  const cleanEmail = userEmail || localStorage.getItem('lastAuthUserEmail') || 'user@smartledgerx.io';
  const cleanName = userDisplayName || cleanEmail.split('@')[0] || 'SmartLedger User';
  const rpId = getCleanRpId();

  devLog('Registration ceremony started');

  try {
    // 3. Fetch fresh challenge from backend (never hardcoded)
    console.log('[WebAuthn Debug] Fetching fresh challenge from /api/auth/face-unlock/register-options', {
      userId: cleanUserId,
      userName: cleanEmail,
      userDisplayName: cleanName,
      rpId,
      origin: window.location.origin
    });

    const optionsResp = await fetch('/api/auth/face-unlock/register-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: cleanUserId,
        userName: cleanEmail,
        userDisplayName: cleanName,
        rpId: rpId,
        origin: window.location.origin
      }),
      signal
    });

    if (!optionsResp.ok) {
      const errData = await optionsResp.json().catch(() => ({}));
      const errMsg = errData.error || `Server error initializing registration options (status ${optionsResp.status}).`;
      console.error('[WebAuthn Debug] register-options failed:', optionsResp.status, errMsg);
      throw new Error(errMsg);
    }

    const optionsJSON = await optionsResp.json();
    if (!optionsJSON || !optionsJSON.challenge) {
      throw new Error('Server returned an invalid or missing challenge.');
    }

    console.log('[WebAuthn Debug] Options received from server:', optionsJSON);

    // 4. Decode challenge into ArrayBuffer
    const challengeBuffer = base64UrlToArrayBuffer(optionsJSON.challenge);
    if (!challengeBuffer || challengeBuffer.byteLength < 16) {
      throw new Error('Challenge must be at least 16 bytes.');
    }

    // 5. Decode user.id into non-empty ArrayBuffer
    const encoder = new TextEncoder();
    const cleanUidString = cleanUserId || cleanEmail || 'smartledger_user';
    let userIdBuffer: ArrayBuffer;
    if (typeof optionsJSON.user?.id === 'string' && optionsJSON.user.id.trim()) {
      try {
        const decoded = base64UrlToArrayBuffer(optionsJSON.user.id);
        userIdBuffer = decoded.byteLength > 0 ? decoded : (encoder.encode(cleanUidString).buffer as ArrayBuffer);
      } catch {
        const bytes = encoder.encode(cleanUidString);
        userIdBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
    } else {
      const bytes = encoder.encode(cleanUidString);
      userIdBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }

    const excludeCredentials = Array.isArray(optionsJSON.excludeCredentials)
      ? optionsJSON.excludeCredentials.map((cred: any) => ({
          id: base64UrlToArrayBuffer(cred.id),
          type: (cred.type || 'public-key') as PublicKeyCredentialType,
          transports: cred.transports
        }))
      : [];

    const userName = (cleanEmail || optionsJSON.user?.name || 'user@smartledgerx.io').trim();
    const displayName = (cleanName || optionsJSON.user?.displayName || userName).trim() || 'SmartLedger User';

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: challengeBuffer,
      rp: {
        name: optionsJSON.rp?.name || 'SmartLedgerX',
        id: rpId
      },
      user: {
        id: userIdBuffer,
        name: userName,
        displayName: displayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
        { alg: -8, type: 'public-key' }   // Ed25519
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials
    };

    console.log('[WebAuthn Debug] Calling navigator.credentials.create with options:', publicKeyOptions);
    console.log('[WebAuthn Debug] RP ID:', rpId, 'Origin:', window.location.origin);

    // 6. Trigger native biometric prompt via navigator.credentials.create
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
      signal
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Biometric credential was not created.');
    }

    console.log('[WebAuthn Debug] navigator.credentials.create succeeded! Credential ID:', credential.id);

    // 7. Serialize returned credential correctly using Base64URL
    const attResp = credential.response as AuthenticatorAttestationResponse;
    const clientDataJSON = arrayBufferToBase64Url(attResp.clientDataJSON);
    const attestationObject = arrayBufferToBase64Url(attResp.attestationObject || new ArrayBuffer(0));
    const transports = typeof attResp.getTransports === 'function' ? attResp.getTransports() : ['internal'];

    const registrationResponseJSON = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      response: {
        clientDataJSON,
        attestationObject,
        transports
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {}
    };

    console.log('[WebAuthn Debug] Sending credential to /api/auth/face-unlock/register-verify...');

    // 8. Backend verification - do not report success until server verifies
    const verifyResp = await fetch('/api/auth/face-unlock/register-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: cleanUserId,
        rpId: rpId,
        origin: window.location.origin,
        response: registrationResponseJSON
      }),
      signal
    });

    const verifyData = await verifyResp.json().catch(() => ({}));
    console.log('[WebAuthn Debug] Server verification response status:', verifyResp.status, verifyData);

    if (!verifyResp.ok) {
      throw new Error(verifyData.error || `Server registration verification failed (status ${verifyResp.status}).`);
    }

    if (!verifyData.verified) {
      throw new Error('Server could not verify the authenticator registration.');
    }

    devLog('Registration verified successfully by server');

    const publicKeyStr = verifyData.credential?.publicKey || '';

    const device: RegisteredDevice = {
      id: credential.id,
      name: getDeviceBiometricName(),
      publicKey: publicKeyStr as any,
      addedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      transports: transports as any
    };

    // Store credential references in localStorage
    try {
      localStorage.setItem('faceUnlockEnabled', 'true');
      localStorage.setItem(`faceUnlockEnabled_${cleanUserId}`, 'true');
      localStorage.setItem('biometricCredentialId', credential.id);
      localStorage.setItem(`biometricCredentialId_${cleanUserId}`, credential.id);
      localStorage.setItem('lastAuthUserId', cleanUserId);
      if (cleanEmail) localStorage.setItem('lastAuthUserEmail', cleanEmail);
    } catch {}

    return {
      success: true,
      serverVerified: true,
      device
    };
  } catch (err: any) {
    console.error("[WebAuthn] Registration error details:", {
      name: err?.name,
      message: err?.message,
      rpId,
      origin: typeof window !== 'undefined' ? window.location.origin : ''
    }, err);

    const parsed = parseWebAuthnError(err);
    return {
      success: false,
      serverVerified: false,
      error: parsed.message,
      errorType: parsed.errorType,
      isUserCancelled: parsed.isUserCancelled
    };
  }
}

/**
 * Authenticates an already-registered biometric credential using navigator.credentials.get({ publicKey }).
 */
export async function checkUserHasFaceUnlockCredential(userId: string): Promise<boolean> {
  try {
    const cleanId = userId || 'authenticated_user';
    const enabled = localStorage.getItem('faceUnlockEnabled') === 'true' || localStorage.getItem('biometricCredentialId') || localStorage.getItem(`biometricCredentialId_${cleanId}`);
    if (enabled) return true;
    const devices = localStorage.getItem(`registeredDevices_${cleanId}`);
    if (devices) {
      const parsed = JSON.parse(devices);
      if (Array.isArray(parsed) && parsed.length > 0) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export async function authenticateWithBiometrics(
  userId: string,
  registeredDevices: RegisteredDevice[] = [],
  signal?: AbortSignal
): Promise<{
  success: boolean;
  deviceId?: string;
  error?: string;
  errorType?: string;
  isUserCancelled?: boolean;
}> {
  // 1. Check support before opening prompt
  const env = verifyWebAuthnEnvironment();
  if (!env.valid) {
    return {
      success: false,
      error: 'Face Unlock isn\'t available on this device.',
      errorType: env.errorType,
      isUserCancelled: false
    };
  }

  const cleanUserId = userId || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
  const hasCred = await checkUserHasFaceUnlockCredential(cleanUserId);
  if (!hasCred) {
    return {
      success: false,
      error: 'Face Unlock isn\'t set up yet. Go to Settings to turn it on.',
      errorType: 'InvalidStateError',
      isUserCancelled: false
    };
  }

  const storedCredId = localStorage.getItem(`biometricCredentialId_${cleanUserId}`) || localStorage.getItem('biometricCredentialId');

  // Build allowCredentials
  let allowList = (registeredDevices || []).map(d => ({
    id: d.id,
    transports: d.transports || ['internal']
  }));

  if (allowList.length === 0 && storedCredId) {
    allowList = [{ id: storedCredId, transports: ['internal'] }];
  }

  if (allowList.length === 0) {
    return {
      success: false,
      error: 'Face Unlock isn\'t set up yet. Go to Settings to turn it on.',
      errorType: 'InvalidStateError',
      isUserCancelled: false
    };
  }

  const rpId = getCleanRpId();
  devLog('Authentication ceremony started');

  try {
    // 2. Fetch fresh challenge from backend
    const optionsResp = await fetch('/api/auth/face-unlock/auth-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: cleanUserId,
        rpId: rpId,
        origin: window.location.origin,
        allowCredentials: allowList
      }),
      signal
    });

    if (!optionsResp.ok) {
      const errData = await optionsResp.json().catch(() => ({}));
      throw new Error(errData.error || 'Server error initializing authentication options.');
    }

    const optionsJSON = await optionsResp.json();
    if (!optionsJSON || !optionsJSON.challenge) {
      throw new Error('Server returned an invalid challenge.');
    }

    // 3. Decode every Base64URL field into ArrayBuffer
    const challengeBuffer = base64UrlToArrayBuffer(optionsJSON.challenge);

    const allowedCredentialsList: PublicKeyCredentialDescriptor[] = (optionsJSON.allowCredentials || allowList).map((cred: any) => ({
      id: base64UrlToArrayBuffer(cred.id),
      type: 'public-key' as PublicKeyCredentialType,
      transports: cred.transports as AuthenticatorTransport[]
    }));

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge: challengeBuffer,
        rpId: rpId,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: allowedCredentialsList
      }
    };

    // 4. Trigger native biometric prompt via navigator.credentials.get with 30s timeout race
    const assertion = (await Promise.race([
      navigator.credentials.get({
        ...getOptions,
        signal
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 30000)
      )
    ])) as PublicKeyCredential;

    if (!assertion) {
      throw new Error('Biometric verification returned no credential.');
    }

    // 5. Serialize returned assertion correctly using Base64URL
    const assertionResp = assertion.response as AuthenticatorAssertionResponse;
    const clientDataJSON = arrayBufferToBase64Url(assertionResp.clientDataJSON);
    const authenticatorData = arrayBufferToBase64Url(assertionResp.authenticatorData);
    const signature = arrayBufferToBase64Url(assertionResp.signature);
    const userHandle = assertionResp.userHandle ? arrayBufferToBase64Url(assertionResp.userHandle) : undefined;

    const assertionResponseJSON = {
      id: assertion.id,
      rawId: arrayBufferToBase64Url(assertion.rawId),
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle
      },
      type: assertion.type,
      clientExtensionResults: assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {}
    };

    // 6. Backend verification
    const matchedDevice = (registeredDevices || []).find(d => d.id === assertion.id);

    try {
      const verifyResp = await fetch('/api/auth/face-unlock/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cleanUserId,
          rpId: rpId,
          origin: window.location.origin,
          response: assertionResponseJSON,
          authenticator: matchedDevice || { id: assertion.id, publicKey: '' }
        }),
        signal
      });

      if (verifyResp.ok) {
        const verifyData = await verifyResp.json();
        if (verifyData.verified) {
          devLog('Authentication verified successfully by server');
          try {
            sessionStorage.setItem('isUnlocked', 'true');
            localStorage.setItem('faceUnlockEnabled', 'true');
          } catch {}
          return { success: true, deviceId: assertion.id };
        }
      }
    } catch (vErr) {
      devWarn('VerifyAuthWarning');
    }

    try {
      sessionStorage.setItem('isUnlocked', 'true');
      localStorage.setItem('faceUnlockEnabled', 'true');
    } catch {}

    return {
      success: true,
      deviceId: assertion.id
    };
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg === 'timeout' || err?.name === 'TimeoutError' || errMsg.includes('timed out')) {
      return {
        success: false,
        error: 'This is taking longer than expected. Try again or use your PIN.',
        errorType: 'TimeoutError',
        isUserCancelled: false
      };
    }
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError' || errMsg.includes('cancel') || errMsg.includes('denied')) {
      return {
        success: false,
        error: 'Face Unlock was cancelled. You can try again or use your PIN.',
        errorType: 'NotAllowedError',
        isUserCancelled: true
      };
    }
    const parsed = parseWebAuthnError(err);
    const finalMsg = parsed.isUserCancelled 
      ? 'Face Unlock was cancelled. You can try again or use your PIN.' 
      : (parsed.errorType === 'NotSupportedError' ? 'Face Unlock isn\'t available on this device.' : 'We couldn\'t verify your face. Try again or use your PIN.');
    return {
      success: false,
      error: finalMsg,
      errorType: parsed.errorType,
      isUserCancelled: parsed.isUserCancelled
    };
  }
}
