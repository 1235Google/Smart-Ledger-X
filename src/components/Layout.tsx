import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  Clock, 
  BarChart3, 
  Settings, 
  Search, 
  Menu, 
  X, 
  User, 
  PiggyBank, 
  Calculator as CalculatorIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Cloud,
  Bell,
  Sparkles,
  ShieldCheck,
  Compass,
  ChevronRight,
  ArrowDownLeft,
  Target,
  Lock,
  ScanFace,
  FileSpreadsheet,
  History,
  FolderSync,
  HelpCircle,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useTheme } from './ui/ThemeProvider';

import { AurexPanelContainer, PanelState } from './ai/AurexPanelContainer';
import NotificationDropdown, { NotificationDropdownRef } from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import SyncStatusBadge from './SyncStatusBadge';
import SystemModeBanner from './SystemModeBanner';
import MaintenanceScreen from './MaintenanceScreen';
import PageTransitionWrapper from './PageTransitionWrapper';

// Android Material 3 Navigation Bar Items (Mobile Bottom Bar)
const mobilePrimaryTabs = [
  { icon: LayoutDashboard, label: 'Home', shortLabel: 'Home', path: '/' },
  { icon: Wallet, label: 'Balance', shortLabel: 'Balance', path: '/balance' },
  { icon: ArrowDownLeft, label: 'Money In', shortLabel: 'Inflow', path: '/received' },
  { icon: Clock, label: 'Due Money', shortLabel: 'Dues', path: '/pending' },
  { icon: BarChart3, label: 'Analytics', shortLabel: 'Stats', path: '/analytics' },
];

