import React from 'react';

export function LuxuryVaultDisplay({ balance, status, cashEvents, prefersReducedMotion, vaultLoaded }: any) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-900 rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
      <div className="text-center z-10 p-6 backdrop-blur-md bg-white/5 rounded-2xl border border-white/10">
        <h3 className="text-xl font-medium text-slate-300 mb-2">Vault Balance</h3>
        <p className="text-4xl font-bold text-white tracking-tight">₹{balance.toLocaleString('en-IN')}</p>
        <p className="text-sm text-slate-400 mt-2">Static view (3D disabled for performance)</p>
      </div>
    </div>
  );
}

