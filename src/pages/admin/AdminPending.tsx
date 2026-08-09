import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Plus, Edit2, Trash2, CheckCircle2, Bell, X, ArrowUpDown, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Transaction } from '../../types';
import ExportModal from '../../components/ExportModal';

export default function AdminPending() {
  const { transactions, addPendingMoney, markAsReceived, deleteTransaction, updateTransaction } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDateAdded, setFormDateAdded] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');

  const rawPending = transactions && transactions.length > 0 
    ? transactions.filter(t => t.type === 'pending')
    : [
        { id: 'p1', personName: 'Priya Sharma', amount: 8400, type: 'pending', status: 'pending', date: '2026-07-20 10:00 AM', dueDate: '2026-07-30' },
        { id: 'p2', personName: 'Rajesh Verma', amount: 12500, type: 'pending', status: 'overdue', date: '2026-07-01 02:30 PM', dueDate: '2026-07-15' },
        { id: 'p3', personName: 'Ananya Roy', amount: 4500, type: 'pending', status: 'paid', date: '2026-07-10 11:15 AM', dueDate: '2026-07-22' },
      ];

  // Derive status dynamically if not set
  const processStatus = (item: any): 'pending' | 'paid' | 'overdue' => {
    if (item.status === 'received' || item.status === 'paid') return 'paid';
    if (item.status === 'overdue') return 'overdue';
    if (item.dueDate) {
      const today = new Date().toISOString().split('T')[0];
      if (item.dueDate < today && item.status !== 'received') return 'overdue';
    }
    return 'pending';
  };

  // Filtering
  const filtered = rawPending.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    const personName = (item.personName || '').toLowerCase();
    const amountStr = String(item.amount || '');
    const currentStatus = processStatus(item);

    const matchesSearch = !q || personName.includes(q) || amountStr.includes(q);
    const matchesDate = !dateFilter || (item.date && item.date.startsWith(dateFilter));
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  // Sorting
  const sorted = [...filtered].sort((a: any, b: any) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Pagination (25 records)
  const itemsPerPage = 25;
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedList = sorted.slice((pageIndex - 1) * itemsPerPage, pageIndex * itemsPerPage);

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormDateAdded(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormStatus('pending');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormName(item.personName || '');
    setFormAmount(String(item.amount || ''));
    setFormDateAdded(item.date ? item.date.split(' ')[0] : new Date().toISOString().split('T')[0]);
    setFormDueDate(item.dueDate || '');
    setFormStatus(processStatus(item));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formAmount) return;

    addPendingMoney({
      personName: formName,
      amount: Number(formAmount),
      reason: 'Pending Settlement',
      dueDate: formDueDate || formDateAdded,
      reminderFrequency: '3days',
    } as any);

    setShowAddModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formName || !formAmount) return;

    updateTransaction(editingItem.id, {
      personName: formName,
      amount: Number(formAmount),
      date: formDateAdded,
      dueDate: formDueDate,
      status: formStatus as any,
    } as any);

    setEditingItem(null);
    resetForm();
  };

  const triggerReminder = (item: any) => {
    const message = `Hello ${item.personName}, this is a payment reminder for your pending amount of ₹${(item.amount || 0).toLocaleString('en-IN')}. Please settle your dues at your earliest convenience.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pending Payments</h1>
          <p className="text-neutral-400 text-sm mt-1">Track outstanding dues, due dates, payment alerts, and settlements.</p>
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
            placeholder="Search Pending..." 
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300">
            <Filter size={16} className="text-neutral-400 shrink-0" />
            <select 
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="bg-transparent border-0 text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">All Statuses</option>
              <option value="pending" className="bg-neutral-900">Pending</option>
              <option value="paid" className="bg-neutral-900">Paid</option>
              <option value="overdue" className="bg-neutral-900">Overdue</option>
            </select>
          </div>

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

          {/* Export Pending Button */}
          <button 
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all border border-white/10 hover:border-white/20 shrink-0 min-h-[44px]"
            title="Export Pending Payments as Excel or PDF"
          >
            <Download size={18} className="text-amber-400" />
            <span>Export Pending</span>
          </button>

          {/* Add Pending Payment Button */}
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0 min-h-[44px]"
          >
            <Plus size={18} />
            <span>Add Pending Payment</span>
          </button>
        </div>
      </div>

      {/* Pending Table Container */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto max-h-[650px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0c0c0c] z-20 border-b border-white/10 shadow-md">
              <tr className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Date Added</th>
                <th className="py-4 px-6">Customer Name</th>
                <th className="py-4 px-6">Amount Pending</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Reminder</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {paginatedList.length > 0 ? (
                paginatedList.map((item: any, idx) => {
                  const status = processStatus(item);
                  return (
                    <tr 
                      key={item.id || idx} 
                      className="hover:bg-white/[0.04] transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 text-neutral-400 font-mono text-xs whitespace-nowrap">
                        {item.date || 'Today'}
                      </td>
                      <td className="py-4 px-6 font-bold text-white whitespace-nowrap">
                        {item.personName || 'Unknown Customer'}
                      </td>
                      <td className="py-4 px-6 font-bold text-amber-400 whitespace-nowrap">
                        ₹{(Number(item.amount) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-neutral-300 font-medium text-xs whitespace-nowrap">
                        {item.dueDate || item.date || 'N/A'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
                            Pending
                          </span>
                        )}
                        {status === 'paid' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                            Paid
                          </span>
                        )}
                        {status === 'overdue' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 inline-block">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button 
                          onClick={() => triggerReminder(item)}
                          className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Bell size={14} /> Send Alert
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {status !== 'paid' && (
                            <button 
                              onClick={() => markAsReceived(item.id)}
                              className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => { if (confirm("Delete this pending payment record?")) deleteTransaction(item.id); }}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete Record"
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
                  <td colSpan={7} className="text-center py-16 text-neutral-400 font-medium">
                    No pending payments found.
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

      {/* Add Modal */}
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
                <h3 className="text-xl font-bold text-white">Add Pending Payment</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Customer Name</label>
                  <input 
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Amount Pending (₹)</label>
                  <input 
                    type="number" 
                    value={formAmount} 
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Date Added</label>
                    <input 
                      type="date" 
                      value={formDateAdded} 
                      onChange={e => setFormDateAdded(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Due Date</label>
                    <input 
                      type="date" 
                      value={formDueDate} 
                      onChange={e => setFormDueDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
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
                    Save Pending
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit Pending Payment</h3>
                <button onClick={() => setEditingItem(null)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Customer Name</label>
                  <input 
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Amount Pending (₹)</label>
                  <input 
                    type="number" 
                    value={formAmount} 
                    onChange={e => setFormAmount(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Due Date</label>
                    <input 
                      type="date" 
                      value={formDueDate} 
                      onChange={e => setFormDueDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Status</label>
                    <select 
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      <option value="pending" className="bg-neutral-900">Pending</option>
                      <option value="paid" className="bg-neutral-900">Paid</option>
                      <option value="overdue" className="bg-neutral-900">Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-sm text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm text-white shadow-lg"
                  >
                    Update Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Pending Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportType="pending"
        title="Export Pending Payments Report"
        records={rawPending}
      />
    </div>
  );
}

