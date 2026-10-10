import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Fingerprint, ScanFace, XCircle, CheckCircle2, Trash2, Plus, Laptop, Key, Info } from 'lucide-react';
import { cn, formatDateTime } from '../lib/utils';
import { 
  checkBiometricSupport, 
  registerBiometricCredential, 
  authenticateWithBiometrics,
  getDeviceBiometricName,
  verifyWebAuthnEnvironment
} from '../lib/webauthnService';
import { FaceUnlockSetupModal } from './FaceUnlockSetupModal';

export default function BiometricSettings() {
  const { securitySettings, updateSecuritySettings, generalSettings, currentUser } = useStore();
  
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [supportReason, setSupportReason] = useState<string | null>(null);
  
  // Pending state and synchronous ref lock to prevent duplicate clicks
  const [isPending, setIsPending] = useState(false);
  const isPendingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Status for testing
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // Short-lived notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);

  const [faceUnlockEnabled, setFaceUnlockEnabled] = useState(Boolean(securitySettings.faceUnlockEnabled));

  // Setup Wizard States
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3 | 'success' | 'failure'>(1);
  const [setupError, setSetupError] = useState<string | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isUnavailable = isSupported === false || isInIframe;
  const hasRegisteredDevices = (securitySettings.registeredDevices?.length ?? 0) > 0;
  const isActive = faceUnlockEnabled || hasRegisteredDevices;

  const handleStartSetup = () => {
    setSetupStep(1);
    setSetupError(null);
    setShowSetupWizard(true);
  };

  const handleExecuteRegistration = async () => {
    setSetupStep(3);
    setSetupError(null);
    const cleanUid = currentUser?.uid || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
    const cleanEmail = currentUser?.email || localStorage.getItem('lastAuthUserEmail') || 'user@smartledgerx.io';
    
    try {
      const result = await registerBiometricCredential(cleanUid, cleanEmail, currentUser?.displayName || undefined);
      if (result.success && result.serverVerified && result.device) {
        const currentDevices = securitySettings.registeredDevices || [];
        const filtered = currentDevices.filter(d => d.id !== result.device!.id);
        const updatedDevices = [...filtered, result.device];

        updateSecuritySettings({
          registeredDevices: updatedDevices,
          biometricEnabled: true,
          faceUnlockEnabled: true
        });
        setFaceUnlockEnabled(true);
        setSetupStep('success');
      } else {
        setSetupError(result.error || 'Registration was not completed.');
        setSetupStep('failure');
      }
    } catch (err: any) {
      setSetupError(err?.message || 'Registration failed. Please try again.');
      setSetupStep('failure');
    }
  };

  // Clean up stale authentication messages and cancellation flags on mount
  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoToast(null);

    // Remove any stale cancellation states
    try {
      localStorage.removeItem('authCancelledBanner');
      sessionStorage.removeItem('authCancelledBanner');
    } catch {}

    // Verify environment and check support
    const env = verifyWebAuthnEnvironment();
    if (!env.valid) {
      setIsSupported(false);
      setSupportReason(env.error || 'Face Unlock is not supported in this environment.');
      return;
    }

    checkBiometricSupport()
      .then(status => {
        setIsSupported(status.supported);
        if (!status.supported) {
          setSupportReason(status.reason || 'Biometric hardware is not available on this device.');
        }
      })
      .catch(() => {
        setIsSupported(false);
        setSupportReason('Unable to detect biometric hardware.');
      });

    return () => {
      // Abort any ongoing WebAuthn request when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isPendingRef.current = false;
    };
  }, []);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Auto-dismiss short neutral toast (e.g. cancellation)
  useEffect(() => {
    if (infoToast) {
      const timer = setTimeout(() => {
        setInfoToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [infoToast]);

  // Auto-dismiss real system error after 5s
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  /**
   * Toggles Face Unlock.
   * Started only from a direct user click.
   */
  const handleToggleFaceUnlock = async (enabled: boolean) => {
    // Synchronous lock check
    if (isPendingRef.current) return;
    isPendingRef.current = true;
    setIsPending(true);

    // Clear any previous authentication messages immediately
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoToast(null);

    // STEP 1 — INSTRUMENT
    console.log("[FU] stage: start", { 
      origin: window.location.origin, 
      host: window.location.hostname, 
      secure: window.isSecureContext, 
      inIframe: window.self !== window.top, 
      hasWebAuthn: !!window.PublicKeyCredential 
    });
    try {
      console.log("[FU] stage: platform authenticator available", await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.());
    } catch (e) {
      console.log("[FU] stage: platform authenticator check failed", e);
    }

    // If turning off
    if (!enabled) {
      try {
        updateSecuritySettings({ faceUnlockEnabled: false });
        setFaceUnlockEnabled(false);
        localStorage.removeItem('faceUnlockEnabled');
        if (currentUser?.uid) {
          localStorage.removeItem(`faceUnlockEnabled_${currentUser.uid}`);
        }
        setSuccessMsg("Face Unlock disabled");
      } finally {
        isPendingRef.current = false;
        setIsPending(false);
      }
      return;
    }

    // Check support before opening prompt
    const env = verifyWebAuthnEnvironment();
    if (!env.valid) {
      setErrorMsg(env.error || "This device or browser does not support Face Unlock.");
      isPendingRef.current = false;
      setIsPending(false);
      return;
    }

    // Abort and clean up any prior request before starting another
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const cleanUid = currentUser?.uid || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
      const cleanEmail = currentUser?.email || localStorage.getItem('lastAuthUserEmail') || 'user@smartledgerx.io';
      
      const result = await registerBiometricCredential(
        cleanUid,
        cleanEmail,
        currentUser?.displayName || undefined,
        controller.signal
      );

      // User cancelled dialog or timed out -> silently return UI to idle state (no persistent banner!)
      if (result.isUserCancelled || result.errorType === 'NotAllowedError' || result.errorType === 'AbortError') {
        setErrorMsg(null);
        setInfoToast("Face Unlock was not completed");
        return;
      }

      // Check for InvalidStateError: credential might already be registered
      if (result.errorType === 'InvalidStateError') {
        setErrorMsg("This biometric authenticator is already registered on this device.");
        return;
      }

      // Non-cancellation errors
      if (!result.success || !result.serverVerified || !result.device) {
        if (result.errorType === 'NotSupportedError') {
          setErrorMsg("This device or browser does not support Face Unlock.");
        } else if (result.errorType === 'SecurityError') {
          setErrorMsg("Face Unlock requires HTTPS or localhost.");
        } else if (result.error) {
          setErrorMsg(result.error);
        }
        return;
      }

      // Registration successfully verified by server:
      // Show "Face Unlock enabled", refresh authenticators list, remove empty state
      const currentDevices = securitySettings.registeredDevices || [];
      const filtered = currentDevices.filter(d => d.id !== result.device!.id);
      const updatedDevices = [...filtered, result.device];

      updateSecuritySettings({
        faceUnlockEnabled: true,
        biometricEnabled: true,
        registeredDevices: updatedDevices
      });
      setFaceUnlockEnabled(true);

      try {
        localStorage.setItem('faceUnlockEnabled', 'true');
        localStorage.setItem(`faceUnlockEnabled_${cleanUid}`, 'true');
        localStorage.setItem('lastAuthUserId', cleanUid);
      } catch {}

      setErrorMsg(null);
      setInfoToast(null);
      setSuccessMsg("Face Unlock enabled");
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        setErrorMsg(null);
        setInfoToast("Face Unlock was not completed");
      } else if (error?.name === 'NotSupportedError') {
        setErrorMsg("This device or browser does not support Face Unlock.");
      } else if (error?.name === 'SecurityError') {
        setErrorMsg("Face Unlock requires HTTPS or localhost.");
      } else if (error?.name === 'InvalidStateError') {
        setErrorMsg("This biometric authenticator is already registered on this device.");
      } else {
        setErrorMsg(error?.message || "Failed to enable Face Unlock. Please try again.");
      }
    } finally {
      // Always reset loading state and the synchronous lock inside finally
      isPendingRef.current = false;
      setIsPending(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Explicitly registers another device authenticator on button click.
   */
  const handleRegisterDevice = async () => {
    if (isPendingRef.current) return;
    isPendingRef.current = true;
    setIsPending(true);

    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoToast(null);

    const env = verifyWebAuthnEnvironment();
    if (!env.valid) {
      setErrorMsg(env.error || "This device or browser does not support Face Unlock.");
      isPendingRef.current = false;
      setIsPending(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const cleanUid = currentUser?.uid || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
      const cleanEmail = currentUser?.email || localStorage.getItem('lastAuthUserEmail') || 'user@smartledgerx.io';
      
      const result = await registerBiometricCredential(
        cleanUid,
        cleanEmail,
        currentUser?.displayName || undefined,
        controller.signal
      );

      if (result.isUserCancelled || result.errorType === 'NotAllowedError' || result.errorType === 'AbortError') {
        setErrorMsg(null);
        setInfoToast("Face Unlock was not completed");
        return;
      }

      if (result.errorType === 'InvalidStateError') {
        setErrorMsg("This biometric authenticator is already registered on this device.");
        return;
      }

      if (!result.success || !result.serverVerified || !result.device) {
        if (result.errorType === 'NotSupportedError') {
          setErrorMsg("This device or browser does not support Face Unlock.");
        } else if (result.errorType === 'SecurityError') {
          setErrorMsg("Face Unlock requires HTTPS or localhost.");
        } else if (result.error) {
          setErrorMsg(result.error);
        }
        return;
      }

      const currentDevices = securitySettings.registeredDevices || [];
      const filtered = currentDevices.filter(d => d.id !== result.device!.id);
      const updatedDevices = [...filtered, result.device];

      updateSecuritySettings({
        registeredDevices: updatedDevices,
        biometricEnabled: true,
        faceUnlockEnabled: true
      });
      setFaceUnlockEnabled(true);

      setErrorMsg(null);
      setInfoToast(null);
      setSuccessMsg("Face Unlock enabled");
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        setErrorMsg(null);
        setInfoToast("Face Unlock was not completed");
      } else {
        setErrorMsg(error?.message || "Registration failed. Please try again.");
      }
    } finally {
      isPendingRef.current = false;
      setIsPending(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Tests biometric authentication on direct button click.
   */
  const handleTest = async () => {
    if (isPendingRef.current) return;
    isPendingRef.current = true;
    setIsPending(true);

    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoToast(null);

    const registeredList = securitySettings.registeredDevices || [];
    if (registeredList.length === 0) {
      setErrorMsg(null);
      setInfoToast("No biometric device registered. Click Enable Face Unlock to register.");
      isPendingRef.current = false;
      setIsPending(false);
      return;
    }

    const env = verifyWebAuthnEnvironment();
    if (!env.valid) {
      setErrorMsg(env.error || "This device or browser does not support Face Unlock.");
      isPendingRef.current = false;
      setIsPending(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTestStatus('testing');

    try {
      const cleanUid = currentUser?.uid || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
      const result = await authenticateWithBiometrics(cleanUid, registeredList, controller.signal);

      if (result.success) {
        setTestStatus('success');
        if (result.deviceId) {
          const updatedDevices = registeredList.map(d => 
            d.id === result.deviceId ? { ...d, lastUsedAt: new Date().toISOString() } : d
          );
          updateSecuritySettings({ registeredDevices: updatedDevices });
        }
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        // User cancellation or abort -> silently reset without red error banner
        if (result.isUserCancelled || result.errorType === 'NotAllowedError' || result.errorType === 'AbortError') {
          setTestStatus('idle');
          setInfoToast("Face Unlock was not completed");
        } else if (result.errorType === 'TimeoutError') {
          setTestStatus('idle');
          setInfoToast("Biometric verification timed out");
        } else {
          setTestStatus('failed');
          setErrorMsg(result.error || "Biometric verification failed.");
          setTimeout(() => setTestStatus('idle'), 3500);
        }
      }
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        setTestStatus('idle');
        setInfoToast("Face Unlock was not completed");
      } else {
        setTestStatus('failed');
        setErrorMsg(error?.message || "Biometric verification failed.");
        setTimeout(() => setTestStatus('idle'), 3500);
      }
    } finally {
      isPendingRef.current = false;
      setIsPending(false);
      abortControllerRef.current = null;
    }
  };

  const removeDevice = (id: string) => {
    const updated = (securitySettings.registeredDevices || []).filter(d => d.id !== id);
    const hasRemaining = updated.length > 0;
    updateSecuritySettings({ 
      registeredDevices: updated,
      biometricEnabled: hasRemaining ? securitySettings.biometricEnabled : false,
      faceUnlockEnabled: hasRemaining ? securitySettings.faceUnlockEnabled : false
    });
    if (!hasRemaining) {
      setFaceUnlockEnabled(false);
      try {
        localStorage.removeItem('faceUnlockEnabled');
      } catch {}
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4">
      {/* Running in Iframe Preview Notification with direct link to launch in dedicated tab */}
      {typeof window !== 'undefined' && window.self !== window.top && (
        <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-200 text-xs">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Info size={18} className="shrink-0 text-indigo-400 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Running in Embedded Preview</p>
              <p className="text-indigo-300/80 mt-0.5 break-words">
                Browsers enforce Permissions Policy that blocks Face ID / Touch ID / Windows Hello inside embedded iframes. Open SmartLedgerX in a full browser tab to use biometric passkeys.
              </p>
            </div>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-sm"
          >
            <span>Open in Dedicated Tab ↗</span>
          </a>
        </div>
      )}

      {/* Biometrics Unavailable Banner */}
      {isSupported === false && (
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3 text-amber-300 text-xs">
          <Fingerprint size={16} className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Biometrics Unavailable</p>
            <p className="text-amber-300/80 mt-0.5 break-words">
              {supportReason || 'This device or browser does not support WebAuthn biometric sensors.'}
            </p>
          </div>
        </div>
      )}

      {/* Enable Face Unlock Card - Fully Responsive, no overflow */}
      <div className="w-full min-w-0 p-4 sm:p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 sm:mt-0">
              <ScanFace size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white text-sm">Face Unlock</span>
                {faceUnlockEnabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Active ✅
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 break-words">
                {isSupported === false 
                  ? 'Biometric authentication is not supported on this device/browser' 
                  : 'Native Face ID, Touch ID, or Windows Hello passkey unlock'}
              </p>
            </div>
          </div>
          
          {isSupported !== false && (
            <div className="w-full sm:w-auto shrink-0 flex justify-end sm:justify-start">
              {isInIframe ? (
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                  Unavailable In Iframe
                </span>
              ) : !isActive ? (
                <button
                  type="button"
                  onClick={handleStartSetup}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm border border-transparent flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Set Up Face Unlock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleFaceUnlock(!faceUnlockEnabled)}
                  disabled={isPending}
                  className={cn(
                    "w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold transition-all border shadow-sm flex items-center justify-center gap-2 whitespace-nowrap",
                    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30",
                    isPending && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isPending ? (
                    <span className="animate-pulse">Configuring...</span>
                  ) : (
                    <>Enabled ✅ (Turn Off)</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Biometric & Passkeys Toggle Card */}
      <div className="w-full min-w-0 p-4 sm:p-5 rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 sm:mt-0">
              <Key size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-sm">Biometric & Passkeys</p>
              <p className="text-xs text-slate-400 mt-1 break-words">
                {isSupported === false 
                  ? 'Not supported on this device/browser' 
                  : 'Fast session unlock with your device passkey'}
              </p>
            </div>
          </div>
          
          {isSupported !== false && (
            <div className="w-full sm:w-auto shrink-0 flex justify-end sm:justify-start">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !securitySettings.biometricEnabled;
                  updateSecuritySettings({ biometricEnabled: nextVal });
                }}
                disabled={isPending || (securitySettings.registeredDevices?.length ?? 0) === 0}
                className={cn(
                  "w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold transition-colors border whitespace-nowrap",
                  securitySettings.biometricEnabled 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20",
                  ((securitySettings.registeredDevices?.length ?? 0) === 0 || isPending) && "opacity-50 cursor-not-allowed"
                )}
              >
                {securitySettings.biometricEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Short neutral toast: disappears automatically after 2.5s */}
      {infoToast && (
        <div className="p-3 bg-neutral-800/80 border border-white/10 rounded-xl flex items-center gap-2.5 text-slate-300 text-xs shadow-lg animate-in fade-in duration-200">
          <Info size={15} className="shrink-0 text-slate-400" />
          <p className="font-medium break-words">{infoToast}</p>
        </div>
      )}

      {/* Real system error (e.g. security context or hardware failure) */}
      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
          <XCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium break-words">{errorMsg}</p>
            {errorMsg.includes('iframe') && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 underline font-semibold text-xs"
              >
                Launch in Dedicated Browser Tab ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Success Notification: "Face Unlock enabled" */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs shadow-lg">
          <CheckCircle2 size={16} className="shrink-0" />
          <p className="font-medium break-words">{successMsg}</p>
        </div>
      )}

      {/* Registered Authenticators List */}
      {isSupported !== false && (
        <div className="w-full min-w-0 p-4 sm:p-5 rounded-2xl border border-white/5 bg-black/10 space-y-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-300">Registered Authenticators</h3>
            <button
              type="button"
              onClick={handleRegisterDevice}
              disabled={isPending}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-semibold self-start sm:self-auto",
                isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <span className="animate-pulse">Registering...</span>
              ) : (
                <>
                  <Plus size={14} /> Register Device
                </>
              )}
            </button>
          </div>

          {(securitySettings.registeredDevices?.length ?? 0) === 0 ? (
            <div className="text-center py-6 px-4 text-slate-500 text-xs sm:text-sm border border-dashed border-white/5 rounded-xl break-words">
              No biometric device registered.<br/>
              Click "Enable Face Unlock" above to register this device.
            </div>
          ) : (
            <div className="space-y-2">
              {securitySettings.registeredDevices?.map(device => (
                <div key={device.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Laptop size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{device.name || getDeviceBiometricName()}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {device.lastUsedAt 
                          ? `Last used: ${formatDateTime(device.lastUsedAt, generalSettings?.timezone)}` 
                          : `Added: ${formatDateTime(device.addedAt, generalSettings?.timezone)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDevice(device.id)}
                    disabled={isPending}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    title="Remove device"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(securitySettings.registeredDevices?.length ?? 0) > 0 && (
            <div className="pt-3 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={handleTest}
                disabled={isPending}
                className={cn(
                  "w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                  testStatus === 'idle' && "bg-white/10 text-white hover:bg-white/20",
                  testStatus === 'testing' && "bg-white/5 text-slate-400 cursor-not-allowed",
                  testStatus === 'success' && "bg-emerald-500/20 text-emerald-400",
                  testStatus === 'failed' && "bg-red-500/20 text-red-400",
                  isPending && testStatus !== 'testing' && "opacity-50 cursor-not-allowed"
                )}
              >
                {testStatus === 'idle' && 'Test Face / Biometric Unlock'}
                {testStatus === 'testing' && <span className="animate-pulse">Checking biometric verification...</span>}
                {testStatus === 'success' && <><CheckCircle2 size={16} /> Biometric Verified</>}
                {testStatus === 'failed' && <><XCircle size={16} /> Test Failed</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Face Unlock Setup Wizard Modal */}
      <FaceUnlockSetupModal
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onSuccess={(device?: any) => {
          setFaceUnlockEnabled(true);
          if (device) {
            const currentDevices = securitySettings.registeredDevices || [];
            const filtered = currentDevices.filter(d => d.id !== device.id);
            updateSecuritySettings({
              faceUnlockEnabled: true,
              biometricEnabled: true,
              registeredDevices: [...filtered, device]
            });
          } else {
            updateSecuritySettings({
              faceUnlockEnabled: true,
              biometricEnabled: true
            });
          }
          setSuccessMsg("✓ Face Unlock is turned on");
        }}
        userId={currentUser?.uid}
        userEmail={currentUser?.email}
        userDisplayName={currentUser?.displayName || undefined}
      />
    </div>
  );
}
