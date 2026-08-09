import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  Wallet, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Cloud, 
  Zap, 
  Shield, 
  ArrowUpRight, 
  TrendingUp,
  IndianRupee,
  Layers,
  Check,
  Mail,
  KeyRound,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Auth method state
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();

  // Mouse tracking for reactive spotlight and 3D tilt effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  // Card 3D tilt
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7deg', '-7deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7deg', '7deg']);

  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalized coordinates (-0.5 to 0.5)
    mouseX.set(x / width - 0.5);
    mouseY.set(y / height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleGoogleSignIn = async () => {
    if (loading || authSuccess) return;
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setAuthSuccess(true);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 900);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored fast clicks
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network connection error. Please check your internet connection.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Google Sign-In unauthorized on this domain. Please use Email/Password or Guest Demo Mode below.');
        setAuthMethod('email');
      } else {
        setError(err.message || 'Failed to authenticate with Google. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (loading || authSuccess) return;
    setLoading(true);
    setError('');

    try {
      let result;
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      if (result.user) {
        setAuthSuccess(true);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 900);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (loading || authSuccess) return;
    setLoading(true);
    setError('');
    try {
      const result = await signInAnonymously(auth);
      if (result.user) {
        setAuthSuccess(true);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 900);
      }
    } catch (err: any) {
      console.error('Guest Login Error:', err);
      setError(err.message || 'Failed to sign in as guest.');
      setLoading(false);
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen bg-[#03050e] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white"
    >
      {/* 1. Dynamic Aurora Mesh & Light Beams Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep ambient radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-indigo-600/20 via-blue-600/10 to-transparent blur-[160px] opacity-80" />
        
        {/* Animated Aurora Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.25, 1],
            x: [0, 60, 0],
            y: [0, -40, 0],
            opacity: [0.35, 0.55, 0.35]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-transparent rounded-full blur-[140px]"
        />

        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -70, 0],
            y: [0, 50, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/3 -right-40 w-[650px] h-[650px] bg-gradient-to-tl from-cyan-500/20 via-blue-600/20 to-transparent rounded-full blur-[160px]"
        />

        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            y: [0, -30, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-transparent rounded-full blur-[150px]"
        />

        {/* Diagonal Light Beams */}
        <div className="absolute top-0 left-1/4 w-[1px] h-[800px] bg-gradient-to-b from-transparent via-indigo-500/15 to-transparent -rotate-45 blur-[1px]" />
        <div className="absolute top-0 right-1/3 w-[1px] h-[900px] bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent -rotate-45 blur-[1px]" />

        {/* Low-opacity Futuristic Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem]"
          style={{ maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)' }}
        />

        {/* Floating Star/Particle Dots */}
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200), 
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: Math.random() * 0.6 + 0.2,
              scale: Math.random() * 0.8 + 0.5
            }}
            animate={{ 
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{ 
              duration: 4 + Math.random() * 6, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: Math.random() * 5 
            }}
            className="absolute w-1 h-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          />
        ))}
      </div>

      {/* Main Responsive Grid Container */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10 py-6">
        
        {/* LEFT COLUMN: Main Floating Glass Authentication Card */}
        <div className="xl:col-span-6 flex flex-col items-center xl:items-start justify-center w-full">
          
          <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[460px] relative group"
          >
            {/* Outer Pulsing Glow Aura */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/40 via-indigo-600/40 to-purple-600/40 rounded-[34px] blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none" />

            {/* Glassmorphism Card Container */}
            <div className="relative w-full bg-[#0a0d1d]/80 backdrop-blur-3xl border border-white/10 p-8 sm:p-10 rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col items-center overflow-hidden">
              
              {/* Subtle inner top highlight beam */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent pointer-events-none" />
              
              {/* Corner Glass Light Reflection */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* 1. SmartLedger Logo with Neon Aura */}
              <motion.div 
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-6"
              >
                <div className="absolute -inset-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-60 animate-pulse" />
                <motion.div 
                  whileHover={{ rotate: 6, scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)] border border-white/30 cursor-pointer"
                >
                  <Wallet className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" size={32} />
                </motion.div>
              </motion.div>

              {/* 2. Heading with Gradient Shine & Subtitle */}
              <div className="text-center mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold mb-3.5 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                >
                  <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                  <span>Account-Based Financial Intelligence</span>
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ delay: 0.25, duration: 0.6 }}
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200"
                >
                  SMARTLEDGER
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="text-slate-400 text-xs sm:text-sm mt-2.5 leading-relaxed max-w-xs sm:max-w-sm mx-auto"
                >
                  Sign in with Google to enter your isolated personal ledger with real-time Firestore sync & encrypted multi-device backups.
                </motion.p>
              </div>

              {/* Error Message Box */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="w-full bg-red-500/10 border border-red-500/25 text-red-300 p-3.5 rounded-2xl mb-6 text-xs text-center flex items-center justify-center gap-2 backdrop-blur-md"
                  >
                    <AlertCircle size={16} className="flex-shrink-0 text-red-400" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auth Method Switcher Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl mb-6 w-full border border-white/10">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('google'); setError(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === 'google' 
                      ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Google Sign-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setError(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === 'email' 
                      ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail size={13} />
                  <span>Email / Password</span>
                </button>
              </div>

              {authMethod === 'google' ? (
                <div className="w-full space-y-4">
                  {/* Premium Google Sign-In Button */}
                  <motion.button
                    type="button"
                    disabled={loading || authSuccess}
                    onClick={handleGoogleSignIn}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full relative overflow-hidden rounded-2xl py-4 px-6 transition-all duration-300 flex items-center justify-center gap-3.5 font-semibold text-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] border ${
                      authSuccess 
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-white hover:bg-neutral-50 text-slate-900 border-white/80 hover:shadow-[0_0_35px_rgba(255,255,255,0.25)]'
                    } group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#0a0d1d]`}
                  >
                    {/* Shine Sweep Beam */}
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                    <AnimatePresence mode="wait">
                      {authSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2.5 font-bold"
                        >
                          <Check className="w-5 h-5 text-white animate-bounce" />
                          <span>Authenticated! Redirecting...</span>
                        </motion.div>
                      ) : loading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2.5 text-slate-800 font-semibold"
                        >
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                          <span>Signing you in...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="normal"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3"
                        >
                          {/* Authentic Google 4-Color Icon */}
                          <svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span className="tracking-tight text-slate-900 font-semibold">Continue with Google</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleGuestLogin}
                      disabled={loading || authSuccess}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer font-medium"
                    >
                      Or continue instantly as Guest Demo User
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEmailAuth} className="w-full space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || authSuccess}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm shadow-[0_10px_25px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : authSuccess ? (
                      <>
                        <Check className="w-4 h-4 animate-bounce" />
                        <span>Success! Redirecting...</span>
                      </>
                    ) : (
                      <span>{isSignUp ? 'Create Account & Sign In' : 'Sign In with Email'}</span>
                    )}
                  </motion.button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer"
                    >
                      {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGuestLogin}
                      disabled={loading}
                      className="text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                      Guest Mode
                    </button>
                  </div>
                </form>
              )}

              {/* 4. Glass Pills Trust Section */}
              <div className="mt-8 pt-6 border-t border-white/10 w-full flex flex-col items-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-300 text-[11px] font-medium mb-4">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Private Account Isolation Active</span>
                </div>

                {/* 4 Trust Badges */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <motion.div 
                    whileHover={{ scale: 1.03, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md transition-all text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                      <Lock size={12} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-200">End-to-End</div>
                      <div className="text-[9px] text-slate-400">AES Encryption</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.03, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md transition-all text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Cloud size={12} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-200">Cloud Sync</div>
                      <div className="text-[9px] text-slate-400">Across Devices</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.03, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md transition-all text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Zap size={12} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-200">Real-Time</div>
                      <div className="text-[9px] text-slate-400">Instant Updates</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.03, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md transition-all text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                      <Shield size={12} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-200">Private Vault</div>
                      <div className="text-[9px] text-slate-400">UID Isolated</div>
                    </div>
                  </motion.div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Interactive 3D Financial Dashboard Mockup (Visible on screens >= 1200px / xl) */}
        <div className="hidden xl:flex xl:col-span-6 flex-col items-center justify-center relative">
          
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative max-w-lg"
          >
            {/* Background Glow for Mockup */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-purple-600/30 rounded-[40px] blur-2xl opacity-70" />

            {/* Main Interactive Glass Frame */}
            <div className="relative bg-[#0c1026]/85 backdrop-blur-3xl border border-white/15 rounded-[32px] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-400 ml-2">SmartLedger Workspace v2.4</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Firestore Active
                </div>
              </div>

              {/* Balance Showcase Card inside Mockup */}
              <div className="bg-gradient-to-br from-indigo-900/60 via-slate-900/80 to-blue-950/70 border border-white/15 rounded-2xl p-5 relative overflow-hidden mb-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Available Balance</span>
                    <div className="text-3xl font-extrabold text-white mt-1 flex items-center gap-1">
                      <span>₹1,48,500.00</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp size={12} /> +14.2%
                      </span>
                    </div>
                  </div>

                  {/* Rotating Glass Orb with Indian Rupee */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg"
                  >
                    <IndianRupee className="w-6 h-6 text-indigo-300" />
                  </motion.div>
                </div>

                {/* Micro Sparkline Visual Representation */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Monthly Goal Progress</span>
                  <span className="text-indigo-300 font-semibold">82% Completed</span>
                </div>
                <div className="w-full bg-slate-800/80 h-2 rounded-full mt-1.5 overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "82%" }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full"
                  />
                </div>
              </div>

              {/* Recent Activity Mini Cards */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Live Account Ledger</span>
                  <span className="text-[10px] text-indigo-400">Auto Sync</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ArrowUpRight size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Client Payment Received</div>
                      <div className="text-[10px] text-slate-400">Verified via Firestore Sync</div>
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-emerald-400">+₹24,500.00</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Pending Invoice #8042</div>
                      <div className="text-[10px] text-slate-400">Automated WhatsApp Reminder</div>
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-amber-400">₹8,200.00</div>
                </div>
              </div>

            </div>

            {/* Floating 3D Badge 1 */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -left-6 bg-[#131938]/90 border border-indigo-500/30 p-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs text-slate-200 font-semibold"
            >
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Google UID Isolation</div>
                <div className="text-[10px] text-slate-400">Strict Data Privacy</div>
              </div>
            </motion.div>

            {/* Floating 3D Badge 2 */}
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -right-6 bg-[#131938]/90 border border-cyan-500/30 p-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs text-slate-200 font-semibold"
            >
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Zap size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Real-Time Sync</div>
                <div className="text-[10px] text-slate-400">Multi-Device Support</div>
              </div>
            </motion.div>

          </motion.div>

        </div>

      </div>
    </div>
  );
}
