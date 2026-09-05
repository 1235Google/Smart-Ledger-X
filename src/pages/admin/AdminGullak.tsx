import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  Search, 
  PiggyBank,
  Wallet,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { GullakEntry } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { 
  getGullakEntryDirection, 
  getGullakAbsoluteAmount, 
  calculateGullakBalance, 
  formatGullakLedgerDisplay,
  GullakDirection,
  GullakOperation
} from '../../lib/gullakAccounting';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminGullak() {
  const { 
    gullakEntries, 
    addGullakEntry, 
    updateGullakEntry, 
    deleteGullakEntry 
  } = useStore();
  const { showSuccess, showError } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const gullakBalance = calculateGullakBalance(gullakEntries || []);

  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GullakEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<GullakEntry | null>(null);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'>('deposit');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const filtered = (gullakEntries || []).filter((entry) => {
    if (typeFilter === 'all') return true;
    const dir = getGullakEntryDirection(entry);
    return dir === typeFilter;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(formAmount);
    if (isNaN(num) || num <= 0) {
      showError('Validation Error', 'Please enter a valid amount.');
      return;
    }

    const isCredit = formType === 'deposit' || formType === 'transfer_in';
    const direction: GullakDirection = isCredit ? 'credit' : 'debit';
    const operation: GullakOperation = isCredit 
      ? (formType === 'transfer_in' ? 'transfer_in' : 'allocation')
      : (formType === 'transfer_out' ? 'transfer_out' : 'withdrawal');
    const categoryName = isCredit ? 'Savings' : 'Withdrawal';
    const noteText = formNotes || (isCredit ? 'Gullak Allocation' : 'Vault Withdrawal');

    try {
      if (editingEntry) {
        updateGullakEntry(editingEntry.id, {
          amount: Math.abs(num),
          category: categoryName,
          type: 'savings',
          operation,
          direction,
          note: noteText,
          date: formDate,
        });
        showSuccess('Gullak Updated', 'Savings entry updated.');
        setEditingEntry(null);
      } else {
        addGullakEntry({
          personName: 'Admin',
          amount: Math.abs(num),
          date: formDate,
          time: new Date().toLocaleTimeString(),
          paymentMethod: 'Cash',
          category: categoryName,
          type: 'savings',
          operation,
          direction,
          note: noteText,
        });
        showSuccess('Gullak Saved', `${isCredit ? 'Allocated' : 'Withdrew'} ₹${num.toLocaleString('en-IN')} ${isCredit ? 'to' : 'from'} Gullak.`);
        setShowAddModal(false);
      }
      setFormAmount('');
      setFormNotes('');
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to save gullak entry.');
    }
  };

  const handleDelete = () => {
    if (!deletingEntry) return;
    try {
      deleteGullakEntry(deletingEntry.id);
      showSuccess('Entry Removed', 'Gullak entry deleted.');
      setDeletingEntry(null);
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to delete entry.');
    }
  };

  const columns: Column<GullakEntry>[] = [
    {
      key: 'category',
      header: 'Type & Operation',
      render: (item) => {
        const display = formatGullakLedgerDisplay(item, isDark);
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors',
              display.iconBg
            )}>
              {display.isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  display.badgeClass
                )}>
                  {display.typeLabel}
                </span>
                <span className={cn(
                  'text-[10px] font-semibold tracking-wide uppercase',
                  display.directionTagClass
                )}>
                  {display.isCredit ? 'Credit' : 'Debit'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{display.operationLabel}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (item) => {
        const display = formatGullakLedgerDisplay(item, isDark);
        return (
          <span className={cn(
            'font-mono font-bold text-sm tabular-nums',
            display.amountColor
          )}>
            {display.formattedAmount}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'Date Recorded',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setEditingEntry(item);
              setFormAmount(String(getGullakAbsoluteAmount(item)));
              const dir = getGullakEntryDirection(item);
              setFormType(dir === 'credit' ? 'deposit' : 'withdrawal');
              setFormNotes(item.note || '');
              setFormDate(item.date);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeletingEntry(item)}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Gullak Digital Vault
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Manage emergency reserve funds, vault allocations, and micro-savings balances.
          </p>
        </div>

        <M3Button
          variant="filled"
          icon={Plus}
          onClick={() => {
            setEditingEntry(null);
            setFormAmount('');
            setFormNotes('');
            setFormType('deposit');
            setFormDate(new Date().toISOString().split('T')[0]);
            setShowAddModal(true);
          }}
        >
          Add Vault Entry
        </M3Button>
      </div>

      {/* Vault Balance Card */}
      <M3Card variant="filled" padding="lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Vault Balance
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#004a77] text-[#c2e7ff] flex items-center justify-center">
            <PiggyBank size={18} />
          </div>
        </div>
        <div className={cn('text-3xl font-extrabold font-mono mt-2 tabular-nums', gullakBalance >= 0 ? 'text-[#6dd58c]' : 'text-[#f2b8b5]')}>
          ₹{(gullakBalance || 0).toLocaleString('en-IN')}
        </div>
        <div className="text-xs text-slate-400 mt-1">{gullakEntries?.length || 0} total vault allocations</div>
      </M3Card>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
        <M3Chip
          label="All Entries"
          selected={typeFilter === 'all'}
          onClick={() => setTypeFilter('all')}
        />
        <M3Chip
          label="Allocations & Deposits (+ Credit)"
          selected={typeFilter === 'credit'}
          onClick={() => setTypeFilter('credit')}
        />
        <M3Chip
          label="Withdrawals (- Debit)"
          selected={typeFilter === 'debit'}
          onClick={() => setTypeFilter('debit')}
        />
      </div>

      {/* Main Table */}
      <M3DataTable
        title="Vault Ledger Entries"
        subtitle={`${filtered.length} total savings records`}
        data={filtered}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search notes, amount, type..."
        searchFields={['note', 'amount', 'category', 'type', 'operation']}
        emptyMessage="No vault entries found"
      />

      {/* Add / Edit Dialog */}
      <M3Dialog
        isOpen={showAddModal || Boolean(editingEntry)}
        onClose={() => {
          setShowAddModal(false);
          setEditingEntry(null);
        }}
        title={editingEntry ? 'Edit Vault Entry' : 'New Vault Allocation'}
        icon={PiggyBank}
        iconTone="emerald"
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
              Save Entry
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <M3TextField
            label="Amount (₹)"
            type="number"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="0.00"
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Vault Operation</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as any)}
              className={cn(
                'w-full h-14 px-3.5 rounded-2xl border text-sm outline-none transition-all cursor-pointer',
                isDark ? 'bg-[#1e1f20] text-white border-[#3c4043]' : 'bg-[#f0f4f9] text-black border-[#c4c7c5]'
              )}
            >
              <option value="deposit">Gullak Allocation / Deposit (+ Credit)</option>
              <option value="withdrawal">Withdrawal from Vault (- Debit)</option>
              <option value="transfer_in">Transfer In (+ Credit)</option>
              <option value="transfer_out">Transfer Out (- Debit)</option>
            </select>
          </div>

          <M3TextField
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          <M3TextField
            label="Purpose / Memo"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="e.g. Monthly emergency reserve"
          />
        </form>
      </M3Dialog>

      {/* Delete Dialog */}
      <M3Dialog
        isOpen={Boolean(deletingEntry)}
        onClose={() => setDeletingEntry(null)}
        title="Delete Vault Record"
        icon={Trash2}
        iconTone="rose"
        actions={
          <>
            <M3Button variant="text" onClick={() => setDeletingEntry(null)}>
              Cancel
            </M3Button>
            <M3Button variant="danger" onClick={handleDelete}>
              Delete
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete this vault entry?
        </p>
      </M3Dialog>
    </div>
  );
}
