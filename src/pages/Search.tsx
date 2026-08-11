import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Search as SearchIcon, ArrowDownLeft, Clock, ArrowUpRight, X } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import AnimatedInput from '../components/ui/AnimatedInput';

export default function Search() {
  const { transactions, generalSettings } = useStore();
  const [query, setQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    
    return transactions.filter(tx => {
      const nameMatch = tx.personName.toLowerCase().includes(lowerQuery);
      const amountMatch = tx.amount.toString().includes(lowerQuery);
      const typeMatch = tx.type.toLowerCase().includes(lowerQuery);
      const purposeMatch = tx.type === 'received' || tx.type === 'sent'
        ? tx.purpose.toLowerCase().includes(lowerQuery)
        : (tx as any).reason.toLowerCase().includes(lowerQuery);
        
      return nameMatch || amountMatch || typeMatch || purposeMatch;
    });
  }, [query, transactions]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full space-y-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <SearchIcon className="text-blue-400" size={32} />
          Search Ledger
        </h1>
        <p className="text-slate-400 mt-1 text-sm font-medium">Instantly search transactions by name, amount, category, or note.</p>
      </header>

      <div className="relative group max-w-3xl">
        <AnimatedInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search transactions, names, amounts..."
          icon={<SearchIcon size={20} className="text-blue-400" />}
          autoFocus
          className="text-base py-4"
        />
        {query && (
          <button 
            onClick={() => setQuery('')} 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {query && filteredTransactions.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-400 text-sm max-w-3xl"
          >
            <SearchIcon size={36} className="text-slate-600 mb-3" />
            <p className="font-semibold text-base text-slate-300">No matching records found</p>
            <p className="text-xs text-slate-500 mt-1">Try searching for a different person name, amount, or purpose.</p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredTransactions.map((tx, idx) => (
            <motion.div
              key={tx.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, height: 0, padding: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 28,
                delay: idx * 0.03,
              }}
              whileHover={{ scale: 1.01, x: 3 }}
              className="group bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all shadow-lg max-w-3xl cursor-pointer"
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner",
                tx.type === 'received' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                tx.type === 'sent' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : 
                "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              )}>
                {tx.type === 'received' ? <ArrowDownLeft size={22} /> : 
                 tx.type === 'sent' ? <ArrowUpRight size={22} /> : 
                 <Clock size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate">{tx.personName}</span>
                  <span className={cn(
                    "text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border",
                    tx.type === 'received' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                    tx.type === 'sent' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {tx.type}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason} • {formatDate(tx.type === 'received' || tx.type === 'sent' ? tx.date : (tx as any).dueDate, generalSettings?.timezone)}
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-sm font-extrabold tracking-tight",
                  tx.type === 'received' ? "text-emerald-400" : 
                  tx.type === 'sent' ? "text-rose-400" : 
                  "text-amber-400"
                )}>
                  {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">{tx.type}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
