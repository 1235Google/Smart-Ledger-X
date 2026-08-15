import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Plus, Edit2, Trash2, X, ArrowUpDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Transaction } from '../../types';
import ExportModal from '../../components/ExportModal';
import DataStateGuard from '../../components/ui/DataStateGuard';

export default function AdminLedger() {
  const { 
    transactions, 
    addReceivedMoney, 
    addSentMoney, 
    deleteTransaction, 
    updateTransaction,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Transaction | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Sales');
  const [formMethod, setFormMethod] = useState('UPI');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<'received' | 'sent'>('received');

  const safeTransactions = transactions || [];

  // Filter ONLY completed/received transactions (exclude pending records)
  const completedEntriesOnly = safeTransactions.filter((tx: any) => {
    // 1. Exclude any pending payment
    if (
      tx.type === 'pending' ||
      tx.status === 'pending' ||
      tx.status === 'overdue' ||
      tx.isPending === true
    ) {
      return false;
    }

    // 2. Only show completed, received, income, sent, or paid transactions
    const isCompleted =
      tx.status === 'completed' ||
      tx.status === 'received' ||
      tx.status === 'paid' ||
      tx.type === 'income' ||
      tx.type === 'received' ||
      tx.type === 'sent' ||
      tx.type === 'expense' ||
      tx.type === 'completed';

    return isCompleted;
  });

  // Filtering
  const filtered = completedEntriesOnly.filter((tx: any) => {
    const q = searchQuery.toLowerCase();
    const personName = (tx.personName || '').toLowerCase();
    const category = (tx.category || tx.purpose || tx.reason || tx.type || '').toLowerCase();
    const method = (tx.method || tx.paymentMethod || '').toLowerCase();
    const amountStr = String(tx.amount || '');

    const matchesSearch = !q || personName.includes(q) || category.includes(q) || method.includes(q) || amountStr.includes(q);
    const matchesDate = !dateFilter || (tx.date && tx.date.startsWith(dateFilter));
    return matchesSearch && matchesDate;
  });

  // Sorting
  const sorted = [...filtered].sort((a: any, b: any) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Pagination (25 records per page)
  const itemsPerPage = 25;
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedEntries = sorted.slice((pageIndex - 1) * itemsPerPage, pageIndex * itemsPerPage);

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCategory('Sales');
    setFormMethod('UPI');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormType('received');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setFormName(entry.personName || '');
    setFormAmount(String(entry.amount || ''));
    setFormCategory(entry.category || entry.purpose || 'Sales');
    setFormMethod(entry.method || entry.paymentMethod || 'UPI');
    setFormDate(entry.date ? entry.date.split(' ')[0] : new Date().toISOString().split('T')[0]);
    setFormType(entry.type === 'sent' ? 'sent' : 'received');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formAmount) return;

    if (formType === 'received') {
      addReceivedMoney({
        personName: formName,
        amount: Number(formAmount),
        date: formDate,
        purpose: formCategory,
      });
    } else {
      addSentMoney({
        personName: formName,
        amount: Number(formAmount),
        date: formDate,
        purpose: formCategory,
      });
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !formName || !formAmount) return;

    updateTransaction(editingEntry.id, {
      personName: formName,
      amount: Number(formAmount),
      date: formDate,
      type: formType as any,
      ...(formCategory ? { category: formCategory, purpose: formCategory } : {}),
      ...(formMethod ? { method: formMethod, paymentMethod: formMethod } : {})
    } as any);

    setEditingEntry(null);
    resetForm();
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading ledger entries..."
      skeletonType="table"
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Entries</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage and track all ledger transaction records.</p>
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search Entries..." 
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300">
            <Calendar size={16} className="text-neutral-400 shrink-0" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-0 text-sm text-white focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-neutral-500 hover:text-white ml-1">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300">
            <ArrowUpDown size={16} className="text-neutral-400 shrink-0" />
            <select 
              value={sortOrder}
              onChange={e => { setSortOrder(e.target.value as 'newest' | 'oldest'); setCurrentPage(1); }}
              className="bg-transparent border-0 text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-neutral-900 text-white">Newest First</option>
              <option value="oldest" className="bg-neutral-900 text-white">Oldest First</option>
            </select>
          </div>

          {/* Export Entries Button */}
          <button 
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all border border-white/10 hover:border-white/20 shrink-0 min-h-[44px]"
            title="Export Entries as Excel or PDF"
          >
            <Download size={18} className="text-emerald-400" />
            <span>Export Entries</span>
          </button>

          {/* Add Entry Button */}
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0 min-h-[44px]"
          >
            <Plus size={18} />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Entries Table Container */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto max-h-[650px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0c0c0c] z-20 border-b border-white/10 shadow-md">
              <tr className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Added By</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Method</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry: any, idx) => {
                  const categoryName = entry.category || entry.purpose || entry.reason || (entry.type === 'sent' ? 'Expense' : 'Sales');
                  const methodName = entry.method || entry.paymentMethod || 'UPI';
                  return (
                    <tr 
                      key={entry.id || idx} 
                      className="hover:bg-white/[0.04] transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 text-neutral-300 font-mono text-xs whitespace-nowrap">
                        {entry.date || 'Today'}
                      </td>
                      <td className="py-4 px-6 font-bold text-white whitespace-nowrap">
                        {entry.personName || 'Unknown'}
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-400 whitespace-nowrap">
                        ₹{(Number(entry.amount) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-neutral-300 font-medium whitespace-nowrap">
                        {methodName}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(entry)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                            title="Edit Entry"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => { if (confirm("Delete this entry record?")) deleteTransaction(entry.id); }}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete Entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-neutral-400 font-medium">
                    No completed entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {sorted.length > itemsPerPage && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40 text-xs text-neutral-400">
            <div>
              Showing {((pageIndex - 1) * itemsPerPage) + 1} to {Math.min(pageIndex * itemsPerPage, sorted.length)} of {sorted.length} records
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={pageIndex === 1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 bg-white/10 rounded-lg text-white font-medium">
                {pageIndex} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={pageIndex === totalPages}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add New Entry</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Added By / Name</label>
                  <input 
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Customer or Entity Name"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Amount (₹)</label>
                    <input 
                      type="number" 
                      value={formAmount} 
                      onChange={e => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Date</label>
                    <input 
                      type="date" 
                      value={formDate} 
                      onChange={e => setFormDate(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Category</label>
                    <select 
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      <option value="Sales" className="bg-neutral-900">Sales</option>
                      <option value="Services" className="bg-neutral-900">Services</option>
                      <option value="Consulting" className="bg-neutral-900">Consulting</option>
                      <option value="Retail" className="bg-neutral-900">Retail</option>
                      <option value="Vendor" className="bg-neutral-900">Vendor</option>
                      <option value="Retainer" className="bg-neutral-900">Retainer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Payment Method</label>
                    <select 
                      value={formMethod}
                      onChange={e => setFormMethod(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      <option value="UPI" className="bg-neutral-900">UPI</option>
                      <option value="Cash" className="bg-neutral-900">Cash</option>
                      <option value="Bank Transfer" className="bg-neutral-900">Bank Transfer</option>
                      <option value="Card" className="bg-neutral-900">Card</option>
                      <option value="Net Banking" className="bg-neutral-900">Net Banking</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-sm text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm text-white shadow-lg"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Entry Modal */}
      <AnimatePresence>
        {editingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit Entry</h3>
                <button onClick={() => setEditingEntry(null)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Added By / Name</label>
                  <input 
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Amount (₹)</label>
                    <input 
                      type="number" 
                      value={formAmount} 
                      onChange={e => setFormAmount(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Date</label>
                    <input 
                      type="date" 
                      value={formDate} 
                      onChange={e => setFormDate(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Category</label>
                    <select 
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      <option value="Sales" className="bg-neutral-900">Sales</option>
                      <option value="Services" className="bg-neutral-900">Services</option>
                      <option value="Consulting" className="bg-neutral-900">Consulting</option>
                      <option value="Retail" className="bg-neutral-900">Retail</option>
                      <option value="Vendor" className="bg-neutral-900">Vendor</option>
                      <option value="Retainer" className="bg-neutral-900">Retainer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Payment Method</label>
                    <select 
                      value={formMethod}
                      onChange={e => setFormMethod(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      <option value="UPI" className="bg-neutral-900">UPI</option>
                      <option value="Cash" className="bg-neutral-900">Cash</option>
                      <option value="Bank Transfer" className="bg-neutral-900">Bank Transfer</option>
                      <option value="Card" className="bg-neutral-900">Card</option>
                      <option value="Net Banking" className="bg-neutral-900">Net Banking</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingEntry(null)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-sm text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm text-white shadow-lg"
                  >
                    Update Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Entries Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportType="entries"
        title="Export SmartLedger Entries Report"
        records={completedEntriesOnly}
      />
    </div>
    </DataStateGuard>
  );
}

