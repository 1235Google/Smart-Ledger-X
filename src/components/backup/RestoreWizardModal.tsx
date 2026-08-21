import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  Layers, 
  Database, 
  Lock, 
  Activity, 
  Sparkles,
  Check,
  RefreshCw
} from 'lucide-react';
import { BackupMetadata, AppState } from '../../types';
import { BackupService } from '../../lib/backupService';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';

interface RestoreWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSnapshot: BackupMetadata | null;
  allSnapshots: BackupMetadata[];
  onRestoreSuccess: (restoredState: AppState) => void;
}

export default function RestoreWizardModal({
  isOpen,
  onClose,
  selectedSnapshot,
  allSnapshots,
  onRestoreSuccess,
}: RestoreWizardModalProps) {
  const { 
    transactions: liveTransactions, 
    customers: liveCustomers, 
    startingBalance: liveStartingBalance,
    gullakEntries: liveGullak,
    savingsGoals: liveGoals
  } = useStore();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeSnapshot, setActiveSnapshot] = useState<BackupMetadata | null>(selectedSnapshot);
  const [snapshotData, setSnapshotData] = useState<AppState | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Confirmation state
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [restoreProgressMsg, setRestoreProgressMsg] = useState('');
  const [restoreProgressPct, setRestoreProgressPct] = useState(0);

  useEffect(() => {
    if (selectedSnapshot) {
      setActiveSnapshot(selectedSnapshot);
    } else if (allSnapshots.length > 0 && !activeSnapshot) {
      setActiveSnapshot(allSnapshots[0]);
    }
  }, [selectedSnapshot, allSnapshots]);

  // Load preview data when entering Step 2
  const loadSnapshotPreview = async (snap: BackupMetadata) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const { parsedData } = await BackupService.fetchAndDecryptBackup(snap.id);
      setSnapshotData(parsedData);
      setStep(2);
    } catch (err: any) {
      setPreviewError(err?.message || 'Failed to inspect backup archive.');
      showError('Preview Failed', err?.message || 'Unable to decrypt snapshot for comparison.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!activeSnapshot || !confirmChecked) return;

    setIsExecuting(true);
    setRestoreProgressMsg('Connecting to secure cloud repository...');
    setRestoreProgressPct(15);

    try {
      const result = await BackupService.restoreBackup(activeSnapshot.id, (msg, pct) => {
        setRestoreProgressMsg(msg);
        setRestoreProgressPct(pct);
      });

      if (result.success && result.restoredState) {
        onRestoreSuccess(result.restoredState);
        setStep(4);
      }
    } catch (err: any) {
      showError('Restore Execution Failed', err?.message || 'Failed to restore snapshot state.');
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  // Comparison Metrics
  const liveTxCount = liveTransactions.length;
  const liveIncome = liveTransactions.filter(t => t.type === 'received').reduce((a, b) => a + (b.amount || 0), 0);
  const liveExpense = liveTransactions.filter(t => t.type === 'sent').reduce((a, b) => a + (b.amount || 0), 0);
  const livePendingCount = liveTransactions.filter(t => t.type === 'pending').length;

  const snapTxs = snapshotData?.transactions || [];
  const snapTxCount = snapTxs.length;
  const snapIncome = snapTxs.filter((t: any) => t.type === 'received').reduce((a: number, b: any) => a + (b.amount || 0), 0);
  const snapExpense = snapTxs.filter((t: any) => t.type === 'sent').reduce((a: number, b: any) => a + (b.amount || 0), 0);
  const snapPendingCount = snapTxs.filter((t: any) => t.type === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step !== 4 && !isExecuting ? onClose : undefined}
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-[#0a0c16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header with Step Indicator */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-950/30 via-transparent to-transparent flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Point-in-Time Restore Wizard</h3>
                <p className="text-xs text-slate-400">4-Step enterprise recovery & state synchronization</p>
              </div>
            </div>

            {step !== 4 && !isExecuting && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { num: 1, title: 'Select' },
              { num: 2, title: 'Preview & Diff' },
              { num: 3, title: 'Confirm' },
              { num: 4, title: 'Complete' },
            ].map((s) => (
              <div key={s.num} className="space-y-1.5">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= s.num ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-white/10'
                }`} />
                <div className={`text-[11px] font-medium truncate ${
                  step === s.num ? 'text-blue-400 font-bold' : step > s.num ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {s.num}. {s.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Select Backup */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">Step 1: Choose Snapshot to Restore</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select a verified recovery snapshot from your cloud repository.</p>
              </div>

              {allSnapshots.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-sm">
                  No snapshots currently available for restore.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {allSnapshots.map((snap) => {
                    const isSelected = activeSnapshot?.id === snap.id;
                    return (
                      <div
                        key={snap.id}
                        onClick={() => setActiveSnapshot(snap)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400'
                          }`}>
                            <Database size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{snap.id}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 capitalize border border-indigo-500/20">
                                {snap.type || 'Manual'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(snap.createdAt).toLocaleString()} • {BackupService.formatSize(snap.size)} • {snap.itemCounts?.transactions || 0} records
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-white/20'
                        }`}>
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview Changes (Diff Table) */}
          {step === 2 && snapshotData && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">Step 2: Compare Live Data vs. Snapshot Data</h4>
                <p className="text-xs text-slate-400 mt-0.5">Review the state comparison before replacing your current live ledger.</p>
              </div>

              {/* Comparison Table (Req 10) */}
              <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.01]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-white/10 text-slate-400">
                      <th className="p-3 font-semibold">Entity</th>
                      <th className="p-3 font-semibold">Current Live State</th>
                      <th className="p-3 font-semibold">Snapshot State</th>
                      <th className="p-3 font-semibold">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="p-3 font-medium text-white">Ledger Records</td>
                      <td className="p-3">{liveTxCount}</td>
                      <td className="p-3 font-bold text-blue-300">{snapTxCount}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          snapTxCount >= liveTxCount ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                        }`}>
                          {snapTxCount - liveTxCount >= 0 ? `+${snapTxCount - liveTxCount}` : snapTxCount - liveTxCount}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Pending Payments</td>
                      <td className="p-3">{livePendingCount}</td>
                      <td className="p-3 font-bold text-amber-300">{snapPendingCount}</td>
                      <td className="p-3">
                        <span className="text-[11px] text-slate-400">
                          {snapPendingCount - livePendingCount >= 0 ? `+${snapPendingCount - livePendingCount}` : snapPendingCount - livePendingCount}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Total Income Volume</td>
                      <td className="p-3">{formatCurrency(liveIncome)}</td>
                      <td className="p-3 font-bold text-emerald-300">{formatCurrency(snapIncome)}</td>
                      <td className="p-3">
                        <span className="text-[11px] text-emerald-400">Point-in-Time</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Customers & Contacts</td>
                      <td className="p-3">{liveCustomers.length}</td>
                      <td className="p-3 font-bold text-indigo-300">{snapshotData.customers?.length || 0}</td>
                      <td className="p-3">
                        <span className="text-[11px] text-slate-400">
                          {(snapshotData.customers?.length || 0) - liveCustomers.length >= 0 ? `+${(snapshotData.customers?.length || 0) - liveCustomers.length}` : (snapshotData.customers?.length || 0) - liveCustomers.length}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">Gullak & Goals</td>
                      <td className="p-3">{liveGullak.length + liveGoals.length}</td>
                      <td className="p-3 font-bold text-purple-300">{(snapshotData.gullakEntries?.length || 0) + (snapshotData.savingsGoals?.length || 0)}</td>
                      <td className="p-3 text-[11px] text-teal-400">Syncs exact point</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm Restore */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <ShieldAlert size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-300">Irreversible Database Rollback Warning</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Restoring this snapshot will replace your current live records and ledger balances with the point-in-time state from{' '}
                    <strong className="text-white">{activeSnapshot ? new Date(activeSnapshot.createdAt).toLocaleString() : ''}</strong>.
                  </p>
                </div>
              </div>

              {/* Progress if executing */}
              {isExecuting ? (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 text-center space-y-4">
                  <RefreshCw size={28} className="animate-spin text-blue-400 mx-auto" />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">{restoreProgressMsg || 'Restoring Database...'}</div>
                    <div className="text-xs text-slate-400">{restoreProgressPct}% Completed</div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${restoreProgressPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 text-blue-600 focus:ring-blue-500 bg-white/5"
                    />
                    <span className="text-xs font-semibold text-white">
                      I understand this action will overwrite live ledger records with this verified snapshot.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Restore Complete */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Restore Completed Successfully!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your transactions, customer balances, Gullak goals, and account preferences have been verified and restored to active memory.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-[#07080d] flex items-center justify-between flex-shrink-0">
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => activeSnapshot && loadSnapshotPreview(activeSnapshot)}
                disabled={!activeSnapshot || isLoadingPreview}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
              >
                {isLoadingPreview ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Decrypting Archive...</span>
                  </>
                ) : (
                  <>
                    <span>Next: Preview Changes</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all"
              >
                <span>Next: Confirm Restore</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                disabled={isExecuting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={!confirmChecked || isExecuting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                <RotateCcw size={15} />
                <span>Execute Point-in-Time Restore</span>
              </button>
            </>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-colors"
            >
              Finish & Return to Ledger
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