// All Navigation Items categorized with Clean M3 Grouping
const navCategories = [
  {
    title: 'MONEY',
    items: [
      { icon: LayoutDashboard, label: 'Home', path: '/', isDueTab: false },
      { icon: Wallet, label: 'Balance', path: '/balance', isDueTab: false },
      { icon: ArrowDownLeft, label: 'Money In', path: '/received', isDueTab: false },
      { icon: Clock, label: 'Due Money', path: '/pending', isDueTab: true },
      { icon: FileSpreadsheet, label: 'Reports', path: '/reports', isDueTab: false },
    ]
  },
  {
    title: 'SAVINGS',
    items: [
      { icon: PiggyBank, label: 'Gullak', path: '/gullak', isDueTab: false },
      { icon: Target, label: 'Goals', path: '/goals', isDueTab: false },
      { icon: Lock, label: 'Secret Vault', path: '/vault', isDueTab: false },
      { icon: CalculatorIcon, label: 'Calculator', path: '/calculator', isDueTab: false },
    ]
  },
  {
    title: 'TOOLS',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics', isDueTab: false },
      { icon: History, label: 'History', path: '/timeline', isDueTab: false },
      { icon: Search, label: 'Search', path: '/search', isDueTab: false },
      { icon: FolderSync, label: 'Backup & Export', path: '/import-export', isDueTab: false },
    ]
  },
  {
    title: 'SETTINGS',
    items: [
      { icon: Bell, label: 'Alerts', path: '/notifications', isDueTab: false },
      { icon: ShieldCheck, label: 'Security', path: '/security', isDueTab: false },
      { icon: ScanFace, label: 'Face Unlock', path: '/face-unlock', isDueTab: false },
      { icon: Cloud, label: 'Cloud Sync', path: '/backup', isDueTab: false },
      { icon: User, label: 'Profile', path: '/profile', isDueTab: false },
      { icon: Settings, label: 'Settings', path: '/settings', isDueTab: false },
      { icon: HelpCircle, label: 'Help', path: '/help', isDueTab: false },
      { icon: Info, label: 'About', path: '/about', isDueTab: false },
    ]
  }
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aurexPanelState, setAurexPanelState] = useState<PanelState>('closed');
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const { transactions, systemConfig, isAdminAuthenticated } = useStore();

  if (systemConfig?.mode === 'maintenance' && !isAdminAuthenticated) {
    return <MaintenanceScreen />;
  }

  // Count active pending dues for live indicator
  const pendingDuesCount = useMemo(() => {
    return (transactions || []).filter(t => (t as any).type === 'pending' && ((t as any).status === 'pending' || (t as any).status === 'overdue')).length;
  }, [transactions]);
  
  // Persisted Collapsed State for Desktop Sidebar
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('smartledger_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const desktopNotifRef = useRef<NotificationDropdownRef>(null);
  const mobileNotifRef = useRef<NotificationDropdownRef>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('smartledger_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Close mobile drawer on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard accessibility: Close mobile drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  // Global Shortcut: Cmd+K / Ctrl+K opens universal search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] font-sans flex relative transition-colors duration-200">
      
      {/* ========================================================================= */}
      {/* MATERIAL 3 NAVIGATION DRAWER (Desktop Sidebar)                             */}
      {/* ========================================================================= */}
      <aside
        style={{ width: isCollapsed ? 80 : 272 }}
        className="hidden md:flex flex-col h-screen max-h-screen sticky top-0 bg-[var(--md-sys-color-surface-container-low)] border-r border-[var(--md-sys-color-outline-variant)]/40 flex-shrink-0 z-20 overflow-hidden select-none transition-[width] duration-200 ease-out"
        aria-label="Main Navigation Drawer"
      >
        {/* Sidebar Header with Brand Mark */}
        <div className={cn("p-4 flex items-center shrink-0 border-b border-[var(--md-sys-color-outline-variant)]/30", isCollapsed ? "justify-center flex-col gap-3" : "justify-between")}>
          <Link 
            to="/" 
            aria-label="Smart Ledger Home"
            className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] rounded-2xl p-1"
          >
            <div className="w-10 h-10 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Wallet size={20} />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-[var(--md-sys-color-on-surface)] whitespace-nowrap">
                    Smart Ledger
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
                    X
                  </span>
                </div>
                <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-medium tracking-tight">Material 3 Edition</span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] active:scale-95"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Quick Search Button in Sidebar */}
        {!isCollapsed && (
          <div className="px-3 py-2.5 shrink-0">
            <button
              type="button"
              onClick={openSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-full bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-xs text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-all border border-[var(--md-sys-color-outline-variant)]/40 group m3-state-layer"
            >
              <div className="flex items-center gap-2">
                <Search size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-primary)] transition-colors" />
                <span className="font-medium">Search ledger...</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/50 text-[var(--md-sys-color-outline)]">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Sidebar Navigation Categories */}
        <nav 
          ref={sidebarNavRef}
          className="flex-1 min-h-0 px-3 py-1 space-y-4 overflow-y-auto custom-sidebar-scrollbar select-none pb-12"
        >
          {navCategories.map((group, groupIdx) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="h-px bg-[var(--md-sys-color-outline-variant)]/30 my-2 mx-2" />
              )}

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center transition-all duration-150 outline-none m3-state-layer",
                      isCollapsed 
                        ? "justify-center h-12 w-12 mx-auto my-1 rounded-2xl" 
                        : "mx-1 px-4 h-12 gap-3.5 rounded-full",
                      isActive 
                        ? "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold shadow-xs" 
                        : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)] font-medium"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative z-10 w-5 h-5 flex items-center justify-center shrink-0">
                        <item.icon size={19} className="transition-colors" />
                      </div>
                      
                      {!isCollapsed && (
                        <span className="text-sm whitespace-nowrap overflow-hidden transition-colors z-10 flex-1 tracking-tight truncate">
                          {item.label}
                        </span>
                      )}

                      {!isCollapsed && item.isDueTab && pendingDuesCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] shadow-xs">
                          {pendingDuesCount}
                        </span>
                      )}

                      {!isCollapsed && item.path === '/vault' && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1">
                          <Lock size={10} /> Locked
                        </span>
                      )}

                      {/* Tooltip for Collapsed State */}
                      {isCollapsed && (
                        <div 
                          role="tooltip" 
                          className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] text-xs font-semibold rounded-xl shadow-md whitespace-nowrap pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center gap-1.5 border border-[var(--md-sys-color-outline-variant)]/30"
                        >
                          <span>{item.label}</span>
                          {item.isDueTab && pendingDuesCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]">
                              {pendingDuesCount}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP BAR (Material 3 Top App Bar)                                   */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[var(--md-sys-color-surface-container-low)]/95 backdrop-blur-md border-b border-[var(--md-sys-color-outline-variant)]/30 z-30 pt-[env(safe-area-inset-top,0px)] transition-colors">
        <div className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open Full App Menu"
              className="w-10 h-10 flex items-center justify-center text-[var(--md-sys-color-on-surface)] rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-95 transition-all shrink-0 m3-state-layer"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-xl flex items-center justify-center shadow-xs shrink-0">
                <Wallet size={16} />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold tracking-tight text-[var(--md-sys-color-on-surface)] text-sm sm:text-base whitespace-nowrap truncate">Smart Ledger</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full text-[var(--md-sys-color-on-primary-container)] bg-[var(--md-sys-color-primary-container)] shrink-0">
                  X
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle Button (Sun / Moon) */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-9 h-9 flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-95 transition-all shrink-0 m3-state-layer"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={openSearch}
              aria-label="Universal Search (Cmd+K)"
              className="w-9 h-9 flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-95 transition-all shrink-0 m3-state-layer"
            >
              <Search size={17} />
            </button>
            <NotificationDropdown ref={mobileNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => mobileNotifRef.current?.open()} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE NAVIGATION DRAWER (Material 3 Modal Drawer)                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              ref={menuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 350 }}
              className="md:hidden fixed inset-y-0 left-0 w-[84%] max-w-sm bg-[var(--md-sys-color-surface-container-low)] border-r border-[var(--md-sys-color-outline-variant)]/40 z-50 flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] rounded-r-[28px] overflow-hidden"
            >
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)]/30 shrink-0">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-2xl flex items-center justify-center shadow-xs shrink-0">
                    <Wallet size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold tracking-tight text-[var(--md-sys-color-on-surface)] block truncate">Smart Ledger</span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
                        X
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--md-sys-color-primary)] font-semibold uppercase tracking-wider block">Material 3</span>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  <SyncStatusBadge />
                  <button 
                    onClick={() => setMobileMenuOpen(false)} 
                    aria-label="Close Navigation Menu"
                    className="w-9 h-9 flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-95 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <nav className="flex-1 min-h-0 px-3 py-3 space-y-4 overflow-y-auto custom-sidebar-scrollbar pb-10">
                {navCategories.map((group) => (
                  <div key={`m-${group.title}`} className="space-y-1">
                    <h3 className="px-4 text-[11px] font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider mb-1">
                      {group.title}
                    </h3>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-label={item.label}
                          className={({ isActive }) =>
                            cn(
                              "relative flex items-center justify-between px-4 py-3 rounded-full transition-all m3-state-layer",
                              isActive 
                                ? "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold shadow-xs" 
                                : "text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] font-medium"
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3.5">
                                <item.icon size={19} className="shrink-0" />
                                <span className="text-sm truncate">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.isDueTab && pendingDuesCount > 0 && (
                                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]">
                                    {pendingDuesCount}
                                  </span>
                                )}
                                <ChevronRight size={16} className={cn("transition-colors", isActive ? "text-[var(--md-sys-color-on-secondary-container)]" : "text-[var(--md-sys-color-outline)]")} />
                              </div>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MAIN CONTENT VIEWPORT                                                     */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-h-[100dvh] z-10 relative w-full min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {/* Desktop Top Header - Material 3 Top App Bar */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-[var(--md-sys-color-outline-variant)]/30 bg-[var(--md-sys-color-surface-container-low)] flex-shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
              <span className="w-2 h-2 rounded-full bg-[var(--md-sys-color-success)]" />
              <span className="text-[var(--md-sys-color-on-surface)]">Online</span>
              <span className="text-[var(--md-sys-color-outline)]">·</span>
              <span className="text-[var(--md-sys-color-on-surface-variant)]">Smart Ledger</span>
            </div>

            {/* M3 Search Pill */}
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/40 text-xs text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-all group w-72 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] shadow-xs m3-state-layer"
            >
              <Search size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-primary)] transition-colors" />
              <span className="flex-1 text-left truncate">Search ledger, transactions...</span>
              <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/50 text-[var(--md-sys-color-outline)]">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2.5 rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all cursor-pointer active:scale-95 m3-state-layer"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
              onClick={() => setAurexPanelState('full')}
              className="p-2.5 rounded-full text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-all cursor-pointer active:scale-95 m3-state-layer"
              aria-label="Open Aurex AI"
            >
              <Sparkles size={18} />
            </button>

            <div className="px-1">
              <SyncStatusBadge />
            </div>

            <NotificationDropdown ref={desktopNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => desktopNotifRef.current?.open()} />
          </div>
        </header>

        {/* Global Read-Only / Availability Mode Banner */}
        <SystemModeBanner isAdmin={false} />

        {/* Fast Page Routing Container */}
        <div className="flex-1 w-full pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-0">
          <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 md:p-8 relative">
            <PageTransitionWrapper>
              <Outlet />
            </PageTransitionWrapper>
            <div className="h-16 md:hidden pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </main>

      <AurexPanelContainer state={aurexPanelState} setState={setAurexPanelState} />

      {/* ========================================================================= */}
      {/* MATERIAL 3 NAVIGATION BAR (Mobile Bottom Bar)                             */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--md-sys-color-surface-container)] border-t border-[var(--md-sys-color-outline-variant)]/30 pb-[env(safe-area-inset-bottom,0px)] shadow-lg transition-colors">
        <nav className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {mobilePrimaryTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="flex-1 flex flex-col items-center justify-center py-1 outline-none select-none min-w-0 group"
              >
                {/* M3 Active Pill Indicator */}
                <div className={cn(
                  "w-14 h-8 rounded-full flex items-center justify-center transition-all duration-150",
                  isActive 
                    ? "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] shadow-xs" 
                    : "text-[var(--md-sys-color-on-surface-variant)] group-hover:bg-[var(--md-sys-color-surface-container-high)]"
                )}>
                  <tab.icon size={20} />
                </div>
                <span className={cn(
                  "text-[11px] font-medium tracking-tight mt-0.5 truncate transition-colors",
                  isActive ? "text-[var(--md-sys-color-on-surface)] font-bold" : "text-[var(--md-sys-color-on-surface-variant)]"
                )}>
                  {tab.shortLabel}
                </span>
              </NavLink>
            );
          })}

          {/* More Action Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-1 outline-none select-none min-w-0 group"
            aria-label="More Features"
          >
            <div className="w-14 h-8 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] group-hover:bg-[var(--md-sys-color-surface-container-high)] transition-all">
              <Compass size={20} />
            </div>
            <span className="text-[11px] font-medium tracking-tight mt-0.5 text-[var(--md-sys-color-on-surface-variant)]">
              More
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
