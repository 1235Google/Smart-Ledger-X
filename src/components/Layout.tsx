import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
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
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Lenis from 'lenis';

import NotificationDropdown, { NotificationDropdownRef } from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import SyncStatusBadge from './SyncStatusBadge';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Current Balance', path: '/balance' },
  { icon: Download, label: 'Money Received', path: '/received' },
  { icon: Clock, label: 'Pending Payments', path: '/pending' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: PiggyBank, label: 'Gullak Savings', path: '/gullak' },
  { icon: CalculatorIcon, label: 'Calculator', path: '/calculator' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Cloud, label: 'Backup & Recovery', path: '/backup' },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Persisted Collapsed State
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

  // Premium Smooth Scroll Context
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
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

  return (
    <div className="min-h-screen bg-[#05060a] text-slate-200 font-sans flex relative">
      {/* Premium Animated Atmospheric Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#020308]">
        {/* Dynamic Noise Filter */}
        <div className="absolute inset-0 bg-noise mix-blend-overlay z-[1]" />
        
        {/* Subtle dot matrix grid overlay for financial terminal feel */}
        <div 
          className="absolute inset-0 opacity-[0.02] z-[2]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
        {/* Soft Ambient Glow Orbs */}
        <div className="absolute top-[-10%] left-[-8%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[160px] animate-aurora-1" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[180px] animate-aurora-2" />
        <div className="absolute top-[35%] right-[20%] w-[30%] h-[30%] bg-cyan-500/5 rounded-full blur-[140px]" />
        
        {/* Deep space radial gradient over everything to focus the center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_80%)]" />

        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full blur-[1px]"
            initial={{ 
              x: Math.random() * 100 + "vw", 
              y: Math.random() * 100 + "vh", 
              opacity: Math.random() * 0.5 + 0.1 
            }}
            animate={{ 
              y: [null, Math.random() * -100 - 50 + "vh"],
              x: [null, Math.random() * 50 - 25 + "vw"],
              opacity: [null, 0]
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10
            }}
          />
        ))}
      </div>

      {/* Desktop Sidebar (Material 3 Navigation Rail / Drawer) */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 76 : 256 }}
        transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-[#111318]/95 backdrop-blur-2xl border-r border-white/[0.08] flex-shrink-0 z-20 overflow-visible select-none shadow-[2px_0_24px_rgba(0,0,0,0.5)] relative"
        aria-label="Main Navigation"
      >
        {/* Faint Ambient Glow inside Sidebar */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#a8c7fa]/[0.04] via-[#0842a0]/[0.02] to-transparent pointer-events-none" />

        {/* Sidebar Header */}
        <div className={cn("p-4 flex items-center relative z-10 transition-all", isCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
          <Link 
            to="/" 
            aria-label="SmartLedger Dashboard"
            className="group flex items-center gap-3 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] rounded-2xl p-1"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative flex-shrink-0"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#0842a0] via-[#0b57d0] to-[#a8c7fa] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0b57d0]/25 border border-white/20">
                <Wallet className="text-white" size={20} />
              </div>
            </motion.div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="text-lg font-bold tracking-tight text-[#e2e2e9] whitespace-nowrap">
                  SmartLedger <span className="text-[#a8c7fa] text-xs font-black uppercase tracking-wider ml-0.5">X</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Fintech Ledger</span>
              </motion.div>
            )}
          </Link>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] flex-shrink-0 relative z-10"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </motion.button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden custom-sidebar-scrollbar relative z-10 pb-8">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]",
                  isCollapsed ? "justify-center h-12 w-12 mx-auto my-0.5" : "px-4 py-3 gap-3.5 w-full",
                  isActive 
                    ? "text-[#d3e3fd] font-semibold" 
                    : "text-slate-400 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Material 3 Active Pill Container with Spring Layout Animation */}
                  {isActive && (
                    <motion.div
                      layoutId="m3SidebarActivePill"
                      className="absolute inset-0 rounded-full bg-[#004a77]/50 border border-[#a8c7fa]/30 shadow-[0_2px_12px_rgba(168,199,250,0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Subtle hover background for non-active items */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/[0.05] transition-colors duration-200" />
                  )}

                  {/* Material 3 Pill Indicator around Icon */}
                  <motion.div 
                    whileHover={{ scale: 1.08 }} 
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                    className={cn(
                      "relative z-10 flex items-center justify-center transition-all duration-200",
                      isCollapsed && isActive && "w-10 h-7 rounded-full bg-[#a8c7fa] text-[#042e6f]",
                      isCollapsed && !isActive && "w-10 h-7 rounded-full text-slate-400"
                    )}
                  >
                    {isActive ? (
                      <item.icon size={20} className={cn("shrink-0 transition-colors duration-200", isCollapsed ? "text-[#042e6f]" : "text-[#a8c7fa]")} />
                    ) : (
                      <item.icon size={20} className="text-slate-400 shrink-0 transition-colors duration-200 group-hover:text-slate-200" />
                    )}
                  </motion.div>
                  
                  {/* Label */}
                  {!isCollapsed && (
                    <span className={cn(
                      "font-medium text-sm whitespace-nowrap overflow-hidden transition-colors duration-200 z-10",
                      isActive ? "text-[#e2e2e9] font-bold" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                      {item.label}
                    </span>
                  )}

                  {/* Material 3 Floating Tooltip for Collapsed State */}
                  {isCollapsed && (
                    <div 
                      role="tooltip" 
                      className="absolute left-full ml-3 px-3 py-1.5 bg-[#1e2029]/95 backdrop-blur-md border border-white/15 text-white text-xs font-semibold rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none opacity-0 scale-95 -translate-x-1.5 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 ease-out z-50 flex items-center gap-1.5"
                    >
                      <span>{item.label}</span>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </motion.aside>

      {/* Mobile Header (Material 3 Top App Bar) */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#111318]/90 backdrop-blur-xl border-b border-white/[0.08] z-30 pt-[env(safe-area-inset-top)]">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open Navigation Menu"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-slate-300 hover:text-white rounded-full hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0842a0] to-[#0b57d0] rounded-xl flex items-center justify-center shadow-lg shadow-[#0b57d0]/20">
                <Wallet className="text-white" size={16} />
              </div>
              <span className="font-bold tracking-tight text-white text-base">SmartLedger</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <NotificationDropdown ref={mobileNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => mobileNotifRef.current?.open()} />
          </div>
        </div>
      </div>

      {/* Mobile Slide-out Drawer (Material 3 Modal Navigation Drawer) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              ref={menuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="md:hidden fixed inset-y-0 left-0 w-[84%] max-w-xs bg-[#191b22]/98 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] rounded-r-[28px]"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/10">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#0842a0] to-[#0b57d0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0b57d0]/20">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white">SmartLedger</span>
                </Link>
                <button 
                  onClick={() => setMobileMenuOpen(false)} 
                  aria-label="Close Navigation Menu"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-white rounded-full hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]"
                >
                  <X size={22} />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-sidebar-scrollbar">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3.5 px-4 py-3.5 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]",
                        isActive 
                          ? "bg-[#004a77]/50 text-[#d3e3fd] border border-[#a8c7fa]/30 font-bold shadow-md" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={20} className={cn("transition-colors", isActive ? "text-[#a8c7fa]" : "text-slate-400")} />
                        <span className="font-semibold text-sm">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen z-10 relative w-full min-w-0 transition-all duration-200">
        {/* Desktop Top App Bar */}
        <header className="hidden md:flex h-20 items-center justify-end px-8 border-b border-white/[0.06] bg-[#111318]/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <SyncStatusBadge />
            <NotificationDropdown ref={desktopNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => desktopNotifRef.current?.open()} />
          </div>
        </header>

        <div className="flex-1 w-full pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0">
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 1.02, position: "absolute", top: 0, left: 0, right: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full relative"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}


