import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  X, 
  ShieldCheck, 
  ArrowLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Validates PIN strength to prevent weak or sequential PINs.
 */
function validatePinStrength(pin: string): { isWeak: boolean; reason?: string } {
  if (!/^\d{4}$/.test(pin)) {
    return { isWeak: true, reason: 'PIN must be exactly 4 numeric digits.' };
  }

  // All same digit (e.g. 1111, 0000, 9999)
  if (/^(\d)\1{3}$/.test(pin)) {
    return { isWeak: true, reason: 'Weak PIN: Cannot use repeated digits (e.g., 1111, 0000, 9999).' };
  }

  // Sequential numbers
  const sequentialPatterns = [
    '0123', '1234', '2345', '3456', '4567', '5678', '6789',
    '9876', '8765', '7654', '6543', '5432', '4321', '3210'
  ];
  if (sequentialPatterns.includes(pin)) {
    return { isWeak: true, reason: 'Weak PIN: Cannot use sequential numbers (e.g., 1234, 4321).' };
  }

  // Simple predictable patterns
  const simplePatterns = ['1212', '2121', '1122', '2211', '0011', '1100', '1221', '1010', '0101'];
  if (simplePatterns.includes(pin)) {
    return { isWeak: true, reason: 'Weak PIN: Pattern is too simple. Please choose a more secure combination.' };
  }

  return { isWeak: false };
}

