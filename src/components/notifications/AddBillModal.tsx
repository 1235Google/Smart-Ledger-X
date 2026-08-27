import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, Calendar, DollarSign, Tag, Save, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { Bill, BillCategory, BillFrequency } from '../../types';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billToEdit?: Bill | null;
}

const CATEGORIES: { value: BillCategory; label: string }[] = [
  { value: 'utilities', label: 'Electricity & Utilities' },
  { value: 'rent', label: 'Rent / Lease' },
  { value: 'subscription', label: 'Software / Subscriptions' },
  { value: 'credit_card', label: 'Credit Card Bill' },
  { value: 'loan', label: 'Loan EMI' },
  { value: 'insurance', label: 'Insurance Premium' },
  { value: 'taxes', label: 'Taxes / GST' },
  { value: 'other', label: 'Other Recurring Bill' },
];

const FREQUENCIES: { value: BillFrequency; label: string }[] = [
  { value: 'once', label: 'One-Time Bill' },
  { value: 'monthly', label: 'Monthly Recurring' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AddBillModal({ isOpen, onClose, billToEdit }: AddBillModalProps) {
  const { addBill, updateBill } = useNotifications();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    return tomorrow.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState<BillCategory>('utilities');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setAmount(billToEdit.amount.toString());
      setDueDate(billToEdit.dueDate);
      setCategory(billToEdit.category);
      setFrequency(billToEdit.frequency || 'monthly');
      setNotes(billToEdit.notes || '');
    } else {
      setName('');
      setAmount('');
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split('T')[0]);
      setCategory('utilities');
      setFrequency('monthly');
      setNotes('');
    }
  }, [billToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Please enter a bill name');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Please enter a valid bill amount');
      return;
    }
    if (!dueDate) {
      showError('Please choose a due date');
      return;
    }

    setIsSubmitting(true);
    try {
      if (billToEdit) {
        await updateBill(billToEdit.id, {
          name: name.trim(),
          amount: numAmount,
          dueDate,
          category,
          frequency,
          notes: notes.trim(),
        });
        showSuccess('Bill updated successfully');
      } else {
        await addBill({
          name: name.trim(),
          amount: numAmount,
          dueDate,
          category,
          frequency,
          notes: notes.trim(),
        });
        showSuccess('New bill created & scheduled for automated reminders');
      }
      onClose();
    } catch (err: any) {
      showError('Failed to save bill: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
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

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {billToEdit ? 'Edit Bill' : 'Schedule New Bill'}
                </h3>
                <p className="text-xs text-slate-400">
                  Automatic alerts will be generated 7d, 3d, 1d before, and on due date
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Bill Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Bill / Vendor Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Office Rent, AWS Cloud, Electricity"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Amount & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Category & Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BillCategory)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-neutral-900 text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value} className="bg-neutral-900 text-white">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Account number, payment link, or reminder instructions..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            {/* Automated Reminder Guarantee Card */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-300">
              <AlertCircle size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <span>
                Smart Ledger will automatically notify you at <strong>7 days</strong>, <strong>3 days</strong>, <strong>1 day</strong>, and on the <strong>due date</strong>. No duplicates will be sent.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {billToEdit ? 'Save Changes' : 'Create Bill'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
