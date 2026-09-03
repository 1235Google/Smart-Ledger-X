import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  ArrowUpDown, 
  Download, 
  Filter, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Building,
  Banknote,
  Smartphone
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Transaction } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import ExportModal from '../../components/ExportModal';

export default function AdminLedger() {
  const { 
    transactions, 
    addReceivedMoney, 
    deleteTransaction, 
    updateTransaction 
  } = useStore();
  const { showSuccess, showError } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [methodFilter, setMethodFilter] = useState<'all' | 'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<Transaction | null>(null);
  const [editingEntry, setEditingEntry] = useState<Transaction | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Transaction | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Sales');
  const [formMethod, setFormMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('UPI');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<'received' | 'sent'>('received');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const safeTransactions = transactions || [];

  // Filter completed ledger records
  const completedEntries = safeTransactions.filter((tx: any) => {
    if (tx.type === 'pending' || tx.status === 'pending' || tx.status === 'overdue' || tx.isPending === true) {
      return false;
    }
    return true;
  });

  // Apply chip filters
  const filteredData = completedEntries.filter((tx: any) => {
    const txMethod = tx.method || tx.paymentMethod || 'UPI';
    if (methodFilter !== 'all' && txMethod !== methodFilter) return false;

    if (dateFilter && (!tx.date || !tx.date.startsWith(dateFilter))) return false;

    return true;
  });

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCategory('Sales');
    setFormMethod('UPI');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormType('received');
    setFormNote('');
    setFormError('');
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
    setFormType(entry.type === 'sent' || entry.type === 'expense' ? 'sent' : 'received');
    setFormNote(entry.note || entry.description || '');
    setFormError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter a party / customer name.');
      return;
    }
    const num = Number(formAmount);
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter a valid positive numerical amount.');
      return;
    }

    try {
      if (editingEntry) {
        updateTransaction(editingEntry.id, {
          personName: formName.trim(),
          amount: num,
          purpose: formCategory || formNote || 'General',
          date: formDate,
          type: formType,
        } as any);
        showSuccess('Transaction Updated', 'Ledger record modified successfully.');
        setEditingEntry(null);
      } else {
        addReceivedMoney({
          personName: formName.trim(),
          amount: num,
          purpose: formCategory || formNote || 'General',
          date: formDate,
        });
        showSuccess('Payment Recorded', `Received ₹${num.toLocaleString()} from ${formName}`);
        setShowAddModal(false);
      }
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Unable to save transaction.');
    }
  };

  const handleDelete = () => {
    if (!deletingEntry) return;
    try {
      deleteTransaction(deletingEntry.id);
      showSuccess('Transaction Deleted', 'Record was removed from the ledger.');
      setDeletingEntry(null);
    } catch (err: any) {
      showError('Delete Failed', err?.message || 'Could not delete entry.');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'personName',
      header: 'Customer / Party',
      sortable: true,
      render: (tx) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm',
            tx.type === 'received' || tx.type === 'income'
              ? isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]'
              : isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]'
          )}>
            {tx.personName ? tx.personName.substring(0, 2).toUpperCase() : 'TX'}
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">{tx.personName || 'Direct Ledger Entry'}</div>
            <div className="text-[11px] text-slate-400 font-medium">ID: {tx.id?.slice(0, 8) || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Flow Type',
      render: (tx) => {
        const isRec = tx.type === 'received' || tx.type === 'income';
        return (
          <span className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1',
            isRec
              ? isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]'
              : isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]'
          )}>
            {isRec ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
            <span>{isRec ? 'Received' : 'Sent'}</span>
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (tx) => {
        const isRec = tx.type === 'received' || tx.type === 'income';
        return (
          <div className="text-right">
            <span className={cn(
              'font-mono font-extrabold text-sm',
              isRec ? 'text-[#6dd58c] dark:text-[#85e197]' : 'text-[#f2b8b5]'
            )}>
              {isRec ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (tx) => (
        <span className={cn(
          'px-2.5 py-1 rounded-lg text-xs font-medium',
          isDark ? 'bg-[#282a2d] text-[#c4c7c5]' : 'bg-[#f0f4f9] text-[#444746]'
        )}>
          {tx.category || tx.purpose || 'General'}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (tx) => {
        const method = tx.method || tx.paymentMethod || 'UPI';
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            {method === 'UPI' && <Smartphone size={14} className="text-[#a8c7fa]" />}
            {method === 'Cash' && <Banknote size={14} className="text-[#6dd58c]" />}
            {method === 'Card' && <CreditCard size={14} className="text-[#ffe082]" />}
            {method === 'Bank Transfer' && <Building size={14} className="text-[#ffaed0]" />}
            <span>{method}</span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date & Time',
      sortable: true,
      render: (tx) => (
        <span className="text-xs text-slate-400">
          {formatDate(tx.date || tx.createdAt || new Date().toISOString())}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (tx) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setViewingEntry(tx)}
            title="View Details"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openEditModal(tx)}
            title="Edit Entry"
            className="p-2 rounded-xl text-slate-400 hover:text-[#a8c7fa] hover:bg-[#a8c7fa]/10 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeletingEntry(tx)}
            title="Delete Entry"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Transactions Ledger
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Search, verify, disburse, and export complete customer and vendor cash flow records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <M3Button
            variant="tonal"
            icon={Download}
            onClick={() => setShowExportModal(true)}
          >
            Export Ledger
          </M3Button>
          <M3Button
            variant="filled"
            icon={Plus}
            onClick={openAddModal}
          >
            New Transaction
          </M3Button>
        </div>
      </div>

      {/* Filter Row: Rail Method Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Method:</span>
          {(['all', 'UPI', 'Cash', 'Card', 'Bank Transfer'] as const).map((m) => (
            <M3Chip
              key={m}
              label={m === 'all' ? 'All Rails' : m}
              selected={methodFilter === m}
              onClick={() => setMethodFilter(m)}
            />
          ))}
        </div>
      </div>

      {/* Main Material 3 Data Table */}
      <M3DataTable
        title="Ledger Entries"
        subtitle={`${filteredData.length} total settled records logged`}
        data={filteredData}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search customer, category, amount, or payment method..."
        searchFields={['personName', 'category', 'method', 'amount', 'note']}
        emptyMessage="No ledger transactions match criteria"
        emptySubtitle="Try resetting your active filters or create a new transaction entry above."
        emptyAction={{
          label: 'Create Transaction',
          onClick: openAddModal,
        }}
      />

      {/* Add / Edit Transaction M3 Dialog */}
      <M3Dialog
        isOpen={showAddModal || Boolean(editingEntry)}
        onClose={() => {
          setShowAddModal(false);
          setEditingEntry(null);
        }}
        title={editingEntry ? 'Edit Ledger Entry' : 'Record New Transaction'}
        subtitle={editingEntry ? 'Update transaction details' : 'Save a payment received or money sent'}
        icon={Wallet}
        iconTone="primary"
        maxWidth="lg"
        actions={
          <>
            <M3Button
              variant="text"
              onClick={() => {
                setShowAddModal(false);
                setEditingEntry(null);
              }}
            >
              Cancel
            </M3Button>
            <M3Button variant="filled" onClick={handleSave}>
              {editingEntry ? 'Update Entry' : 'Record Transaction'}
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-400 text-xs font-bold">
            <ArrowDownLeft size={16} />
            <span>Recording Settlement / Inflow Entry</span>
          </div>

          <M3TextField
            label="Party / Customer Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Acme Enterprises, Rajesh Sharma"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <M3TextField
              label="Amount (₹)"
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              required
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Payment Rail</label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as any)}
                className={cn(
                  'w-full h-14 px-3.5 rounded-2xl border text-sm outline-none transition-all cursor-pointer',
                  isDark ? 'bg-[#1e1f20] text-white border-[#3c4043]' : 'bg-[#f0f4f9] text-black border-[#c4c7c5]'
                )}
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                <option value="Cash">Cash Handover</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className={cn(
                  'w-full h-14 px-3.5 rounded-2xl border text-sm outline-none transition-all cursor-pointer',
                  isDark ? 'bg-[#1e1f20] text-white border-[#3c4043]' : 'bg-[#f0f4f9] text-black border-[#c4c7c5]'
                )}
              >
                <option value="Sales">Sales & Invoicing</option>
                <option value="Consulting">Consulting / Services</option>
                <option value="Supplies">Inventory & Supplies</option>
                <option value="Rent">Rent & Utilities</option>
                <option value="Salary">Salaries & Payroll</option>
                <option value="General">General / Miscellaneous</option>
              </select>
            </div>

            <M3TextField
              label="Transaction Date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          <M3TextField
            label="Notes & Invoice Reference"
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="Optional reference memo..."
          />

          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}
        </form>
      </M3Dialog>

      {/* View Details M3 Dialog */}
      <M3Dialog
        isOpen={Boolean(viewingEntry)}
        onClose={() => setViewingEntry(null)}
        title="Transaction Ledger Audit Details"
        subtitle={`Audit ID: ${viewingEntry?.id || 'N/A'}`}
        icon={Eye}
        iconTone="primary"
        actions={
          <M3Button variant="filled" onClick={() => setViewingEntry(null)}>
            Done
          </M3Button>
        }
      >
        {viewingEntry && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xs">Total Amount</span>
                <div className="text-2xl font-extrabold font-mono text-white">
                  ₹{(viewingEntry.amount || 0).toLocaleString()}
                </div>
              </div>
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-bold uppercase',
                viewingEntry.type === 'received'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              )}>
                {viewingEntry.type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5">
                <div className="text-slate-400">Customer / Party</div>
                <div className="font-bold text-sm mt-0.5">{viewingEntry.personName}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5">
                <div className="text-slate-400">Payment Rail</div>
                <div className="font-bold text-sm mt-0.5">{(viewingEntry as any).method || (viewingEntry as any).paymentMethod || 'UPI / Cash'}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5">
                <div className="text-slate-400">Category / Purpose</div>
                <div className="font-bold text-sm mt-0.5">{(viewingEntry as any).category || (viewingEntry as any).purpose || (viewingEntry as any).reason || 'General'}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5">
                <div className="text-slate-400">Timestamp</div>
                <div className="font-bold text-sm mt-0.5">{formatDate((viewingEntry as any).date || (viewingEntry as any).dueDate || (viewingEntry as any).createdAt || '')}</div>
              </div>
            </div>

            {(viewingEntry as any).note && (
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5">
                <div className="text-slate-400 text-xs">Memo / Description</div>
                <p className="mt-1 text-slate-200">{(viewingEntry as any).note}</p>
              </div>
            )}
          </div>
        )}
      </M3Dialog>

      {/* Delete Confirmation M3 Dialog */}
      <M3Dialog
        isOpen={Boolean(deletingEntry)}
        onClose={() => setDeletingEntry(null)}
        title="Delete Transaction Record"
        subtitle="Irreversible ledger adjustment"
        icon={Trash2}
        iconTone="rose"
        actions={
          <>
            <M3Button variant="text" onClick={() => setDeletingEntry(null)}>
              Cancel
            </M3Button>
            <M3Button variant="danger" onClick={handleDelete}>
              Confirm Delete
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete transaction of <strong className="text-white">₹{(deletingEntry?.amount || 0).toLocaleString()}</strong> with{' '}
          <strong className="text-white">{deletingEntry?.personName}</strong>?
        </p>
      </M3Dialog>

      {/* Export Modal Component */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportType="entries"
        records={completedEntries}
      />
    </div>
  );
}
