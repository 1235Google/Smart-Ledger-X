import React from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, Smartphone, Lock, Fingerprint, ScanFace } from 'lucide-react';
import { motion } from 'motion/react';

export default function SecurityCenter() {
  const { securitySettings, updateSecuritySettings, lockApp } = useStore();

  return (
    <div className="w-full space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Security Center</h1>
        <p className="text-neutral-400 mt-1">Manage your app security and access.</p>
      </header>

      {/* PIN Settings */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="text-blue-400"/> PIN Lock
        </h2>
        <div className="flex items-center justify-between">
            <p className="text-neutral-300">Enable PIN for app access</p>
            <input type="checkbox" checked={securitySettings.pinEnabled} onChange={e => updateSecuritySettings({ pinEnabled: e.target.checked })} />
        </div>
      </div>

      {/* Biometrics */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Fingerprint className="text-blue-400"/> Biometric Unlock
        </h2>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-neutral-300">Fingerprint</p>
                <input type="checkbox" checked={securitySettings.biometricEnabled} onChange={e => updateSecuritySettings({ biometricEnabled: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
                <p className="text-neutral-300">Face Unlock</p>
                <input type="checkbox" checked={securitySettings.faceUnlockEnabled} onChange={e => updateSecuritySettings({ faceUnlockEnabled: e.target.checked })} />
            </div>
        </div>
      </div>
      
      {/* Lock App */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="text-blue-400"/> Security Actions
        </h2>
        <button 
          onClick={lockApp}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl"
        >
          Lock App Now
        </button>
      </div>
    </div>
  );
}
