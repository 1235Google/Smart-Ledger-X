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
  Bell,
  Sparkles,
  ShieldCheck,
  Compass,
  Layers,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Lenis from 'lenis';

import NotificationDropdown, { NotificationDropdownRef } from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import SyncStatusBadge from './SyncStatusBadge';

// Primary Apple Floating Bottom Tab Bar Items
const mobilePrimaryTabs = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Balance', path: '/balance' },
  { icon: Download, label: 'Received', path: '/received' },
  { icon: Clock, label: 'Pending', path: '/pending' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

// All Navigation Items categorized for macOS-style Sidebar & Apple Drawer
const navCategories = [
  {
    title: 'FINANCE & LEDGER',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/', color: 'text-[#0a84ff]', bg: 'bg-[#0a84ff]/15' },
      { icon: Wallet, label: 'Current Balance', path: '/balance', color: 'text-[#30d158]', bg: 'bg-[#30d158]/15' },
      { icon: Download, label: 'Money Received', path: '/received', color: 'text-[#34c759]', bg: 'bg-[#34c759]/15' },
      { icon: Clock, label: 'Pending Payments', path: '/pending', color: 'text-[#ffd60a]', bg: 'bg-[#ffd60a]/15' },
    ]
  },
  {
    title: 'INTELLIGENCE & SAVINGS',
    items: [
      { icon: BarChart3, label: 'Analytics & Insights', path: '/analytics', color: 'text-[#bf5af2]', bg: 'bg-[#bf5af2]/15' },
      { icon: PiggyBank, label: 'Gullak Savings', path: '/gullak', color: 'text-[#ff375f]', bg: 'bg-[#ff375f]/15' },
      { icon: Search, label: 'Universal Search', path: '/search', color: 'text-[#64d2ff]', bg: 'bg-[#64d2ff]/15' },
      { icon: CalculatorIcon, label: 'Financial Calculator', path: '/calculator', color: 'text-[#ff9f0a]', bg: 'bg-[#ff9f0a]/15' },
    ]
  },
  {
    title: 'SYSTEM & DATA',
    items: [
      { icon: Bell, label: 'Notifications', path: '/notifications', color: 'text-[#ff453a]', bg: 'bg-[#ff453a]/15' },
      { icon: User, label: 'Account Profile', path: '/profile', color: 'text-[#5e5ce6]', bg: 'bg-[#5e5ce6]/15' },
      { icon: Settings, label: 'Apple Settings', path: '/settings', color: 'text-[#98989d]', bg: 'bg-white/10' },
      { icon: Cloud, label: 'Backup & Recovery', path: '/backup', color: 'text-[#0a84ff]', bg: 'bg-[#0a84ff]/15' },
    ]
  }
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
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

  // Smooth Scroll Context
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.8,
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

  const isPrimaryTabActive = mobilePrimaryTabs.some(t => t.path === location.pathname);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans flex relative selection:bg-[#0a84ff]/30 selection:text-white">
      {/* Apple-Inspired Ambient Canvas Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#030407]">
        {/* Fine Noise Texture */}
        <div className="absolute inset-0 bg-noise mix-blend-overlay z-[1]" />
        
        {/* Soft Radial Ambient Lights */}
        <div className="absolute -top-[12%] left-1/4 w-[600px] h-[500px] bg-[#0a84ff]/[0.07] rounded-full blur-[160px] animate-aurora-1" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[550px] h-[550px] bg-[#5e5ce6]/[0.06] rounded-full blur-[180px] animate-aurora-2" />
        <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] bg-[#30d158]/[0.03] rounded-full blur-[150px]" />
        
        {/* Subtle Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.85)_100%)]" />
      </div>

      {/* Desktop macOS / iPadOS Frosted Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 270 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="hidden md:flex flex-col h-screen sticky top-0 bg-[#0c0d14]/85 backdrop-blur-3xl border-r border-white/[0.07] flex-shrink-0 z-20 overflow-visible select-none shadow-[2px_0_30px_rgba(0,0,0,0.6)] relative"
        aria-label="Main Navigation"
      >
        {/* Top Rim Glass Shimmer */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        {/* Sidebar Header with Apple Branding */}
        <div className={cn("p-4 flex items-center relative z-10 transition-all", isCollapsed ? "justify-center flex-col gap-3" : "justify-between")}>
          <Link 
            to="/" 
            aria-label="Smart Ledger X"
            className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] rounded-2xl p-1"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="relative flex-shrink-0"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0a84ff]/25 border border-white/20">
                <Wallet className="text-white drop-shadow-sm" size={20} />
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
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                    Smart Ledger
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-[#64d2ff] border border-white/15">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] text-[#86868b] font-medium tracking-tight">Apple Finance Suite</span>
              </motion.div>
            )}
          </Link>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-full text-[#86868b] hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] flex-shrink-0"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </motion.button>
        </div>

        {/* Sidebar Navigation Categories */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto overflow-x-hidden custom-sidebar-scrollbar relative z-10 pb-10">
          {navCategories.map((group, groupIdx) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  {group.title}
                </div>
              ) : (
                groupIdx > 0 && <div className="h-[1px] bg-white/[0.06] my-2 mx-2" />
              )}

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center rounded-2xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]",
                      isCollapsed ? "justify-center h-11 w-11 mx-auto my-1" : "px-3.5 py-2.5 gap-3 w-full",
                      isActive 
                        ? "text-white font-semibold shadow-sm" 
                        : "text-[#a1a1a6] hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Apple Active Translucent Glass Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="appleSidebarActivePill"
                          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/[0.12] to-white/[0.06] border border-white/[0.14] shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-xl"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}

                      {/* Hover background for idle state */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/[0.05] transition-colors duration-150" />
                      )}

                      {/* Squircle Icon Container */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className={cn(
                          "relative z-10 w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200",
                          isActive ? item.bg : "bg-white/[0.04] text-[#86868b] group-hover:text-white group-hover:bg-white/[0.08]"
                        )}
                      >
                        <item.icon size={16} className={cn("transition-colors", isActive ? item.color : "text-[#86868b] group-hover:text-white")} />
                      </motion.div>
                      
                      {/* Label */}
                      {!isCollapsed && (
                        <span className={cn(
                          "text-sm font-medium whitespace-nowrap overflow-hidden transition-colors z-10",
                          isActive ? "text-white font-semibold" : "text-[#a1a1a6] group-hover:text-white"
                        )}>
                          {item.label}
                        </span>
                      )}

                      {/* Floating Tooltip for Collapsed State */}
                      {isCollapsed && (
                        <div 
                          role="tooltip" 
                          className="absolute left-full ml-3 px-3 py-1.5 bg-[#1c1c24]/95 backdrop-blur-xl border border-white/15 text-white text-xs font-semibold rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] whitespace-nowrap pointer-events-none opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-1.5"
                        >
                          <span>{item.label}</span>
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
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-2xl border-b border-white/[0.08] z-30 pt-[env(safe-area-inset-top)]">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open Full App Menu"
              className="w-10 h-10 flex items-center justify-center text-[#f5f5f7] rounded-full hover:bg-white/[0.08] active:scale-95 transition-all"
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-[#0a84ff] to-[#5e5ce6] rounded-xl flex items-center justify-center shadow-md shadow-[#0a84ff]/25 border border-white/20">
                <Wallet className="text-white" size={16} />
              </div>
              <span className="font-bold tracking-tight text-white text-base">Smart Ledger</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
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
              transition={{ duration: 0.25 }}
              className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              ref={menuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="md:hidden fixed inset-y-0 left-0 w-[88%] max-w-sm bg-[#0e0f17]/95 backdrop-blur-3xl border-r border-white/10 z-50 flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] rounded-r-[32px] overflow-hidden"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/10">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0a84ff]/20 border border-white/20">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight text-white block">Smart Ledger</span>
                    <span className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wider">Apple Edition</span>
                  </div>
                </Link>
                <button 
                  onClick={() => setMobileMenuOpen(false)} 
                  aria-label="Close Navigation Menu"
                  className="w-9 h-9 flex items-center justify-center text-[#86868b] hover:text-white rounded-full bg-white/[0.06] active:scale-95 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto custom-sidebar-scrollbar">
                {navCategories.map((group) => (
                  <div key={`m-${group.title}`} className="space-y-1.5">
                    <h3 className="px-3 text-[11px] font-bold text-[#86868b] uppercase tracking-wider mb-2">
                      {group.title}
                    </h3>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5 space-y-1">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-label={item.label}
                          className={({ isActive }) =>
                            cn(
                              "relative flex items-center justify-between px-3 py-3 rounded-xl transition-all",
                              isActive 
                                ? "bg-[#0a84ff]/20 text-white font-bold border border-[#0a84ff]/30" 
                                : "text-[#a1a1a6] hover:text-white hover:bg-white/[0.04]"
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", item.bg)}>
                                  <item.icon size={18} className={item.color} />
                                </div>
                                <span className="font-semibold text-sm">{item.label}</span>
                              </div>
                              <ChevronRight size={16} className={cn("transition-colors", isActive ? "text-[#0a84ff]" : "text-[#86868b]")} />
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
        {/* Desktop Top Header */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 border-b border-white/[0.06] bg-[#000000]/60 backdrop-blur-2xl flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3 text-xs text-[#86868b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
            <span>Smart Ledger X • Encrypted & Synchronized</span>
          </div>

          <div className="flex items-center gap-3">
            <SyncStatusBadge />
            <NotificationDropdown ref={desktopNotifRef} />
            <UserProfileDropdown onOpenNotifications={() => desktopNotifRef.current?.open()} />
          </div>
        </header>

        {/* Page Routing Container */}
        <div className="flex-1 w-full pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-0">
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(6px)', position: "absolute", top: 0, left: 0, right: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
          transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.1 }}
          className="pointer-events-auto flex items-center justify-between gap-1 p-1.5 rounded-full bg-[#161722]/85 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] max-w-md w-full"
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



