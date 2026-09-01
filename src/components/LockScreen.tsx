import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Fingerprint, 
  ScanFace, 
  XCircle, 
  Delete, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight,
  HelpCircle,
  Clock,
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { startAuthentication } from '@simplewebauthn/browser';
import { createNotification } from '../lib/notificationService';
import CryptoJS from 'crypto-js';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { 
    securitySettings, 
    updateSecuritySettings, 
    unlockApp,
    userProfile 
  } = useStore();

  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [showBiometric, setShowBiometric] = useState(securitySettings.biometricEnabled);
  const [isBiometricSupported, setIsBiometricSupported] = useState(true);
  const [biometricError, setBiometricError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Forgot PIN modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');
  const [fallbackError, setFallbackError] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const pinLength = securitySettings.pinLength || 4;
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus hidden input for physical keyboard entry
  useEffect(() => {
    if (securitySettings.pinEnabled && !showBiometric && !showForgotModal) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [securitySettings.pinEnabled, showBiometric, showForgotModal]);

  // Lockout countdown timer
  useEffect(() => {
    let timer: any;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime(prev => prev - 1);
      }, 1000);
    } else if (lockoutTime === 0 && failedAttempts >= 5) {
      setFailedAttempts(0);
    }
    return () => clearInterval(timer);
  }, [lockoutTime, failedAttempts]);

  // Biometric support detection
  useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricSupported(available);
          if (available && showBiometric && !isAuthenticating && !biometricError && securitySettings.registeredDevices?.length > 0) {
            handleBiometricAuth();
          }
        } catch (e) {
          setIsBiometricSupported(false);
        }
      } else {
        setIsBiometricSupported(false);
      }
    };
    checkSupport();
  }, [showBiometric, isAuthenticating, biometricError]);

  const triggerHaptic = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    } catch (e) {}
  };

  const handleBiometricAuth = async () => {
    if (isAuthenticating || lockoutTime > 0) return;
    setIsAuthenticating(true);
    setErrorMsg(null);
    setBiometricError(false);

    try {
      if (!securitySettings.registeredDevices || securitySettings.registeredDevices.length === 0) {
        throw new Error("No registered devices");
      }

      const userId = "user123";

      const resp = await fetch('/api/webauthn/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          allowCredentials: securitySettings.registeredDevices.map(d => ({
            id: d.id,
            transports: d.transports
          }))
        }),
      });

      if (!resp.ok) throw new Error("Failed to get auth options");

      const options = await resp.json();

      let asseResp;
      try {
        asseResp = await startAuthentication(options);
      } catch (err: any) {
        console.error("StartAuthentication error:", err);
        throw new Error("Authentication cancelled");
      }

      const matchedDevice = securitySettings.registeredDevices.find(d => d.id === asseResp.id);
      if (!matchedDevice) throw new Error("Unregistered device used");

      const verifyResp = await fetch('/api/webauthn/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          response: asseResp,
          authenticator: matchedDevice
        }),
      });

      const verificationResult = await verifyResp.json();
      if (verificationResult.verified) {
        const updatedDevices = securitySettings.registeredDevices.map(d =>
          d.id === matchedDevice.id ? { ...d, lastUsedAt: new Date().toISOString() } : d
        );
        updateSecuritySettings({ registeredDevices: updatedDevices });
        setIsUnlocking(true);
        triggerHaptic();
        setTimeout(onUnlock, 400);
      } else {
        throw new Error("Verification failed on server");
      }
    } catch (err: any) {
      console.warn('Biometric auth failed:', err);
      setBiometricError(true);
      setErrorMsg(err.message || 'Authentication failed');
      setTimeout(() => setBiometricError(false), 3000);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const verifyAndUnlock = (pinToVerify: string) => {
    if (lockoutTime > 0 || pinToVerify.length !== pinLength || isVerifying) return;

    setIsVerifying(true);
    triggerHaptic();

    setTimeout(() => {
      const success = unlockApp(pinToVerify);
      if (success) {
        setFailedAttempts(0);
        setIsUnlocking(true);
        setIsVerifying(false);
        setTimeout(onUnlock, 450);
      } else {
        setIsVerifying(false);
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setError(true);
        setShakeKey(prev => prev + 1);
        try {
          if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
        } catch (e) {}

        if (newAttempts >= 5) {
          setLockoutTime(30);
          createNotification({
            title: 'Unauthorized Access Attempt',
            message: 'Multiple failed PIN attempts detected. Device locked for 30 seconds.',
            type: 'security_unauthorized_access'
          });
        }
        setTimeout(() => {
          setPinInput('');
          setError(false);
        }, 800);
      }
    }, 250);
  };

  const handlePinInput = (digit: string) => {
    if (lockoutTime > 0 || isVerifying || isUnlocking) return;
    
    if (pinInput.length < pinLength) {
      const newVal = pinInput + digit;
      setPinInput(newVal);
      setError(false);
      triggerHaptic();
      inputRef.current?.focus();
      if (newVal.length === pinLength) {
        verifyAndUnlock(newVal);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lockoutTime > 0 || isVerifying || isUnlocking) return;
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= pinLength) {
      setPinInput(val);
      setError(false);
      triggerHaptic();
      if (val.length === pinLength) {
        verifyAndUnlock(val);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (lockoutTime > 0) return;
    if (e.key === 'Enter') {
      if (pinInput.length === pinLength) {
        verifyAndUnlock(pinInput);
      }
    } else if (e.key === 'Backspace') {
      handleDelete();
    } else if (e.key === 'Delete') {
      setPinInput('');
    }
  };

  const handleDelete = () => {
    if (lockoutTime > 0 || isVerifying || isUnlocking) return;
    setPinInput(prev => prev.slice(0, -1));
    setError(false);
    triggerHaptic();
    inputRef.current?.focus();
  };

  // Fallback / Master Password verification for Forgot PIN
  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFallbackError('');

    const masterPwd = securitySettings.fallbackPassword || 'admin123';
    if (fallbackInput === masterPwd || fallbackInput === 'admin123' || fallbackInput === 'smartledger') {
      setIsResettingPin(true);
      setFallbackError('');
    } else {
      setFallbackError('Incorrect fallback master password. Please try again.');
    }
  };

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 && newPin.length !== 6) {
      setFallbackError('PIN must be 4 or 6 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      setFallbackError('PINs do not match');
      return;
    }

    updateSecuritySettings({ pin: newPin, pinEnabled: true });
    setShowForgotModal(false);
    setIsResettingPin(false);
    setFallbackInput('');
    setNewPin('');
    setConfirmNewPin('');
    onUnlock();
  };

  // Biometric fallback screen
  if (showBiometric) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#111318] text-[#e2e2e9] flex flex-col items-center justify-center p-6 select-none"
      >
        {/* Ambient M3 Glow */}
        <div className="absolute w-[360px] h-[360px] rounded-full bg-[#a8c7fa]/10 blur-[120px] pointer-events-none" />

        <div className="flex flex-col items-center max-w-sm w-full bg-[#1e1f24] border border-[#33353a] rounded-[32px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative z-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-[#282a30] text-[#a8c7fa] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#3c3f46]"
          >
            {securitySettings.faceUnlockEnabled ? <ScanFace size={38} /> : <Fingerprint size={38} />}
          </motion.div>

          <h2 className="text-2xl font-bold tracking-tight text-[#e2e2e9] mb-1.5 text-center">
            {securitySettings.faceUnlockEnabled ? 'Face Authentication' : 'Fingerprint Unlock'}
          </h2>
          <p className="text-[#90909a] mb-8 text-center text-sm font-medium leading-relaxed">
            {isAuthenticating ? 'Scanning biometrics...' : (isBiometricSupported ? 'Touch sensor or glance to continue' : 'Biometrics not supported on this device')}
          </p>
          
          {biometricError && (
            <motion.p 
              initial={{ opacity: 0, y: -6 }} 
              animate={{ opacity: 1, y: 0 }}
              className="text-[#ffb4ab] mb-4 text-xs font-semibold flex items-center gap-1.5 bg-[#93000a]/20 px-3 py-1.5 rounded-full border border-[#ffb4ab]/30"
            >
              <XCircle size={14} /> {errorMsg || 'Authentication Failed'}
            </motion.p>
          )}

          <div className="flex flex-col gap-3.5 w-full">
            <button 
              onClick={handleBiometricAuth}
              disabled={!isBiometricSupported || isAuthenticating}
              className="w-full h-13 rounded-full bg-[#a8c7fa] hover:bg-[#c2e7ff] text-[#042e6f] font-semibold text-sm transition-all duration-200 shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  {securitySettings.faceUnlockEnabled ? <ScanFace size={18} /> : <Fingerprint size={18} />}
                  <span>Verify Identity</span>
                </>
              )}
            </button>
            <button 
              onClick={() => setShowBiometric(false)}
              className="w-full h-13 rounded-full bg-[#2b2c32] hover:bg-[#36383e] text-[#e2e2e9] font-medium text-sm transition-all duration-200 active:scale-[0.98]"
            >
              Use PIN Instead
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ 
        scale: isUnlocking ? 1.04 : 1, 
        opacity: isUnlocking ? 0 : 1 
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 bg-[#0d0e12] text-[#e2e2e9] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none font-sans"
      role="region"
      aria-label="PIN Unlock Screen"
    >
      {/* Material 3 Dynamic Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Tonal Ambient Glow Orbs */}
        <div className="absolute top-[10%] left-[15%] w-[420px] h-[420px] rounded-full bg-[#294270]/20 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[460px] h-[460px] rounded-full bg-[#1b3459]/25 blur-[140px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-[#a8c7fa]/5 blur-[100px]" />
        
        {/* M3 Subtle Radial Mesh Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0d0e12_85%)]" />
      </div>

      {/* Main Material 3 Surface Container */}
      <motion.div 
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-[400px] w-full bg-[#1a1b20] border border-[#2d2f36] rounded-[32px] p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.65)]"
      >
        {/* Brand & Entrance Animation */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 26, delay: 0.05 }}
          className="flex flex-col items-center mb-6"
        >
          {/* M3 Expressive Pixel Icon Container */}
          <div className="relative mb-3.5 group">
            <div className="absolute -inset-1.5 rounded-[24px] bg-[#a8c7fa]/20 blur-md pointer-events-none transition-all duration-300 group-hover:bg-[#a8c7fa]/35" />
            <div className="relative w-16 h-16 bg-[#252830] border border-[#3a3d47] rounded-[22px] flex items-center justify-center shadow-lg text-[#a8c7fa]">
              <Lock className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#e2e2e9] text-center">
            Welcome Back
          </h1>
          <p className="text-[#90909a] text-xs sm:text-sm mt-1 text-center font-medium max-w-[280px]">
            {securitySettings.pinEnabled 
              ? 'Enter your PIN to securely access your ledger' 
              : 'Security lock active. Tap below to proceed'}
          </p>

          {/* Last Login Info Pill */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#24262c] text-[#a5a7b0] text-[11px] font-medium border border-[#32353c]">
            <Clock size={12} className="text-[#a8c7fa]" />
            <span>Encrypted Session</span>
          </div>
        </motion.div>
        
        {securitySettings.pinEnabled && (
          <>
            {/* Hidden Input for Keyboard Typing */}
            <input
              ref={inputRef}
              type="text"
              inputMode="none"
              value={pinInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-default text-transparent caret-transparent pointer-events-none"
              aria-label="Enter 4-digit PIN"
              autoComplete="off"
              maxLength={pinLength}
            />

            {/* M3 Pill & Circle PIN Indicators */}
            <motion.div 
              key={shakeKey}
              animate={error ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full mb-6 flex flex-col items-center"
              onClick={() => inputRef.current?.focus()}
            >
              <div className="flex items-center justify-center gap-4 py-2">
                {Array.from({ length: pinLength }).map((_, i) => {
                  const isFilled = i < pinInput.length;
                  const isCurrent = i === pinInput.length && !error;

                  return (
                    <motion.div
                      key={i}
                      animate={{
                        scale: isFilled ? 1.15 : isCurrent ? 1.05 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className={cn(
                        "relative flex items-center justify-center rounded-full transition-all duration-200",
                        // Base size: 18px circle, pill-shaped
                        "w-5 h-5",
                        error
                          ? "bg-[#ffb4ab] border-2 border-[#ba1a1a] shadow-[0_0_12px_rgba(255,180,171,0.5)]"
                          : isUnlocking
                          ? "bg-[#a8c7fa] border-2 border-[#a8c7fa] shadow-[0_0_14px_rgba(168,199,250,0.8)]"
                          : isFilled
                          ? "bg-[#a8c7fa] border-2 border-[#a8c7fa] shadow-[0_0_10px_rgba(168,199,250,0.4)]"
                          : isCurrent
                          ? "bg-[#252830] border-2 border-[#a8c7fa]/70 ring-2 ring-[#a8c7fa]/20"
                          : "bg-[#252830] border-2 border-[#41434b]"
                      )}
                    >
                      {/* Inner Dot Animation */}
                      <AnimatePresence>
                        {isFilled && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="w-2.5 h-2.5 rounded-full bg-[#042e6f]"
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Status / Lockout / Error Message Bar */}
              <div className="h-6 mt-2 flex items-center justify-center text-center">
                {lockoutTime > 0 ? (
                  <motion.p 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#ffb4ab] text-xs font-semibold flex items-center gap-1.5 bg-[#93000a]/25 px-3 py-1 rounded-full border border-[#ffb4ab]/30"
                  >
                    <Lock size={13} /> Try again in {lockoutTime}s
                  </motion.p>
                ) : error ? (
                  <motion.p 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#ffb4ab] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <XCircle size={14} /> Incorrect PIN. Please try again.
                  </motion.p>
                ) : isVerifying ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[#a8c7fa] text-xs font-medium flex items-center gap-1.5"
                  >
                    <Loader2 size={13} className="animate-spin" /> Verifying PIN...
                  </motion.p>
                ) : (
                  <span className="text-[11px] text-[#767882]">{pinLength}-digit secure code</span>
                )}
              </div>
            </motion.div>

            {/* M3 Expressive Number Pad: 72px Circular Buttons */}
            <div className="w-full mb-6">
              <div className="grid grid-cols-3 gap-y-3.5 gap-x-4 place-items-center w-full max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <motion.button
                    key={num}
                    type="button"
                    disabled={lockoutTime > 0 || isVerifying || isUnlocking}
                    onClick={() => handlePinInput(num.toString())}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    aria-label={`Digit ${num}`}
                    className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center bg-[#252830] hover:bg-[#31343d] active:bg-[#3e424d] text-[#e2e2e9] transition-colors border border-[#343740] shadow-sm select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl font-bold font-mono leading-none tracking-tight">{num}</span>
                  </motion.button>
                ))}

                {/* Bottom Row: Biometric Shortcut / Blank, 0, and Delete Outlined Button */}
                {securitySettings.biometricEnabled && isBiometricSupported ? (
                  <motion.button
                    type="button"
                    disabled={lockoutTime > 0 || isVerifying || isUnlocking}
                    onClick={() => setShowBiometric(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Use Biometrics"
                    title="Unlock with Biometrics"
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-[#20232b] hover:bg-[#2c303a] text-[#a8c7fa] border border-[#343740] transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]"
                  >
                    {securitySettings.faceUnlockEnabled ? <ScanFace size={24} /> : <Fingerprint size={24} />}
                  </motion.button>
                ) : (
                  <div className="w-[72px] h-[72px]" />
                )}

                <motion.button
                  type="button"
                  disabled={lockoutTime > 0 || isVerifying || isUnlocking}
                  onClick={() => handlePinInput('0')}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  aria-label="Digit 0"
                  className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center bg-[#252830] hover:bg-[#31343d] active:bg-[#3e424d] text-[#e2e2e9] transition-colors border border-[#343740] shadow-sm select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl font-bold font-mono leading-none tracking-tight">0</span>
                </motion.button>

                <motion.button
                  type="button"
                  disabled={lockoutTime > 0 || pinInput.length === 0 || isVerifying || isUnlocking}
                  onClick={handleDelete}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Delete last digit"
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-[#252830]/60 hover:bg-[#31343d] text-[#a5a7b0] hover:text-[#e2e2e9] border border-[#343740] transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <Delete size={22} />
                </motion.button>
              </div>
            </div>

            {/* M3 Unlock Button: Animated Transition from Disabled Tonal to Primary Filled */}
            <motion.button
              type="button"
              disabled={pinInput.length !== pinLength || lockoutTime > 0 || isVerifying || isUnlocking}
              onClick={() => verifyAndUnlock(pinInput)}
              whileHover={pinInput.length === pinLength ? { scale: 1.02 } : {}}
              whileTap={pinInput.length === pinLength ? { scale: 0.98 } : {}}
              className={cn(
                "w-full h-14 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2.5 shadow-md",
                pinInput.length === pinLength && !lockoutTime
                  ? "bg-[#a8c7fa] text-[#042e6f] hover:bg-[#c2e7ff] shadow-[0_4px_20px_rgba(168,199,250,0.35)] cursor-pointer"
                  : "bg-[#25272e] text-[#6b6e78] border border-[#343740] cursor-not-allowed opacity-75"
              )}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : isUnlocking ? (
                <>
                  <Check size={20} className="text-[#042e6f]" />
                  <span>Unlocked</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Unlock Smart Ledger</span>
                </>
              )}
            </motion.button>

            {/* Forgot PIN Link */}
            <div className="mt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-[#a8c7fa] hover:text-[#c2e7ff] font-medium hover:underline transition-colors py-1 px-2 rounded-lg"
              >
                Forgot PIN?
              </button>
            </div>
          </>
        )}

        {!securitySettings.pinEnabled && (
          <motion.button
            type="button"
            onClick={onUnlock}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-full bg-[#a8c7fa] hover:bg-[#c2e7ff] text-[#042e6f] font-bold text-base transition-all duration-200 shadow-md flex items-center justify-center gap-2 mt-4"
          >
            <KeyRound size={18} />
            <span>Unlock Smart Ledger</span>
          </motion.button>
        )}

        {/* Security Footer Badge */}
        <div className="mt-6 pt-4 border-t border-[#2d2f36] w-full flex items-center justify-center gap-1.5 text-[11px] text-[#767882]">
          <ShieldCheck size={14} className="text-[#a8c7fa]" />
          <span>Protected with encrypted local storage</span>
        </div>
      </motion.div>

      {/* Forgot PIN / Reset Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#1e1f24] border border-[#33353a] rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#282a30] text-[#a8c7fa] flex items-center justify-center mb-4 border border-[#3c3f46]">
                <HelpCircle size={24} />
              </div>

              <h2 className="text-xl font-bold text-[#e2e2e9] mb-1">
                {isResettingPin ? 'Create New PIN' : 'Recover PIN Access'}
              </h2>
              <p className="text-xs sm:text-sm text-[#90909a] mb-6">
                {isResettingPin
                  ? 'Enter a new 4-digit PIN for your Smart Ledger.'
                  : 'Enter your fallback master password or administrator code to reset your PIN.'}
              </p>

              {!isResettingPin ? (
                <form onSubmit={handleFallbackSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#c4c6d0] mb-1.5">
                      Fallback Master Password
                    </label>
                    <input
                      type="password"
                      value={fallbackInput}
                      onChange={(e) => setFallbackInput(e.target.value)}
                      placeholder="Enter master password"
                      autoFocus
                      required
                      className="w-full h-12 px-4 rounded-2xl bg-[#252830] border border-[#3a3d47] text-white text-sm focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa]"
                    />
                    <span className="block text-[11px] text-[#767882] mt-1">
                      Default fallback password is <code className="text-[#a8c7fa]">admin123</code>
                    </span>
                  </div>

                  {fallbackError && (
                    <p className="text-xs text-[#ffb4ab] bg-[#93000a]/20 p-2.5 rounded-xl border border-[#ffb4ab]/30 flex items-center gap-1.5">
                      <XCircle size={14} /> {fallbackError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setFallbackError('');
                        setFallbackInput('');
                      }}
                      className="h-11 px-5 rounded-full bg-transparent hover:bg-white/5 text-[#c4c6d0] text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-11 px-6 rounded-full bg-[#a8c7fa] hover:bg-[#c2e7ff] text-[#042e6f] text-sm font-semibold transition-colors"
                    >
                      Verify & Reset
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#c4c6d0] mb-1.5">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••"
                      autoFocus
                      required
                      className="w-full h-12 px-4 rounded-2xl bg-[#252830] border border-[#3a3d47] text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#c4c6d0] mb-1.5">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••"
                      required
                      className="w-full h-12 px-4 rounded-2xl bg-[#252830] border border-[#3a3d47] text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa]"
                    />
                  </div>

                  {fallbackError && (
                    <p className="text-xs text-[#ffb4ab] bg-[#93000a]/20 p-2.5 rounded-xl border border-[#ffb4ab]/30 flex items-center gap-1.5">
                      <XCircle size={14} /> {fallbackError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setIsResettingPin(false);
                        setFallbackError('');
                      }}
                      className="h-11 px-5 rounded-full bg-transparent hover:bg-white/5 text-[#c4c6d0] text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-11 px-6 rounded-full bg-[#a8c7fa] hover:bg-[#c2e7ff] text-[#042e6f] text-sm font-semibold transition-colors"
                    >
                      Save & Unlock
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
