import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion } from 'motion/react';
import { ArrowUpRight, Plus, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { SentMoney } from '../types';

export default function SendMoney() {
  const { addSentMoney, transactions, currentBalance, generalSettings } = useStore();
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [error, setError] = useState('');

  const sentTransactions = transactions.filter((t): t is SentMoney => t.type === 'sent');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!personName || !amount || !date || !purpose) return;

    const numAmount = Number(amount);
    
    if (numAmount > currentBalance) {
      setError(`Insufficient balance. You only have ${formatCurrency(currentBalance)} available.`);
      return;
    }

    addSentMoney({
      personName,
      amount: numAmount,
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
          <ArrowUpRight className="text-red-400" />
          Send Money
        </h1>
        <p className="text-neutral-400 mt-1">Send money and track your outgoing transactions.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl"
          >
            <h2 className="text-lg font-bold text-white mb-6">New Transaction</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Recipient Name</label>
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
                    className={cn(
                      "w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors text-sm font-mono",
                      error && "border-red-500/50 focus:ring-red-500/50"
                    )}
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
                    placeholder="e.g. Bill Payment"
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
                Send Money
              </button>
            </form>
          </motion.div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-semibold text-white px-2">History</h2>
          
          <div className="space-y-3">
            {sentTransactions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl h-16 flex items-center justify-center text-slate-600 text-sm">
                <p>No sent money records found.</p>
              </div>
            ) : (
              sentTransactions.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all"
                >
                  <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-white">{tx.personName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tx.purpose} {tx.invoiceNumber && `(${tx.invoiceNumber})`} • {formatDate(tx.date, generalSettings?.timezone)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">- {formatCurrency(tx.amount)}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Sent</p>
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
