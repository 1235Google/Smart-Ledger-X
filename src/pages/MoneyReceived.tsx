import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, Plus, User, Calendar, FileText, Hash, Search, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ReceivedMoney } from '../types';
import AnimatedInput from '../components/ui/AnimatedInput';
import AnimatedButton from '../components/ui/AnimatedButton';
import GlassCard from '../components/ui/GlassCard';
import DataStateGuard from '../components/ui/DataStateGuard';

export default function MoneyReceived() {
  const { 
    addReceivedMoney, 
    transactions, 
    generalSettings,
    dataStatus,
    dataError,
    retryFetchData
  } = useStore();
  const { showSuccess } = useToast();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const receivedTransactions = transactions.filter((t): t is ReceivedMoney => t.type === 'received');
  const filteredTransactions = receivedTransactions.filter(tx => 
    tx.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.invoiceNumber && tx.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || !date || !purpose) return;

    const numAmount = Number(amount);
    addReceivedMoney({
      personName,
      amount: numAmount,
      date,
      purpose,
      invoiceNumber: invoiceNumber.trim() || undefined,
    });

    showSuccess('Money Received Added', `Recorded +${formatCurrency(numAmount)} from ${personName}`);

    setPersonName('');
    setAmount('');
    setPurpose('');
    setInvoiceNumber('');
  };

  return (
    <DataStateGuard
      status={dataStatus}
      error={dataError}
      onRetry={retryFetchData}
      loadingMessage="Loading received transactions..."
      skeletonType="table"
    >
      <motion.div 
        layoutId="shared-received"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8"
      >
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#30d158] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#30d158]" /> Inflow Ledger
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Money Received
          </h1>
          <p className="text-[#86868b] mt-1 text-sm font-medium">Record incoming client credits, salary, freelance milestones, and deposits.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Apple Style Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#12131a]/90 border border-white/[0.08] rounded-[28px] p-6 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-[#30d158]/15 text-[#30d158]">
                  <ArrowDownLeft size={16} />
                </span>
                Record Inflow
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatedInput
                  label="Client / Sender Name"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  icon={<User size={16} />}
                  required
                />

                <AnimatedInput
                  label="Amount (₹)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  icon={<span className="font-bold text-xs">₹</span>}
                  required
                />

                <AnimatedInput
                  label="Transaction Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  icon={<Calendar size={16} />}
                  required
                />

                <AnimatedInput
                  label="Purpose / Category"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Website Consulting"
                  icon={<FileText size={16} />}
                  required
                />

                <AnimatedInput
                  label="Invoice Number (Optional)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-08"
                  icon={<Hash size={16} />}
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-full bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-sm transition-all shadow-lg shadow-[#30d158]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Plus size={18} />
                    <span>Save Received Money</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-base font-bold text-white">
                Inflow Feed ({filteredTransactions.length})
              </h2>
              <div className="relative w-48 sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  placeholder="Search received..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-[#86868b] outline-none focus:border-[#30d158]/50 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-2.5">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-[28px] flex flex-col items-center justify-center text-[#86868b] text-sm">
                  <ArrowDownLeft size={32} className="text-[#86868b]/50 mb-2" />
                  <p>No received money records found.</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((tx, idx) => (
                    <motion.div
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: idx * 0.02 }}
                      className="bg-[#12131a]/70 hover:bg-[#12131a]/95 border border-white/[0.06] p-4 rounded-2xl flex items-center gap-4 transition-all shadow-sm group"
                    >
                      <div className="w-11 h-11 bg-[#30d158]/15 text-[#30d158] rounded-xl flex items-center justify-center flex-shrink-0">
                        <ArrowDownLeft size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-white">{tx.personName}</p>
                        <p className="text-xs text-[#86868b] mt-0.5 truncate">
                          {tx.purpose} {tx.invoiceNumber && `• #${tx.invoiceNumber}`} • {formatDate(tx.date, generalSettings?.timezone)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-[#30d158] font-tabular">+ {formatCurrency(tx.amount)}</p>
                        <p className="text-[10px] text-[#86868b] uppercase font-semibold">Cleared</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </DataStateGuard>
  );
}

