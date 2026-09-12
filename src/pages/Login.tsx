import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Loader2, Mail, Lock, User, ArrowRight, KeyRound, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  requestPasswordReset, 
  checkRedirectResult,
  formatAuthError 
} from '../lib/firebase';
import { 
  loginWithSupabaseEmail, 
  registerWithSupabaseEmail, 
  loginWithSupabaseOAuth 
} from '../lib/supabaseAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordLoginActivity } from '../lib/securityService';
import SyncStatusBadge from '../components/SyncStatusBadge';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'pin';

export default function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const { loginWithPin, updateUserProfile, securitySettings } = useStore();
  const currentPinLength = securitySettings.pinLength || 4;

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  // Handle redirect sign-in results on initial mount
  useEffect(() => {
    let isMounted = true;
    const processRedirect = async () => {
      try {
        const user = await checkRedirectResult();
        if (user && isMounted) {
          console.log('[Auth] Detected successful Google redirect login for:', user.uid);
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

  // PIN state
  const [pin, setPin] = useState<string[]>(() => Array(securitySettings.pinLength || 4).fill(''));
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setPin(Array(currentPinLength).fill(''));
  }, [currentPinLength]);

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
        await recordLoginActivity(result.user.uid, {
          method: 'Google',
          status: 'Success',
          email: result.user.email || '',
          userName: result.user.displayName || '',
          userAvatar: result.user.photoURL || ''
        });
        console.log('[Route Navigation] Navigating to / (Dashboard)');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error('[Auth Action Error] Google Sign-In failed:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        console.log('[Auth Action] Google Sign-In was closed by the user.');
      } else {
        const friendlyMsg = formatAuthError(err);
        triggerError(friendlyMsg);
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      triggerError('Please enter a valid email address (e.g. user@example.com).');
      return;
    }

    if (authMode === 'forgot') {
      console.log('[Auth Action] Requesting password reset email for:', cleanEmail);
      setLoading(true);
      try {
        await requestPasswordReset(cleanEmail);
        console.log('[Auth Action] Password reset email sent successfully');
        setSuccessMsg('Password recovery link has been sent to your email address.');
        setTimeout(() => {
          setAuthMode('signin');
          setSuccessMsg('');
        }, 4000);
      } catch (err: any) {
        console.error('[Auth Action Error] Password reset failed:', err);
        triggerError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      triggerError('Password must be at least 6 characters long.');
      return;
    }

    if (authMode === 'signup') {
      if (cleanPassword !== confirmPassword.trim()) {
        triggerError('Passwords do not match. Please re-enter your password.');
        return;
      }

      console.log('[Auth Action] Registering new user with email:', cleanEmail);
      setLoading(true);
      try {
        const cred = await registerWithEmail(cleanEmail, cleanPassword, fullName.trim());
        console.log('[Auth Action] User registration successful:', cred.user?.uid);
        
        // Also register in Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            await registerWithSupabaseEmail(cleanEmail, cleanPassword, fullName);
            console.log('[Auth Action] Supabase user registration synchronized.');
          } catch (sbErr) {
            console.warn('[Auth Action] Supabase registration notice:', sbErr);
          }
        }

        if (fullName.trim()) {
          updateUserProfile({ fullName: fullName.trim() });
        }
        if (cred.user) {
          await recordLoginActivity(cred.user.uid, {
            method: 'Email',
            status: 'Success',
            email: cleanEmail,
            userName: fullName.trim() || 'New User',
          });
          console.log('[Route Navigation] Navigating to / (Dashboard)');
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Action Error] Registration failed:', err);
        const friendlyMsg = formatAuthError(err);
        triggerError(friendlyMsg);
        recordLoginActivity('anonymous', {
          method: 'Email',
          status: 'Failed',
          email: cleanEmail,
          userName: fullName.trim(),
          failureReason: friendlyMsg
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Sign in
      console.log('[Auth Action] Logging in user with email:', cleanEmail);
      setLoading(true);
      try {
        const cred = await loginWithEmail(cleanEmail, cleanPassword);
        console.log('[Auth Action] Login successful for user:', cred.user?.uid);

        // Also sign in to Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            await loginWithSupabaseEmail(cleanEmail, cleanPassword);
            console.log('[Auth Action] Supabase user session synchronized.');
          } catch (sbErr) {
            console.warn('[Auth Action] Supabase login notice:', sbErr);
          }
        }

        if (cred.user) {
          await recordLoginActivity(cred.user.uid, {
            method: 'Email',
            status: 'Success',
            email: cleanEmail,
            userName: cred.user.displayName || '',
            userAvatar: cred.user.photoURL || ''
          });
          console.log('[Route Navigation] Navigating to / (Dashboard)');
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error('[Auth Action Error] Login failed:', err);
        const friendlyMsg = formatAuthError(err);
        triggerError(friendlyMsg);
        recordLoginActivity('anonymous', {
          method: 'Email',
          status: 'Failed',
          email: cleanEmail,
          failureReason: friendlyMsg
        });
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
    if (value && index < currentPinLength - 1) {
      pinRefs.current[index + 1]?.focus();
    }
    
    // Check if full PIN entered
    if (newPin.every((p) => p !== '') && newPin.length === currentPinLength) {
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
      setPin(Array(currentPinLength).fill(''));
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
          className="bg-[#171717] border border-white/[0.08] p-5 sm:p-8 rounded-2xl sm:rounded-[24px] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] relative overflow-hidden"
        >
          {/* Top subtle sheen */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'signin' && 'Welcome Back'}
              {authMode === 'signup' && 'Create Cloud Account'}
              {authMode === 'forgot' && 'Reset Password'}
              {authMode === 'pin' && 'Enter Quick PIN'}
            </h1>
            <p className="text-[#86868b] text-sm mt-1.5 font-medium">
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
              className="bg-[#ff453a]/10 border border-[#ff453a]/25 text-[#ff453a] px-4 py-3 rounded-2xl mb-5 text-sm space-y-2"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
                <span className="leading-relaxed text-xs">{error}</span>
              </div>
              
              {(error.includes('Authorized Domain') || error.includes('auth/internal-error') || error.includes('Configuration Error')) && (
                <div className="pt-2 border-t border-[#ff453a]/20 text-xs text-white/80 space-y-1">
                  <p className="font-semibold text-[#ff453a]">Firebase Setup Checklist:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#86868b]">
                    <li>Project ID: <code className="text-[#ffd60a] bg-white/5 px-1 py-0.5 rounded">studio-3200340687-9f052</code></li>
                    <li>Current Host: <code className="text-[#ffd60a] bg-white/5 px-1 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.hostname : 'current domain'}</code></li>
                    <li>Firebase Console → Authentication → Sign-in method → Enable <strong>Google</strong></li>
                    <li>Firebase Console → Authentication → Settings → Authorized domains → Add <strong>{typeof window !== 'undefined' ? window.location.hostname : 'domain'}</strong></li>
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#30d158]/10 border border-[#30d158]/25 text-[#30d158] px-4 py-3 rounded-2xl mb-5 text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Mode Switchers */}
          {authMode !== 'pin' && authMode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#1c1c1e] border border-white/[0.08] rounded-full mb-6 shadow-sm">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setError(''); }}
                className={cn(
                  'py-2 text-xs font-semibold rounded-full transition-all',
                  authMode === 'signin'
                    ? 'bg-[#0a84ff] text-white shadow-[0_2px_8px_rgba(10,132,255,0.3)]'
                    : 'text-[#86868b] hover:text-white'
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); }}
                className={cn(
                  'py-2 text-xs font-semibold rounded-full transition-all',
                  authMode === 'signup'
                    ? 'bg-[#0a84ff] text-white shadow-[0_2px_8px_rgba(10,132,255,0.3)]'
                    : 'text-[#86868b] hover:text-white'
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
                className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-neutral-100 font-semibold py-3 px-4 rounded-full transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {googleLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-900" />
                    <span>Signing in with Google...</span>
                  </div>
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
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
                <span className="text-xs text-[#86868b] uppercase tracking-widest font-mono">Or with email</span>
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
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
              <div className="flex justify-center gap-2 sm:gap-3">
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
                      'w-11 sm:w-14 h-13 sm:h-16 bg-[#1f1f1f] border rounded-xl sm:rounded-2xl text-center text-xl sm:text-2xl text-white font-mono focus:outline-none transition-all',
                      digit ? 'border-[#0a84ff] shadow-[0_0_15px_rgba(10,132,255,0.3)]' : 'border-white/[0.08] focus:border-[#0a84ff]'
                    )}
                  />
                ))}
              </div>
              
              <button
                type="button"
                disabled={loading || pin.some((p) => p === '')}
                onClick={() => handlePinSubmit(pin.join(''))}
                className="w-full bg-[#0a84ff] hover:bg-[#0a84ff]/90 disabled:opacity-50 text-white rounded-full py-3.5 font-semibold transition-all shadow-[0_4px_16px_rgba(10,132,255,0.3)] flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Wallet'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setError(''); }}
                  className="text-xs text-[#0a84ff] hover:underline font-medium transition-colors"
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
                  <label className="block text-xs font-semibold text-white/90 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#86868b] focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#86868b] focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 transition-all"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-white/90">Password</label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setError(''); }}
                        className="text-xs text-[#0a84ff] hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#86868b] focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 transition-all"
                    />
                  </div>
                </div>
              )}

              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#1f1f1f] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#86868b] focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-[#0a84ff] hover:bg-[#0a84ff]/90 text-white font-semibold py-3.5 px-4 rounded-full transition-all shadow-[0_4px_16px_rgba(10,132,255,0.3)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 text-sm"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {authMode === 'signin' && 'Signing in to Ledger...'}
                      {authMode === 'signup' && 'Creating Account...'}
                      {authMode === 'forgot' && 'Sending Recovery Email...'}
                    </span>
                  </div>
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
                    className="text-xs text-[#86868b] hover:text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Bottom PIN fallback toggle */}
          {authMode !== 'pin' && (
            <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#86868b]">
              <span className="flex items-center gap-1.5 text-[#86868b]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#30d158]" />
                End-to-End Encrypted Cloud Sync
              </span>
              <button
                type="button"
                onClick={() => { setAuthMode('pin'); setError(''); }}
                className="text-[#0a84ff] hover:underline font-semibold flex items-center gap-1 transition-colors"
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
