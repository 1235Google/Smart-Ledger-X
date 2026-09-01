import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Loader2, Mail, Lock, User, ArrowRight, KeyRound, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { loginWithGoogle, loginWithEmail, registerWithEmail, requestPasswordReset } from '../lib/firebase';
import SyncStatusBadge from '../components/SyncStatusBadge';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'pin';

export default function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // PIN state
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shake, setShake] = useState(false);
  
  const navigate = useNavigate();
  const { loginWithPin, updateUserProfile, securitySettings } = useStore();

  useEffect(() => {
    if (authMode === 'pin') {
      pinRefs.current[0]?.focus();
    }
  }, [authMode]);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    console.log('[Auth Action] Initiating Google Sign-In');
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await loginWithGoogle();
      console.log('[Auth Action] Google Sign-In successful for user:', result?.user?.uid);
      if (result?.user) {
        console.log('[Route Navigation] Navigating to / (Dashboard)');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error('[Auth Action Error] Google Sign-In failed:', err);
      let message = 'Unable to sign in with Google. Please try again.';
      if (err.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in cancelled.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'Sign-in popup was blocked. Please allow popups for this site.';
      } else if (err.message) {
        message = err.message;
      }
      triggerError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setError('');
    setSuccessMsg('');

    if (!email || !email.includes('@')) {
      triggerError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'forgot') {
      console.log('[Auth Action] Requesting password reset email for:', email);
      setLoading(true);
      try {
        await requestPasswordReset(email);
        console.log('[Auth Action] Password reset email sent successfully');
        setSuccessMsg('Password reset link has been sent to your email.');
        setTimeout(() => {
          setAuthMode('signin');
          setSuccessMsg('');
        }, 3500);
      } catch (err: any) {
        console.error('[Auth Action Error] Password reset failed:', err);
        triggerError(err.message || 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      triggerError('Password must be at least 6 characters long.');
      return;
    }

    if (authMode === 'signup') {
      if (password !== confirmPassword) {
        triggerError('Passwords do not match.');
        return;
      }

      console.log('[Auth Action] Registering new user with email:', email);
      setLoading(true);
      try {
        const cred = await registerWithEmail(email, password);
        console.log('[Auth Action] User registration successful:', cred.user?.uid);
        if (fullName) {
          updateUserProfile({ fullName });
        }
        if (cred.user) {
          console.log('[Route Navigation] Navigating to / (Dashboard)');
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Action Error] Registration failed:', err);
        let msg = 'Failed to create account. Please try again.';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'An account with this email already exists.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'Password should be at least 6 characters.';
        } else if (err.message) {
          msg = err.message;
        }
        triggerError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // Sign in
      console.log('[Auth Action] Logging in user with email:', email);
      setLoading(true);
      try {
        const cred = await loginWithEmail(email, password);
        console.log('[Auth Action] Login successful for user:', cred.user?.uid);
        if (cred.user) {
          console.log('[Route Navigation] Navigating to / (Dashboard)');
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Action Error] Login failed:', err);
        let msg = 'Invalid email or password.';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = 'Invalid email or password credentials.';
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Too many failed login attempts. Please try again later.';
        } else if (err.message) {
          msg = err.message;
        }
        triggerError(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-advance
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
    
    // Check if full PIN entered
    if (newPin.every((p) => p !== '') && newPin.length === 4) {
      handlePinSubmit(newPin.join(''));
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinSubmit = (fullPin: string) => {
    if (loading) return;
    setLoading(true);
    setError('');
    setShake(false);
    
    const success = loginWithPin(fullPin);
    if (success) {
      setLoading(false);
      navigate('/', { replace: true });
    } else {
      setLoading(false);
      triggerError('Incorrect PIN. Please try again.');
      setPin(['', '', '', '']);
      pinRefs.current[0]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated gradient atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[140px] animate-aurora-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[140px] animate-aurora-2" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold tracking-wider text-sm">SMART LEDGER</span>
          </div>
          <SyncStatusBadge />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            x: shake ? [-8, 8, -8, 8, -4, 4, 0] : 0 
          }}
          transition={{ duration: shake ? 0.4 : 0.25 }}
          className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
        >
          {/* Top subtle sheen */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'signin' && 'Welcome Back'}
              {authMode === 'signup' && 'Create Cloud Account'}
              {authMode === 'forgot' && 'Reset Password'}
              {authMode === 'pin' && 'Enter Quick PIN'}
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              {authMode === 'signin' && 'Sign in to synchronize your ledger across all devices'}
              {authMode === 'signup' && 'All your financial records safely stored in Cloud Firestore'}
              {authMode === 'forgot' && 'Enter your email to receive a recovery link'}
              {authMode === 'pin' && 'Enter your 4-digit passcode to unlock ledger'}
            </p>
          </div>

          {/* Status / Error feedback */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl mb-5 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 px-4 py-3 rounded-2xl mb-5 text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Mode Switchers */}
          {authMode !== 'pin' && authMode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setError(''); }}
                className={cn(
                  'py-2 text-sm font-semibold rounded-xl transition-all',
                  authMode === 'signin'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); }}
                className={cn(
                  'py-2 text-sm font-semibold rounded-xl transition-all',
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* GOOGLE SIGN IN BUTTON (Primary Cloud Auth Option) */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <div className="space-y-4 mb-6">
              <button
                type="button"
                disabled={googleLoading || loading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white text-neutral-900 hover:bg-neutral-100 font-semibold py-3 px-4 rounded-2xl transition-all shadow-lg hover:shadow-white/20 active:scale-[0.98] disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-900" />
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">Or with email</span>
                <div className="flex-1 h-[1px] bg-white/10" />
              </div>
            </div>
          )}

          {/* PIN FORM */}
          {authMode === 'pin' ? (
            <motion.div
              key="pin-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-center gap-3">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { pinRefs.current[i] = el; }}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    className={cn(
                      'w-14 h-16 bg-white/5 border rounded-2xl text-center text-2xl text-white font-mono focus:outline-none transition-all',
                      digit ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10 focus:border-blue-500'
                    )}
                  />
                ))}
              </div>
              
              <button
                type="button"
                disabled={loading || pin.some((p) => p === '')}
                onClick={() => handlePinSubmit(pin.join(''))}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl py-3.5 font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Wallet'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setError(''); }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Switch to Cloud Account Login
                </button>
              </div>
            </motion.div>
          ) : (
            /* EMAIL & PASSWORD FORM */
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setError(''); }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {authMode === 'signin' && 'Sign In to Ledger'}
                      {authMode === 'signup' && 'Create Account'}
                      {authMode === 'forgot' && 'Send Recovery Email'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {authMode === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setError(''); }}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Bottom PIN fallback toggle */}
          {authMode !== 'pin' && (
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                End-to-End Encrypted Cloud Sync
              </span>
              <button
                type="button"
                onClick={() => { setAuthMode('pin'); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Quick PIN
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
