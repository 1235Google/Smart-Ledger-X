import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { auth } from '../lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

export default function MfaChallenge() {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Verification failed');
        return;
      }
      
      // Successfully verified. The backend returns a custom token with mfa_verified=true claim
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
        window.location.reload();
      } else {
        window.location.reload();
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f1015] z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1b23] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500"></div>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Shield className="text-blue-400 w-8 h-8" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-2">Two-Factor Authentication</h2>
        <p className="text-slate-400 text-center mb-8">
          Enter the 6-digit code from your authenticator app or a recovery code.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9A-Z]/g, '').toUpperCase())}
                placeholder="000000"
                maxLength={8}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-lg tracking-widest uppercase"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isVerifying || code.length < 6}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                VERIFY
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            type="button"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Use a recovery code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
