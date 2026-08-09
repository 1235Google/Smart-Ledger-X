import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion } from 'motion/react';
import { ArrowDownLeft, Plus, User, Calendar, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ReceivedMoney } from '../types';

export default function MoneyReceived() {
  const { addReceivedMoney, transactions, generalSettings } = useStore();
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const receivedTransactions = transactions.filter((t): t is ReceivedMoney => t.type === 'received');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || !date || !purpose) return;

    addReceivedMoney({
      personName,
      amount: Number(amount),
      date,
      purpose,
      invoiceNumber: invoiceNumber.trim() || undefined,
    });

    setPersonName('');
    setAmount('');
    setPurpose('');
    setInvoiceNumber('');
  };

  return (
    <div className="w-full space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
          <ArrowDownLeft className="text-green-400" />
          Money Received
        </h1>
        <p className="text-neutral-400 mt-1">Track payments you have received from others.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl"
          >
            <h2 className="text-lg font-bold text-white mb-6">Add New Entry</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Person Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm font-mono"
                    placeholder="5000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Purpose</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. Loan Returned"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Invoice Number (Optional)</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm"
                    placeholder="e.g. INV-1002"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[48px] rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/30"
              >
                <Plus size={18} />
                Add Money Received
              </button>
            </form>
          </motion.div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-semibold text-white px-2">History</h2>
          
          <div className="space-y-3">
            {receivedTransactions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl h-16 flex items-center justify-center text-slate-600 text-sm">
                <p>No received money records found.</p>
              </div>
            ) : (
              receivedTransactions.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all"
                >
                  <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowDownLeft size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-white">{tx.personName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tx.purpose} {tx.invoiceNumber && `(${tx.invoiceNumber})`} • {formatDate(tx.date, generalSettings?.timezone)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">+ {formatCurrency(tx.amount)}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Received</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
