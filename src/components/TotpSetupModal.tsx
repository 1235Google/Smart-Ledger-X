import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Smartphone, QrCode, Copy, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { auth } from '../lib/firebase';
import { createNotification } from '../lib/notificationService';

interface TotpSetupModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function TotpSetupModal({ onClose, onComplete }: TotpSetupModalProps) {
  const [step, setStep] = useState(1);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (step === 2) {
      startEnrollment();
    }
  }, [step]);

  const startEnrollment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const text = await res.text();
      if (!text) {
        throw new Error('Server returned an empty response from the 2FA setup endpoint.');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server returned an invalid response from the 2FA setup endpoint.');
      }
      
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to start setup');
      }
      
      setSecret(data.secret || data.manualEntryKey);
      setQrCodeUrl(data.qrCodeUrl || data.qrCodeDataUrl);
    } catch (err: any) {
      console.error('[2FA Setup Error]:', err);
      setError(err.message);
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/security/2fa/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      
      const text = await res.text();
      if (!text) {
        throw new Error('Server returned an empty response from the 2FA confirm endpoint.');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server returned an invalid response from the 2FA confirm endpoint.');
      }
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Invalid code');
      }
      
      setRecoveryCodes(data.recoveryCodes);
      setStep(4);
      createNotification({ title: 
        'Two-Factor Authentication Enabled',
        message: 'Your account is now protected with TOTP.', type: 'success', category: 
        'security'
      });
    } catch (err: any) {
      console.error('[2FA Confirm Error]:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadRecoveryCodes = () => {
    const text = `Smart Ledger Recovery Codes\n\nKeep these safe! They can be used to access your account if you lose your authenticator app.\n\n${recoveryCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-ledger-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1a1b23] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-blue-400" />
            Setup Two-Factor Authentication
          </h2>
          {step !== 4 && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              ✕
            </button>
          )}
        </div>
        
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                    <Smartphone className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Secure your Smart Ledger account</h3>
                  <p className="text-slate-400">
                    We'll use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to generate a 6-digit code you'll need to enter when you sign in.
                  </p>
                </div>
                
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}
                
                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-slate-400">Generating secure key...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white mb-2">Scan this QR code with Google Authenticator</h3>
                      <p className="text-slate-400 text-sm">
                        Open your authenticator app and scan the QR code below.
                      </p>
                    </div>
                    
                    <div className="flex justify-center p-4 bg-white rounded-xl">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                      <p className="text-xs text-slate-400 text-center uppercase tracking-wider font-bold">Can't scan? Enter this setup key manually</p>
                      <div className="flex flex-col gap-2">
                        {showSecret ? (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-black/40 py-2 px-3 rounded-lg text-emerald-400 font-mono text-center tracking-widest text-sm select-all">
                              {secret}
                            </code>
                            <button onClick={copySecret} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              Copy Setup Key
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setShowSecret(true)} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-all text-sm">
                            Show Setup Key
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                        Back
                      </button>
                      <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all">
                        Next
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Verify Authenticator</h3>
                  <p className="text-slate-400 text-sm">
                    Enter the 6-digit code generated by your authenticator app.
                  </p>
                </div>
                
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}
                
                <div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-2xl tracking-[0.5em] text-center"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={isLoading} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50">
                    Back
                  </button>
                  <button 
                    onClick={handleVerify}
                    disabled={isLoading || code.length !== 6}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold rounded-xl transition-all flex items-center justify-center"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Enable'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Two-Factor Authentication Enabled</h3>
                  <p className="text-slate-400 text-sm">
                    Keep these recovery codes safe! They are the ONLY way to access your account if you lose your device.
                  </p>
                </div>
                
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 font-mono text-emerald-400 text-center grid grid-cols-2 gap-3 text-lg tracking-widest">
                  {recoveryCodes.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <button onClick={copyRecoveryCodes} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2">
                    {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    Copy All
                  </button>
                  <button onClick={downloadRecoveryCodes} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                    Download
                  </button>
                </div>
                
                <label className="flex items-start gap-3 p-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-1">
                    <input 
                      type="checkbox" 
                      checked={savedCodes}
                      onChange={(e) => setSavedCodes(e.target.checked)}
                      className="peer sr-only" 
                    />
                    <div className="w-5 h-5 rounded border border-slate-500 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors"></div>
                    <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    I have safely stored my recovery codes
                  </span>
                </label>
                
                <button 
                  onClick={onComplete}
                  disabled={!savedCodes}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
