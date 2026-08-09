import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Plus, Edit2, Trash2, X, ArrowUpDown, Download, Filter, Eye } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { GullakEntry } from '../../types';
import ExportModal from '../../components/ExportModal';

export default function AdminGullak() {
  const { gullakEntries, addGullakEntry, updateGullakEntry, deleteGullakEntry } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GullakEntry | null>(null);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'>('deposit');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const filtered = gullakEntries.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || entry.note.toLowerCase().includes(q) || String(entry.amount).includes(q) || entry.category.toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || entry.category === typeFilter;
    const matchesDate = !dateFilter || entry.date.startsWith(dateFilter);
    return matchesSearch && matchesType && matchesDate;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
        updateGullakEntry(editingEntry.id, {
            amount: Number(formAmount),
            category: formType,
            note: formNotes,
            date: formDate
        });
        setEditingEntry(null);
    } else {
        addGullakEntry({
            personName: 'Admin',
            amount: Number(formAmount),
            date: formDate,
            time: new Date().toLocaleTimeString(),
            paymentMethod: 'Cash',
            category: formType,
            note: formNotes
        });
    }
    setShowAddModal(false);
    setFormAmount('');
    setFormNotes('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gullak Entries</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage all gullak transactions and monitor balances.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search entries..." 
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
            <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-2 text-sm">
                <Download size={16}/> Export
            </button>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 text-sm">
                <Plus size={16}/> Add Entry
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left">
            <thead className="bg-[#0c0c0c] border-b border-white/10">
                <tr className="text-neutral-400 text-xs uppercase">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Notes</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
                {sorted.map(entry => (
                    <tr key={entry.id} className="hover:bg-white/[0.04]">
                        <td className="py-4 px-6">{entry.date}</td>
                        <td className="py-4 px-6 capitalize">{entry.category.replace('_', ' ')}</td>
                        <td className="py-4 px-6 font-bold text-emerald-400">₹{entry.amount.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-neutral-300">{entry.note}</td>
                        <td className="py-4 px-6 text-right flex justify-end gap-2">
                            <button onClick={() => { setEditingEntry(entry); setFormAmount(String(entry.amount)); setFormNotes(entry.note); setFormType(entry.category as any); setFormDate(entry.date); setShowAddModal(true); }} className="p-2 hover:bg-white/10 rounded-lg"><Edit2 size={16}/></button>
                            <button onClick={() => deleteGullakEntry(entry.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"><Trash2 size={16}/></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#121212] border border-white/10 rounded-3xl p-6 w-full max-w-sm">
                    <h3 className="text-xl font-bold mb-4">{editingEntry ? 'Edit' : 'Add'} Gullak Entry</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="Amount" required className="w-full bg-black/40 border rounded-xl p-2.5"/>
                        <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full bg-black/40 border rounded-xl p-2.5">
                            <option value="deposit">Deposit</option>
                            <option value="withdrawal">Withdrawal</option>
                            <option value="transfer_in">Transfer In</option>
                            <option value="transfer_out">Transfer Out</option>
                        </select>
                        <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes" className="w-full bg-black/40 border rounded-xl p-2.5"/>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required className="w-full bg-black/40 border rounded-xl p-2.5"/>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-white/5 rounded-xl">Cancel</button>
                            <button type="submit" className="flex-1 py-2 bg-emerald-600 rounded-xl">Save</button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

        <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            reportType="entries"
            title="Export Gullak Entries Report"
            records={gullakEntries}
        />
    </div>
  );
}
