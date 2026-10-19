import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, Plus, User, Calendar, FileText, Hash, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ReceivedMoney } from '../types';
import AnimatedInput from '../components/ui/AnimatedInput';
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-6 sm:space-y-8"
      >
        <header className="mb-4 sm:mb-6">
          <div className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider mb-1">
            Inflow Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-3">
            Money Received
          </h1>
          <p className="text-[var(--md-sys-color-on-surface-variant)] mt-1 text-sm font-medium">Record incoming client credits, salary, freelance milestones, and deposits.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Material 3 Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="m3-card rounded-[28px] p-5 sm:p-7 shadow-xs relative overflow-hidden bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/40">
              <h2 className="text-base font-bold text-[var(--md-sys-color-on-surface)] mb-5 flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)]">
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
                    className="m3-btn-filled w-full py-3.5 px-6 font-bold text-sm shadow-xs flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <h2 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">
                Inflow Feed ({filteredTransactions.length})
              </h2>
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-outline)]" />
                <input
                  type="text"
                  placeholder="Search received..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 sm:py-1.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/40 text-xs text-[var(--md-sys-color-on-surface)] placeholder-[var(--md-sys-color-outline)] outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 transition-all min-h-[40px] sm:min-h-[36px]"
                />
              </div>
            </div>
            
            <div className="space-y-2.5">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[var(--md-sys-color-outline-variant)]/60 rounded-[28px] flex flex-col items-center justify-center text-[var(--md-sys-color-on-surface-variant)] text-sm bg-[var(--md-sys-color-surface-container-low)]">
                  <ArrowDownLeft size={32} className="text-[var(--md-sys-color-outline)] mb-2" />
                  <p>No received money records found.</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((tx, idx) => (
                    <motion.div
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="m3-card bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/40 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 transition-all duration-150 shadow-xs group"
                    >
                      <div className="w-10 h-10 bg-[var(--md-sys-color-success-container)] text-[var(--md-sys-color-on-success-container)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
                        <ArrowDownLeft size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-[var(--md-sys-color-on-surface)]">{tx.personName}</p>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5 truncate">
                          {tx.purpose} {tx.invoiceNumber && `• #${tx.invoiceNumber}`} • {formatDate(tx.date, generalSettings?.timezone)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm sm:text-base font-extrabold text-[var(--md-sys-color-success)] font-mono tabular-nums whitespace-nowrap">+ {formatCurrency(tx.amount)}</p>
                        <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase font-bold">Cleared</p>
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
