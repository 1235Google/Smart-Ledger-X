import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Command,
  Wallet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Sparkles,
  ShieldCheck,
  PiggyBank,
  Calculator,
  History,
  HelpCircle,
  Lock,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';

type SearchCategory = 'all' | 'transactions' | 'pending' | 'people' | 'navigation' | 'actions' | 'ai';

interface SearchResultItem {
  id: string;
  category: 'transactions' | 'pending' | 'people' | 'navigation' | 'actions' | 'ai';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  amount?: number;
  amountType?: 'received' | 'sent' | 'pending';
  icon: any;
  iconBg: string;
  iconColor: string;
  shortcut?: string[];
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { transactions, customers, savingsGoals, gullakEntries, userProfile } = useStore();

  // Navigation pages list
  const navItems = useMemo<SearchResultItem[]>(() => [
    {
      id: 'nav-dashboard',
      category: 'navigation',
      title: 'Dashboard Overview',
      subtitle: 'Executive financial cockpit & metrics',
      badge: 'Home',
      icon: Wallet,
      iconBg: 'bg-[#0a84ff]/15',
      iconColor: 'text-[#0a84ff]',
      shortcut: ['G', 'D'],
      action: () => navigate('/')
    },
    {
      id: 'nav-balance',
      category: 'navigation',
      title: 'Current Balance & Vaults',
      subtitle: 'Liquid cash, account balances, asset valuation',
      badge: 'Finances',
      icon: Wallet,
      iconBg: 'bg-[#30d158]/15',
      iconColor: 'text-[#30d158]',
      shortcut: ['G', 'B'],
      action: () => navigate('/balance')
    },
    {
      id: 'nav-received',
      category: 'navigation',
      title: 'Money Received Ledger',
      subtitle: 'All completed inbound cashflows and invoices',
      badge: 'Inflow',
      icon: ArrowDownLeft,
      iconBg: 'bg-[#30d158]/15',
      iconColor: 'text-[#30d158]',
      shortcut: ['G', 'R'],
      action: () => navigate('/received')
    },
    {
      id: 'nav-pending',
      category: 'navigation',
      title: 'Pending Receivables & Payments',
      subtitle: 'Overdue reminders, automated WhatsApp notices, penalties',
      badge: 'Receivables',
      icon: Clock,
      iconBg: 'bg-[#ffd60a]/15',
      iconColor: 'text-[#ffd60a]',
      shortcut: ['G', 'P'],
      action: () => navigate('/pending')
    },
    {
      id: 'nav-analytics',
      category: 'navigation',
      title: 'Analytics & Financial Trends',
      subtitle: 'Cash velocity, monthly breakdowns, asset trajectory',
      badge: 'Intelligence',
      icon: BarChart3,
      iconBg: 'bg-[#bf5af2]/15',
      iconColor: 'text-[#bf5af2]',
      shortcut: ['G', 'A'],
      action: () => navigate('/analytics')
    },
    {
      id: 'nav-gullak',
      category: 'navigation',
      title: 'Gullak Digital Piggy Bank',
      subtitle: 'Daily spare change, deposits, micro-savings',
      badge: 'Savings',
      icon: PiggyBank,
      iconBg: 'bg-[#ff375f]/15',
      iconColor: 'text-[#ff375f]',
      action: () => navigate('/gullak')
    },
    {
      id: 'nav-goals',
      category: 'navigation',
      title: 'Savings Goals & Targets',
      subtitle: 'Target milestones, progress tracking, projections',
      badge: 'Milestones',
      icon: Target,
      iconBg: 'bg-[#64d2ff]/15',
      iconColor: 'text-[#64d2ff]',
      action: () => navigate('/goals')
    },
    {
      id: 'nav-vault',
      category: 'navigation',
      title: 'Encrypted Vault & Documents',
      subtitle: 'Zero-knowledge encrypted financial documents & receipts',
      badge: 'Security',
      icon: Lock,
      iconBg: 'bg-[#ffd60a]/15',
      iconColor: 'text-[#ffd60a]',
      action: () => navigate('/vault')
    },
    {
      id: 'nav-reports',
      category: 'navigation',
      title: 'Monthly Reports & Statements',
      subtitle: 'Audit-ready PDF statements and Excel exports',
      badge: 'Reports',
      icon: FileSpreadsheet,
      iconBg: 'bg-[#0a84ff]/15',
      iconColor: 'text-[#0a84ff]',
      action: () => navigate('/reports')
    },
    {
      id: 'nav-calculator',
      category: 'navigation',
      title: 'Financial Calculator',
      subtitle: 'Compound interest, EMI, tax, and investment math',
      badge: 'Utility',
      icon: Calculator,
      iconBg: 'bg-[#ff9f0a]/15',
      iconColor: 'text-[#ff9f0a]',
      action: () => navigate('/calculator')
    },
    {
      id: 'nav-timeline',
      category: 'navigation',
      title: 'Timeline Replay',
      subtitle: 'Historical playback of all financial moves',
      badge: 'History',
      icon: History,
      iconBg: 'bg-[#5e5ce6]/15',
      iconColor: 'text-[#5e5ce6]',
      action: () => navigate('/timeline')
    },
    {
      id: 'nav-security',
      category: 'navigation',
      title: 'Security Center',
      subtitle: 'PIN lock, biometric protection, device authorization',
      badge: 'Defense',
      icon: ShieldCheck,
      iconBg: 'bg-[#30d158]/15',
      iconColor: 'text-[#30d158]',
      action: () => navigate('/security')
    },
    {
      id: 'nav-settings',
      category: 'navigation',
      title: 'System Settings',
      subtitle: 'Currency format, tax configuration, backup rules',
      badge: 'Preferences',
      icon: Settings,
      iconBg: 'bg-white/10',
      iconColor: 'text-white',
      shortcut: ['Ctrl', ','],
      action: () => navigate('/settings')
    },
    {
      id: 'nav-backup',
      category: 'navigation',
      title: 'Backup & Cloud Recovery',
      subtitle: 'Instant snapshot backups and Firestore sync',
      badge: 'Storage',
      icon: Database,
      iconBg: 'bg-[#0a84ff]/15',
      iconColor: 'text-[#0a84ff]',
      action: () => navigate('/backup')
    },
    {
      id: 'nav-help',
      category: 'navigation',
      title: 'Help & Knowledge Base',
      subtitle: 'Keyboard shortcuts, guides, ledger best practices',
      badge: 'Support',
      icon: HelpCircle,
      iconBg: 'bg-[#64d2ff]/15',
      iconColor: 'text-[#64d2ff]',
      action: () => navigate('/help')
    }
  ], [navigate]);

