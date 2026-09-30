import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScanFace, 
  Lock, 
  KeyRound, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  Fingerprint
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { authenticateWithBiometrics, checkBiometricSupport, getDeviceBiometricName } from '../lib/webauthnService';

export interface FaceUnlockProps {
  onUnlock: () => void;
  onCancel?: () => void;
  onUsePin?: () => void;
  onFallbackToPin?: (reason?: string) => void;
  embedded?: boolean;
  title?: string;
  matchThreshold?: number;
}

// SHA-256 hash helper for standalone PIN fallback security
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function FaceUnlock({
  onUnlock,
  onCancel,
  onUsePin,
  onFallbackToPin,
  embedded = false,
  title = "Face Unlock",
}: FaceUnlockProps) {
  const { currentUser, securitySettings } = useStore();
  const isMountedRef = useRef<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthenticatingRef = useRef<boolean>(false);
  const hasAutoPromptedRef = useRef<boolean>(false);

  // Core biometric authentication states
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [statusText, setStatusText] = useState<string>("Checking biometric authentication...");
  const [isMatch, setIsMatch] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Standalone PIN Fallback States (when used in standalone Vault modal)
  const [showPinFallback, setShowPinFallback] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [shake, setShake] = useState<boolean>(false);

  // Trigger brief haptic buzz if supported
  const triggerHaptic = (success = true) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(success ? [25, 35, 25] : [50, 40, 50]);
      }
    } catch {}
  };

  const triggerFallback = useCallback((reason: string) => {
    if (onFallbackToPin) {
      onFallbackToPin(reason);
    } else if (onUsePin) {
      onUsePin();
    } else {
      setShowPinFallback(true);
    }
  }, [onFallbackToPin, onUsePin]);

  /**
   * Main WebAuthn Biometric Verification Handler
   */
  const handlePerformBiometrics = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (isAuthenticatingRef.current) {
      return;
    }
    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);
    setStatusText("Checking biometric authentication...");

    // Check device support first
    const support = await checkBiometricSupport();
    if (!support.supported) {
      if (isMountedRef.current) {
        setIsSupported(false);
        setIsAuthenticating(false);
        setAuthError(support.reason || "This device does not support Face Unlock.");
        setStatusText("This device does not support Face Unlock.");
      }
      isAuthenticatingRef.current = false;
      return;
    }

    try {
      const resolvedUserId = currentUser?.uid || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
      const result = await authenticateWithBiometrics(
        resolvedUserId,
        securitySettings.registeredDevices || []
      );

      if (!isMountedRef.current) return;

      if (result.success) {
        setIsMatch(true);
        setIsAuthenticating(false);
        setStatusText("Identity confirmed ✅");
        triggerHaptic(true);

        try {
          sessionStorage.setItem('isUnlocked', 'true');
        } catch {}

        timerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            onUnlock();
          }
        }, 500);
      } else {
        setIsAuthenticating(false);
        const errMsg = result.error || "Authentication cancelled.";
        setAuthError(errMsg);
        if (errMsg.includes("timed out")) {
          setStatusText("Biometric verification timed out. Try again.");
        } else if (errMsg.includes("cancelled")) {
          setStatusText("Authentication cancelled.");
        } else if (errMsg.includes("support")) {
          setStatusText("This device does not support Face Unlock.");
        } else {
          setStatusText(errMsg);
        }
        triggerHaptic(false);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setIsAuthenticating(false);
        const errMsg = err?.message || "Please set up Face Unlock again.";
        setAuthError(errMsg);
        setStatusText("Verification failed");
      }
    } finally {
      isAuthenticatingRef.current = false;
      if (isMountedRef.current) {
        setIsAuthenticating(false);
      }
    }
  }, [currentUser?.uid, securitySettings.registeredDevices, onUnlock]);

  // Only clean up on unmount. Do NOT call WebAuthn inside useEffect or on page load.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Standalone PIN Submit Handler
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinError("Please enter a 4-digit PIN");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      const enteredHash = await sha256(pinInput);
      const storedPinHash = localStorage.getItem('vaultPinHash') || (await sha256('1234'));

      if (enteredHash === storedPinHash) {
        setPinError(null);
        try {
          sessionStorage.setItem('isUnlocked', 'true');
        } catch {}
        setTimeout(onUnlock, 400);
      } else {
        setPinError("Incorrect PIN. Please try again.");
        setPinInput('');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setPinError("Verification error");
    }
  };

  // ==========================================================================
  // VIEW: EMBEDDED MODE (Inside Parent LockScreen Card)
  // ==========================================================================
  if (embedded) {
    return (
      <div className="w-full flex flex-col items-center select-none font-sans">
        {/* Header Icon Container */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 26, delay: 0.05 }}
          className="flex flex-col items-center mb-4"
        >
          <div className="relative mb-3.5 group">
            <div className={cn(
              "absolute -inset-2 rounded-[28px] blur-md pointer-events-none transition-all duration-300",
              isMatch ? "bg-emerald-500/30" : authError ? "bg-red-500/20" : "bg-[#a8c7fa]/25 group-hover:bg-[#a8c7fa]/35"
            )} />
            <div className={cn(
              "relative w-20 h-20 border rounded-[26px] flex items-center justify-center shadow-xl transition-all duration-300",
              isMatch 
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                : authError
                ? "bg-red-950/40 border-red-500/50 text-red-300"
                : "bg-[#252830] border-[#3a3d47] text-[#a8c7fa]"
            )}>
              {isMatch ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              ) : (
                <ScanFace className={cn(
                  "w-10 h-10 transition-transform duration-300",
                  isAuthenticating && "animate-pulse scale-105"
                )} />
              )}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#e2e2e9] text-center">
            {title}
          </h1>
          <p className="text-[#90909a] text-xs sm:text-sm mt-1.5 text-center font-medium max-w-[280px]">
            {isMatch 
              ? "Identity confirmed. Unlocking..."
              : isAuthenticating 
              ? "Checking biometric authentication..."
              : authError 
              ? authError
              : "Face ID / Windows Hello biometric verification"}
          </p>

          {/* Encrypted Session Pill */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#24262c] text-[#a5a7b0] text-[11px] font-medium border border-[#32353c]">
            <Clock size={12} className="text-[#a8c7fa]" />
            <span>Encrypted Session • {getDeviceBiometricName()}</span>
          </div>
        </motion.div>

        {/* Biometric Status Visualizer */}
        <div className="w-full flex flex-col items-center my-3">
          <div className={cn(
            "w-full p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center text-center",
            isMatch 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
              : isAuthenticating 
              ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
              : authError
              ? "bg-red-500/10 border-red-500/25 text-red-300"
              : "bg-[#181920] border-[#2d2f36] text-slate-300"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {isAuthenticating ? (
                <RefreshCw size={16} className="animate-spin text-[#a8c7fa]" />
              ) : isMatch ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={16} className="text-amber-400" />
              )}
              <span className="text-sm font-semibold">{statusText}</span>
            </div>
            
            {isAuthenticating && (
              <p className="text-xs text-slate-400 mt-1">
                Touch your biometric sensor or glance at camera to continue
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5 mt-2">
          {!isMatch && (
            <>
              <button
                type="button"
                onClick={handlePerformBiometrics}
                disabled={isAuthenticating}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ScanFace size={16} />
                <span>{isAuthenticating ? "Verifying..." : authError ? "Try Face Unlock Again" : "Unlock with Face ID / Biometrics"}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerFallback("Switched to PIN code")}
                className="w-full py-3 rounded-2xl bg-[#252830] hover:bg-[#31343d] text-[#e2e2e9] font-medium text-sm transition-colors border border-[#343740] flex items-center justify-center gap-2"
              >
                <KeyRound size={16} className="text-[#a8c7fa]" />
                <span>Use PIN Code Instead</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW: STANDALONE MODAL (When opened full-screen or inside Vault)
  // ==========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="vision-glass-elevated max-w-sm w-full rounded-3xl p-6 sm:p-8 flex flex-col items-center relative border border-white/10 shadow-2xl overflow-hidden"
      >
        <button
          onClick={onCancel || (() => window.history.back())}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        {showPinFallback ? (
          <form onSubmit={handlePinSubmit} className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <KeyRound size={28} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Enter Security PIN</h2>
            <p className="text-xs text-slate-400 mb-6 text-center">
              Enter your PIN to access {title}
            </p>

            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              autoFocus
              className={cn(
                "w-48 text-center text-2xl tracking-[0.5em] py-3 px-4 rounded-xl bg-black/50 border text-white font-mono focus:outline-none transition-all",
                pinError ? "border-red-500/60 ring-2 ring-red-500/20" : "border-white/15 focus:border-indigo-400"
              )}
            />

            {pinError && (
              <p className="text-xs text-red-400 mt-2">{pinError}</p>
            )}

            <div className="w-full flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPinFallback(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Use Face Unlock
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25"
              >
                Unlock
              </button>
            </div>
          </form>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className={cn(
              "w-20 h-20 rounded-3xl border flex items-center justify-center mb-4 transition-all duration-300",
              isMatch 
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
            )}>
              {isMatch ? (
                <CheckCircle2 size={36} className="text-emerald-400" />
              ) : (
                <ScanFace size={36} className={cn(isAuthenticating && "animate-pulse")} />
              )}
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
            <p className="text-xs text-slate-400 mb-6 text-center">
              {isMatch 
                ? "Verified. Opening..." 
                : isAuthenticating 
                ? "Checking biometric authentication..." 
                : authError || "Position your face or touch sensor to unlock"}
            </p>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handlePerformBiometrics}
                disabled={isAuthenticating}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                <ScanFace size={16} />
                <span>{isAuthenticating ? "Verifying..." : authError ? "Try Face Unlock Again" : "Unlock with Face ID / Biometrics"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPinFallback(true)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-white/10"
              >
                <KeyRound size={16} className="text-indigo-400" />
                <span>Use PIN Instead</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