export default function ChangePinModal({ isOpen, onClose }: ChangePinModalProps) {
  const { securitySettings, updateSecuritySettings, addSecurityLog } = useStore();
  
  const hasExistingPin = !!securitySettings.pin;
  const initialStep = hasExistingPin ? 1 : 2;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(hasExistingPin ? 1 : 2);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError(null);
      setShowPinText(false);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, hasExistingPin]);

  // Focus input on step change
  useEffect(() => {
    if (isOpen && step < 4) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step, isOpen]);

  if (!isOpen) return null;

  const currentInputValue = step === 1 ? currentPin : step === 2 ? newPin : confirmPin;

  const handleDigitChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '').slice(0, 4);
    setError(null);

    if (step === 1) {
      setCurrentPin(cleanVal);
      if (cleanVal.length === 4) {
        verifyCurrentPin(cleanVal);
      }
    } else if (step === 2) {
      setNewPin(cleanVal);
      if (cleanVal.length === 4) {
        validateNewPin(cleanVal);
      }
    } else if (step === 3) {
      setConfirmPin(cleanVal);
      if (cleanVal.length === 4) {
        verifyConfirmPin(cleanVal);
      }
    }
  };

  const handleKeyPress = (digit: string) => {
    if (currentInputValue.length < 4) {
      handleDigitChange(currentInputValue + digit);
    }
  };

  const handleBackspace = () => {
    if (currentInputValue.length > 0) {
      handleDigitChange(currentInputValue.slice(0, -1));
    }
  };

  // Step 1: Verify Current PIN
  const verifyCurrentPin = (pinToVerify: string) => {
    if (pinToVerify.length !== 4) {
      setError('Please enter a 4-digit current PIN.');
      return;
    }

    const hashedInput = CryptoJS.SHA256(pinToVerify).toString();
    const storedPin = securitySettings.pin;

    if (storedPin && (storedPin === hashedInput || storedPin === pinToVerify)) {
      setError(null);
      setStep(2);
    } else {
      setError('Current PIN is incorrect.');
      setCurrentPin('');
      addSecurityLog({
        eventType: 'pin_change',
        deviceInfo: 'Current Device',
        location: 'Local Session',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Step 2: Validate New PIN
  const validateNewPin = (pinToValidate: string) => {
    if (pinToValidate.length !== 4) {
      setError('New PIN must be exactly 4 digits.');
      return;
    }

    // Check if same as current PIN
    const hashedNew = CryptoJS.SHA256(pinToValidate).toString();
    if (securitySettings.pin && (securitySettings.pin === hashedNew || securitySettings.pin === pinToValidate || currentPin === pinToValidate)) {
      setError('New PIN cannot be the same as current PIN.');
      setNewPin('');
      return;
    }

    // Weak / Sequential check
    const weakCheck = validatePinStrength(pinToValidate);
    if (weakCheck.isWeak) {
      setError(weakCheck.reason || 'Weak PIN selected.');
      setNewPin('');
      return;
    }

    setError(null);
    setStep(3);
  };

  // Step 3: Confirm & Save New PIN
  const verifyConfirmPin = async (confirmToVerify: string) => {
    if (confirmToVerify.length !== 4) {
      setError('Please enter a 4-digit confirmation PIN.');
      return;
    }

    if (confirmToVerify !== newPin) {
      setError('PIN mismatch. New PIN and Confirmation PIN do not match.');
      setConfirmPin('');
      return;
    }

    setIsSubmitting(true);
    try {
      const hashedPin = CryptoJS.SHA256(newPin).toString();

      // Update PIN in global state (triggers Firestore cloud sync)
      updateSecuritySettings({
        pin: hashedPin,
        pinEnabled: true
      });

      addSecurityLog({
        eventType: 'pin_change',
        deviceInfo: 'Current Device',
        location: 'Local Session',
        timestamp: new Date().toISOString()
      });

      setStep(4);
    } catch (err) {
      setError('Failed to update PIN. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackStep = () => {
    setError(null);
    if (step === 3) {
      setConfirmPin('');
      setStep(2);
    } else if (step === 2 && hasExistingPin) {
      setNewPin('');
      setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100"
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Change Security PIN</h3>
              <p className="text-xs text-slate-400">
                {step === 1 && 'Step 1 of 3: Verify Current PIN'}
                {step === 2 && 'Step 2 of 3: Enter New 4-Digit PIN'}
                {step === 3 && 'Step 3 of 3: Confirm New PIN'}
                {step === 4 && 'PIN Changed Successfully'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-indigo-500' : 'bg-white/10'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-indigo-500' : 'bg-white/10'}`} />
          </div>
        )}

        {/* Hidden Input for Keyboard Typing */}
        {step < 4 && (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={currentInputValue}
            onChange={(e) => handleDigitChange(e.target.value)}
            className="sr-only"
            autoFocus
          />
        )}

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2.5 text-xs font-medium leading-relaxed"
          >
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Step 1: Current PIN */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h4 className="text-base font-semibold text-white">Enter Current PIN</h4>
              <p className="text-xs text-slate-400">Verify your identity before setting a new security PIN.</p>
            </div>

            {/* Display 4 Digit Dots */}
            <div 
              onClick={() => inputRef.current?.focus()} 
              className="flex justify-center items-center gap-4 py-3 cursor-pointer"
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = currentPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-12 h-14 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all",
                      filled 
                        ? "border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/20" 
                        : "border-white/10 bg-white/5 text-slate-500"
                    )}
                  >
                    {filled ? (showPinText ? currentPin[idx] : '•') : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: New PIN */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h4 className="text-base font-semibold text-white">Enter New 4-Digit PIN</h4>
              <p className="text-xs text-slate-400">Choose a strong combination. Avoid 1234, 1111, or repeated numbers.</p>
            </div>

            {/* Display 4 Digit Dots */}
            <div 
              onClick={() => inputRef.current?.focus()} 
              className="flex justify-center items-center gap-4 py-3 cursor-pointer"
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = newPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-12 h-14 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all",
                      filled 
                        ? "border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/20" 
                        : "border-white/10 bg-white/5 text-slate-500"
                    )}
                  >
                    {filled ? (showPinText ? newPin[idx] : '•') : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Confirm PIN */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h4 className="text-base font-semibold text-white">Confirm New PIN</h4>
              <p className="text-xs text-slate-400">Re-enter your new 4-digit PIN to confirm.</p>
            </div>

            {/* Display 4 Digit Dots */}
            <div 
              onClick={() => inputRef.current?.focus()} 
              className="flex justify-center items-center gap-4 py-3 cursor-pointer"
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = confirmPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-12 h-14 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all",
                      filled 
                        ? "border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/20" 
                        : "border-white/10 bg-white/5 text-slate-500"
                    )}
                  >
                    {filled ? (showPinText ? confirmPin[idx] : '•') : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Success View */}
        {step === 4 && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">PIN Updated Successfully</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Your new security PIN is active immediately. Every future unlock, auto-lock, and login session will require this new PIN.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-sm"
            >
              Done
            </button>
          </div>
        )}

        {/* Keypad & Controls (Steps 1, 2, 3) */}
        {step < 4 && (
          <div className="mt-6 space-y-4">
            {/* Toggle PIN Visibility & Back */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              {step > 1 && (
                <button
                  onClick={handleBackStep}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinText(!showPinText)}
                  className="flex items-center gap-1 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  {showPinText ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPinText ? 'Hide PIN' : 'Show PIN'}</span>
                </button>
              </div>
            </div>

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(String(num))}
                  className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-lg transition-colors border border-white/5 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handleKeyPress('0')}
                className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-lg transition-colors border border-white/5 flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 font-bold transition-colors border border-white/5 flex items-center justify-center text-xs"
              >
                ⌫ Clear
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              disabled={isSubmitting || currentInputValue.length !== 4}
              onClick={() => {
                if (step === 1) verifyCurrentPin(currentPin);
                else if (step === 2) validateNewPin(newPin);
                else if (step === 3) verifyConfirmPin(confirmPin);
              }}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{step === 1 ? 'Verify Current PIN' : step === 2 ? 'Continue' : 'Confirm & Save PIN'}</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
