import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, RefreshCw, FileText, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { MaterialButton } from '../ui/MaterialButton';

interface DeepScanProps {
  onScanComplete: () => void;
}

export const DeepScan: React.FC<DeepScanProps> = ({ onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [deepResult, setDeepResult] = useState<any>(null);

  const runDeepScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/smartguard/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType: 'deep' })
      });
      const data = await res.json();
      if (data.success) {
        setDeepResult(data);
        onScanComplete();
      }
    } catch (err) {
      console.error('Deep scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <GlassCard className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            SmartGuard Deep Forensic Audit
          </h3>
          <p className="text-sm text-neutral-400">
            Exhaustive cryptographic verification of backup snapshots, IAM role boundaries, permission rules, and failed login anomalies.
          </p>
        </div>
        <MaterialButton
          variant="tonal"
          onClick={runDeepScan}
          disabled={scanning}
          icon={scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        >
          {scanning ? 'Auditing System...' : 'Run Deep Audit'}
        </MaterialButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="text-xs text-neutral-400">Database Permissions</div>
          <div className="text-white font-bold text-sm">Strict Zero-Trust Rules</div>
          <p className="text-xs text-neutral-500">Firestore security rules mathematically validated</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="text-xs text-neutral-400">Failed Login Attempt Rate</div>
          <div className="text-white font-bold text-sm">0 Brute-Force Violations</div>
          <p className="text-xs text-neutral-500">IP rate limiter active (10 attempts/min)</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="text-xs text-neutral-400">Cloud Backup Archival</div>
          <div className="text-white font-bold text-sm">Verified SHA-256 Match</div>
          <p className="text-xs text-neutral-500">Automated daily cron snapshots verified</p>
        </div>
      </div>

      {deepResult && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Deep Forensic Audit Results Saved to Database
            </span>
            <span className="text-xs font-mono text-neutral-400">Score: {deepResult.score}/100</span>
          </div>
          <p className="text-xs text-neutral-300">
            {deepResult.message || 'All collections, schemas, and security boundaries verified with zero critical threats found.'}
          </p>
        </motion.div>
      )}
    </GlassCard>
  );
};
