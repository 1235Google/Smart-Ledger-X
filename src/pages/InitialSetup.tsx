import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function InitialSetup() {
  const { setStartingBalance } = useStore();
  const [balance, setBalance] = useState('14000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(balance);
    if (!isNaN(amount)) {
      setStartingBalance(amount);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SmartLedger</h1>
          <p className="text-slate-400 mt-2 text-center text-sm">Let's set up your personal banking dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">Current Bank Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-lg"
                required
              />
            </div>
            <p className="text-xs text-slate-500">You can always change this later in settings.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            Start Managing
          </button>
        </form>
      </motion.div>
    </div>
  );
}
