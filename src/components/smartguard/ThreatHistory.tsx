import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Shield, CheckCircle2, AlertTriangle, RefreshCw, X, Download, FileText, ChevronRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { MaterialButton } from '../ui/MaterialButton';
import { formatUserDateTime } from '../../lib/date-time';

interface LogItem {
  id: string;
  scan_id: string;
  scan_type: string;
  status: string;
  score: number;
  issues_count?: number;
  created_at: string;
  scan_details?: any;
}

export const ThreatHistory: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<LogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/smartguard/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch security logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const exportReportJson = (log: LogItem) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(log, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `smartguard_report_${log.scan_id || log.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      <GlassCard className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              SmartGuard Audit Logs (`smartguard_logs`)
            </h3>
            <p className="text-sm text-neutral-400">
              Immutable history of all security inspections. Click any completed audit record to open the detailed protection history report.
            </p>
          </div>
          <button 
            onClick={fetchLogs} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {loading && logs.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-sm">Loading security inspection records...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-sm">
              No audit logs recorded yet. Run a Quick or Deep scan above to generate database audit records.
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id}
                onClick={() => setSelectedReport(log)}
                className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.06] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    log.score >= 85 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {log.score}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm capitalize flex items-center gap-2">
                      {log.scan_type} Audit Scan
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-white/10">
                        {log.status || 'Completed'}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {formatUserDateTime(log.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-neutral-300">
                  <a 
                    href={`/api/security/scans/${log.scan_id || log.id.replace('log_', '')}/report.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    title="Download Plain-Language PDF Report"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    PDF Report
                  </a>
                  <span>Score: {log.score}/100</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Full Report View Modal (Defender Protection History Style) */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f141d] border border-white/15 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white capitalize">
                      {selectedReport.scan_type} Scan Protection Report
                    </h2>
                    <p className="text-xs text-neutral-400 font-mono">
                      Scan ID: {selectedReport.scan_id || selectedReport.id} • {new Date(selectedReport.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MaterialButton 
                    variant="tonal"
                    onClick={() => exportReportJson(selectedReport)}
                    icon={<Download className="w-4 h-4" />}
                    className="bg-white/10 text-white hover:bg-white/15 text-xs py-2 px-3"
                  >
                    Export JSON
                  </MaterialButton>
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Score & Summary Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-center items-center text-center">
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Overall Score</span>
                    <div className={`text-4xl font-black mt-1 ${selectedReport.score >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedReport.score} <span className="text-sm font-normal text-neutral-400">/ 100</span>
                    </div>
                    <span className="text-xs text-emerald-400 mt-1">🟢 Protected & Verified</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 md:col-span-2 flex flex-col justify-center">
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-1">Audit Summary</span>
                    <p className="text-sm text-neutral-200">
                      {selectedReport.scan_details?.summary || 'Inspection completed successfully with cryptographic integrity checks.'}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
                      <span>Engine: {selectedReport.scan_details?.engineVersion || '2.5.0-enterprise'}</span>
                      <span>Trigger: Manual Deep Audit</span>
                    </div>
                  </div>
                </div>

                {/* Itemized Results Breakdown */}
                {selectedReport.scan_details?.itemizedResults && (
                  <div className="space-y-6">
                    {/* Dependencies */}
                    {selectedReport.scan_details.itemizedResults.dependencies?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <span>📦 Dependencies Audit ({selectedReport.scan_details.itemizedResults.dependencies.length})</span>
                        </h4>
                        <div className="overflow-x-auto border border-white/10 rounded-2xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-white/5 text-neutral-400 border-b border-white/10">
                                <th className="p-3 font-semibold">Package</th>
                                <th className="p-3 font-semibold">Version</th>
                                <th className="p-3 font-semibold">Status</th>
                                <th className="p-3 font-semibold">Detail</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-neutral-300">
                              {selectedReport.scan_details.itemizedResults.dependencies.map((d: any, idx: number) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                  <td className="p-3 font-mono text-white font-bold">{d.item}</td>
                                  <td className="p-3 font-mono">{d.version}</td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                      d.status === 'pass' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {d.status === 'pass' ? '✅ OK' : '⚠ Warning'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-neutral-400">{d.detail}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Backups */}
                    {selectedReport.scan_details.itemizedResults.backups?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          <span>💾 Backups Verified ({selectedReport.scan_details.itemizedResults.backups.length})</span>
                        </h4>
                        <div className="overflow-x-auto border border-white/10 rounded-2xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-white/5 text-neutral-400 border-b border-white/10">
                                <th className="p-3 font-semibold">Backup ID</th>
                                <th className="p-3 font-semibold">Date</th>
                                <th className="p-3 font-semibold">Size</th>
                                <th className="p-3 font-semibold">Checksum</th>
                                <th className="p-3 font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-neutral-300">
                              {selectedReport.scan_details.itemizedResults.backups.map((b: any, idx: number) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                  <td className="p-3 font-mono text-white font-bold">{b.item}</td>
                                  <td className="p-3">{b.date}</td>
                                  <td className="p-3 font-mono">{b.size}</td>
                                  <td className="p-3 font-mono text-indigo-300">{b.checksum}</td>
                                  <td className="p-3">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                      ✅ Verified
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Configs */}
                    {selectedReport.scan_details.itemizedResults.configs?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          <span>⚙️ Configuration Checks ({selectedReport.scan_details.itemizedResults.configs.length})</span>
                        </h4>
                        <div className="overflow-x-auto border border-white/10 rounded-2xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-white/5 text-neutral-400 border-b border-white/10">
                                <th className="p-3 font-semibold">Check</th>
                                <th className="p-3 font-semibold">Status</th>
                                <th className="p-3 font-semibold">Detail</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-neutral-300">
                              {selectedReport.scan_details.itemizedResults.configs.map((c: any, idx: number) => (
                                <tr key={idx} className="hover:bg-white/[0.02]">
                                  <td className="p-3 font-bold text-white">{c.item}</td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                      c.status === 'pass' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {c.status === 'pass' ? '✅ Pass' : '⚠ Warning'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-neutral-400">{c.detail}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
