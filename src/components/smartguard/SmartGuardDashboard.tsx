import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Cpu, Layers, History, ArrowLeft, Play, Square, CheckCircle2, AlertTriangle, RefreshCw, Clock, ChevronDown, ChevronUp, Download, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SecurityScore } from './SecurityScore';
import { ThreatHistory } from './ThreatHistory';
import { GlassCard } from '../ui/GlassCard';
import { MaterialButton } from '../ui/MaterialButton';
import { renameCategory, translateFinding } from '../../shared/security-plain-language';
import { formatUserDateTime, formatUserTime, formatDuration, getUserTimeZone } from '../../lib/date-time';

export default function SmartGuardDashboard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'quick' | 'full' | 'deep' | 'targeted'>('full');
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [expandedTable, setExpandedTable] = useState<'deps' | 'backups' | 'configs' | 'db' | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);
  const [scoreData, setScoreData] = useState({
    score: 95,
    breakdown: { backup: 25, auth: 25, encryption: 20, activity: 15, systemHealth: 10 },
    issues: []
  });

  // Poll active scan progress & check staleness (>45s stuck for deep, >25s for quick/full)
  useEffect(() => {
    if (!activeScanId) {
      setIsStale(false);
      return;
    }
    const threshold = mode === 'deep' ? 90000 : 30000;
    const timer = setInterval(() => {
      if (scanStartTime && Date.now() - scanStartTime > threshold && scanStatus?.status === 'queued') {
        setIsStale(true);
      }
    }, 2000);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/security/scans/${activeScanId}`);
        const data = await res.json();
        if (data.success && data.scan) {
          setScanStatus(data.scan);
          if (data.scan.status === 'completed' || data.scan.status === 'failed' || data.scan.status === 'cancelled') {
            setActiveScanId(null);
            setScanStartTime(null);
            setIsStale(false);
            const fRes = await fetch(`/api/security/scans/${activeScanId}/findings`);
            const fData = await fRes.json();
            if (fData.success) {
              setFindings(fData.findings || []);
            }
          }
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    }, 1500);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [activeScanId, scanStartTime, scanStatus?.status, mode]);

  const startScan = async () => {
    try {
      setIsStale(false);
      setExpandedTable(null);
      const res = await fetch('/api/security/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.scanId) {
        setActiveScanId(data.scanId);
        setScanStartTime(Date.now());
        setScanStatus({ status: 'queued', currentStage: 'Initializing', progress: { percent: 0, completedUnits: 0, totalUnits: mode === 'deep' ? 12 : 6 }, liveFeed: [] });
      }
    } catch (err) {
      console.error('Failed to start scan:', err);
    }
  };

  const cancelScan = async () => {
    if (!activeScanId) return;
    try {
      await fetch(`/api/security/scans/${activeScanId}/cancel`, { method: 'POST' });
      setActiveScanId(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold tracking-wide uppercase mb-1">
            <Shield className="w-4 h-4" />
            Plain-Language Security Architecture
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            SmartGuard Protection Center
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Automatic background inspection running independently of browser sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              showTechnical ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
            }`}
            title="Toggle between friendly plain-language wording and developer technical view"
          >
            {showTechnical ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showTechnical ? 'Technical Details: ON' : 'Technical Details: OFF'}
          </button>

          <MaterialButton
            variant="outlined"
            onClick={() => navigate('/settings')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Settings
          </MaterialButton>
        </div>
      </div>

      {/* Security Score Overview */}
      <SecurityScore 
        score={scanStatus?.finalScore || scoreData.score} 
        breakdown={scoreData.breakdown} 
        issues={scoreData.issues} 
      />

      {/* Asynchronous Scan Control Panel */}
      <GlassCard className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Run Security Inspection
            </h3>
            <p className="text-sm text-neutral-400">
              Select mode and dispatch durable worker job. Plain English reports generated automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-col gap-1">
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as any)}
                disabled={!!activeScanId}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="quick" className="bg-neutral-900">Quick Scan (Fast check)</option>
                <option value="full" className="bg-neutral-900">Full Application Scan (Standard)</option>
                <option value="deep" className="bg-neutral-900">Deep Scan (Thorough historical audit)</option>
              </select>
            </div>

            {!activeScanId ? (
              <MaterialButton
                variant="filled"
                onClick={startScan}
                icon={<Play className="w-4 h-4" />}
              >
                Run Scan
              </MaterialButton>
            ) : (
              <MaterialButton
                variant="tonal"
                onClick={cancelScan}
                icon={<Square className="w-4 h-4 text-rose-400" />}
                className="bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
              >
                Cancel Scan
              </MaterialButton>
            )}
          </div>
        </div>

        {mode === 'deep' && !activeScanId && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
            ℹ️ <strong>Deep Scan Mode:</strong> Checks your complete history — all backups, all data, and all files ever uploaded. This is the most thorough scan and may take several minutes depending on how much data you have.
          </div>
        )}

        {/* Live Active Scan Progress */}
        {isStale && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">Scan taking longer than expected. You can retry if needed.</span>
            </div>
            <MaterialButton variant="filled" onClick={startScan} className="bg-amber-500 text-neutral-950 font-bold text-xs py-1.5 px-3">
              Retry Scan
            </MaterialButton>
          </div>
        )}

        {scanStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
                  Status: {scanStatus.status.toUpperCase()}
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">{scanStatus.currentStage}</h4>
                <p className="text-xs text-neutral-300">{scanStatus.stageMessage}</p>
                {scanStatus.estimatedDuration && (
                  <p className="text-xs text-indigo-300 mt-1">⏱ Estimated duration: {scanStatus.estimatedDuration}</p>
                )}
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-white tabular-nums">
                  {scanStatus.progress?.percent || 0}%
                </div>
                <div className="text-xs text-neutral-400">
                  Unit {scanStatus.progress?.completedUnits || 0} of {scanStatus.progress?.totalUnits || 6}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                animate={{ width: `${scanStatus.progress?.percent || 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Live Plain-Language Terminal Feed */}
            {scanStatus.liveFeed && scanStatus.liveFeed.length > 0 && (
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs space-y-1.5 max-h-44 overflow-y-auto">
                <div className="text-indigo-400 font-bold mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Inspection Feed:
                </div>
                {scanStatus.liveFeed.map((feed: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-neutral-300">
                    <span className="text-neutral-500">[{formatUserTime(feed.timestamp)}]</span>
                    <span className={feed.severity === 'pass' ? 'text-emerald-400' : feed.severity === 'warning' ? 'text-amber-400' : 'text-indigo-300'}>
                      {feed.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Renamed Counts Grid (Clickable to Expand Itemized Tables) */}
            {scanStatus.scannedCounts && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
                <div 
                  onClick={() => setExpandedTable(expandedTable === 'db' ? null : 'db')}
                  className="bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-neutral-400 block text-[11px]">{renameCategory('databaseRecords')}</span>
                    <span className="text-white font-bold text-sm tabular-nums">{scanStatus.scannedCounts.databaseRecords}</span>
                  </div>
                  {expandedTable === 'db' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>

                <div 
                  onClick={() => setExpandedTable(expandedTable === 'backups' ? null : 'backups')}
                  className="bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-neutral-400 block text-[11px]">{renameCategory('backups')}</span>
                    <span className="text-white font-bold text-sm tabular-nums">{scanStatus.scannedCounts.backups}</span>
                  </div>
                  {expandedTable === 'backups' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>

                <div 
                  onClick={() => setExpandedTable(expandedTable === 'deps' ? null : 'deps')}
                  className="bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-neutral-400 block text-[11px]">{renameCategory('dependencies')}</span>
                    <span className="text-white font-bold text-sm tabular-nums">{scanStatus.scannedCounts.dependencies}</span>
                  </div>
                  {expandedTable === 'deps' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>

                <div 
                  onClick={() => setExpandedTable(expandedTable === 'configs' ? null : 'configs')}
                  className="bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-neutral-400 block text-[11px]">{renameCategory('configChecks')}</span>
                    <span className="text-white font-bold text-sm tabular-nums">{scanStatus.scannedCounts.configurationChecks}</span>
                  </div>
                  {expandedTable === 'configs' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>
              </div>
            )}

            {/* Expandable Itemized Tables */}
            {expandedTable && scanStatus.itemizedResults && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Itemized Breakdown: {expandedTable === 'deps' ? renameCategory('dependencies') : expandedTable === 'backups' ? renameCategory('backups') : expandedTable === 'configs' ? renameCategory('configChecks') : renameCategory('databaseRecords')}
                  </h5>
                  <button onClick={() => setExpandedTable(null)} className="text-xs text-neutral-400 hover:text-white">Close Table</button>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/30">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/5 text-neutral-400 border-b border-white/10">
                        <th className="p-2.5 font-semibold">Item</th>
                        {expandedTable === 'deps' && <th className="p-2.5 font-semibold">{showTechnical ? 'Package / Version' : 'Category'}</th>}
                        {expandedTable === 'backups' && <>
                          <th className="p-2.5 font-semibold">Date</th>
                          <th className="p-2.5 font-semibold">Size</th>
                          <th className="p-2.5 font-semibold">Checksum</th>
                        </>}
                        {expandedTable === 'db' && <th className="p-2.5 font-semibold">Type</th>}
                        <th className="p-2.5 font-semibold">Status</th>
                        <th className="p-2.5 font-semibold">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-neutral-300">
                      {expandedTable === 'deps' && scanStatus.itemizedResults.dependencies?.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 font-mono text-white font-bold">{showTechnical ? (d.rawName || d.item) : d.item}</td>
                          <td className="p-2.5 font-mono">{showTechnical ? d.version : 'Core Feature'}</td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'pass' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {d.status === 'pass' ? '✅ OK' : '⚠ Warning'}
                            </span>
                          </td>
                          <td className="p-2.5 text-neutral-400">{d.detail}</td>
                        </tr>
                      ))}

                      {expandedTable === 'backups' && scanStatus.itemizedResults.backups?.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 font-mono text-white font-bold">{showTechnical ? (b.rawName || b.item) : b.item}</td>
                          <td className="p-2.5">{b.date}</td>
                          <td className="p-2.5 font-mono">{b.size}</td>
                          <td className="p-2.5 font-mono text-indigo-300">{b.checksum}</td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✅ Verified
                            </span>
                          </td>
                        </tr>
                      ))}

                      {expandedTable === 'configs' && scanStatus.itemizedResults.configs?.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 font-bold text-white">{c.item}</td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'pass' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {c.status === 'pass' ? '✅ Pass' : '⚠ Warning'}
                            </span>
                          </td>
                          <td className="p-2.5 text-neutral-400">{c.detail}</td>
                        </tr>
                      ))}

                      {expandedTable === 'db' && scanStatus.itemizedResults.databaseRecords?.map((dbRec: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 font-mono text-white font-bold">{showTechnical ? dbRec.item : 'Protected Account Record'}</td>
                          <td className="p-2.5 text-indigo-300">{dbRec.type}</td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✅ Pass
                            </span>
                          </td>
                          <td className="p-2.5 text-neutral-400">{dbRec.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {scanStatus.status === 'completed' && (
              <div className="pt-3 flex items-center justify-between border-t border-white/10 mt-4">
                <span className="text-xs text-emerald-300 font-semibold">✓ Inspection completed & plain-language PDF report generated</span>
                <a 
                  href={`/api/security/scans/${scanStatus.id}/report.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Report
                </a>
              </div>
            )}
          </motion.div>
        )}

        {/* Findings List (Translated via Shared Plain Language Module) */}
        {findings.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Audit Findings & Recommendations</h4>
            <div className="space-y-3">
              {findings.map((f: any) => {
                const plain = translateFinding(f);
                return (
                  <div key={f.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          plain.actionType === 'user' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {plain.actionType === 'user' ? 'Needs Your Attention' : 'Needs a Developer'}
                        </span>
                        <span className="text-white font-bold text-sm">{plain.title}</span>
                      </div>
                      {showTechnical && <span className="text-xs font-mono text-neutral-500">{f.checkId}</span>}
                    </div>
                    <p className="text-xs text-neutral-300">{plain.explanation}</p>
                    <p className="text-xs text-indigo-300 font-semibold bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20">
                      <strong>What to do:</strong> {plain.actionText}
                    </p>
                    {showTechnical && (
                      <div className="text-[10px] font-mono text-neutral-500 pt-1">
                        Technical payload: {f.title} ({f.description})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Threat & Audit History */}
      <ThreatHistory />
    </div>
  );
}
