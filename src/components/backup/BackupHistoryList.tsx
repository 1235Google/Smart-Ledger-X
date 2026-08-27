import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Database, Download, RotateCcw, Trash2, Eye, 
  CheckCircle2, Clock, Shield, Search, FileJson, 
  HardDrive, Server, Smartphone, Sparkles, Filter,
  AlertCircle
} from 'lucide-react';
import { BackupMetadata, BackupType, BackupItemCounts } from '../../types';
import { BackupService } from '../../lib/backupService';
import { formatDate } from '../../lib/utils';

interface BackupHistoryListProps {
  backups: BackupMetadata[];
  isLoading: boolean;
  onRestore: (backup: BackupMetadata) => void;
  onDelete: (backup: BackupMetadata) => void;
  onDownload: (backup: BackupMetadata) => void;
  onInspect: (backup: BackupMetadata) => void;
}

export default function BackupHistoryList({
  backups,
  isLoading,
  onRestore,
  onDelete,
  onDownload,
  onInspect,
}: BackupHistoryListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = backups.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.checksum.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || b.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeBadge = (type: BackupType) => {
    switch (type) {
      case 'automatic':
      case 'daily':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            Auto (24h)
          </span>
        );
      case 'on-login':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-semibold">
            On Login
          </span>
        );
      case 'pre-restore':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
            Pre-Restore
          </span>
        );
      case 'manual':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
            Manual
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Snapshot History Vault</span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 text-xs font-mono">
              {backups.length}
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Immutable cryptographic cloud backups. Verified and point-in-time restorable.
          </p>
        </div>

        {/* Search & Filter pills */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search snapshots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d101a] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0d101a] border border-white/[0.08] text-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="automatic">Auto (24h)</option>
            <option value="manual">Manual</option>
            <option value="on-login">On Login</option>
            <option value="pre-restore">Pre-Restore</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 px-4 rounded-[24px] bg-[#0c0e17]/60 border border-white/[0.06] backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-slate-400 mb-4 shadow-inner">
            <Database size={24} />
          </div>
          <h3 className="text-base font-bold text-white">No Cloud Backups Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {searchTerm || filterType !== 'all'
              ? 'No snapshots match your search criteria.'
              : 'Create your first encrypted snapshot by clicking "Run Backup Now" above.'}
          </p>
        </div>
      )}

      {/* Snapshot Cards List */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item, index) => {
            const sizeFormatted = BackupService.formatSize(item.fileSize || item.size);
            const relativeTime = BackupService.formatRelativeTime(item.createdAt);
            const counts = (item.itemCounts || {}) as BackupItemCounts;
            const totalRecords = item.recordsCount || (
              (counts.transactions || 0) + 
              (counts.customers || 0) + 
              (counts.savingsGoals || 0) + 
              (counts.gullakEntries || 0) + 
              (counts.investments || 0) + 
              (counts.reports || 0) + 
              (counts.bills || 0)
            );
            const hashPreview = (item.checksumSha256 || item.checksum || '').substring(0, 8);
            const formattedDate = item.date || new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const formattedTime = item.time || new Date(item.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const durationText = item.durationFormatted || (item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : null);
            const isFailed = item.status === 'failed';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className={`group relative overflow-hidden rounded-[22px] bg-[#0b0e18]/90 hover:bg-[#0f1322] border ${
                  isFailed ? 'border-rose-500/20 hover:border-rose-500/40' : 'border-white/[0.08] hover:border-indigo-500/30'
                } p-4 sm:p-5 transition-all shadow-lg backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4`}
              >
                {/* Left section: Identity & Metadata */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl bg-white/[0.03] ${
                    isFailed 
                      ? 'group-hover:bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : 'group-hover:bg-indigo-500/10 border-white/[0.06] group-hover:border-indigo-500/20 text-indigo-400'
                  } border transition-colors flex-shrink-0 mt-0.5`}>
                    {isFailed ? <AlertCircle size={20} /> : <Database size={20} />}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white tracking-tight">{item.name}</h4>
                      {getTypeBadge(item.type)}
                      {isFailed ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-semibold flex items-center gap-1">
                          <AlertCircle size={10} /> Failed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 size={10} /> Success
                        </span>
                      )}
                      {item.status === 'restored' && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-semibold">
                          Restored Point
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{relativeTime}</span>
                      </span>
                      <span>•</span>
                      <span>{formattedDate} at {formattedTime}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-300 font-medium">{sizeFormatted}</span>
                      {durationText && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-300 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                            ⚡ {durationText}
                          </span>
                        </>
                      )}
                      {hashPreview && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">
                            SHA: {hashPreview}...
                          </span>
                        </>
                      )}
                    </div>

                    {/* Dataset item counts chips */}
                    {!isFailed ? (
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                          {totalRecords} Total Records
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/[0.03] text-slate-300 border border-white/5">
                          {counts.transactions || 0} Transactions
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/[0.03] text-slate-300 border border-white/5">
                          {counts.customers || 0} Customers
                        </span>
                        {counts.savingsGoals ? (
                          <span className="px-2 py-0.5 rounded-lg bg-white/[0.03] text-slate-300 border border-white/5">
                            {counts.savingsGoals} Goals
                          </span>
                        ) : null}
                      </div>
                    ) : item.errorMessage ? (
                      <div className="text-[11px] text-rose-400 pt-0.5">
                        Error: {item.errorMessage}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right section: Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.04] w-full md:w-auto justify-end">
                  <button
                    onClick={() => onInspect(item)}
                    className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl border border-white/[0.06] transition-colors"
                    title="Inspect Snapshot JSON Details"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => onDownload(item)}
                    className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl border border-white/[0.06] transition-colors"
                    title="Download Encrypted Archive"
                  >
                    <Download size={16} />
                  </button>

                  <button
                    onClick={() => onRestore(item)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
                  >
                    <RotateCcw size={14} />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => onDelete(item)}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/20 transition-colors"
                    title="Delete Snapshot"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
