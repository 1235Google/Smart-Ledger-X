import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Target, 
  Bell, 
  BarChart3, 
  Settings, 
  Download, 
  Database,
  X,
  ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const actions = [
    { id: 'new-transaction', label: 'New Transaction', icon: Plus, shortcut: ['Ctrl', 'N'], action: () => navigate('/balance?new=true') },
    { id: 'new-goal', label: 'New Savings Goal', icon: Target, shortcut: ['Ctrl', 'Shift', 'G'], action: () => navigate('/goals?new=true') },
    { id: 'reminders', label: 'Reminder Manager', icon: Bell, shortcut: ['Ctrl', 'Shift', 'R'], action: () => navigate('/pending') },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: ['Ctrl', 'Shift', 'A'], action: () => navigate('/analytics') },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: ['Ctrl', 'Shift', 'S'], action: () => navigate('/settings') },
    { id: 'export', label: 'Export PDF', icon: Download, shortcut: ['Ctrl', 'Shift', 'E'], action: () => navigate('/reports') },
    { id: 'backup', label: 'Backup Data', icon: Database, shortcut: ['Ctrl', 'Shift', 'B'], action: () => navigate('/import-export') },
    { id: 'search', label: 'Search Transactions', icon: Search, shortcut: ['/'], action: () => navigate('/search') },
  ];

  const filteredActions = actions.filter(action => 
    action.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      if (!isOpen) {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'n') {
          e.preventDefault();
          navigate('/balance?new=true');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          navigate('/goals?new=true');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          navigate('/pending');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          navigate('/analytics');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          navigate('/settings');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          navigate('/reports');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          navigate('/import-export');
        }
        if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          navigate('/search');
        }
        return;
      }

      // Inside Command Palette
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
          setIsOpen(false);
          setQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, navigate]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[#0f111a]/95 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden z-[9999] backdrop-blur-2xl"
          >
            <div className="flex items-center px-4 border-b border-white/10">
              <Search size={20} className="text-slate-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="w-full bg-transparent text-white placeholder-slate-500 py-4 outline-none text-lg"
              />
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredActions.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </div>
                  {filteredActions.map((action, index) => {
                    const isSelected = index === selectedIndex;
                    const Icon = action.icon;
                    return (
                      <div
                        key={action.id}
                        className={cn(
                          "flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-colors duration-150",
                          isSelected ? "bg-blue-500/20 text-white" : "text-slate-300 hover:bg-white/5"
                        )}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => {
                          action.action();
                          setIsOpen(false);
                          setQuery('');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isSelected ? "bg-blue-500/30 text-blue-400" : "bg-white/5 text-slate-400"
                          )}>
                            <Icon size={18} />
                          </div>
                          <span className="font-medium">{action.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {action.shortcut.map(key => (
                            <kbd key={key} className="px-2 py-1 bg-black/30 border border-white/10 rounded text-xs font-mono text-slate-400">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded">↑</kbd> <kbd className="bg-white/10 px-1.5 py-0.5 rounded">↓</kbd> to navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded">↵</kbd> to select</span>
              </div>
              <span className="flex items-center gap-1">Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded">Esc</kbd> to close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
