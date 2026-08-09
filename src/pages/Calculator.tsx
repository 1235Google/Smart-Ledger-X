import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator as CalcIcon, 
  History, 
  Trash2, 
  Copy, 
  Heart, 
  Search, 
  Plus, 
  Minus, 
  CreditCard, 
  Wallet, 
  FileText,
  Star,
  Check,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';

interface HistoryItem {
  id: string;
  date: string;
  time: string;
  expression: string;
  result: string;
  isFavorite: boolean;
}

export default function Calculator() {
  const { addReceivedMoney, addSentMoney, addPendingMoney, setStartingBalance, startingBalance } = useStore();
  
  // Calculator State
  const [expression, setExpression] = useState('');
  const [displayValue, setDisplayValue] = useState('0');
  const [previewResult, setPreviewResult] = useState('');
  const [memory, setMemory] = useState<number>(0);
  const [lastResult, setLastResult] = useState<string>('');
  const [justCalculated, setJustCalculated] = useState(false);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false); // Mobile toggle
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);
  
  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  
  const displayRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus trap and accessibility
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Math Evaluation
  const evaluateExpression = (expr: string) => {
    try {
      // Replace × and ÷ for native JS
      const sanitizedExpr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/.()]/g, '');
      const result = new Function('return ' + sanitizedExpr)();
      if (typeof result === 'number') {
        // Handle floating point precision roughly
        return parseFloat(result.toFixed(14)).toString();
      }
      return result.toString();
    } catch (e) {
      return '';
    }
  };

  // Update preview on expression change
  useEffect(() => {
    if (expression && !justCalculated) {
      const currentExpr = expression + (displayValue !== '0' && displayValue !== '' ? displayValue : '');
      const res = evaluateExpression(currentExpr);
      if (res && res !== displayValue) {
        setPreviewResult(res);
      } else {
        setPreviewResult('');
      }
    } else {
      setPreviewResult('');
    }
  }, [expression, displayValue, justCalculated]);

  // Handle number formatting with thousands separator
  const formatNumber = (numStr: string) => {
    if (!numStr) return '';
    if (numStr === 'Error') return numStr;
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Core Calculator Functions
  const handleNumber = useCallback((num: string) => {
    if (justCalculated) {
      setDisplayValue(num);
      setExpression('');
      setJustCalculated(false);
    } else {
      if (displayValue === '0' && num !== '.') {
        setDisplayValue(num);
      } else {
        if (num === '.' && displayValue.includes('.')) return;
        setDisplayValue(displayValue + num);
      }
    }
  }, [displayValue, justCalculated]);

  const handleOperator = useCallback((op: string) => {
    setJustCalculated(false);
    if (displayValue !== '') {
      setExpression(expression + displayValue + ' ' + op + ' ');
      setDisplayValue('0');
    } else if (expression.length > 0) {
      // Change last operator
      setExpression(expression.slice(0, -3) + ' ' + op + ' ');
    }
  }, [displayValue, expression]);

  const calculateResult = useCallback(() => {
    if (!expression && displayValue === '0') return;
    
    const finalExpr = expression + (displayValue !== '0' && displayValue !== '' ? displayValue : '');
    const result = evaluateExpression(finalExpr);
    
    if (result) {
      const now = new Date();
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        expression: finalExpr,
        result: result,
        isFavorite: false
      };
      
      setHistory(prev => [newItem, ...prev]);
      setDisplayValue(result);
      setLastResult(result);
      setExpression('');
      setPreviewResult('');
      setJustCalculated(true);
      setShowActions(true);
    }
  }, [expression, displayValue]);

  const handleClear = useCallback(() => {
    setDisplayValue('0');
    setExpression('');
    setPreviewResult('');
    setJustCalculated(false);
    setShowActions(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (justCalculated) {
      setShowActions(false);
      return;
    }
    if (displayValue.length > 1) {
      setDisplayValue(displayValue.slice(0, -1));
    } else {
      setDisplayValue('0');
    }
  }, [displayValue, justCalculated]);

  const handlePercentage = useCallback(() => {
    if (displayValue !== '0') {
      const val = parseFloat(displayValue);
      setDisplayValue((val / 100).toString());
    }
  }, [displayValue]);

  const handleParentheses = useCallback(() => {
    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    
    if (openCount > closeCount && displayValue !== '0') {
      setExpression(expression + displayValue + ')');
      setDisplayValue('');
    } else {
      setExpression(expression + '(');
    }
  }, [expression, displayValue]);

  const handleNegate = useCallback(() => {
    if (displayValue !== '0') {
      if (displayValue.startsWith('-')) {
        setDisplayValue(displayValue.slice(1));
      } else {
        setDisplayValue('-' + displayValue);
      }
    }
  }, [displayValue]);

  // Memory Functions
  const handleMemory = useCallback((action: 'MC' | 'MR' | 'M+' | 'M-') => {
    const currentVal = parseFloat(displayValue || '0');
    switch (action) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplayValue(memory.toString()); setJustCalculated(true); break;
      case 'M+': setMemory(m => m + currentVal); setJustCalculated(true); break;
      case 'M-': setMemory(m => m - currentVal); setJustCalculated(true); break;
    }
  }, [displayValue, memory]);

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in search input
      if (document.activeElement === searchInputRef.current) return;

      const key = e.key;
      
      // Numbers
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleNumber(key);
      }
      
      // Operators
      if (key === '+') { e.preventDefault(); handleOperator('+'); }
      if (key === '-') { e.preventDefault(); handleOperator('-'); }
      if (key === '*') { e.preventDefault(); handleOperator('×'); }
      if (key === '/') { e.preventDefault(); handleOperator('÷'); }
      if (key === '%') { e.preventDefault(); handlePercentage(); }
      if (key === '.') { e.preventDefault(); handleNumber('.'); }
      
      // Enter / Equals
      if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
      }
      
      // Backspace / Delete
      if (key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
      if (key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
      if (key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
      
      // History Navigation
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        if (history.length === 0) return;
        
        let newIdx = selectedHistoryIndex;
        if (key === 'ArrowUp') {
          newIdx = newIdx < history.length - 1 ? newIdx + 1 : newIdx;
        } else {
          newIdx = newIdx > -1 ? newIdx - 1 : -1;
        }
        
        setSelectedHistoryIndex(newIdx);
        if (newIdx !== -1) {
          setDisplayValue(history[newIdx].result);
          setJustCalculated(true);
        }
      }

      // Copy / Paste / Undo
      if (e.ctrlKey || e.metaKey) {
        if (key === 'c' && e.shiftKey) {
          e.preventDefault();
          if (history.length > 0) {
            navigator.clipboard.writeText(`${history[0].expression} = ${history[0].result}`);
            setCopiedId('full');
            setTimeout(() => setCopiedId(null), 2000);
          }
        } else if (key === 'c') {
          e.preventDefault();
          navigator.clipboard.writeText(displayValue);
          setCopiedId('display');
          setTimeout(() => setCopiedId(null), 2000);
        } else if (key === 'v') {
          navigator.clipboard.readText().then(text => {
            const num = parseFloat(text);
            if (!isNaN(num)) {
              setDisplayValue(num.toString());
              setJustCalculated(true);
            }
          }).catch(() => {});
        } else if (key === 'z') {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleOperator, calculateResult, handleDelete, handleClear, handlePercentage, displayValue, history, selectedHistoryIndex]);

  // Smart Ledger Integrations
  const handleAddTransaction = (type: 'received' | 'sent') => {
    const amount = parseFloat(displayValue);
    if (isNaN(amount) || amount <= 0) return;

    if (type === 'received') {
      addReceivedMoney({
        amount,
        personName: 'Manual Calculator Entry',
        date: new Date().toISOString().split('T')[0],
        purpose: 'Calculator Calculation'
      });
    } else {
      addSentMoney({
        amount,
        personName: 'Manual Calculator Entry',
        date: new Date().toISOString().split('T')[0],
        purpose: 'Calculator Calculation'
      });
    }
    setShowActions(false);
  };

  const handleAddPendingPayment = () => {
    const amount = parseFloat(displayValue);
    if (isNaN(amount) || amount <= 0) return;

    addPendingMoney({
      amount,
      personName: 'Manual Calculator Entry',
      dueDate: new Date().toISOString().split('T')[0],
      reason: 'Calculator Calculation',
      reminderFrequency: 'once'
    });
    setShowActions(false);
  };

  const handleUpdateVault = () => {
    const amount = parseFloat(displayValue);
    if (isNaN(amount)) return;
    setStartingBalance(amount);
    setShowActions(false);
  };

  const filteredHistory = history.filter(h => 
    h.expression.includes(searchQuery) || 
    h.result.includes(searchQuery)
  );

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 relative max-w-6xl mx-auto" ref={calculatorRef}>
      
      {/* Calculator Main Panel */}
      <div className="flex-1 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Display Area */}
        <div className="p-8 pb-4 flex flex-col justify-end min-h-[220px] relative z-10">
          <div className="text-slate-400 text-right text-lg mb-2 font-mono h-6 overflow-hidden text-ellipsis whitespace-nowrap">
            {expression}
          </div>
          <div 
            ref={displayRef}
            className={cn(
              "text-right font-light tracking-tight transition-all duration-200 break-all leading-tight",
              displayValue.length > 15 ? "text-4xl" : "text-6xl text-white font-mono"
            )}
          >
            {formatNumber(displayValue)}
          </div>
          <div className="h-6 mt-1 text-right text-indigo-400/80 font-mono text-sm">
            {previewResult && previewResult !== displayValue ? `= ${formatNumber(previewResult)}` : ''}
          </div>
        </div>

        {/* Quick Actions (Slide Down after =) */}
        <AnimatePresence>
          {showActions && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-4 overflow-hidden border-b border-white/5 bg-white/5"
            >
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => handleAddTransaction('received')} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-colors text-sm font-medium">
                  <Plus size={16} /> Add Income
                </button>
                <button onClick={() => handleAddTransaction('sent')} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium">
                  <Minus size={16} /> Add Expense
                </button>
                <button onClick={() => handleAddPendingPayment()} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors text-sm font-medium">
                  <Clock size={16} /> Pending Payment
                </button>
                <button onClick={handleUpdateVault} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-colors text-sm font-medium">
                  <Wallet size={16} /> Set Vault
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.readText().then(text => {
                      const num = parseFloat(text);
                      if (!isNaN(num)) {
                        setDisplayValue(num.toString());
                        setJustCalculated(true);
                      }
                    }).catch(() => {});
                  }}
                  className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  <FileText size={16} /> Paste Number
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(displayValue);
                    setCopiedId('action');
                    setTimeout(() => setCopiedId(null), 2000);
                  }} 
                  className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  {copiedId === 'action' ? <Check size={16} /> : <Copy size={16} />} 
                  {copiedId === 'action' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="flex-1 p-6 pt-4 bg-gradient-to-b from-transparent to-black/20 grid grid-cols-4 gap-3 sm:gap-4">
          
          {/* Memory Row */}
          <div className="col-span-4 flex justify-between gap-2 mb-2">
            <CalcButton onClick={() => handleMemory('MC')} variant="memory" className="flex-1">MC</CalcButton>
            <CalcButton onClick={() => handleMemory('MR')} variant="memory" className="flex-1">MR</CalcButton>
            <CalcButton onClick={() => handleMemory('M+')} variant="memory" className="flex-1">M+</CalcButton>
            <CalcButton onClick={() => handleMemory('M-')} variant="memory" className="flex-1">M-</CalcButton>
            <CalcButton onClick={() => {
              if (lastResult) {
                setDisplayValue(lastResult);
                setJustCalculated(true);
              }
            }} variant="memory" className="flex-1 font-bold text-indigo-400">ANS</CalcButton>
          </div>

          {/* Row 1 */}
          <CalcButton onClick={handleClear} variant="danger">AC</CalcButton>
          <CalcButton onClick={handleParentheses} variant="secondary">( )</CalcButton>
          <CalcButton onClick={handlePercentage} variant="secondary">%</CalcButton>
          <CalcButton onClick={() => handleOperator('÷')} variant="operator">÷</CalcButton>

          {/* Row 2 */}
          <CalcButton onClick={() => handleNumber('7')}>7</CalcButton>
          <CalcButton onClick={() => handleNumber('8')}>8</CalcButton>
          <CalcButton onClick={() => handleNumber('9')}>9</CalcButton>
          <CalcButton onClick={() => handleOperator('×')} variant="operator">×</CalcButton>

          {/* Row 3 */}
          <CalcButton onClick={() => handleNumber('4')}>4</CalcButton>
          <CalcButton onClick={() => handleNumber('5')}>5</CalcButton>
          <CalcButton onClick={() => handleNumber('6')}>6</CalcButton>
          <CalcButton onClick={() => handleOperator('-')} variant="operator">-</CalcButton>

          {/* Row 4 */}
          <CalcButton onClick={() => handleNumber('1')}>1</CalcButton>
          <CalcButton onClick={() => handleNumber('2')}>2</CalcButton>
          <CalcButton onClick={() => handleNumber('3')}>3</CalcButton>
          <CalcButton onClick={() => handleOperator('+')} variant="operator">+</CalcButton>

          {/* Row 5 */}
          <CalcButton onClick={handleNegate}>±</CalcButton>
          <CalcButton onClick={() => handleNumber('0')}>0</CalcButton>
          <CalcButton onClick={() => handleNumber('.')}>.</CalcButton>
          <CalcButton onClick={calculateResult} variant="primary">=</CalcButton>
        </div>
      </div>

      {/* Mobile History Toggle */}
      <div className="md:hidden">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/80 font-medium"
        >
          <History size={18} />
          {showHistory ? 'Hide History' : 'Show History'}
          <ChevronDown size={18} className={cn("transition-transform", showHistory && "rotate-180")} />
        </button>
      </div>

      {/* History Panel */}
      <div className={cn(
        "md:w-80 lg:w-96 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col shadow-2xl transition-all duration-300",
        !showHistory && "hidden md:flex",
        showHistory && "h-[400px] md:h-auto"
      )}>
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold">
            <History size={18} className="text-indigo-400" />
            History
          </div>
          {history.length > 0 && (
            <button 
              onClick={() => setHistory([])}
              className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
        
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-8 text-center">
              <History size={32} className="opacity-20" />
              <p className="text-sm">No calculations yet. Start crunching numbers!</p>
            </div>
          ) : (
            filteredHistory.map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                onClick={() => {
                  setDisplayValue(item.result);
                  setJustCalculated(true);
                }}
                className={cn(
                  "p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group relative",
                  selectedHistoryIndex === idx && "bg-white/10 ring-1 ring-white/20"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-slate-500 font-medium">
                    {item.date} • {item.time}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isFavorite: !h.isFavorite } : h));
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star size={14} className={cn(item.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-slate-400 hover:text-white")} />
                  </button>
                </div>
                <div className="text-sm text-slate-400 font-mono mb-1">{item.expression} =</div>
                <div className="text-lg text-white font-mono">{formatNumber(item.result)}</div>
              </motion.div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// Reusable Calculator Button
function CalcButton({ 
  children, 
  onClick, 
  variant = 'default',
  className
}: { 
  children: React.ReactNode, 
  onClick: () => void, 
  variant?: 'default' | 'operator' | 'primary' | 'secondary' | 'danger' | 'memory',
  className?: string
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'operator': return 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border-indigo-500/20';
      case 'primary': return 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 border-white/10';
      case 'secondary': return 'bg-white/10 text-indigo-300 hover:bg-white/20 border-white/5';
      case 'danger': return 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/10';
      case 'memory': return 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-white border-transparent text-sm font-semibold shadow-none';
      default: return 'bg-white/5 text-white hover:bg-white/10 border-white/5 hover:border-white/10';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-2xl flex items-center justify-center text-xl font-medium transition-all active:scale-95 border overflow-hidden group outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        variant === 'memory' ? 'h-10' : 'h-16 sm:h-20',
        getVariantStyles(),
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      {/* Ripple effect placeholder - can be implemented with motion if needed, but active:scale-95 is usually enough for responsiveness */}
    </button>
  );
}
