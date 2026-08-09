import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const { loginWithPin } = useStore();

  useEffect(() => {
    // Focus first input on mount
    pinRefs.current[0]?.focus();
  }, []);

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
    if (newPin.every(p => p !== '') && newPin.length === 4) {
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
      setError('Incorrect PIN. Please try again.');
      setShake(true);
      setPin(['', '', '', '']);
      setTimeout(() => setShake(false), 500);
      pinRefs.current[0]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse delay-1000" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          x: shake ? [-10, 10, -10, 10, -5, 5, 0] : 0 
        }}
        transition={{ duration: shake ? 0.4 : 0.2 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="text-2xl font-bold tracking-widest text-white mb-2">SMARTLEDGER</div>
          <h1 className="text-xl font-semibold text-white/90">Enter PIN</h1>
          <p className="text-slate-400 text-sm mt-2">
            Enter your 4-digit PIN to continue
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <motion.div
          key="pin-form"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex justify-center gap-4">
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
                  "w-14 h-16 bg-neutral-900/50 border rounded-2xl text-center text-2xl text-white font-medium focus:outline-none transition-all",
                  digit ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-white/10 focus:border-indigo-500"
                )}
              />
            ))}
          </div>
          
          <button
            type="button"
            disabled={loading || pin.some(p => p === '')}
            onClick={() => handlePinSubmit(pin.join(''))}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl py-3 font-medium transition-colors flex items-center justify-center h-[52px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Wallet'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
