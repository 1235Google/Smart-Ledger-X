import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, Users, Wallet, ArrowDownLeft, ArrowUpRight, 
  Bell, BarChart3, FileText, Settings, LogOut, ShieldCheck, Menu, X, Search 
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { cn } from '../../lib/utils';

export default function AdminLayout() {
  const { isAdminAuthenticated, adminLogout, customers, transactions } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  if (location.pathname === '/admin' || location.pathname === '/admin/' || location.pathname === '/admin/dashboard') {
    return <Navigate to="/admin/ledger" replace />;
  }

  const handleLogout = () => {
    adminLogout();
    navigate('/admin', { replace: true });
  };

  const navItems = [
    { label: 'Entries', path: '/admin/ledger', icon: Wallet },
    { label: 'Pending Payments', path: '/admin/pending', icon: ArrowUpRight },
    { label: 'Gullak Entries', path: '/admin/gullak', icon: Wallet },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white flex overflow-x-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-black/60 border-r border-white/10 backdrop-blur-2xl fixed inset-y-0 z-40">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <div className="w-full h-full bg-[#0a0a0a] rounded-[10px] flex items-center justify-center">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
              SmartLedgerX
            </h1>
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Admin Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-medium text-sm transition-all duration-300 relative group",
                  isActive 
                    ? "text-white bg-gradient-to-r from-blue-600/20 to-emerald-500/20 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_10px_#10b981]" />
                )}
                <Icon size={20} className={cn("transition-colors", isActive ? "text-emerald-400" : "text-neutral-500 group-hover:text-neutral-300")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Drawer */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/10 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5">
            <div className="w-full h-full bg-[#0a0a0a] rounded-[6px] flex items-center justify-center">
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
          </div>
          <span className="font-bold text-base">Admin Panel</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/5 text-neutral-300"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/90 backdrop-blur-xl pt-20 px-6 flex flex-col">
          <nav className="flex-1 space-y-2 py-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium text-base",
                    isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:bg-white/5"
                  )}
                >
                  <Icon size={22} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="py-6 border-t border-white/10">
            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium text-base text-red-400 bg-red-500/10 border border-red-500/20"
            >
              <LogOut size={22} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        <header className="hidden lg:flex items-center justify-between h-20 px-8 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input 
                type="text" 
                placeholder="Search records, users, transactions..."
                className="w-80 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
                AD
              </div>
              <div>
                <div className="text-sm font-semibold">Super Administrator</div>
                <div className="text-xs text-neutral-400">admin@smartledgerx.io</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-10 pt-20 lg:pt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
