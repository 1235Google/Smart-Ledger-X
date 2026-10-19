import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Bell, 
  HelpCircle, 
  Info, 
  LogOut, 
  Calendar, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTheme } from './ui/ThemeProvider';
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
  const { theme, toggleTheme } = useTheme();
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
        className="flex items-center gap-2 sm:gap-3 pl-1.5 pr-3 py-1.5 rounded-full bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] cursor-pointer m3-state-layer"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[var(--md-sys-color-primary)] to-[var(--md-sys-color-secondary)] flex items-center justify-center border border-[var(--md-sys-color-outline-variant)]/40 shadow-xs flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white tracking-wider">{getInitials(fullName)}</span>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start max-w-[130px]">
          <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] truncate w-full text-left">{fullName}</span>
          <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate w-full text-left font-mono">{email}</span>
        </div>
      </button>

      {/* Dropdown Menu (Material 3 Surface Elevation) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            className="absolute inset-x-3 top-full mt-2 sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/40 rounded-3xl shadow-lg overflow-hidden z-[1000] divide-y divide-[var(--md-sys-color-outline-variant)]/20 max-h-[75vh] sm:max-h-[85vh] overflow-y-auto"
          >
            {/* Header / User Info */}
            <div className="p-4 bg-[var(--md-sys-color-surface-container-high)]/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--md-sys-color-primary)] to-[var(--md-sys-color-secondary)] flex items-center justify-center border border-[var(--md-sys-color-outline-variant)]/40 shadow-xs flex-shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-white tracking-wider">{getInitials(fullName)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[var(--md-sys-color-on-surface)] text-sm truncate">{fullName}</h4>
                  <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate">{email}</p>
                </div>
              </div>

              {/* User Account Metadata */}
              <div className="mt-3.5 pt-3 border-t border-[var(--md-sys-color-outline-variant)]/30 grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 bg-[var(--md-sys-color-surface-container)] px-2.5 py-1.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]/30">
                  <Calendar size={13} className="text-[var(--md-sys-color-primary)] flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider font-bold">Joined</span>
                    <span className="block font-medium text-[var(--md-sys-color-on-surface)] truncate">{formatDate(creationDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-[var(--md-sys-color-surface-container)] px-2.5 py-1.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]/30">
                  <Clock size={13} className="text-[var(--md-sys-color-success)] flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[9px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider font-bold">Last Active</span>
                    <span className="block font-medium text-[var(--md-sys-color-on-surface)] truncate">{formatLastSignIn(lastSignIn)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => handleAction(() => navigate('/profile'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shadow-xs">
                    <User size={16} />
                  </div>
                  <span className="text-xs font-semibold">Profile</span>
                </div>
                <ChevronRight size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors" />
              </button>

              <button
                onClick={() => handleAction(() => navigate('/settings'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] flex items-center justify-center shadow-xs">
                    <Settings size={16} />
                  </div>
                  <span className="text-xs font-semibold">Settings</span>
                </div>
                <ChevronRight size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors" />
              </button>

              <button
                onClick={() => handleAction(() => onOpenNotifications?.())}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] flex items-center justify-center shadow-xs">
                    <Bell size={16} />
                  </div>
                  <span className="text-xs font-semibold">Notifications</span>
                </div>
                <ChevronRight size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors" />
              </button>

              {/* Theme Toggle within Menu */}
              <button
                onClick={() => toggleTheme()}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center shadow-xs">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  </div>
                  <span className="text-xs font-semibold">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                </div>
                <span className="text-[11px] font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
              </button>

              {isAdminAuthenticated && (
                <button
                  onClick={() => handleAction(() => navigate('/admin/dashboard'))}
                  role="menuitem"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] flex items-center justify-center shadow-xs">
                      <ShieldAlert size={16} />
                    </div>
                    <span className="text-xs font-semibold">Admin Panel</span>
                  </div>
                  <ChevronRight size={14} className="text-[var(--md-sys-color-outline)]" />
                </button>
              )}
            </div>

            {/* Help & About */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => handleAction(() => navigate('/help'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] flex items-center justify-center shadow-xs">
                    <HelpCircle size={16} />
                  </div>
                  <span className="text-xs font-semibold">Help & Support</span>
                </div>
                <ChevronRight size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors" />
              </button>

              <button
                onClick={() => handleAction(() => navigate('/about'))}
                role="menuitem"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors group cursor-pointer m3-state-layer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] flex items-center justify-center shadow-xs">
                    <Info size={16} />
                  </div>
                  <span className="text-xs font-semibold">About SmartLedger</span>
                </div>
                <ChevronRight size={14} className="text-[var(--md-sys-color-outline)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors" />
              </button>
            </div>

            {/* Logout Footer */}
            <div className="p-2">
              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)]/30 transition-colors font-semibold text-xs cursor-pointer m3-state-layer"
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] flex items-center justify-center shadow-xs">
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
