import React from 'react';
import { Wallet, Shield, Zap, Sparkles, CheckCircle, ExternalLink, Award, Users, Lock, Server } from 'lucide-react';

export default function About() {
  return (
    <div className="w-full space-y-8 max-w-4xl mx-auto">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-950/60 via-neutral-900 to-black p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 border border-white/20 flex-shrink-0">
            <Wallet size={40} className="text-white" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles size={14} />
              <span>Version 2.4.0 Enterprise</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">SmartLedger</h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
              An intelligent, cloud-synchronized financial management & ledger platform built for speed, security, and seamless bookkeeping.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield size={20} />
          </div>
          <h3 className="font-bold text-white text-lg">Bank-Grade Security</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-factor protection including PIN unlock, WebAuthn biometric security, and Firebase real-time rule enforcement keeping your records private.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Server size={20} />
          </div>
          <h3 className="font-bold text-white text-lg">Firestore Cloud Sync</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instant multi-device synchronization powered by Google Firebase Firestore. Your ledger entries and reports update in real-time across devices.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award size={20} />
          </div>
          <h3 className="font-bold text-white text-lg">Gullak & Goal Tracking</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Smart savings target calculators, milestone celebrations, and habit trackers designed to keep your financial health on target.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap size={20} />
          </div>
          <h3 className="font-bold text-white text-lg">Automated Reminders</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Integrated reminder system for pending payments and customer logs with flexible delivery frequency and automated notification logs.
          </p>
        </div>
      </div>

      {/* Tech Specifications */}
      <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white">System Architecture & Tech Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 block">Frontend</span>
            <span className="text-sm font-semibold text-white mt-1 block">React 18 + Vite</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 block">Styling</span>
            <span className="text-sm font-semibold text-white mt-1 block">Tailwind CSS</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 block">Database</span>
            <span className="text-sm font-semibold text-white mt-1 block">Firebase Firestore</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-xs text-slate-400 block">Authentication</span>
            <span className="text-sm font-semibold text-white mt-1 block">Firebase Auth</span>
          </div>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="text-center text-xs text-slate-500 pt-4">
        <p>© 2026 SmartLedger Technologies Inc. All rights reserved.</p>
      </div>
    </div>
  );
}
