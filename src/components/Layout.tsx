import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  Download, 
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
  Layers,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Lock,
  FileSpreadsheet,
  History,
  FolderSync,
  HelpCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Lenis from 'lenis';
import { useStore } from '../context/StoreContext';

import NotificationDropdown, { NotificationDropdownRef } from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import SyncStatusBadge from './SyncStatusBadge';
import LiquidSpotlight from './ui/LiquidSpotlight';
import SystemModeBanner from './SystemModeBanner';

// Primary Apple Floating Bottom Tab Bar Items - Simple & Clear
const mobilePrimaryTabs = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Wallet, label: 'Balance', path: '/balance' },
  { icon: ArrowDownLeft, label: 'Money In', path: '/received' },
  { icon: Clock, label: 'Due Money', path: '/pending' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

// All Navigation Items categorized with Simple, Natural, Plain English names
const navCategories = [
  {
    title: 'MONEY',
    items: [
      { icon: LayoutDashboard, label: 'Home', path: '/', color: 'text-[#0a84ff]', bg: 'bg-[#0a84ff]/15' },
      { icon: Wallet, label: 'Balance', path: '/balance', color: 'text-[#30d158]', bg: 'bg-[#30d158]/15' },
      { icon: ArrowDownLeft, label: 'Money In', path: '/received', color: 'text-[#30d158]', bg: 'bg-[#30d158]/15' },
      { icon: Clock, label: 'Due Money', path: '/pending', color: 'text-[#ffd60a]', bg: 'bg-[#ffd60a]/15', isDueTab: true },
      { icon: FileSpreadsheet, label: 'Reports', path: '/reports', color: 'text-[#0a84ff]', bg: 'bg-[#0a84ff]/15' },
    ]
  },
  {
    title: 'SAVINGS',
    items: [
      { icon: PiggyBank, label: 'Gullak', path: '/gullak', color: 'text-[#ff375f]', bg: 'bg-[#ff375f]/15' },
      { icon: Target, label: 'Goals', path: '/goals', color: 'text-[#64d2ff]', bg: 'bg-[#64d2ff]/15' },
      { icon: Lock, label: 'Secret Vault', path: '/vault', color: 'text-[#ffd60a]', bg: 'bg-[#ffd60a]/15' },
      { icon: CalculatorIcon, label: 'Calculator', path: '/calculator', color: 'text-[#ff9f0a]', bg: 'bg-[#ff9f0a]/15' },
    ]
  },
  {
    title: 'TOOLS',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics', color: 'text-[#bf5af2]', bg: 'bg-[#bf5af2]/15' },
      { icon: History, label: 'History', path: '/timeline', color: 'text-[#5e5ce6]', bg: 'bg-[#5e5ce6]/15' },
      { icon: Search, label: 'Search', path: '/search', color: 'text-[#64d2ff]', bg: 'bg-[#64d2ff]/15' },
      { icon: FolderSync, label: 'Backup & Export', path: '/import-export', color: 'text-[#30d158]', bg: 'bg-[#30d158]/15' },
    ]
  },
  {
    title: 'SETTINGS',
    items: [
      { icon: Bell, label: 'Alerts', path: '/notifications', color: 'text-[#ff453a]', bg: 'bg-[#ff453a]/15' },
      { icon: ShieldCheck, label: 'Security', path: '/security', color: 'text-[#30d158]', bg: 'bg-[#30d158]/15' },
      { icon: Cloud, label: 'Cloud Sync', path: '/backup', color: 'text-[#0a84ff]', bg: 'bg-[#0a84ff]/15' },
      { icon: User, label: 'Profile', path: '/profile', color: 'text-[#5e5ce6]', bg: 'bg-[#5e5ce6]/15' },
      { icon: Settings, label: 'Settings', path: '/settings', color: 'text-[#98989d]', bg: 'bg-white/10' },
      { icon: HelpCircle, label: 'Help', path: '/help', color: 'text-[#64d2ff]', bg: 'bg-[#64d2ff]/15' },
      { icon: Info, label: 'About', path: '/about', color: 'text-[#86868b]', bg: 'bg-white/[0.08]' },
    ]
  }
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { transactions } = useStore();

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
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragScrollTop = useRef(0);
  const isDraggingMove = useRef(false);

  // Robust mouse wheel scrolling: smooth response to any mouse wheel over sidebar
  const handleSidebarWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (!sidebarNavRef.current) return;
    if (!sidebarNavRef.current.contains(e.target as Node)) {
      sidebarNavRef.current.scrollTop += e.deltaY;
    }
  };

  // Mouse drag-to-scroll (mouse scrobbling) handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0 || !sidebarNavRef.current) return;
    setIsMouseDragging(true);
    dragStartY.current = e.clientY;
    dragScrollTop.current = sidebarNavRef.current.scrollTop;
    isDraggingMove.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isMouseDragging || !sidebarNavRef.current) return;
    const dy = e.clientY - dragStartY.current;
    if (Math.abs(dy) > 2) {
      isDraggingMove.current = true;
      sidebarNavRef.current.scrollTop = dragScrollTop.current - dy;
    }
  };

  const handleMouseUp = () => {
    setIsMouseDragging(false);
    // Briefly keep flag so click event on NavLink knows it was a drag
    setTimeout(() => {
      isDraggingMove.current = false;
    }, 50);
  };

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

  // Smooth & Snappy Scroll Context (tuned for responsive speed)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
      prevent: (node) => {
        return (
          node.hasAttribute('data-lenis-prevent') ||
          Boolean(node.closest?.('[data-lenis-prevent="true"]')) ||
          Boolean(node.closest?.('.custom-sidebar-scrollbar')) ||
          Boolean(node.closest?.('aside'))
        );
      },
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    
    return () => {
      lenis.destroy();
    };
  }, []);

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

  const isPrimaryTabActive = mobilePrimaryTabs.some(t => t.path === location.pathname);

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans flex relative selection:bg-[#0a84ff]/30 selection:text-white">
      {/* VisionOS Dynamic Liquid Spotlight Tracker */}
      <LiquidSpotlight />

      {/* Apple-Inspired VisionOS Canvas with Translucent Breathing Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#000000]">
        {/* Fine Noise Texture */}
        <div className="absolute inset-0 bg-noise mix-blend-overlay z-[1] opacity-25" />
        
        {/* Soft, minimal radial ambient lights with organic drift */}
        <div className="absolute -top-[15%] left-1/4 w-[600px] h-[450px] bg-[#0a84ff]/[0.07] rounded-full blur-[150px] animate-orb-1" />
        <div className="absolute bottom-[-10%] right-[5%] w-[550px] h-[550px] bg-[#5e5ce6]/[0.06] rounded-full blur-[160px] animate-orb-2" />
        <div className="absolute top-1/2 left-[-10%] w-[450px] h-[450px] bg-[#bf5af2]/[0.035] rounded-full blur-[140px] animate-aurora-1" />
        
        {/* Subtle Matte Optical Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.75)_100%)]" />
      </div>

      {/* Desktop macOS / VisionOS Floating Frosted Glass Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 76 : 258 }}
        transition={{ type: 'spring', stiffness: 420, damping: 35 }}
        onWheel={handleSidebarWheel}
        data-lenis-prevent="true"
        className="hidden md:flex flex-col h-screen max-h-screen sticky top-0 bg-[#090a12]/85 backdrop-blur-3xl border-r border-white/[0.08] flex-shrink-0 z-20 overflow-hidden select-none shadow-[4px_0_35px_rgba(0,0,0,0.85)] relative"
        aria-label="Main Navigation"
      >
        {/* Top Rim Specular Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        {/* Sidebar Header with Clean Branding */}
        <div className={cn("p-4 flex items-center relative z-10 transition-all shrink-0", isCollapsed ? "justify-center flex-col gap-3" : "justify-between")}>
          <Link 
            to="/" 
            aria-label="Smart Ledger Home"
            className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] rounded-2xl p-1"
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] rounded-xl flex items-center justify-center shadow-lg shadow-[#0a84ff]/30 border border-white/20 transition-transform duration-200 group-hover:scale-105">
                <Wallet className="text-white drop-shadow-sm" size={18} />
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                    Smart Ledger
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[#64d2ff] border border-blue-500/30 shadow-sm">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium tracking-tight">Personal & Business</span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] flex-shrink-0 border border-transparent hover:border-white/10 active:scale-95"
          >
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        {/* Quick Search Button in Sidebar when Expanded */}
        {!isCollapsed && (
          <div className="px-3 pb-2 relative z-10 shrink-0">
            <button
              type="button"
              onClick={openSearch}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-xs text-slate-400 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2">
                <Search size={13} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span className="text-slate-400 group-hover:text-slate-200">Search</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-400">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Sidebar Navigation Categories - Mouse Scrollable & Scrubbable */}
        <nav 
          ref={sidebarNavRef}
          data-lenis-prevent="true"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            "flex-1 min-h-0 px-3 py-1 space-y-3 overflow-y-auto overflow-x-hidden custom-sidebar-scrollbar relative z-10 pb-12 overscroll-contain select-none",
            isMouseDragging ? "cursor-grabbing" : "cursor-default"
          )}
        >
          {navCategories.map((group, groupIdx) => (
            <div key={group.title} className="space-y-0.5">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="h-px bg-white/[0.06] my-2 mx-2" />
              )}

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  onClick={(e) => {
                    if (isDraggingMove.current) {
                      e.preventDefault();
                    }
                  }}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]",
                      isCollapsed ? "justify-center h-10 w-10 mx-auto my-0.5" : "px-2.5 py-2 gap-2.5 w-full",
                      isActive 
                        ? "text-white font-semibold bg-gradient-to-r from-[#0a84ff]/20 via-[#5e5ce6]/12 to-transparent border border-[#0a84ff]/35 shadow-[0_2px_12px_rgba(10,132,255,0.18)]" 
                        : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active Indicator Bar on left for expanded sidebar */}
                      {!isCollapsed && isActive && (
                        <div className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-[#0a84ff] to-[#5e5ce6] shadow-[0_0_8px_#0a84ff]" />
                      )}

                      {/* Squircle Icon Container */}
                      <div 
                        className={cn(
                          "relative z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0",
                          isActive 
                            ? "bg-gradient-to-tr from-[#0a84ff] to-[#5e5ce6] text-white shadow-md shadow-[#0a84ff]/40 border border-white/20" 
                            : "bg-white/[0.04] text-slate-400 group-hover:text-white group-hover:bg-white/[0.08] border border-white/[0.04]"
                        )}
                      >
                        <item.icon size={15} className={cn("transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                      </div>
                      
                      {/* Label */}
                      {!isCollapsed && (
                        <span className={cn(
                          "text-xs font-medium whitespace-nowrap overflow-hidden transition-colors z-10 flex-1",
                          isActive ? "text-white font-semibold" : "text-slate-400 group-hover:text-white"
                        )}>
                          {item.label}
                        </span>
                      )}

                      {/* Live Badge for Due Money */}
                      {!isCollapsed && (item as any).isDueTab && pendingDuesCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm">
                          {pendingDuesCount}
                        </span>
                      )}

                      {/* Floating Tooltip for Collapsed State */}
                      {isCollapsed && (
                        <div 
                          role="tooltip" 
                          className="absolute left-full ml-3 px-3 py-1.5 bg-[#141520]/95 backdrop-blur-2xl border border-white/15 text-white text-xs font-semibold rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.9)] whitespace-nowrap pointer-events-none opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-1.5"
                        >
                          <span>{item.label}</span>
                          {(item as any).isDueTab && pendingDuesCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/30">
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
      </motion.aside>

      {/* Mobile Top Bar (Apple Frosted Header) */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#000000]/85 backdrop-blur-2xl border-b border-white/[0.08] z-30 pt-[env(safe-area-inset-top)]">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open Full App Menu"
              className="w-9 h-9 flex items-center justify-center text-[#f5f5f7] rounded-full hover:bg-white/[0.08] active:scale-95 transition-all"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-[#0a84ff] to-[#5e5ce6] rounded-xl flex items-center justify-center shadow-md shadow-[#0a84ff]/20 border border-white/15">
                <Wallet className="text-white" size={15} />
              </div>
              <span className="font-bold tracking-tight text-white text-sm">Smart Ledger</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openSearch}
              aria-label="Universal Search (Cmd+K)"
              className="w-9 h-9 flex items-center justify-center text-[#86868b] hover:text-white rounded-full bg-white/[0.05] border border-white/[0.08] active:scale-95 transition-all"
            >
              <Search size={15} />
            </button>
            <SyncStatusBadge />
            <NotificationDropdown ref={mobileNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => mobileNotifRef.current?.open()} />
          </div>
        </div>
      </div>

      {/* Mobile Slide-out Drawer (Apple Settings-Style Hub) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              ref={menuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 w-[86%] max-w-sm bg-[#0a0b12]/95 backdrop-blur-3xl border-r border-white/10 z-50 flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] rounded-r-[32px] overflow-hidden"
            >
              <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0a84ff]/20 border border-white/20">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight text-white block">Smart Ledger</span>
                    <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Vision Edition</span>
                  </div>
                </Link>
                <button 
                  onClick={() => setMobileMenuOpen(false)} 
                  aria-label="Close Navigation Menu"
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-full bg-white/[0.06] active:scale-95 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <nav data-lenis-prevent="true" className="flex-1 min-h-0 px-4 py-4 space-y-5 overflow-y-auto custom-sidebar-scrollbar overscroll-contain pb-10">
                {navCategories.map((group) => (
                  <div key={`m-${group.title}`} className="space-y-1">
                    <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {group.title}
                    </h3>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5 space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-label={item.label}
                          className={({ isActive }) =>
                            cn(
                              "relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                              isActive 
                                ? "bg-[#0a84ff]/20 text-white font-bold border border-[#0a84ff]/30 shadow-sm" 
                                : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", item.bg)}>
                                  <item.icon size={18} className={item.color} />
                                </div>
                                <span className="font-medium text-sm">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {(item as any).isDueTab && pendingDuesCount > 0 && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {pendingDuesCount}
                                  </span>
                                )}
                                <ChevronRight size={16} className={cn("transition-colors", isActive ? "text-[#0a84ff]" : "text-slate-500")} />
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

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-h-screen z-10 relative w-full min-w-0 pb-28 md:pb-8">
        {/* Desktop Top Header - Floating Apple VisionOS Glass Navigation */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-white/[0.10] bg-[#090a12]/80 backdrop-blur-3xl flex-shrink-0 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.6)] relative">
          {/* Specular Top Rim */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 text-xs text-[#86868b] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#30d158] shadow-[0_0_10px_#30d158] animate-pulse" />
              <span className="text-[#a1a1a6] font-semibold">Online</span>
              <span className="text-white/20">•</span>
              <span className="text-[#86868b]">Smart Ledger</span>
            </div>

            {/* Natural Integrated Glass Search Bar */}
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.10] hover:border-white/[0.20] text-xs text-slate-400 hover:text-white transition-all duration-150 group w-72 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] shadow-sm backdrop-blur-md active:scale-98"
            >
              <Search size={14} className="text-slate-400 group-hover:text-white transition-colors" />
              <span className="flex-1 text-left text-xs text-slate-400 group-hover:text-slate-200">Search ledger, transactions...</span>
              <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] text-slate-400">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <SyncStatusBadge />
            <NotificationDropdown ref={desktopNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => desktopNotifRef.current?.open()} />
          </div>
        </header>

        {/* Global Read-Only / Availability Mode Banner */}
        <SystemModeBanner isAdmin={false} />

        {/* Fast, Smooth Page Routing Container (Instant & Stutter-Free) */}
        <div className="flex-1 w-full pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-0">
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="w-full relative"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* APPLE-STYLE FLOATING BOTTOM CAPSULE TAB BAR (Mobile & Tablet)             */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-5 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom)]">
        <motion.nav 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="pointer-events-auto flex items-center justify-between gap-1 p-1.5 rounded-full bg-[#12131e]/90 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.15)] max-w-md w-full"
        >
          {mobilePrimaryTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full outline-none transition-all select-none"
              >
                {isActive && (
                  <motion.div
                    layoutId="appleFloatingTabIndicator"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-[#0a84ff] to-[#0066cc] shadow-[0_0_16px_rgba(10,132,255,0.5)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <motion.div 
                  whileTap={{ scale: 0.88 }}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-0.5 transition-colors",
                    isActive ? "text-white font-bold" : "text-[#86868b]"
                  )}
                >
                  <tab.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] tracking-tight">{tab.label}</span>
                </motion.div>
              </NavLink>
            );
          })}

          {/* More Action Capsule Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full outline-none text-[#86868b] hover:text-white transition-all select-none active:scale-90"
            aria-label="More Features"
          >
            <Compass size={19} />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </motion.nav>
      </div>
    </div>
  );
}



