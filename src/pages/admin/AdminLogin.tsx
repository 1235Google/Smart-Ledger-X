import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Sparkles, Shield, KeyRound } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function AdminLogin() {
  const { adminLogin, adminGoogleLogin, isAdminAuthenticated, isAdminLoading } = useStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@smartledgerx.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // If already authenticated, redirect to Admin Dashboard
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleSigningIn(true);

    try {
      const res = await adminGoogleLogin();
      if (res.success) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(res.error || 'This account does not have administrator access.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in could not be completed. Please try again.');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setError('Please enter the admin password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await adminLogin(trimmedPassword, email);
      if (result.success) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(result.error || 'Invalid administrator credentials.');
      }
    } catch (err: any) {
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanForgotEmail = forgotEmail.trim();
    if (!cleanForgotEmail) return;

    setIsSendingForgot(true);
    setForgotError('');
    try {
      await sendPasswordResetEmail(auth, cleanForgotEmail);
      setForgotSent(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotSent(false);
        setForgotEmail('');
      }, 3000);
    } catch (err: any) {
      console.warn('[AdminAuth Debug] Password reset email error:', err?.code, err?.message);
      if (err?.code === 'auth/user-not-found') {
        setForgotError('No administrator account found with this email address.');
      } else if (err?.code === 'auth/invalid-email') {
        setForgotError('Please enter a valid email address.');
      } else {
        // Don't expose sensitive details, still show confirmation to prevent enumeration
        setForgotSent(true);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotSent(false);
          setForgotEmail('');
        }, 3000);
      }
    } finally {
      setIsSendingForgot(false);
    }
  };

  // State 1: Loading / checking session state
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-[#06080e] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-4 relative z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <ShieldCheck size={36} className="text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">SmartLedger Admin</h2>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-2 mt-2">
              <Loader2 size={15} className="animate-spin text-emerald-400" />
              <span>Verifying administrator authorization...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 2 & 3: Unauthenticated / login form view (redirect handled by useEffect if authenticated)
  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Background Glass & Mesh Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-emerald-500/15 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '32px 32px' }} 
      />

      <motion.div 
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Material 3 Glass Card Container */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-7 sm:p-9 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
          {/* Subtle Top Ambient Glow Accent */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-32 bg-gradient-to-b from-emerald-400/20 to-transparent blur-2xl pointer-events-none" />

          {/* Header Brand */}
          <div className="text-center mb-7">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              SmartLedger <span className="text-emerald-400 font-semibold text-lg px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">Admin</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 font-normal">
              Enterprise Role-Based Access & Ledger Management
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 overflow-hidden"
              >
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Action: Google Authentication */}
          <div className="space-y-3 mb-6">
            <button
              id="google-admin-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn || isSubmitting || isAdminLoading}
              className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none relative overflow-hidden group"
            >
              {isGoogleSigningIn ? (
                <>
                  <Loader2 size={18} className="animate-spin text-slate-800" />
                  <span>Verifying Google Account...</span>
                </>
              ) : (
                <>
                  {/* Official Multicolor Google G SVG */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Only authorized Google Workspace or approved administrator accounts can access the panel.
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-slate-900/90 px-3 text-[10px] font-semibold tracking-wider text-slate-500 uppercase shrink-0">
              Or Sign In with Password
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@smartledgerx.io"
                  disabled={isSubmitting || isGoogleSigningIn}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input 
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  disabled={isSubmitting || isGoogleSigningIn}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-1 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-white/20 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5" 
                />
                <span>Keep session active</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || isGoogleSigningIn}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Link */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <button 
              onClick={() => navigate('/')} 
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
            >
              <span>← Back to SmartLedger User Portal</span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield size={13} className="text-emerald-400" />
          <span>Protected with Firebase Auth & Role-Based Firestore Rules</span>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-1.5">Reset Admin Password</h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-5">
              Enter your authorized admin email. If matched in our records, password instructions will be sent.
            </p>
            
            {forgotSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
                <CheckCircle2 size={18} />
                <span>Recovery instructions dispatched successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{forgotError}</span>
                  </div>
                )}
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@smartledgerx.io"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(false)} 
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSendingForgot}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-xs text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSendingForgot ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{isSendingForgot ? 'Sending...' : 'Send Instructions'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
