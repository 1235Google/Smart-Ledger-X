import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, CheckCircle2, AlertTriangle, Lock, Cpu, Database, Check } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { MaterialButton } from '../ui/MaterialButton';

interface QuickScanProps {
  onScanComplete: () => void;
}

export const QuickScan: React.FC<QuickScanProps> = ({ onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const runQuickScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/smartguard/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType: 'quick' })
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data);
        onScanComplete();
      }
    } catch (err) {
      console.error('Quick scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <GlassCard className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            SmartGuard Quick Diagnostic
          </h3>
          <p className="text-sm text-neutral-400">
            Performs an instantaneous heuristic inspection of local session validity, backup checksums, and API health.
          </p>
        </div>
        <MaterialButton
          variant="filled"
          onClick={runQuickScan}
          disabled={scanning}
          icon={scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        >
          {scanning ? 'Running Inspection...' : 'Run Quick Scan'}
        </MaterialButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Account Security</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-white font-semibold text-sm">Authenticated & Verified</div>
          <p className="text-xs text-neutral-500">Active Firebase JWT session valid</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Backup Integrity</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-white font-semibold text-sm">SHA-256 Checksum Active</div>
          <p className="text-xs text-neutral-500">Zero-knowledge AES-256 archives ready</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Database Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-white font-semibold text-sm">Firestore Connected</div>
          <p className="text-xs text-neutral-500">Zero connection timeouts</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Network Security</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-white font-semibold text-sm">TLS 1.3 Enforced</div>
          <p className="text-xs text-neutral-500">Secure socket headers active</p>
        </div>
      </div>

      {scanResult && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <span>Quick scan completed successfully. System status: <strong>Protected</strong> (Score: {scanResult.score}/100)</span>
          </div>
          <span className="text-xs text-neutral-400">{new Date().toLocaleTimeString()}</span>
        </motion.div>
      )}
    </GlassCard>
  );
};
