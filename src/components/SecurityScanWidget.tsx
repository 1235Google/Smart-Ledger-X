import React from 'react';
import { useSecurityScan, ScanType } from '../hooks/useSecurityScan';
import { 
  Play, 
  Loader2, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Database, 
  KeyRound, 
  Lock, 
  Activity, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SecurityScanWidget() {
  const {
    scanState,
    scanType,
    setScanType,
    score,
    progress,
    lastScanTime,
    errorMessage,
    categories,
    triggerScan,
    clearError,
  } = useSecurityScan(95);

  const isScanning = scanState === 'scanning';
  const isSuccess = scanState === 'success';

  // Category Icon Mapping
  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'backupSecurity': return <Database className="w-4 h-4 text-sky-400" />;
      case 'authentication': return <KeyRound className="w-4 h-4 text-teal-400" />;
      case 'aesCrypto': return <Lock className="w-4 h-4 text-emerald-400" />;
      case 'loginMonitoring': return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
      default: return <Activity className="w-4 h-4 text-amber-400" />;
    }
  };

  // Circular gauge math (radius = 38, perimeter = 2 * PI * 38 ≈ 238.76)
  const radius = 38;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative bg-[#0d121c] border border-neutral-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden max-w-4xl mx-auto">
      
      {/* 2.5px Thin Top Progress Bar (Active during scan) */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-neutral-800/50 overflow-hidden">
        {isScanning && (
          <div 
            className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-sky-400 transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>

      {/* Header Row: Title, Dropdown, and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold tracking-tight text-white">
              Run Security Inspection
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Automated compliance audit across cryptographic storage, RBAC tokens, and ledger backups.
          </p>
        </div>

        {/* Controls Cluster: Dropdown + Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Scan Mode Dropdown */}
          <div className="relative">
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value as ScanType)}
              disabled={isScanning}
              className="w-full sm:w-auto appearance-none bg-neutral-900/90 hover:bg-neutral-800/90 text-neutral-200 border border-neutral-700/80 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="full">Full Application Scan (Standard)</option>
              <option value="quick">Quick Health Check (Essential)</option>
              <option value="deep">Deep Cryptographic Audit (Thorough)</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Action Button: Tactile, 150ms transitions, quiet confidence */}
          <button
            type="button"
            onClick={() => triggerScan(scanType)}
            disabled={isScanning}
            className={`
              relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
              transition-all duration-150 ease-out select-none
              ${isSuccess
                ? 'bg-emerald-600/90 text-white border border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : isScanning
                  ? 'bg-teal-700/70 text-teal-100 border border-teal-600/50 cursor-not-allowed opacity-90'
                  : 'bg-teal-500 hover:bg-teal-400 active:scale-[0.97] text-neutral-950 font-bold border border-teal-400/30 hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(20,184,166,0.3)]'}
            `}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Scan Completed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Inspection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Microcopy & Error Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 pb-2 text-[11px] text-neutral-400">
        <div>
          {lastScanTime ? (
            <span>
              Last scanned: <strong className="text-neutral-300 font-medium">{formatDistanceToNow(lastScanTime, { addSuffix: true })}</strong>
            </span>
          ) : (
            <span className="text-neutral-500">Ready to audit current posture</span>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
            <button
              onClick={() => triggerScan(scanType)}
              className="ml-2 underline hover:text-rose-300 flex items-center gap-0.5"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}
      </div>

      {/* Main Body: Circular Score Gauge + 5 Audit Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        
        {/* Left Column: System Security Score Gauge */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/40 border border-neutral-800/80">
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-neutral-800"
                strokeWidth={stroke}
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-teal-400 transition-[stroke-dashoffset] duration-600 ease-out"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Score Number Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black tracking-tight text-white font-mono">
                {score}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                / 100
              </span>
            </div>
          </div>

          <div className="text-center mt-3">
            <h4 className="text-xs font-bold text-neutral-200">System Security Score</h4>
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Grade A • Production Secured
            </p>
          </div>
        </div>

        {/* Right Columns: 5 Security Categories with subtle pulse when scanning */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(categories).map(([key, item]) => (
            <div
              key={key}
              className={`
                p-3.5 rounded-2xl bg-neutral-900/60 border transition-all duration-300
                ${isScanning 
                  ? 'border-teal-500/40 bg-teal-950/10 animate-pulse' 
                  : 'border-neutral-800/80 hover:border-neutral-700/80'}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700/70">
                    {getCategoryIcon(key)}
                  </span>
                  <span className="text-xs font-semibold text-neutral-200">{item.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-teal-300">
                  {item.score}%
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 pl-8 truncate">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
