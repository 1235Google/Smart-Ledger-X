import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Trash2, RefreshCw, X, ShieldAlert, FileText, ArrowUpRight, ArrowDownRight, Clock, PiggyBank, Database } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Transaction, PendingMoney, GullakEntry } from '../../types';

type TabType = 'all' | 'transactions' | 'pending' | 'gullak';

interface RecycleBinItem {
  id: string;
  type: 'transaction' | 'pending' | 'gullak';
  description: string;
  amount: number;
  originalDate: string;
  deletedAt: string;
  deletedBy: string;
  purgeAfter: string;
  raw: any;
}

export default function AdminRecycleBin() {
  const { rawTransactions, rawGullakEntries, restoreTransaction, permanentDeleteTransaction, restoreGullakEntry, permanentDeleteGullakEntry, adminUser } = useStore();
  const { showSuccess, showError } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ type: 'restore' | 'delete', item: RecycleBinItem } | null>(null);

  const recycleItems: RecycleBinItem[] = useMemo(() => {
    const items: RecycleBinItem[] = [];
    
    (rawTransactions || []).filter(t => t.deleted).forEach(t => {
      const isPending = t.type === 'pending';
      items.push({
        id: t.id,
        type: isPending ? 'pending' : 'transaction',
        description: isPending ? `Pending: ${t.personName} - ${(t as PendingMoney).reason}` : `${t.type === 'received' ? 'Received from' : 'Sent to'} ${t.personName} - ${t.purpose}`,
        amount: Number(t.amount) || 0,
        originalDate: isPending ? (t as PendingMoney).dueDate : t.date,
        deletedAt: t.deletedAt || new Date().toISOString(),
        deletedBy: t.deletedBy || 'Unknown',
        purgeAfter: t.purgeAfter || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        raw: t
      });
    });

    (rawGullakEntries || []).filter(e => e.deleted).forEach(e => {
      items.push({
        id: e.id,
        type: 'gullak',
        description: `Gullak ${e.direction === 'credit' ? 'In' : 'Out'} - ${e.category} - ${e.note}`,
        amount: Number(e.amount) || 0,
        originalDate: e.date,
        deletedAt: e.deletedAt || new Date().toISOString(),
        deletedBy: e.deletedBy || 'Unknown',
        purgeAfter: e.purgeAfter || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        raw: e
      });
    });

    return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [rawTransactions, rawGullakEntries]);

  const filteredItems = useMemo(() => {
    return recycleItems.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.description.toLowerCase().includes(q) || item.amount.toString().includes(q);
      }
      return true;
    });
  }, [recycleItems, activeTab, searchQuery]);

  const handleRestore = () => {
    if (!confirmModal || confirmModal.type !== 'restore') return;
    const { item } = confirmModal;
    
    try {
      if (item.type === 'transaction' || item.type === 'pending') {
        restoreTransaction(item.id);
      } else if (item.type === 'gullak') {
        restoreGullakEntry(item.id);
      }
      showSuccess('Record Restored', 'The financial record has been restored to the active ledger.');
    } catch (err) {
      showError('Restore Failed', 'Could not restore the record.');
    } finally {
      setConfirmModal(null);
    }
  };

  const handlePermanentDelete = () => {
    if (!confirmModal || confirmModal.type !== 'delete') return;
    const { item } = confirmModal;
    
    try {
      if (item.type === 'transaction' || item.type === 'pending') {
        permanentDeleteTransaction(item.id);
      } else if (item.type === 'gullak') {
        permanentDeleteGullakEntry(item.id);
      }
      showSuccess('Permanently Deleted', 'The record has been permanently removed.');
    } catch (err) {
      showError('Delete Failed', 'Could not permanently delete the record.');
    } finally {
      setConfirmModal(null);
    }
  };

  const calculateDaysRemaining = (purgeAfter: string) => {
    const days = Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Trash2 className="text-[#a8c7fa]" size={28} />
            Recycle Bin
          </h1>
          <p className="text-slate-400 mt-1">Manage soft-deleted financial records. Items are automatically purged after 30 days.</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="vision-glass-subtle rounded-[20px] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center bg-[#131314] rounded-xl p-1 overflow-x-auto no-scrollbar">
          {(['all', 'transaction', 'pending', 'gullak'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab === 'transaction' ? 'transactions' : tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                (activeTab === tab || (activeTab === 'transactions' && tab === 'transaction'))
                  ? 'bg-[#282a2d] text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'all' && '📦 All'}
              {tab === 'transaction' && '💰 Transactions'}
              {tab === 'gullak' && '🐷 Gullak'}
              {tab === 'pending' && '📤 Pending'}
            </button>
          ))}
        </div>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search deleted records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131314] text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa] transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="vision-glass-subtle rounded-[20px] p-12 flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#282a2d] flex items-center justify-center mb-4">
                <Trash2 className="text-slate-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Recycle Bin is Empty</h3>
              <p className="text-slate-400">No deleted records match your criteria.</p>
            </motion.div>
          ) : (
            filteredItems.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                className="vision-glass-subtle hover:border-white/20 rounded-[20px] p-4 transition-all"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'transaction' ? 'bg-blue-500/10 text-blue-400' :
                      item.type === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-pink-500/10 text-pink-400'
                    }`}>
                      {item.type === 'transaction' && <FileText size={24} />}
                      {item.type === 'pending' && <Clock size={24} />}
                      {item.type === 'gullak' && <PiggyBank size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#282a2d] text-slate-300 uppercase">
                          {item.type}
                        </span>
                        <span className="text-lg font-bold text-white">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-slate-300 font-medium mb-2">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                        <span>Original Date: {new Date(item.originalDate).toLocaleDateString()}</span>
                        <span>Deleted: {new Date(item.deletedAt).toLocaleString()}</span>
                        <span>Auto-delete in: <strong className="text-amber-400">{calculateDaysRemaining(item.purgeAfter)} days</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                    <button
                      onClick={() => setConfirmModal({ type: 'restore', item })}
                      className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-[#282a2d] text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      <RefreshCw size={16} />
                      Restore
                    </button>
                    <button
                      onClick={() => setConfirmModal({ type: 'delete', item })}
                      className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setConfirmModal(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-md vision-glass rounded-[24px] p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-2 ${confirmModal.type === 'restore' ? 'bg-[#0b57d0]' : 'bg-red-500'}`} />
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmModal.type === 'restore' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                  {confirmModal.type === 'restore' ? <RefreshCw size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {confirmModal.type === 'restore' ? 'Restore Record?' : 'Permanently Delete?'}
                  </h3>
                </div>
              </div>

              <div className="bg-[#131314] rounded-xl p-4 mb-6">
                <div className="text-lg font-bold text-white mb-1">
                  ₹{confirmModal.item.amount.toLocaleString('en-IN')} — {confirmModal.item.type.toUpperCase()}
                </div>
                <div className="text-sm text-slate-400 mb-2">{confirmModal.item.description}</div>
                <div className="text-xs text-slate-500">Deleted: {new Date(confirmModal.item.deletedAt).toLocaleDateString()}</div>
              </div>

              <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                {confirmModal.type === 'restore' 
                  ? 'This record will be restored to your active ledger and will resume affecting balances and reports.'
                  : 'This action is destructive and cannot be undone. Backups may still contain historical copies according to retention policy.'
                }
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-[#282a2d] text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.type === 'restore' ? handleRestore : handlePermanentDelete}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                    confirmModal.type === 'restore' 
                      ? 'bg-[#0b57d0] hover:bg-[#0b57d0]/90' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {confirmModal.type === 'restore' ? (
                    <>
                      <RefreshCw size={18} />
                      Restore
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
