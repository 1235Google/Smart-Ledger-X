import React, { useState } from 'react';
import { ScanFace, CheckCircle2, XCircle, ShieldCheck, ArrowRight, RefreshCw, X } from 'lucide-react';
import { registerBiometricCredential } from '../lib/webauthnService';

interface FaceUnlockSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (device?: any) => void;
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
}

export const FaceUnlockSetupModal: React.FC<FaceUnlockSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userEmail,
  userDisplayName
}) => {
  const [step, setStep] = useState<1 | 2 | 'success' | 'failure'>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartRegistration = async () => {
    setStep(2);
    setErrorMessage(null);

    const cleanUid = userId || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
    const cleanEmail = userEmail || localStorage.getItem('lastAuthUserEmail') || 'user@smartledgerx.io';

    try {
      const result = await registerBiometricCredential(cleanUid, cleanEmail, userDisplayName);
      
      if (result.isUserCancelled) {
        setErrorMessage(result.error || 'Face Unlock setup was cancelled. You can try again anytime.');
        setStep('failure');
        return;
      }

      if (result.success && result.serverVerified) {
        setStep('success');
        setTimeout(() => {
          onSuccess(result.device);
          onClose();
        }, 1500);
      } else {
        setErrorMessage(result.error || 'Failed to verify biometric credential with the server.');
        setStep('failure');
      }
    } catch (err: any) {
      console.error('[FaceUnlockSetupModal] Biometric registration error:', err?.name, err?.message, err);
      setErrorMessage(err?.message || 'An unexpected error occurred during biometric setup.');
      setStep('failure');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-white/10 shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ScanFace size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Set Up Face Unlock</h3>
            <p className="text-xs text-slate-400">Secure hardware biometric verification</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Face Unlock uses your device's native secure enclave (Face ID, Windows Hello, or Android biometric sensors) via WebAuthn.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your biometric data never leaves your device and is never stored on our servers. Only a secure cryptographic key is registered.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRegistration}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto animate-pulse">
              <ScanFace size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">Verifying Biometrics...</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Please follow your browser or device prompt to complete facial or fingerprint recognition.
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-400">✓ Face Unlock is turned on</h4>
              <p className="text-xs text-slate-400">Your device authenticator has been successfully registered.</p>
            </div>
          </div>
        )}

        {step === 'failure' && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Setup Not Completed</p>
                <p className="text-red-400/90 mt-0.5">{errorMessage || 'Could not register biometric credential.'}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleStartRegistration}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