  // Operational Quick Actions
  const actionItems = useMemo<SearchResultItem[]>(() => [
    {
      id: 'act-new-income',
      category: 'actions',
      title: 'Record Inbound Payment (+)',
      subtitle: 'Log received money with party name & invoice note',
      badge: 'Inflow',
      icon: Plus,
      iconBg: 'bg-[#30d158]/20',
      iconColor: 'text-[#30d158]',
      shortcut: ['Ctrl', 'I'],
      action: () => navigate('/received?new=true')
    },
    {
      id: 'act-new-pending',
      category: 'actions',
      title: 'Create Pending Receivable',
      subtitle: 'Set up automated reminder cadence & penalty fees',
      badge: 'Receivable',
      icon: Clock,
      iconBg: 'bg-[#ffd60a]/20',
      iconColor: 'text-[#ffd60a]',
      shortcut: ['Ctrl', 'P'],
      action: () => navigate('/pending?new=true')
    },
    {
      id: 'act-new-goal',
      category: 'actions',
      title: 'Create Savings Target',
      subtitle: 'Define a new financial target with automated milestones',
      badge: 'Goals',
      icon: Target,
      iconBg: 'bg-[#bf5af2]/20',
      iconColor: 'text-[#bf5af2]',
      action: () => navigate('/goals?new=true')
    },
    {
      id: 'act-export-pdf',
      category: 'actions',
      title: 'Download Statement (PDF / Excel)',
      subtitle: 'Export monthly or custom ledger statements',
      badge: 'Export',
      icon: Download,
      iconBg: 'bg-[#0a84ff]/20',
      iconColor: 'text-[#0a84ff]',
      action: () => navigate('/reports')
    },
    {
      id: 'act-lock',
      category: 'actions',
      title: 'Lock Ledger Vault Now',
      subtitle: 'Require master PIN code to unlock again',
      badge: 'Security',
      icon: Lock,
      iconBg: 'bg-[#ff453a]/20',
      iconColor: 'text-[#ff453a]',
      shortcut: ['Ctrl', 'L'],
      action: () => {
        sessionStorage.removeItem('smartledger_unlocked');
        window.location.reload();
      }
    }
  ], [navigate]);

