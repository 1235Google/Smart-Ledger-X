import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Fingerprint, ScanFace, XCircle, Delete, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { startAuthentication } from '@simplewebauthn/browser';
import { createNotification } from '../lib/notificationService';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { securitySettings, updateSecuritySettings, unlockApp } = useStore();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const [showBiometric, setShowBiometric] = useState(securitySettings.biometricEnabled);
  const [isBiometricSupported, setIsBiometricSupported] = useState(true);
  const [biometricError, setBiometricError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const pinLength = 4;
  
  const [isCreatingPin, setIsCreatingPin] = useState(securitySettings.pinEnabled && !securitySettings.pin);
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCreatePin = () => {
    if (pinInput.length !== pinLength) return;
    
    if (!showConfirm) {
        setShowConfirm(true);
        setPinInput('');
    } else {
        if (pinInput === confirmPinInput) {
            const hashedPin = CryptoJS.SHA256(pinInput).toString();
            updateSecuritySettings({ pin: hashedPin, pinEnabled: true });
            onUnlock();
        } else {
            setError(true);
            setPinInput('');
            setConfirmPinInput('');
            setShowConfirm(false);
            setErrorMsg('PINs do not match');
        }
    }
  };
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (securitySettings.pinEnabled && !showBiometric) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [securitySettings.pinEnabled, showBiometric]);

  useEffect(() => {
    let timer: any;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime(prev => prev - 1);
      }, 1000);
    } else if (lockoutTime === 0 && failedAttempts >= 5) {
      setFailedAttempts(0); // reset after lockout
    }
    return () => clearInterval(timer);
  }, [lockoutTime, failedAttempts]);

  useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricSupported(available);
          // Only auto-trigger if we have devices and aren't already authenticating/errored
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
        onUnlock();
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
    if (lockoutTime > 0 || pinToVerify.length !== pinLength) return;

    const success = unlockApp(pinToVerify);
    if (success) {
      setFailedAttempts(0);
      setIsUnlocking(true);
      setTimeout(onUnlock, 400);
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setError(true);
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
  };

  const handlePinInput = (digit: string) => {
    if (lockoutTime > 0) return;
    
    if (pinInput.length < pinLength) {
      const newVal = pinInput + digit;
      setPinInput(newVal);
      setError(false);
      inputRef.current?.focus();
      if (newVal.length === pinLength) {
        verifyAndUnlock(newVal);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lockoutTime > 0) return;
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= pinLength) {
      setPinInput(val);
      setError(false);
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
    } else if (e.key === 'Delete') {
      setPinInput('');
    }
  };

  const handleUnlockClick = () => {
    verifyAndUnlock(pinInput);
  };

  const handleDelete = () => {
    if (lockoutTime > 0) return;
    setPinInput(prev => prev.slice(0, -1));
    setError(false);
    inputRef.current?.focus();
  };

  if (showBiometric) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0a0b10] flex flex-col items-center justify-center p-6"
      >
        <div className="flex flex-col items-center max-w-sm w-full">
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
            {securitySettings.faceUnlockEnabled ? <ScanFace size={40} /> : <Fingerprint size={40} />}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {securitySettings.faceUnlockEnabled ? 'Face Authentication' : 'Fingerprint Unlock'}
          </h2>
          <p className="text-slate-400 mb-12 text-center text-sm">
            {isAuthenticating ? 'Waiting for authentication...' : (isBiometricSupported ? 'Ready to authenticate' : 'Not Supported')}
          </p>
          
          {biometricError && (
             <p className="text-red-400 mb-4 text-sm font-semibold flex items-center gap-1">
               <XCircle size={16} /> {errorMsg || 'Authentication Failed'}
             </p>
          )}

          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={handleBiometricAuth}
              disabled={!isBiometricSupported || isAuthenticating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? 'Authenticating...' : 'Unlock with Biometrics'}
            </button>
            {!isBiometricSupported && (
              <p className="text-red-400 text-xs text-center font-semibold mt-[-8px]">
                Biometric authentication is not supported on this device.
              </p>
            )}
            <button 
              onClick={() => setShowBiometric(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all"
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
      initial={{ opacity: 1 }}
      animate={{ scale: isUnlocking ? 1.2 : 1, opacity: isUnlocking ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 bg-[#0a0b10] flex flex-col items-center justify-center p-6"
    >
      <div className="flex flex-col items-center max-w-sm w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            SmartLedger
          </span>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome Back
        </h2>
        <p className="text-slate-400 mb-8 text-sm text-center">
          {securitySettings.pinEnabled ? 'Enter your PIN to access your account' : 'Security lock active. Click below to enter.'}
        </p>
        
        {securitySettings.pinEnabled && (
          <div className="w-full mb-8 relative" onClick={() => inputRef.current?.focus()}>
            <input
              ref={inputRef}
              type="text"
              inputMode="none"
              value={pinInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer text-transparent caret-transparent"
              aria-label="Enter PIN"
              autoComplete="off"
              maxLength={pinLength}
            />
            <div className="flex justify-center gap-3">
              {Array.from({ length: pinLength }).map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-12 h-14 rounded-xl border flex items-center justify-center text-2xl font-bold transition-all duration-300 relative overflow-hidden",
                    i < pinInput.length 
                      ? "bg-white/10 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                      : "bg-black/20 border-white/10 text-transparent",
                    i === pinInput.length && !error && "border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] bg-white/5",
                    error && "border-red-500 bg-red-500/10 text-red-500"
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {i < pinInput.length && (
                      <motion.span
                        key={`pin-${i}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {showPin ? pinInput[i] : '•'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            {pinInput.length > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPin(!showPin); inputRef.current?.focus(); }} 
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-10 text-slate-400 hover:text-white transition-colors z-20"
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
          </div>
        )}
        
        <div className="h-6 mb-4 flex items-center justify-center w-full">
          {lockoutTime > 0 ? (
            <p className="text-red-400 text-sm font-semibold flex items-center gap-1">
              <Lock size={16} /> Try again in {lockoutTime}s
            </p>
          ) : error ? (
            <p className="text-red-400 text-sm font-semibold flex items-center gap-1">
              <XCircle size={16} /> Incorrect PIN. Please try again.
            </p>
          ) : null}
        </div>

        {securitySettings.pinEnabled && (
          <div className="w-full">
            <div className="grid grid-cols-3 gap-y-4 gap-x-6 w-full mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  disabled={lockoutTime > 0}
                  onClick={() => handlePinInput(num.toString())}
                  className="w-16 h-16 flex items-center justify-center text-2xl font-semibold text-white bg-black/20 hover:bg-white/10 rounded-2xl transition-all disabled:opacity-50 mx-auto"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                disabled={lockoutTime > 0}
                onClick={() => handlePinInput('0')}
                className="w-16 h-16 flex items-center justify-center text-2xl font-semibold text-white bg-black/20 hover:bg-white/10 rounded-2xl transition-all disabled:opacity-50 mx-auto"
              >
                0
              </button>
              <button
                disabled={lockoutTime > 0 || pinInput.length === 0}
                onClick={handleDelete}
                className="w-16 h-16 flex items-center justify-center text-neutral-400 bg-black/20 hover:bg-white/10 rounded-2xl transition-all disabled:opacity-50 mx-auto"
              >
                <Delete size={24} />
              </button>
            </div>
            
            <button
              disabled={pinInput.length !== pinLength || lockoutTime > 0}
              onClick={handleUnlockClick}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:grayscale text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/25"
            >
              Unlock App
            </button>
          </div>
        )}

        {!securitySettings.pinEnabled && (
          <button
            onClick={onUnlock}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 mt-4"
          >
            Unlock App
          </button>
        )}
      </div>
    </motion.div>
  );
}

