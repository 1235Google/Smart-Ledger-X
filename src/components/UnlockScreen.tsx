import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, ShieldCheck, KeyRound, Delete, XCircle, Check, Loader2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';
import CryptoJS from 'crypto-js';

export default function UnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { updateSecuritySettings, securitySettings } = useStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isCreating, setIsCreating] = useState(!securitySettings.pin);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = (digit: string) => {
    if (step === 'enter') {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        setError('');
        if (next.length === 4) {
          if (!isCreating) {
            handleUnlock(next);
          } else {
            setStep('confirm');
          }
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        setError('');
        if (next.length === 4) {
          handleCreate(pin, next);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (confirmPin.length === 0) {
        setStep('enter');
      } else {
        setConfirmPin(prev => prev.slice(0, -1));
      }
    }
    setError('');
  };

  const handleUnlock = (pinToTest?: string) => {
    const val = pinToTest || pin;
    setIsVerifying(true);
    setTimeout(() => {
      const hashedPin = CryptoJS.SHA256(val).toString();
      if (securitySettings.pin === hashedPin) {
        setIsVerifying(false);
        onUnlock();
      } else {
        setIsVerifying(false);
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    }, 200);
  };

  const handleCreate = (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      setStep('enter');
      setPin('');
      return;
    }
    const hashedPin = CryptoJS.SHA256(firstPin).toString();
    updateSecuritySettings({ pin: hashedPin, pinEnabled: true });
    onUnlock();
  };

  const currentDisplayPin = step === 'enter' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0e12] p-4 font-sans select-none">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[20%] w-[380px] h-[380px] rounded-full bg-[#294270]/20 blur-[130px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[380px] h-[380px] rounded-full bg-[#1b3459]/25 blur-[140px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 16 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#1a1b20] border border-[#2d2f36] rounded-[32px] p-6 sm:p-8 max-w-[400px] w-full text-center shadow-[0_24px_64px_rgba(0,0,0,0.65)] relative z-10"
      >
        {/* Animated Brand Icon */}
        <div className="relative mx-auto mb-4 w-16 h-16 bg-[#252830] border border-[#3a3d47] rounded-[22px] flex items-center justify-center text-[#a8c7fa] shadow-lg">
          <Lock size={32} />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-[#e2e2e9] mb-1">
          {isCreating 
            ? (step === 'enter' ? 'Create Smart Ledger PIN' : 'Confirm Your PIN') 
            : 'Welcome Back'}
        </h1>
        <p className="text-xs sm:text-sm text-[#90909a] mb-6">
          {isCreating 
            ? (step === 'enter' ? 'Enter a 4-digit security PIN' : 'Re-enter the 4-digit PIN to confirm')
            : 'Enter your PIN to securely access your ledger'}
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => {
            const isFilled = i < currentDisplayPin.length;
            const isCurrent = i === currentDisplayPin.length && !error;

            return (
              <motion.div 
                key={i} 
                animate={{ scale: isFilled ? 1.15 : isCurrent ? 1.05 : 1 }}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                  error
                    ? "bg-[#ffb4ab] border-2 border-[#ba1a1a]"
                    : isFilled 
                    ? "bg-[#a8c7fa] border-2 border-[#a8c7fa] shadow-[0_0_10px_rgba(168,199,250,0.4)]" 
                    : isCurrent
                    ? "bg-[#252830] border-2 border-[#a8c7fa]/70 ring-2 ring-[#a8c7fa]/20"
                    : "bg-[#252830] border-2 border-[#41434b]"
                )}
              >
                {isFilled && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#042e6f]" />
                )}
              </motion.div>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-[#ffb4ab] mb-4 font-semibold flex items-center justify-center gap-1.5 bg-[#93000a]/20 py-1 px-3 rounded-full border border-[#ffb4ab]/30 w-fit mx-auto">
            <XCircle size={14} /> {error}
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-y-3 gap-x-4 place-items-center w-full max-w-[280px] mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <motion.button 
              key={d} 
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleDigit(String(d))} 
              className="w-[72px] h-[72px] rounded-full bg-[#252830] hover:bg-[#31343d] active:bg-[#3e424d] text-[#e2e2e9] font-mono font-bold text-2xl border border-[#343740] shadow-sm flex items-center justify-center transition-colors"
            >
              {d}
            </motion.button>
          ))}
          <div className="w-[72px] h-[72px]" />
          <motion.button 
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleDigit('0')} 
            className="w-[72px] h-[72px] rounded-full bg-[#252830] hover:bg-[#31343d] active:bg-[#3e424d] text-[#e2e2e9] font-mono font-bold text-2xl border border-[#343740] shadow-sm flex items-center justify-center transition-colors"
          >
            0
          </motion.button>
          <motion.button 
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleBackspace} 
            className="w-[72px] h-[72px] rounded-full bg-[#252830]/60 hover:bg-[#31343d] text-[#a5a7b0] hover:text-white border border-[#343740] flex items-center justify-center transition-colors"
          >
            <Delete size={22} />
          </motion.button>
        </div>

        <button 
          type="button"
          disabled={currentDisplayPin.length !== 4 || isVerifying}
          onClick={() => {
            if (isCreating) {
              if (step === 'enter') setStep('confirm');
              else handleCreate(pin, confirmPin);
            } else {
              handleUnlock();
            }
          }} 
          className={cn(
            "w-full h-14 rounded-full font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-md",
            currentDisplayPin.length === 4
              ? "bg-[#a8c7fa] text-[#042e6f] hover:bg-[#c2e7ff] shadow-[0_4px_20px_rgba(168,199,250,0.35)] cursor-pointer"
              : "bg-[#25272e] text-[#6b6e78] border border-[#343740] cursor-not-allowed opacity-75"
          )}
        >
          {isVerifying ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <KeyRound size={18} />
              <span>{isCreating ? (step === 'enter' ? 'Next' : 'Save PIN') : 'Unlock Smart Ledger'}</span>
            </>
          )}
        </button>

        {/* Security Badge */}
        <div className="mt-6 pt-4 border-t border-[#2d2f36] flex items-center justify-center gap-1.5 text-[11px] text-[#767882]">
          <ShieldCheck size={14} className="text-[#a8c7fa]" />
          <span>Protected with encrypted local storage</span>
        </div>
      </motion.div>
    </div>
  );
}