  // AI & Intelligence Actions
  const aiItems = useMemo<SearchResultItem[]>(() => [
    {
      id: 'ai-anomaly',
      category: 'ai',
      title: 'Run Smart Checks & Fraud Audit',
      subtitle: 'Detect suspicious transactions, outliers, duplicate invoices',
      badge: 'Smart Audit',
      icon: Sparkles,
      iconBg: 'bg-[#bf5af2]/20',
      iconColor: 'text-[#bf5af2]',
      action: () => navigate('/analytics#anomalies')
    },
    {
      id: 'ai-health',
      category: 'ai',
      title: 'Compute Financial Health Score',
      subtitle: 'Run mathematical 100-point liquidity & savings analysis',
      badge: 'AI Score',
      icon: Sparkles,
      iconBg: 'bg-[#bf5af2]/20',
      iconColor: 'text-[#bf5af2]',
      action: () => navigate('/analytics#health-score')
    },
    {
      id: 'ai-forecast',
      category: 'ai',
      title: 'Generate Cash Flow Forecast',
      subtitle: 'Pro forma runway projections based on historical velocity',
      badge: 'AI Forecast',
      icon: Sparkles,
      iconBg: 'bg-[#bf5af2]/20',
      iconColor: 'text-[#bf5af2]',
      action: () => navigate('/analytics#forecast')
    }
  ], [navigate]);

  // Dynamic Transactions Search
  const transactionItems = useMemo<SearchResultItem[]>(() => {
    return transactions.slice(0, 50).map((tx) => {
      const isReceived = tx.type === 'received';
      const isSent = tx.type === 'sent';
      const isPending = tx.type === 'pending';
      const reason = isReceived || isSent ? tx.purpose : (tx as any).reason;
      const dateStr = formatDate((tx as any).date || (tx as any).dueDate || (tx as any).createdAt || new Date().toISOString());

      return {
        id: `tx-${tx.id}`,
        category: isPending ? 'pending' : 'transactions',
        title: tx.personName,
        subtitle: `${reason || 'General'} • ${dateStr}`,
        badge: isReceived ? 'Received' : isSent ? 'Sent' : 'Pending',
        badgeColor: isReceived ? 'text-[#30d158] bg-[#30d158]/15 border-[#30d158]/25' :
                    isSent ? 'text-[#ff453a] bg-[#ff453a]/15 border-[#ff453a]/25' :
                    'text-[#ffd60a] bg-[#ffd60a]/15 border-[#ffd60a]/25',
        amount: tx.amount,
        amountType: isReceived ? 'received' : isSent ? 'sent' : 'pending',
        icon: isReceived ? ArrowDownLeft : isSent ? ArrowUpRight : Clock,
        iconBg: isReceived ? 'bg-[#30d158]/15' : isSent ? 'bg-[#ff453a]/15' : 'bg-[#ffd60a]/15',
        iconColor: isReceived ? 'text-[#30d158]' : isSent ? 'text-[#ff453a]' : 'text-[#ffd60a]',
        action: () => {
          if (isPending) navigate(`/pending?search=${encodeURIComponent(tx.personName)}`);
          else navigate(`/received?search=${encodeURIComponent(tx.personName)}`);
        }
      };
    });
  }, [transactions, navigate]);

  // People & Parties Search
  const peopleItems = useMemo<SearchResultItem[]>(() => {
    const peopleMap = new Map<string, { count: number; total: number; phone?: string }>();

    transactions.forEach((tx) => {
      const name = tx.personName.trim();
      if (!name) return;
      const current = peopleMap.get(name) || { count: 0, total: 0, phone: (tx as any).phoneNumber };
      current.count += 1;
      current.total += tx.amount;
      if (!current.phone && (tx as any).phoneNumber) current.phone = (tx as any).phoneNumber;
      peopleMap.set(name, current);
    });

    return Array.from(peopleMap.entries()).map(([name, data]) => ({
      id: `person-${name}`,
      category: 'people',
      title: name,
      subtitle: `${data.count} transactions • Vol: ${formatCurrency(data.total)}${data.phone ? ` • ${data.phone}` : ''}`,
      badge: 'Contact',
      icon: User,
      iconBg: 'bg-[#0a84ff]/15',
      iconColor: 'text-[#0a84ff]',
      action: () => navigate(`/search?q=${encodeURIComponent(name)}`)
    }));
  }, [transactions, navigate]);

