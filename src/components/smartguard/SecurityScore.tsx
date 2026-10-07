import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface SecurityScoreProps {
  score: number;
  breakdown: {
    backup: number; // max 25
    auth: number; // max 25
    encryption: number; // max 20
    activity: number; // max 15
    systemHealth: number; // max 15
  };
  issues: string[];
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({ score, breakdown, issues }) => {
  const isHealthy = score >= 85;
  const isWarning = score >= 60 && score < 85;

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (score / 100) * circumference;

  return (
    <GlassCard className="p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Shield className="w-3.5 h-3.5" />
            SmartGuard Engine
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            System Security Score
          </h2>
          <p className="text-sm text-neutral-400 max-w-md">
            Real-time heuristic audit of your cryptographic backups, session auth, database integrity, and anomaly detection.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
              isHealthy ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
              isWarning ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
              'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}>
              {isHealthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {isHealthy ? 'Fully Protected' : isWarning ? 'Moderate Attention Needed' : 'Vulnerable'}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Calculated dynamically
            </span>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              className="text-white/10 fill-none"
            />
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: progressOffset }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              strokeLinecap="round"
              className="fill-none"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#635BFF" />
                <stop offset="100%" stopColor="#30D158" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-white tabular-nums tracking-tight">
              {score}
            </span>
            <span className="text-xs font-medium text-neutral-400">out of 100</span>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-white/10">
        <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
          <div className="text-xs text-neutral-400 mb-1">Backup Security</div>
          <div className="text-lg font-bold text-white tabular-nums">{breakdown.backup} <span className="text-xs font-normal text-neutral-500">/ 25</span></div>
        </div>
        <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
          <div className="text-xs text-neutral-400 mb-1">Authentication</div>
          <div className="text-lg font-bold text-white tabular-nums">{breakdown.auth} <span className="text-xs font-normal text-neutral-500">/ 25</span></div>
        </div>
        <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
          <div className="text-xs text-neutral-400 mb-1">AES-256 Crypto</div>
          <div className="text-lg font-bold text-white tabular-nums">{breakdown.encryption} <span className="text-xs font-normal text-neutral-500">/ 20</span></div>
        </div>
        <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
          <div className="text-xs text-neutral-400 mb-1">Login Monitoring</div>
          <div className="text-lg font-bold text-white tabular-nums">{breakdown.activity} <span className="text-xs font-normal text-neutral-500">/ 15</span></div>
        </div>
        <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5 col-span-2 md:col-span-1">
          <div className="text-xs text-neutral-400 mb-1">System Health</div>
          <div className="text-lg font-bold text-white tabular-nums">{breakdown.systemHealth} <span className="text-xs font-normal text-neutral-500">/ 15</span></div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex flex-col gap-1.5">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Opportunities for Maximum Security Hardening:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-200/90 pl-1">
            {issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
};
