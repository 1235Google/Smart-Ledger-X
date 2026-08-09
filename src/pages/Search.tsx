import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Search as SearchIcon, ArrowDownLeft, Clock, Calendar, X } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';

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
    <div className="w-full space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
          <SearchIcon className="text-blue-400" />
          Search
        </h1>
        <p className="text-neutral-400 mt-1">Find transactions by name, amount, or purpose.</p>
      </header>

      <div className="relative group">
        <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl transition-opacity opacity-0 group-focus-within:opacity-100" />
        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center backdrop-blur-xl">
          <SearchIcon className="text-slate-400 ml-3" size={24} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-transparent border-none text-white px-4 py-3 focus:outline-none text-lg"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-2 text-slate-400 hover:text-white mr-1 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {query && filteredTransactions.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl h-16 flex items-center justify-center text-slate-600 text-sm">
            <p>No results found for "{query}"</p>
          </div>
        )}

        {filteredTransactions.map((tx, idx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all"
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              tx.type === 'received' ? "bg-green-500/20 text-green-400" : 
              tx.type === 'sent' ? "bg-red-500/20 text-red-400" : 
              "bg-amber-500/20 text-amber-400"
            )}>
              {tx.type === 'received' ? <ArrowDownLeft size={24} /> : 
               tx.type === 'sent' ? <ArrowDownLeft className="rotate-180" size={24} /> : 
               <Clock size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm truncate">{tx.personName}</span>
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                  tx.type === 'received' ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                  tx.type === 'sent' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {tx.type}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {tx.type === 'received' || tx.type === 'sent' ? tx.purpose : (tx as any).reason} • {formatDate(tx.type === 'received' || tx.type === 'sent' ? tx.date : (tx as any).dueDate, generalSettings?.timezone)}
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-sm font-bold",
                tx.type === 'received' ? "text-green-400" : 
                tx.type === 'sent' ? "text-red-400" : 
                "text-amber-500"
              )}>
                {tx.type === 'received' ? '+' : tx.type === 'sent' ? '-' : '⏳'} {formatCurrency(tx.amount)}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">{tx.type}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
