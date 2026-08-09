import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  HelpCircle, 
  Info, 
  LogOut, 
  Calendar, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

interface UserProfileDropdownProps {
  onOpenNotifications?: () => void;
}

function formatDate(dateInput?: string | number | null): string {
  if (!dateInput) return 'Joined recently';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Joined recently';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Joined recently';
  }
}

function formatLastSignIn(dateInput?: string | number | null): string {
  if (!dateInput) return 'Active now';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Active now';
    const now = new Date();
    const diffInSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffInSec < 60) return 'Just now';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return 'Active now';
  }
}

export default function UserProfileDropdown({ onOpenNotifications }: UserProfileDropdownProps) {
  const { userProfile, logout, isAdminAuthenticated } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const firebaseUser = auth.currentUser;

  const photoUrl = firebaseUser?.photoURL || userProfile?.profilePhoto || '';
  const fullName = userProfile?.fullName || firebaseUser?.displayName || 'SmartLedger User';
  const email = userProfile?.email || firebaseUser?.email || 'user@smartledger.app';
  const creationDate = firebaseUser?.metadata?.creationTime || userProfile?.memberSince;
  const lastSignIn = firebaseUser?.metadata?.lastSignInTime || userProfile?.lastLogin;

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SL';
  };

  // Close on outside click and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Account Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 sm:gap-3 pl-1.5 pr-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 shadow-md flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white tracking-wider">{getInitials(fullName)}</span>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start max-w-[130px]">
          <span className="text-xs font-semibold text-white truncate w-full text-left">{fullName}</span>
          <span className="text-[10px] text-slate-400 truncate w-full text-left font-mono">{email}</span>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="menu"
            className="absolute right-0 top-full mt-2 w-80 sm:w-84 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 divide-y divide-white/10 max-w-[calc(100vw-2rem)]"
          >
            {/* Header / User Info */}
            <div className="p-4 bg-gradient-to-b from-white/[0.04] to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 shadow-lg flex-shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-white tracking-wider">{getInitials(fullName)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white text-sm truncate">{fullName}</h4>
                  <p className="text-xs text-slate-400 truncate">{email}</p>
                </div>
              </div>

              {/* User Account Metadata */}
              <div className="mt-3.5 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                  <Calendar size={13} className="text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-medium">Joined</span>
                    <span className="block font-medium text-slate-200 truncate">{formatDate(creationDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                  <Clock size={13} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-medium">Last Active</span>
                    <span className="block font-medium text-slate-200 truncate">{formatLastSignIn(lastSignIn)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => handleAction(() => navigate('/profile'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    <User size={16} />
                  </div>
                  <span className="text-xs font-semibold">Profile</span>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              <button
                onClick={() => handleAction(() => navigate('/settings'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Settings size={16} />
                  </div>
                  <span className="text-xs font-semibold">Settings</span>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              <button
                onClick={() => handleAction(() => onOpenNotifications?.())}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Bell size={16} />
                  </div>
                  <span className="text-xs font-semibold">Notifications</span>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              {isAdminAuthenticated && (
                <button
                  onClick={() => handleAction(() => navigate('/admin/dashboard'))}
                  role="menuitem"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <ShieldAlert size={16} />
                    </div>
                    <span className="text-xs font-semibold">Admin Panel</span>
                  </div>
                  <ChevronRight size={14} className="text-purple-400" />
                </button>
              )}
            </div>

            {/* Help & About */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => handleAction(() => navigate('/help'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                    <HelpCircle size={16} />
                  </div>
                  <span className="text-xs font-semibold">Help & Support</span>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              <button
                onClick={() => handleAction(() => navigate('/about'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <Info size={16} />
                  </div>
                  <span className="text-xs font-semibold">About SmartLedger</span>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>
            </div>

            {/* Logout Footer */}
            <div className="p-2 bg-red-500/[0.02]">
              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <LogOut size={16} />
                </div>
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
