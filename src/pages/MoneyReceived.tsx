import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, Plus, User, Calendar, FileText, Hash } from 'lucide-react';
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

  const receivedTransactions = transactions.filter((t): t is ReceivedMoney => t.type === 'received');

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
        className="w-full space-y-8 bg-[#05060a]"
      >
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <ArrowDownLeft className="text-emerald-400" size={32} />
          Money Received
        </h1>
        <p className="text-slate-400 mt-1 text-sm font-medium">Record and manage all incoming payments and income credits.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard glowColor="rgba(16, 185, 129, 0.2)" className="p-6">
            <h2 className="text-lg font-bold text-white mb-6">Add Received Payment</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatedInput
                label="Person / Client Name"
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
                label="Date"
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
                placeholder="e.g. Freelance Invoice"
                icon={<FileText size={16} />}
                required
              />

              <AnimatedInput
                label="Invoice Number (Optional)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-1002"
                icon={<Hash size={16} />}
              />

              <div className="pt-2">
                <AnimatedButton
                  type="submit"
                  variant="success"
                  icon={<Plus size={18} />}
                  className="w-full justify-center text-sm py-3"
                >
                  Save Received Money
                </AnimatedButton>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* List Section */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-bold text-white px-2">Received History</h2>
          
          <div className="space-y-3">
            {receivedTransactions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center text-slate-500 text-sm">
                <p>No received money records found.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {receivedTransactions.map((tx, idx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, x: 24, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, height: 0, padding: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 26,
                      delay: idx * 0.04,
                    }}
                    whileHover={{ scale: 1.01, x: 2 }}
                    className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all shadow-md"
                  >
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                      <ArrowDownLeft size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-white">{tx.personName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tx.purpose} {tx.invoiceNumber && `(${tx.invoiceNumber})`} • {formatDate(tx.date, generalSettings?.timezone)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-emerald-400">+ {formatCurrency(tx.amount)}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Received</p>
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
