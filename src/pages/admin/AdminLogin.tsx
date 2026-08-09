import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function AdminLogin() {
  const { adminLogin, isAdminAuthenticated } = useStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@smartledgerx.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // If already authenticated, redirect to Entries page
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/ledger', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setError('Please enter the admin password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await adminLogin(trimmedPassword, email);
      if (result.success) {
        navigate('/admin/ledger', { replace: true });
      } else {
        setError(result.error || 'Invalid Admin Password');
      }
    } catch (err: any) {
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSent(false);
      setForgotEmail('');
      alert('Password reset instructions sent to your admin email.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <div className="w-full h-full bg-[#0a0a0a] rounded-[14px] flex items-center justify-center">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-emerald-400">
            SmartLedger Admin
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Centralized Admin Portal</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Admin Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@smartledgerx.io"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Admin Password</label>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                <Lock size={18} />
              </div>
              <input 
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-11 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400 select-none">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-black/40 border-white/20 text-emerald-500 focus:ring-emerald-500 w-4 h-4" 
              />
              <span>Remember session</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:opacity-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>Verifying Password...</span>
              </>
            ) : (
              <>
                <span>Access Admin Panel</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button 
            onClick={() => navigate('/')} 
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Back to SmartLedger App
          </button>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Reset Admin Password</h3>
            <p className="text-neutral-400 text-sm mb-6">Enter your registered admin email to receive secure recovery instructions.</p>
            
            {forgotSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
                <CheckCircle2 size={20} />
                <span>Recovery email dispatched successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@smartledgerx.io"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForgotModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm">Send Link</button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
