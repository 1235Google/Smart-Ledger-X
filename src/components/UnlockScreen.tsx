import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import CryptoJS from 'crypto-js';

export default function UnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { updateSecuritySettings, securitySettings } = useStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isCreating, setIsCreating] = useState(!securitySettings.pin);
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleUnlock = () => {
    const hashedPin = CryptoJS.SHA256(pin).toString();
    if (securitySettings.pin === hashedPin) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleCreate = () => {
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    const hashedPin = CryptoJS.SHA256(pin).toString();
    updateSecuritySettings({ pin: hashedPin, pinEnabled: true });
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-neutral-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="text-blue-500" size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
            {isCreating ? 'Create PIN' : 'SmartLedger Locked'}
        </h2>
        <p className="text-neutral-400 mb-8">
            {isCreating ? 'Enter 4-digit PIN to secure your data' : 'Enter your PIN to unlock'}
        </p>

        <div className="flex justify-center gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length > i ? 'bg-white' : 'bg-transparent'} border-white/20`} />
            ))}
        </div>

        {isCreating && (
          <input 
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm PIN"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white mb-4"
          />
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                <button key={d} onClick={() => handleDigit(String(d))} className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xl">{d}</button>
            ))}
            <div />
            <button onClick={() => handleDigit('0')} className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xl">0</button>
            <button onClick={handleBackspace} className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold">⌫</button>
        </div>

        <button 
          onClick={isCreating ? handleCreate : handleUnlock} 
          className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold"
        >
            {isCreating ? 'Save PIN' : 'Unlock'}
        </button>
      </motion.div>
    </div>
  );
}
