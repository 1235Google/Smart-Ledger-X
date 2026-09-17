import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Loader2, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, Wallet, Eye, EyeOff, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  requestPasswordReset, 
  checkRedirectResult,
  formatAuthError 
} from '../lib/firebase';
import { 
  loginWithSupabaseEmail, 
} from '../lib/supabaseAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordLoginActivity } from '../lib/securityService';

export default function Login() {
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { updateUserProfile } = useStore();

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  // Handle redirect sign-in results on initial mount
  useEffect(() => {
    let isMounted = true;
    const processRedirect = async () => {
      try {
        const user = await checkRedirectResult();
        if (user && isMounted) {
          try {
            sessionStorage.setItem('isUnlocked', 'true');
          } catch (e) {}
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(formatAuthError(err));
        }
      }
    };
    processRedirect();
    return () => { isMounted = false; };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await loginWithGoogle();
      if (result?.user) {
        try { sessionStorage.setItem('isUnlocked', 'true'); } catch (e) {}
        await recordLoginActivity(result.user.uid, {
          method: 'Google',
          status: 'Success',
          email: result.user.email || '',
          userName: result.user.displayName || '',
          userAvatar: result.user.photoURL || ''
        });
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        const friendlyMsg = formatAuthError(err);
        setError(friendlyMsg);
        recordLoginActivity('anonymous', {
          method: 'Google',
          status: 'Failed',
          failureReason: friendlyMsg
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const cred = await loginWithEmail(cleanEmail, cleanPassword);
      if (isSupabaseConfigured()) {
        try {
          await loginWithSupabaseEmail(cleanEmail, cleanPassword);
        } catch (sbErr) {}
      }

      if (cred.user) {
        try { sessionStorage.setItem('isUnlocked', 'true'); } catch (e) {}
        await recordLoginActivity(cred.user.uid, {
          method: 'Email',
          status: 'Success',
          email: cleanEmail,
          userName: cred.user.displayName || '',
          userAvatar: cred.user.photoURL || ''
        });
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      recordLoginActivity('anonymous', {
        method: 'Email',
        status: 'Failed',
        email: cleanEmail,
        failureReason: friendlyMsg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none bg-gradient-to-br from-[#0c0f1c] via-[#050614] to-[#030408]">
      {/* Background Geometric Web */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* Left Web */}
        <svg className="absolute -left-[10%] top-[10%] w-[60%] h-[80%] opacity-20" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 250 L 250 100 L 500 250 L 250 400 Z" stroke="#00f0ff" strokeWidth="1" />
          <path d="M0 250 L 250 400 L 100 500" stroke="#00f0ff" strokeWidth="1" />
          <path d="M250 100 L 100 0" stroke="#00f0ff" strokeWidth="1" />
          <path d="M250 100 L 250 400" stroke="#00f0ff" strokeWidth="1" />
          <path d="M0 250 L 500 250" stroke="#00f0ff" strokeWidth="1" />
          <circle cx="250" cy="100" r="3" fill="#00f0ff" />
          <circle cx="500" cy="250" r="3" fill="#00f0ff" />
          <circle cx="250" cy="400" r="3" fill="#00f0ff" />
          <circle cx="0" cy="250" r="3" fill="#00f0ff" />
          <circle cx="250" cy="250" r="3" fill="#00f0ff" />
        </svg>

        {/* Right Web */}
        <svg className="absolute -right-[10%] top-[0%] w-[70%] h-[90%] opacity-20" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 250 L 350 50 L 500 250 L 350 450 Z" stroke="#00f0ff" strokeWidth="1" />
          <path d="M100 250 L 350 450 L 200 500" stroke="#00f0ff" strokeWidth="1" />
          <path d="M500 250 L 500 500" stroke="#00f0ff" strokeWidth="1" />
          <path d="M350 50 L 350 450" stroke="#00f0ff" strokeWidth="1" />
          <path d="M100 250 L 500 250" stroke="#00f0ff" strokeWidth="1" />
          <circle cx="350" cy="50" r="3" fill="#00f0ff" />
          <circle cx="500" cy="250" r="3" fill="#00f0ff" />
          <circle cx="350" cy="450" r="3" fill="#00f0ff" />
          <circle cx="100" cy="250" r="3" fill="#00f0ff" />
          <circle cx="350" cy="250" r="3" fill="#00f0ff" />
        </svg>

        {/* Soft radial glows */}
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-cyan-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Glassmorphic Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Intense Glowing Border Envelope */}
        <div className="relative rounded-[26px] p-[2.5px] bg-white shadow-[0_0_30px_rgba(255,255,255,0.7),inset_0_0_15px_rgba(255,255,255,0.5)]">
          
          {/* Inner Frosted Glass Body */}
          <div className="relative bg-[#1a1c23]/80 backdrop-blur-2xl rounded-[23px] py-8 sm:py-10 px-5 sm:px-8 overflow-hidden">
            
            {/* Card Header */}
            <div className="mb-6 sm:mb-8 text-center relative z-10">
              <h2 className="text-2xl sm:text-[32px] font-bold tracking-tight text-white mb-2 font-sans">
                Welcome Back
              </h2>
              <p className="text-[13px] text-white/60 font-medium">
                Sign in to access your encrypted ledger.
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs backdrop-blur-md z-10 relative shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 space-y-5">
              {/* Google OAuth Button */}
              <motion.button
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-bold text-white/90 bg-[#1e2029] hover:bg-[#252836] border border-white/5 transition-all duration-300 disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z" />
                    <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-3.1-.4-2.7z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </motion.button>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-2">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-white transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-[#1e2029] border border-white/5 focus:border-white/20 focus:bg-[#252836] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-white/90">Password</label>
                    <span className="text-xs font-semibold text-[#00f0ff]">Enterprise Vault</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-white transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-11 py-3 bg-[#1e2029] border border-white/5 focus:border-white/20 focus:bg-[#252836] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Submit Button */}
                <div className="pt-6">
                  <motion.button
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full relative py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#2f5af4] to-[#00f0ff] shadow-[0_10px_30px_-10px_rgba(0,240,255,0.8)] hover:shadow-[0_15px_40px_-10px_rgba(0,240,255,1)] transition-all duration-300 flex items-center justify-center disabled:opacity-50 border border-white/20"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>Sign in &rarr;</span>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Trust Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-white/80 tracking-widest uppercase">
          <ShieldCheck className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <span>End To End Encrypted Cloud Sync</span>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md p-[1px] rounded-[24px] bg-gradient-to-b from-white/20 via-white/5 to-white/5 shadow-2xl"
            >
              <div className="bg-[#050b14]/95 backdrop-blur-3xl rounded-[23px] p-6 sm:p-8 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Reset Password</h3>
                    <p className="text-[13px] text-slate-400 mt-1 font-medium">Enter your email to receive a recovery link.</p>
                  </div>
                </div>

                {resetSent ? (
                  <div className="p-5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center shadow-inner">
                    <CheckCircle2 className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-white mb-1.5">Recovery Link Sent</h4>
                    <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                      We sent a secure password reset link to <br/><span className="text-cyan-400 font-mono font-medium">{email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 shadow-sm"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    {error && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 shadow-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="font-medium">{error}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Account Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-4 py-3 bg-black/40 border border-white/[0.08] focus:border-cyan-400/50 rounded-xl text-white placeholder-slate-500/70 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-400/10 transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 transition-colors shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_4px_14px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 border border-white/10"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
