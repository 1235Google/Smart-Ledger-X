import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Wallet, 
  Clock, 
  BarChart3, 
  FileText, 
  Cloud, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X, 
  Search, 
  Activity, 
  Users, 
  Bell, 
  Sun, 
  Moon, 
  Laptop, 
  ChevronRight, 
  Plus, 
  Download, 
  Crown, 
  Shield, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Database,
  Loader2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { M3ThemeProvider, useM3Theme, M3ThemeMode } from '../../components/admin/material3/M3ThemeContext';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';

function AdminLayoutInner() {
  const { 
    isAdminAuthenticated, 
    isAdminLoading, 
    adminUser, 
    adminLogout,
    transactions,
    customers,
    currentBalance 
  } = useStore();
  const { showSuccess, showInfo } = useToast();
  const { mode, setMode, resolvedTheme, toggleTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Close menus on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setProfileMenuOpen(false);
    setThemeMenuOpen(false);
  }, [location.pathname]);

  if (isAdminLoading) {
    return (
      <div className={cn(
        'min-h-screen flex flex-col items-center justify-center gap-4 transition-colors duration-200',
        isDark ? 'bg-[#131314] text-white' : 'bg-[#f8fafd] text-[#1f1f1f]'
      )}>
        <div className="w-14 h-14 rounded-3xl bg-[#a8c7fa]/20 flex items-center justify-center p-3">
          <ShieldCheck size={32} className="text-[#0b57d0] dark:text-[#a8c7fa] animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin text-[#0b57d0] dark:text-[#a8c7fa]" />
          <span>Verifying Google Admin session...</span>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = async () => {
    await adminLogout();
    showInfo('Logged Out', 'You have been safely signed out of the Admin Console.');
    navigate('/admin', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/admin/ledger', icon: Wallet },
    { label: 'Pending Payments', path: '/admin/pending', icon: Clock },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Reports', path: '/admin/reports', icon: FileText },
    { label: 'Backup & Recovery', path: '/admin/backup', icon: Cloud },
    { label: 'Gullak Savings', path: '/admin/gullak', icon: Database },
    { label: 'Reminders', path: '/admin/reminders', icon: Bell },
    { label: 'Admin RBAC', path: '/admin/users', icon: Users },
    { label: 'Security Logs', path: '/admin/logs', icon: Activity },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const currentNav = navItems.find((item) => location.pathname.startsWith(item.path)) || navItems[0];

  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return [{ label: 'Admin', path: '/admin/dashboard' }];
    return [
      { label: 'Console', path: '/admin/dashboard' },
      { label: currentNav.label, path: currentNav.path },
    ];
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Owner':
        return isDark ? 'bg-[#5c3e00] text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]';
      case 'Super Admin':
        return isDark ? 'bg-[#492532] text-[#ffd8e4]' : 'bg-[#ffd8e4] text-[#31111d]';
      case 'Admin':
        return isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]';
      case 'Manager':
        return isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]';
      default:
        return isDark ? 'bg-[#282a2d] text-[#c4c7c5]' : 'bg-[#f0f4f9] text-[#444746]';
    }
  };

  return (
    <div className={cn(
      'min-h-screen flex transition-colors duration-200 font-sans selection:bg-[#0b57d0]/20 selection:text-[#0b57d0]',
      isDark ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8fafd] text-[#1f1f1f]'
    )}>
      {/* Permanent Desktop Navigation Sidebar (Material 3 Navigation Drawer) */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 border-r select-none',
          sidebarCollapsed ? 'w-20' : 'w-72',
          isDark ? 'bg-[#1e1f20] border-[#2d2f31]' : 'bg-[#f0f4f9] border-[#e1e3e1]'
        )}
      >
        {/* Brand Header */}
        <div className="h-18 px-5 flex items-center justify-between border-b border-transparent">
          <Link to="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
              isDark ? 'bg-[#a8c7fa] text-[#04214c]' : 'bg-[#0b57d0] text-white'
            )}>
              <ShieldCheck size={24} />
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col min-w-0"
              >
                <span className="font-extrabold text-base tracking-tight leading-none truncate">
                  Smart Ledger
                </span>
                <span className={cn('text-[11px] font-semibold tracking-wider uppercase mt-1', isDark ? 'text-[#a8c7fa]' : 'text-[#0b57d0]')}>
                  Admin Console
                </span>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center rounded-full transition-all duration-200 relative group font-medium text-sm',
                  sidebarCollapsed ? 'justify-center h-12 w-12 mx-auto my-1' : 'px-4 py-3 gap-3.5',
                  isActive
                    ? isDark
                      ? 'text-[#c2e7ff] font-semibold'
                      : 'text-[#001d35] font-semibold'
                    : isDark
                    ? 'text-[#c4c7c5] hover:text-white hover:bg-white/5'
                    : 'text-[#444746] hover:text-[#1f1f1f] hover:bg-black/5'
                )}
              >
                {/* Active M3 Pill Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    className={cn(
                      'absolute inset-0 rounded-full z-0',
                      isDark ? 'bg-[#004a77]' : 'bg-[#c2e7ff]'
                    )}
                  />
                )}

                <div className="relative z-10 flex items-center justify-center">
                  <Icon
                    size={20}
                    className={cn(
                      'transition-colors shrink-0',
                      isActive
                        ? isDark ? 'text-[#c2e7ff]' : 'text-[#001d35]'
                        : isDark ? 'text-[#8e918f] group-hover:text-white' : 'text-[#5f6368] group-hover:text-[#1f1f1f]'
                    )}
                  />
                </div>

                {!sidebarCollapsed && (
                  <span className="relative z-10 truncate tracking-tight">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Admin Profile & Logout */}
        <div className={cn('p-3 border-t', isDark ? 'border-[#2d2f31]' : 'border-[#e1e3e1]')}>
          {!sidebarCollapsed ? (
            <div className="space-y-2">
              <div
                onClick={() => setShowProfileModal(true)}
                className={cn(
                  'p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors',
                  isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                )}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold text-xs">
                  {adminUser?.photoURL ? (
                    <img src={adminUser.photoURL} alt={adminUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    adminUser?.displayName ? adminUser.displayName.substring(0, 2).toUpperCase() : 'AD'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs truncate leading-tight">
                    {adminUser?.displayName || 'Administrator'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {adminUser?.email || 'admin@smartledger.io'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-colors text-rose-400 hover:bg-rose-500/10'
                )}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full overflow-hidden cursor-pointer bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold text-xs"
              >
                {adminUser?.photoURL ? (
                  <img src={adminUser.photoURL} alt={adminUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  'AD'
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2.5 rounded-full text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        sidebarCollapsed ? 'md:pl-20' : 'md:pl-72'
      )}>
        {/* Sticky Top App Bar (Material 3 Header) */}
        <header className={cn(
          'sticky top-0 z-20 h-18 px-4 sm:px-8 flex items-center justify-between border-b backdrop-blur-xl transition-colors duration-200',
          isDark
            ? 'bg-[#131314]/85 border-[#2d2f31]'
            : 'bg-[#f8fafd]/85 border-[#e1e3e1]'
        )}>
          {/* Left: Mobile Menu Trigger + Breadcrumb / Title */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Menu size={22} />
            </button>

            {/* Desktop collapse rail toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse to Rail'}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1.5 text-xs sm:text-sm font-medium overflow-hidden">
              {getBreadcrumbs().map((crumb, idx, arr) => (
                <React.Fragment key={crumb.path}>
                  <Link
                    to={crumb.path}
                    className={cn(
                      'hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] transition-colors truncate',
                      idx === arr.length - 1
                        ? isDark ? 'text-white font-bold' : 'text-[#1f1f1f] font-bold'
                        : isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'
                    )}
                  >
                    {crumb.label}
                  </Link>
                  {idx < arr.length - 1 && (
                    <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action: Run Backup */}
            <M3Button
              variant="tonal"
              size="sm"
              icon={Cloud}
              onClick={() => navigate('/admin/backup')}
              className="hidden sm:inline-flex"
            >
              Snapshot
            </M3Button>

            {/* Quick Action: Switch to User App */}
            <M3Button
              variant="outlined"
              size="sm"
              icon={ExternalLink}
              onClick={() => navigate('/')}
              className="hidden lg:inline-flex"
            >
              User App
            </M3Button>

            {/* Theme Toggle (Light / Dark / System dropdown) */}
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className={cn(
                  'p-2.5 rounded-full transition-colors flex items-center justify-center',
                  isDark ? 'hover:bg-white/10 text-[#a8c7fa]' : 'hover:bg-black/10 text-[#0b57d0]'
                )}
                title="Switch Theme"
              >
                {resolvedTheme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
              </button>

              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    className={cn(
                      'absolute right-0 mt-2 w-44 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] border p-1.5 z-50 overflow-hidden',
                      isDark ? 'bg-[#1e1f20] border-[#3c4043]' : 'bg-[#ffffff] border-[#e1e3e1]'
                    )}
                  >
                    {[
                      { id: 'light' as M3ThemeMode, label: 'Light Theme', icon: Sun },
                      { id: 'dark' as M3ThemeMode, label: 'Dark Theme', icon: Moon },
                      { id: 'system' as M3ThemeMode, label: 'System Default', icon: Laptop },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = mode === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setMode(t.id);
                            setThemeMenuOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                            isSelected
                              ? isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
                              : isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-black/5 text-slate-700'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={16} />
                            <span>{t.label}</span>
                          </div>
                          {isSelected && <Check size={14} />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Trigger & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-700/50"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold text-xs shrink-0">
                  {adminUser?.photoURL ? (
                    <img src={adminUser.photoURL} alt={adminUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    adminUser?.displayName ? adminUser.displayName.substring(0, 2).toUpperCase() : 'AD'
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold leading-none truncate max-w-[100px]">
                    {adminUser?.displayName?.split(' ')[0] || 'Admin'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {adminUser?.role || 'Admin'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    className={cn(
                      'absolute right-0 mt-2 w-64 rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.3)] border p-3 z-50 overflow-hidden',
                      isDark ? 'bg-[#1e1f20] border-[#3c4043]' : 'bg-[#ffffff] border-[#e1e3e1]'
                    )}
                  >
                    {/* Header Info */}
                    <div className="p-3 pb-3 border-b border-white/10 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold text-sm shrink-0">
                        {adminUser?.photoURL ? (
                          <img src={adminUser.photoURL} alt={adminUser.displayName} className="w-full h-full object-cover" />
                        ) : (
                          'AD'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{adminUser?.displayName || 'Administrator'}</div>
                        <div className="text-[11px] text-slate-400 truncate">{adminUser?.email}</div>
                        <div className={cn('mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block', getRoleBadge(adminUser?.role))}>
                          {adminUser?.role || 'Administrator'}
                        </div>
                      </div>
                    </div>

                    {/* Menu links */}
                    <div className="py-2 space-y-1 text-xs font-medium">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setShowProfileModal(true);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors',
                          isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-black/5 text-slate-700'
                        )}
                      >
                        <Shield size={16} />
                        <span>Security Credentials</span>
                      </button>
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/admin/logs');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors',
                          isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-black/5 text-slate-700'
                        )}
                      >
                        <Activity size={16} />
                        <span>Audit Logs</span>
                      </button>
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/admin/settings');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors',
                          isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-black/5 text-slate-700'
                        )}
                      >
                        <Settings size={16} />
                        <span>Admin Settings</span>
                      </button>
                    </div>

                    {/* Sign out */}
                    <div className="pt-2 border-t border-white/10">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Sign Out of Console</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer (Material 3 Mobile Navigation) */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className={cn(
                'relative w-72 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl p-4 overflow-y-auto',
                isDark ? 'bg-[#1e1f20]' : 'bg-[#f0f4f9]'
              )}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#04214c] flex items-center justify-center font-bold">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">Smart Ledger</h2>
                    <span className="text-[10px] uppercase font-bold text-[#0b57d0] dark:text-[#a8c7fa]">
                      Admin Console
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="flex-1 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileDrawerOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3.5 px-4 py-3 rounded-full font-medium text-sm transition-colors',
                        isActive
                          ? isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]'
                          : isDark ? 'text-[#c4c7c5] hover:bg-white/5' : 'text-[#444746] hover:bg-black/5'
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Drawer Sign Out */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Profile & Role Details Dialog */}
      <M3Dialog
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Admin Identity & Privileges"
        subtitle="Google OAuth & Role-Based Access Control"
        icon={ShieldCheck}
        iconTone="primary"
        actions={
          <M3Button variant="filled" onClick={() => setShowProfileModal(false)}>
            Close
          </M3Button>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold text-base shrink-0">
              {adminUser?.photoURL ? (
                <img src={adminUser.photoURL} alt={adminUser.displayName} className="w-full h-full object-cover" />
              ) : (
                'AD'
              )}
            </div>
            <div>
              <div className="font-bold text-base">{adminUser?.displayName || 'Administrator'}</div>
              <div className="text-slate-400">{adminUser?.email}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase', getRoleBadge(adminUser?.role))}>
                  {adminUser?.role || 'Administrator'}
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Active Session
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Assigned Permissions
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Full Ledger Read / Write</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Cloud Snapshot Execution</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Admin User Management</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Security Audit Log Access</span>
              </div>
            </div>
          </div>
        </div>
      </M3Dialog>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <M3ThemeProvider>
      <AdminLayoutInner />
    </M3ThemeProvider>
  );
}
