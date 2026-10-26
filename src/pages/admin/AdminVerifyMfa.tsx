import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Loader2,
  KeyRound,
  Info,
  Server,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { verifyAdminMfaCode, resendAdminMfaCode, checkEmailServiceStatus } from '../../lib/adminMfaClient';
import { useStore } from '../../context/StoreContext';

export default function AdminVerifyMfa() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAdminUser, setIsAdminAuthenticated } = useStore() as any;

  // Read state passed from AdminLogin
  const state = (location.state as {
    tempSessionId?: string;
    email?: string;
    expiresInSeconds?: number;
    deliveryDiagnostic?: any;
    emailDelivery?: any;
  }) || {};

  const tempSessionId = state.tempSessionId || sessionStorage.getItem('smartledger_admin_temp_mfa_id') || '';
  const email = state.email || sessionStorage.getItem('smartledger_admin_temp_mfa_email') || 'admin@smartledgerx.io';

  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Email delivery warning state
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(
    state.deliveryDiagnostic?.error || null
  );
  const [devOtpCode, setDevOtpCode] = useState<string | null>(
    state.deliveryDiagnostic?.devOtpHint || null
  );

  // Expiration countdown (only active if code was actually dispatched)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    state.deliveryDiagnostic?.error ? 0 : (state.expiresInSeconds || 300)
  );

  // 60-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Email service diagnostics modal state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If no tempSessionId, redirect back to login
  useEffect(() => {
    if (!tempSessionId) {
      navigate('/admin/login', { replace: true });
    }
  }, [tempSessionId, navigate]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Expiration timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Verification code has expired. Please request a new code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev <= 1 ? 0 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...codeDigits];
      updated[index] = '';
      setCodeDigits(updated);
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...codeDigits];
    updated[index] = digit;
    setCodeDigits(updated);
    setError(null);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // Auto-submit when all 6 digits entered
      const fullCode = updated.join('');
      if (fullCode.length === 6) {
        submitVerification(fullCode);
      }
    }
  };

  // Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Paste support
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...codeDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setCodeDigits(updated);
    setError(null);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      submitVerification(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const submitVerification = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || codeDigits.join('');
    if (finalCode.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyAdminMfaCode(tempSessionId, finalCode, rememberDevice);
      if (result.success) {
        if (setAdminUser && result.adminUser) {
          setAdminUser(result.adminUser);
        }
        if (setIsAdminAuthenticated) {
          setIsAdminAuthenticated(true);
        }
        sessionStorage.removeItem('smartledger_admin_temp_mfa_id');
        sessionStorage.removeItem('smartledger_admin_temp_mfa_email');
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(result.error || 'Verification failed. Please check the code.');
        setCodeDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      const result = await resendAdminMfaCode(tempSessionId);
      if (result.success) {
        setResendCooldown(60);
        setSecondsRemaining(300);
        setDeliveryWarning(null);
        setResendSuccess('New verification code sent to your email.');
        setCodeDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setTimeout(() => setResendSuccess(null), 5000);
      } else {
        if (result.cooldownRemaining) {
          setResendCooldown(result.cooldownRemaining);
        }
        setError(result.error || 'Failed to resend verification code.');
        if (result.deliveryDiagnostic?.error) {
          setDeliveryWarning(result.deliveryDiagnostic.error);
        }
        if (result.deliveryDiagnostic?.devOtpHint) {
          setDevOtpCode(result.deliveryDiagnostic.devOtpHint);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error requesting code resend.');
    } finally {
      setIsResending(false);
    }
  };

  const handleInspectDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    setShowDiagnostics(true);
    try {
      const data = await checkEmailServiceStatus();
      setDiagnosticData(data);
    } catch {
      setDiagnosticData({ success: false, error: 'Could not contact server diagnostic endpoint' });
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  // Format countdown minutes:seconds
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mask email for privacy
  const maskedEmail = (() => {
    if (!email) return 'your email';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  })();

  const handleApplyDevCode = (code: string) => {
    const chars = code.split('').slice(0, 6);
    setCodeDigits(chars);
    setError(null);
    if (chars.length === 6) {
      submitVerification(code);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 sm:p-9 shadow-2xl relative z-10"
      >
        {/* Top Navigation & Status */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/login')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Login</span>
          </button>

          <button
            onClick={handleInspectDiagnostics}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-300 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10"
          >
            <Server size={12} className="text-blue-400" />
            <span>Email Health</span>
          </button>
        </div>

        {/* Brand Shield & Title */}
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-600/30 to-blue-500/20 border border-blue-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] mb-4">
            <KeyRound size={26} className="text-blue-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Two-Factor Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
            Enter the 6-digit authorization code sent to{' '}
            <span className="font-semibold text-slate-200">{maskedEmail}</span>
          </p>
        </div>

        {/* Email Delivery Warning Banner (when Resend API fails) */}
        <AnimatePresence>
          {deliveryWarning && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-col gap-1.5"
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-amber-300 block">Email Delivery Notice:</span>
                  <span className="text-amber-200/90 leading-relaxed block">{deliveryWarning}</span>
                </div>
              </div>
              <div className="mt-1 pt-1.5 border-t border-amber-500/20 text-[11px] text-amber-300/80 flex items-center justify-between">
                <span>Check spam folder or click "Email Health" above</span>
                <button
                  type="button"
                  onClick={handleInspectDiagnostics}
                  className="underline hover:text-white"
                >
                  View fix &rarr;
                </button>
              </div>
            </motion.div>
          )}

          {/* Dev Mode Sandbox Auto-Fill Chip */}
          {devOtpCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 rounded-xl bg-blue-950/70 border border-blue-500/40 text-xs text-blue-200 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            >
              <div className="flex items-center gap-2">
                <Info size={15} className="text-blue-400 shrink-0" />
                <span>
                  <strong className="text-white">Sandbox OTP:</strong> <code className="font-mono bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-300 font-bold">{devOtpCode}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleApplyDevCode(devOtpCode)}
                className="px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-[11px] transition-colors"
              >
                Auto Fill
              </button>
            </motion.div>
          )}

          {/* Error / Success Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300"
            >
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span className="flex-1">{error}</span>
            </motion.div>
          )}

          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span className="flex-1">{resendSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6-Digit Code Input Boxes */}
        <div className="mt-7">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
            Security Verification Code
          </label>
          <div className="flex justify-between gap-2 sm:gap-2.5">
            {codeDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={isVerifying}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className={`w-11 sm:w-12 h-14 sm:h-15 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl transition-all outline-none ${
                  digit 
                    ? 'bg-blue-950/60 border-2 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.25)]' 
                    : 'bg-slate-800/60 border border-slate-700/80 text-white hover:border-slate-600 focus:border-blue-500 focus:bg-slate-800 focus:shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 5-minute countdown & Resend Trigger */}
        <div className="mt-5 flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className={secondsRemaining > 0 && secondsRemaining <= 60 ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
            <span>Code expires in:</span>
            <span className={`font-mono font-bold ${secondsRemaining <= 60 ? 'text-rose-400' : 'text-slate-200'}`}>
              {formatTime(secondsRemaining)}
            </span>
          </div>

          {/* Resend Action */}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isResending}
            className={`flex items-center gap-1 font-semibold transition-colors ${
              resendCooldown > 0 || isResending
                ? 'text-slate-500 cursor-not-allowed'
                : 'text-blue-400 hover:text-blue-300 underline underline-offset-4'
            }`}
          >
            {isResending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <>
                <RefreshCw size={12} />
                <span>Resend code</span>
              </>
            )}
          </button>
        </div>

        {/* Remember this device checkbox */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                Remember this device for 30 days
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Bypasses multi-factor authentication on subsequent logins from this recognized workstation.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => submitVerification()}
          disabled={isVerifying || codeDigits.some(d => !d)}
          className={`w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg ${
            isVerifying || codeDigits.some(d => !d)
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 active:scale-[0.99]'
          }`}
        >
          {isVerifying ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              <span>Confirm & Enter Portal</span>
            </>
          )}
        </button>

        {/* Bank-Grade Protocol Footer */}
        <div className="mt-6 text-center text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Lock size={10} className="text-blue-500" />
          <span>AES-256 &bull; SHA-256 Timed Authentication</span>
        </div>
      </motion.div>

      {/* Diagnostics & Troubleshooting Modal */}
      <AnimatePresence>
        {showDiagnostics && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Server size={18} className="text-blue-400" />
                  <span>Email Provider Diagnostic</span>
                </div>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800"
                >
                  Close
                </button>
              </div>

              {isLoadingDiagnostics ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                  <span>Checking Resend service status...</span>
                </div>
              ) : diagnosticData ? (
                <div className="mt-4 space-y-4 text-xs">
                  {/* Status Badges */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">API Key</span>
                      <span className={`font-mono font-semibold ${diagnosticData.configured ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {diagnosticData.configured ? (diagnosticData.maskedKey || 'Configured') : 'Missing in .env'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Sender Domain</span>
                      <span className="font-semibold text-blue-300 truncate block">
                        {diagnosticData.isCustomDomain ? 'Custom Verified' : 'onboarding@resend.dev'}
                      </span>
                    </div>
                  </div>

                  {/* Sender Address */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Active Sender Address</span>
                    <code className="text-blue-300 font-mono text-[11px] break-all">{diagnosticData.resolvedSender}</code>
                  </div>

                  {/* Why isn't email arriving checklist */}
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                      <HelpCircle size={14} className="text-amber-400" />
                      <span>Why might an email not arrive?</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 leading-relaxed">
                      <li>
                        <strong>Gmail Spam / Promotions:</strong> Resend test emails from <code className="text-blue-300">onboarding@resend.dev</code> frequently land in Gmail's <em>Spam</em> or <em>Promotions</em> tab.
                      </li>
                      <li>
                        <strong>Resend Sandbox Rule:</strong> Free Resend accounts using <code className="text-blue-300">onboarding@resend.dev</code> can <em>only deliver to the email address registered on the Resend account</em>.
                      </li>
                      <li>
                        <strong>Domain Verification:</strong> Sending from custom domains (e.g. <code className="text-blue-300">security@smartledgerx.io</code>) requires verified DNS (DKIM/SPF) at <code className="text-blue-300">resend.com/domains</code>.
                      </li>
                    </ul>
                  </div>

                  <a
                    href="https://resend.com/emails"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold transition-colors text-xs"
                  >
                    <span>Open Resend Activity & Logs Dashboard</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
