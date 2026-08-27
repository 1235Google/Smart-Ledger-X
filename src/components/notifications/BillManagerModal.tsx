import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Clock, 
  Calendar, 
  AlertTriangle,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { Bill } from '../../types';
import AddBillModal from './AddBillModal';

interface BillManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BillManagerModal({ isOpen, onClose }: BillManagerModalProps) {
  const { bills, markBillAsPaid, deleteBill } = useNotifications();
  const { showSuccess, showError } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');

  const handleMarkPaid = async (bill: Bill) => {
    try {
      await markBillAsPaid(bill.id);
      showSuccess(`Marked ${bill.name} as paid`);
    } catch (e: any) {
      showError('Failed to mark bill as paid');
    }
  };

  const handleDelete = async (bill: Bill) => {
    if (confirm(`Delete bill reminder for ${bill.name}?`)) {
      try {
        await deleteBill(bill.id);
        showSuccess(`Deleted ${bill.name}`);
      } catch (e: any) {
        showError('Failed to delete bill');
      }
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setIsAddModalOpen(true);
  };

  const filteredBills = bills.filter((b) => {
    if (filter === 'unpaid') return !b.isPaid;
    if (filter === 'paid') return b.isPaid;
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMillis = new Date(todayStr).getTime();

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Upcoming Bills & Recurring Costs</h3>
                  <p className="text-xs text-slate-400">
                    Track recurring expenses with automated reminders at 7d, 3d, 1d, and due day
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingBill(null);
                    setIsAddModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Plus size={15} />
                  Add Bill
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-3 border-b border-white/5 flex gap-2 bg-black/20">
              <button
                onClick={() => setFilter('unpaid')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
                  filter === 'unpaid'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Unpaid ({bills.filter(b => !b.isPaid).length})
              </button>
              <button
                onClick={() => setFilter('paid')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
                  filter === 'paid'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Paid ({bills.filter(b => b.isPaid).length})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All ({bills.length})
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {filteredBills.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-400">
                    <Inbox size={26} />
                  </div>
                  <p className="text-white font-bold text-base">No Bills Found</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm">
                    {filter === 'unpaid'
                      ? 'You have no unpaid bills scheduled. Click "+ Add Bill" to schedule one.'
                      : 'No bills match this filter.'}
                  </p>
                </div>
              ) : (
                filteredBills.map((bill) => {
                  const dueMillis = new Date(bill.dueDate).getTime();
                  const daysDiff = Math.round((dueMillis - todayMillis) / (1000 * 60 * 60 * 24));
                  const isOverdue = !bill.isPaid && daysDiff < 0;
                  const isDueToday = !bill.isPaid && daysDiff === 0;

                  return (
                    <motion.div
                      key={bill.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        bill.isPaid
                          ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                          : isOverdue
                          ? 'bg-rose-500/[0.08] border-rose-500/30'
                          : isDueToday
                          ? 'bg-amber-500/[0.08] border-amber-500/30'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                            bill.isPaid
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : isOverdue
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : isDueToday
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}
                        >
                          <Receipt size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-white text-sm">{bill.name}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 capitalize font-medium">
                              {bill.category}
                            </span>
                            {bill.frequency !== 'once' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 capitalize font-medium">
                                {bill.frequency}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1 font-medium text-slate-300">
                              <Calendar size={13} className="text-slate-400" />
                              {bill.dueDate}
                            </span>
                            {bill.isPaid ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={13} /> Paid
                              </span>
                            ) : isOverdue ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle size={13} /> Overdue by {Math.abs(daysDiff)}d
                              </span>
                            ) : isDueToday ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Clock size={13} /> Due Today
                              </span>
                            ) : (
                              <span className="text-indigo-300">
                                Due in {daysDiff} day{daysDiff === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="font-bold text-base text-white">
                            ₹{bill.amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!bill.isPaid && (
                            <button
                              onClick={() => handleMarkPaid(bill)}
                              title="Mark as Paid"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} />
                              Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(bill)}
                            title="Edit bill"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(bill)}
                            title="Delete bill"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Add / Edit Bill Sub-modal */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBill(null);
        }}
        billToEdit={editingBill}
      />
    </>
  );
}
