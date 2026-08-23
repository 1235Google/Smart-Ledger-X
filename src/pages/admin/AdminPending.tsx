import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  Plus, 
  CheckCircle2, 
  Send, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  Search, 
  Filter, 
  Wallet, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Bell, 
  Mail,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn, formatDate, formatReminderMessage, DEFAULT_REMINDER_TEMPLATE } from '../../lib/utils';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminPending() {
  const { 
    transactions, 
    addPendingMoney, 
    markAsReceived, 
    deleteTransaction,
    addReminderHistoryLog,
    advanceReminderDate,
    generalSettings,
    customReminderTemplate
  } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [typeFilter, setTypeFilter] = useState<'all' | 'receivable' | 'payable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [settlingItem, setSettlingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [phonePromptItem, setPhonePromptItem] = useState<any | null>(null);
  const [inputPhone, setInputPhone] = useState('');

  // Add Form states
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDueDate, setFormDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [formType, setFormType] = useState<'receivable' | 'payable'>('receivable');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const safeTransactions = transactions || [];

  // Filter only pending items
  const pendingTransactions = safeTransactions.filter((tx: any) => {
    return tx.type === 'pending' || tx.status === 'pending' || tx.isPending === true || tx.status === 'overdue';
  });

  const filteredData = pendingTransactions.filter((tx: any) => {
    const isReceivable = tx.pendingType === 'receivable' || tx.flowType === 'received' || tx.type === 'received' || !tx.pendingType;
    if (typeFilter === 'receivable' && !isReceivable) return false;
    if (typeFilter === 'payable' && isReceivable) return false;

    // Check overdue
    const isOverdue = tx.dueDate && new Date(tx.dueDate) < new Date();
    if (statusFilter === 'overdue' && !isOverdue) return false;
    if (statusFilter === 'pending' && isOverdue) return false;

    return true;
  });

  const totalReceivable = pendingTransactions
    .filter((tx: any) => tx.pendingType === 'receivable' || tx.flowType === 'received' || tx.type === 'received' || !tx.pendingType)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalPayable = pendingTransactions
    .filter((tx: any) => tx.pendingType === 'payable' || tx.flowType === 'sent' || tx.type === 'sent')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter person/party name.');
      return;
    }
    const num = Number(formAmount);
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }

    try {
      addPendingMoney({
        personName: formName.trim(),
        amount: num,
        phoneNumber: formPhone.trim(),
        dueDate: formDueDate,
        reason: formNote || 'Pending Settlement',
        reminderFrequency: '7days',
      });

      showSuccess('Pending Payment Saved', `Tracked ₹${num.toLocaleString()} with ${formName}`);
      setShowAddModal(false);
      setFormName('');
      setFormAmount('');
      setFormPhone('');
      setFormNote('');
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to save pending payment.');
    }
  };

  const handleSettle = () => {
    if (!settlingItem) return;
    try {
      markAsReceived(settlingItem.id);
      showSuccess('Payment Settled', `Marked payment of ₹${(settlingItem.amount || 0).toLocaleString()} as fully received.`);
      setSettlingItem(null);
    } catch (err: any) {
      showError('Settlement Failed', err?.message || 'Could not settle payment.');
    }
  };

  const dispatchWhatsApp = (item: any, phoneNum: string) => {
    const template = customReminderTemplate || DEFAULT_REMINDER_TEMPLATE;
    const message = formatReminderMessage(
      template,
      {
        ...item,
        personName: item.personName || 'Customer',
        amount: Number(item.amount) || 0,
        dueDate: item.dueDate || new Date().toISOString().split('T')[0],
      } as any,
      generalSettings?.timezone,
      Number(item.amount) || 0
    );

    let cleanPhone = phoneNum.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    addReminderHistoryLog({
      transactionId: item.id,
      customerName: item.personName || 'Customer',
      amount: Number(item.amount) || 0,
      dateTime: new Date().toISOString(),
      sentVia: 'WhatsApp',
      reminderCount: 1,
      nextReminderDate: item.dueDate || '',
    });

    advanceReminderDate(item.id);

    showSuccess('Reminder Dispatched', `WhatsApp notification sent to ${item.personName}.`);

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard?.writeText(message);
      showInfo('Message Copied', 'Reminder message text copied to clipboard.');
    }
  };

  const handleSendReminder = (item: any) => {
    const phone = item.phoneNumber || item.phone || '';
    if (!phone.trim()) {
      setPhonePromptItem(item);
      setInputPhone('');
      return;
    }
    dispatchWhatsApp(item, phone);
  };

  const handlePhonePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phonePromptItem) return;
    if (!inputPhone.trim()) {
      showError('Input Required', 'Please enter a phone number to dispatch WhatsApp reminder.');
      return;
    }
    dispatchWhatsApp(phonePromptItem, inputPhone.trim());
    setPhonePromptItem(null);
  };

  const handleDelete = () => {
    if (!deletingItem) return;
    try {
      deleteTransaction(deletingItem.id);
      showSuccess('Entry Removed', 'Pending record deleted.');
      setDeletingItem(null);
    } catch (err: any) {
      showError('Delete Failed', err?.message || 'Could not delete.');
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
            'w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0',
            tx.pendingType === 'payable'
              ? isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]'
              : isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
          )}>
            <Clock size={16} />
          </div>
          <div>
            <div className="font-bold text-sm">{tx.personName || 'Pending Client'}</div>
            <div className="text-[11px] text-slate-400">{tx.phone || 'No phone recorded'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'pendingType',
      header: 'Direction',
      render: (tx) => {
        const isReceivable = tx.pendingType === 'receivable' || tx.flowType === 'received' || tx.type === 'received' || !tx.pendingType;
        return (
          <span className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
            isReceivable
              ? isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]'
              : isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]'
          )}>
            {isReceivable ? 'To Collect (In)' : 'To Pay (Out)'}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Pending Amount',
      sortable: true,
      align: 'right',
      render: (tx) => (
        <span className="font-mono font-extrabold text-sm text-[#ffe082]">
          ₹{(tx.amount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date & Status',
      sortable: true,
      render: (tx) => {
        const isOverdue = tx.dueDate && new Date(tx.dueDate) < new Date();
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium">{formatDate(tx.dueDate || tx.date || '')}</span>
            {isOverdue ? (
              <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                <AlertCircle size={10} /> Overdue
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-medium">On Schedule</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (tx) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <M3Button
            variant="tonal"
            size="sm"
            onClick={() => handleSendReminder(tx)}
            icon={Send}
          >
            Remind
          </M3Button>
          <M3Button
            variant="filled"
            size="sm"
            onClick={() => setSettlingItem(tx)}
            icon={CheckCircle2}
          >
            Settle
          </M3Button>
          <button
            onClick={() => setDeletingItem(tx)}
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Pending Payments & Receivables
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Track customer debts, send automated reminders, and settle outstanding balances.
          </p>
        </div>

        <M3Button
          variant="filled"
          icon={Plus}
          onClick={() => setShowAddModal(true)}
        >
          Track Pending Payment
        </M3Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <M3Card variant="filled" padding="lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Receivables (To Collect)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#6dd58c] mt-2">
            ₹{totalReceivable.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Outstanding collections due from clients</div>
        </M3Card>

        <M3Card variant="filled" padding="lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Payables (To Disburse)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#f2b8b5] mt-2">
            ₹{totalPayable.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Vendor bills and outgoing disbursements</div>
        </M3Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
          {(['all', 'receivable', 'payable'] as const).map((t) => (
            <M3Chip
              key={t}
              label={t === 'all' ? 'All Types' : t === 'receivable' ? 'Receivables (In)' : 'Payables (Out)'}
              selected={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>

        <div className="h-4 w-[1px] bg-slate-700 hidden sm:block mx-1" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {(['all', 'pending', 'overdue'] as const).map((s) => (
            <M3Chip
              key={s}
              label={s === 'all' ? 'All Schedules' : s === 'pending' ? 'Active' : 'Overdue Only'}
              selected={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Main Table */}
      <M3DataTable
        title="Pending Payment Items"
        subtitle={`${filteredData.length} active pending entries`}
        data={filteredData}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search customer, amount, phone..."
        emptyMessage="No pending payments found"
        emptySubtitle="All customer accounts and bills are fully settled."
        emptyAction={{
          label: 'Create Pending Entry',
          onClick: () => setShowAddModal(true),
        }}
      />

      {/* Add Modal */}
      <M3Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Pending Payment"
        subtitle="Track money to collect or money owed"
        icon={Clock}
        iconTone="amber"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowAddModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" onClick={handleAdd}>
              Save Pending Entry
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4 pt-2">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/10 dark:bg-white/5 border border-white/5">
            <button
              type="button"
              onClick={() => setFormType('receivable')}
              className={cn(
                'py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
                formType === 'receivable'
                  ? isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
                  : 'text-slate-400'
              )}
            >
              <ArrowDownLeft size={16} />
              <span>Receivable (To Collect)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormType('payable')}
              className={cn(
                'py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
                formType === 'payable'
                  ? isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]'
                  : 'text-slate-400'
              )}
            >
              <ArrowUpRight size={16} />
              <span>Payable (To Pay)</span>
            </button>
          </div>

          <M3TextField
            label="Customer / Party Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <M3TextField
              label="Pending Amount (₹)"
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <M3TextField
              label="Contact Phone / WhatsApp"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <M3TextField
            label="Due Date"
            type="date"
            value={formDueDate}
            onChange={(e) => setFormDueDate(e.target.value)}
          />

          <M3TextField
            label="Purpose / Memo"
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="e.g. Invoice #402 balance"
          />

          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}
        </form>
      </M3Dialog>

      {/* Settle Modal */}
      <M3Dialog
        isOpen={Boolean(settlingItem)}
        onClose={() => setSettlingItem(null)}
        title="Confirm Payment Settlement"
        subtitle="Move pending entry to completed ledger"
        icon={CheckCircle2}
        iconTone="emerald"
        actions={
          <>
            <M3Button variant="text" onClick={() => setSettlingItem(null)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" onClick={handleSettle}>
              Confirm Settlement
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Mark pending payment of <strong className="text-white">₹{(settlingItem?.amount || 0).toLocaleString()}</strong> with{' '}
          <strong className="text-white">{settlingItem?.personName}</strong> as fully received/paid?
        </p>
      </M3Dialog>

      {/* Delete Modal */}
      <M3Dialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Remove Pending Record"
        icon={Trash2}
        iconTone="rose"
        actions={
          <>
            <M3Button variant="text" onClick={() => setDeletingItem(null)}>
              Cancel
            </M3Button>
            <M3Button variant="danger" onClick={handleDelete}>
              Delete
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to permanently delete this pending entry?
        </p>
      </M3Dialog>

      {/* Phone Prompt Modal */}
      <M3Dialog
        isOpen={Boolean(phonePromptItem)}
        onClose={() => setPhonePromptItem(null)}
        title="Send WhatsApp Reminder"
        subtitle={`Dispatch reminder to ${phonePromptItem?.personName}`}
        icon={Send}
        iconTone="emerald"
        actions={
          <>
            <M3Button variant="text" onClick={() => setPhonePromptItem(null)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" onClick={handlePhonePromptSubmit}>
              Dispatch WhatsApp
            </M3Button>
          </>
        }
      >
        <form onSubmit={handlePhonePromptSubmit} className="space-y-4">
          <p className="text-xs text-slate-300">
            No phone number is saved for <strong className="text-white">{phonePromptItem?.personName}</strong>. Please enter a 10-digit mobile number to open WhatsApp:
          </p>
          <M3TextField
            label="Mobile Number / WhatsApp"
            value={inputPhone}
            onChange={(e) => setInputPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            required
            autoFocus
          />
        </form>
      </M3Dialog>
    </div>
  );
}
