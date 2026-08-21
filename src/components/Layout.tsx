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
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Lenis from 'lenis';

import NotificationDropdown, { NotificationDropdownRef } from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import SyncStatusBadge from './SyncStatusBadge';
import FloatingProtectionStatus from './FloatingProtectionStatus';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Current Balance', path: '/balance' },
  { icon: Download, label: 'Money Received', path: '/received' },
  { icon: Clock, label: 'Pending Payments', path: '/pending' },
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
  const navigate = useNavigate();
  
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

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 248 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-[#070812]/90 backdrop-blur-2xl border-r border-white/[0.08] flex-shrink-0 z-20 overflow-visible select-none shadow-[4px_0_30px_rgba(0,0,0,0.6)] relative"
        aria-label="Main Navigation"
      >
        {/* Faint Ambient Glow inside Sidebar */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent pointer-events-none" />

        {/* Sidebar Header */}
        <div className={cn("p-5 flex items-center relative z-10 transition-all", isCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
          <Link 
            to="/" 
            aria-label="SmartLedger Dashboard"
            className="group flex items-center gap-3 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl p-1"
          >
            <motion.div 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative flex-shrink-0"
            >
              <motion.div 
                animate={{ opacity: [0.2, 0.5, 0.2] }} 
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 blur-md pointer-events-none" 
              />
              <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
                <Wallet className="text-white" size={22} />
              </div>
            </motion.div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent whitespace-nowrap"
              >
                SmartLedger
              </motion.span>
            )}
          </Link>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0 relative z-10"
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </motion.button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto overflow-x-hidden custom-sidebar-scrollbar relative z-10 pb-8">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isCollapsed ? "justify-center h-11 w-11 mx-auto" : "px-3.5 py-2.5 gap-3 w-full",
                  isActive 
                    ? "text-white font-semibold" 
                    : "text-slate-400 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active Gradient Background with Shared Layout Animation */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveBg"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-transparent border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Active Vertical 3.5px Accent Bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveBar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.9)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Subtle hover background for non-active items */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-200" />
                  )}

                  {/* Icon with Spring Hover */}
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 4 }} 
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    {isActive ? (
                      <item.icon size={20} className="text-blue-400 flex-shrink-0 transition-colors duration-200" />
                    ) : (
                      <item.icon size={20} className="text-slate-400 flex-shrink-0 transition-colors duration-200 group-hover:text-slate-100" />
                    )}
                  </motion.div>
                  
                  {/* Label */}
                  {!isCollapsed && (
                    <span className={cn(
                      "font-medium text-sm whitespace-nowrap overflow-hidden transition-colors duration-200 z-10",
                      isActive ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                      {item.label}
                    </span>
                  )}

                  {/* Premium Floating Tooltip for Collapsed State */}
                  {isCollapsed && (
                    <div 
                      role="tooltip" 
                      className="absolute left-full ml-3 px-3 py-1.5 bg-[#0e101a]/95 backdrop-blur-md border border-white/15 text-white text-xs font-semibold rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none opacity-0 scale-95 -translate-x-1.5 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 ease-out z-50 flex items-center gap-1.5"
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#05060a]/85 backdrop-blur-xl border-b border-white/10 z-30 pt-[env(safe-area-inset-top)]">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open Navigation Menu"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-slate-300 hover:text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
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

      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              ref={menuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="md:hidden fixed inset-y-0 left-0 w-[82%] max-w-sm bg-[#090a12]/95 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/10">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Wallet className="text-white" size={22} />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white">SmartLedger</span>
                </Link>
                <button 
                  onClick={() => setMobileMenuOpen(false)} 
                  aria-label="Close Navigation Menu"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-sidebar-scrollbar">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        isActive ? "bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-transparent text-white border border-blue-500/30 font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={22} className={cn("transition-colors", isActive ? "text-blue-400" : "text-slate-400")} />
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
        {/* Desktop Header */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 border-b border-white/5 bg-[#05060a]/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <FloatingProtectionStatus onClick={() => navigate('/backup')} />
          </div>
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