  // Aggregate all items
  const allItems = useMemo<SearchResultItem[]>(() => {
    return [
      ...actionItems,
      ...navItems,
      ...aiItems,
      ...transactionItems,
      ...peopleItems
    ];
  }, [actionItems, navItems, aiItems, transactionItems, peopleItems]);

  // Filter based on query and selected category
  const filteredResults = useMemo(() => {
    let pool = allItems;
    if (selectedCategory !== 'all') {
      pool = pool.filter(item => item.category === selectedCategory);
    }

    if (!query.trim()) {
      return pool.slice(0, 15);
    }

    const q = query.toLowerCase().trim();
    return pool.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchBadge = item.badge?.toLowerCase().includes(q);
      const matchAmount = item.amount?.toString().includes(q);
      return matchTitle || matchSubtitle || matchBadge || matchAmount;
    }).slice(0, 20);
  }, [allItems, query, selectedCategory]);

  // Listeners for shortcuts and custom open event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          filteredResults[selectedIndex].action();
          setIsOpen(false);
          setQuery('');
        }
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen, filteredResults, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-24 px-4 select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl vision-glass-elevated border border-white/[0.14] rounded-[28px] shadow-[0_28px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(10,132,255,0.15)] overflow-hidden flex flex-col max-h-[82vh] z-10"
          >
            {/* Top VisionOS Specular Rim */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/35 to-transparent z-20" />

            {/* Ambient Corner Lighting */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#0a84ff]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Search Input Bar */}
            <div className="flex items-center px-6 py-4.5 border-b border-white/[0.08] gap-3 relative z-10">
              <Search size={20} className="text-[#0a84ff] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ledger, payments, people, pages, or ask AI..."
                className="w-full bg-transparent text-white placeholder-[#86868b] text-base outline-none font-medium"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full hover:bg-white/[0.08] text-[#86868b] hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[#86868b]">
                ESC
              </kbd>
            </div>

            {/* Category Filter Pills (Apple Segmented Style in Liquid Glass) */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] overflow-x-auto no-scrollbar bg-black/20 backdrop-blur-md relative z-10">
              {(['all', 'transactions', 'pending', 'people', 'navigation', 'actions', 'ai'] as SearchCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all",
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] text-white shadow-md shadow-[#0a84ff]/30"
                      : "text-[#86868b] hover:text-white hover:bg-white/[0.05]"
                  )}
                >
                  {cat === 'ai' ? 'AI Intelligence' : cat}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar max-h-[50vh] relative z-10">
              {filteredResults.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl vision-glass flex items-center justify-center mx-auto text-[#86868b]">
                    <Search size={20} />
                  </div>
                  <p className="text-sm font-semibold text-white">No records found for "{query}"</p>
                  <p className="text-xs text-[#86868b]">Try searching by name, transaction purpose, or amount.</p>
                </div>
              ) : (
                filteredResults.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        "group flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 border select-none",
                        isSelected
                          ? "bg-[#0a84ff]/20 border-[#0a84ff]/40 text-white shadow-md backdrop-blur-md"
                          : "border-transparent hover:bg-white/[0.04] text-[#a1a1a6]"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-sm", item.iconBg)}>
                          <Icon size={16} className={item.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-bold truncate", isSelected ? "text-white" : "text-white/90")}>
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                item.badgeColor || "text-[#86868b] bg-white/[0.04] border-white/[0.08]"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#86868b] truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {item.amount !== undefined && (
                          <span className={cn(
                            "text-sm font-extrabold font-tabular tracking-tight",
                            item.amountType === 'received' ? "text-[#30d158]" :
                            item.amountType === 'sent' ? "text-[#ff453a]" :
                            "text-[#ffd60a]"
                          )}>
                            {item.amountType === 'received' ? '+' : item.amountType === 'sent' ? '-' : '⏳'}{' '}
                            {formatCurrency(item.amount)}
                          </span>
                        )}

                        {item.shortcut && (
                          <div className="hidden sm:flex items-center gap-1">
                            {item.shortcut.map((key) => (
                              <kbd key={key} className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[#86868b]">
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}

                        <ChevronRight size={14} className={cn("transition-transform", isSelected ? "text-[#0a84ff] translate-x-0.5" : "text-white/20")} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Guide */}
            <div className="px-5 py-3 border-t border-white/[0.08] bg-black/30 backdrop-blur-md flex items-center justify-between text-xs text-[#86868b] relative z-10">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px]">↓</kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px]">↵</kbd>
                  <span>open</span>
                </span>
              </div>
              <span className="font-medium">{filteredResults.length} records found</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

