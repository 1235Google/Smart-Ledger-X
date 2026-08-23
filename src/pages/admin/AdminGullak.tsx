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

  const gullakBalance = (gullakEntries || []).reduce((acc: number, curr: any) => {
    if (curr.category === 'deposit' || curr.category === 'transfer_in') return acc + (curr.amount || 0);
    if (curr.category === 'withdrawal' || curr.category === 'transfer_out') return acc - (curr.amount || 0);
    return acc;
  }, 0);

  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GullakEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<GullakEntry | null>(null);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'>('deposit');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const filtered = gullakEntries.filter((entry) => {
    if (typeFilter !== 'all' && entry.category !== typeFilter) return false;
    return true;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(formAmount);
    if (isNaN(num) || num <= 0) {
      showError('Validation Error', 'Please enter a valid amount.');
      return;
    }

    try {
      if (editingEntry) {
        updateGullakEntry(editingEntry.id, {
          amount: num,
          category: formType,
          note: formNotes,
          date: formDate,
        });
        showSuccess('Gullak Updated', 'Savings entry updated.');
        setEditingEntry(null);
      } else {
        addGullakEntry({
          personName: 'Admin',
          amount: num,
          date: formDate,
          time: new Date().toLocaleTimeString(),
          paymentMethod: 'Cash',
          category: formType,
          note: formNotes || 'Gullak Allocation',
        });
        showSuccess('Gullak Saved', `Saved ₹${num.toLocaleString()} to Gullak.`);
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
        const isDeposit = item.category === 'deposit' || item.category === 'transfer_in';
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0',
              isDeposit
                ? isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]'
                : isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]'
            )}>
              {isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </div>
            <div>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                isDeposit
                  ? isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]'
                  : isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]'
              )}>
                {item.category}
              </span>
              <div className="text-[11px] text-slate-400 mt-0.5">{item.note || 'Gullak Allocation'}</div>
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
        const isDeposit = item.category === 'deposit' || item.category === 'transfer_in';
        return (
          <span className={cn(
            'font-mono font-bold text-sm',
            isDeposit ? 'text-[#6dd58c]' : 'text-[#f2b8b5]'
          )}>
            {isDeposit ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
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
              setFormAmount(String(item.amount));
              setFormType(item.category as any);
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
        <div className="text-3xl font-extrabold font-mono text-[#6dd58c] mt-2">
          ₹{(gullakBalance || 0).toLocaleString('en-IN')}
        </div>
        <div className="text-xs text-slate-400 mt-1">{gullakEntries.length} total vault allocations</div>
      </M3Card>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
        {['all', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'].map((t) => (
          <M3Chip
            key={t}
            label={t === 'all' ? 'All Entries' : t}
            selected={typeFilter === t}
            onClick={() => setTypeFilter(t as any)}
          />
        ))}
      </div>

      {/* Main Table */}
      <M3DataTable
        title="Vault Ledger Entries"
        subtitle={`${filtered.length} total savings records`}
        data={filtered}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Search notes, amount, type..."
        searchFields={['note', 'amount', 'category']}
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
              <option value="deposit">Deposit to Vault</option>
              <option value="withdrawal">Withdrawal from Vault</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
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
