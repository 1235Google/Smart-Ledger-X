import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ensureAuthPersistence } from '../lib/firebase';
import LockScreen from './LockScreen';
import { ShieldCheck } from 'lucide-react';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';

interface SecurityWrapperProps {
  children: React.ReactNode;
}

export default function SecurityWrapper({ children }: SecurityWrapperProps) {
  const { 
    user,
    currentUser, 
    authLoading,
    isAuthReady, 
    securitySettings,
    unlockApp: storeUnlockApp, 
    lockApp: storeLockApp,
    securityLock,
    unlockLedger
  } = useStore();
  
  const activeUser = user || currentUser;
  const location = useLocation();
  const navigate = useNavigate();

  // Mount global keyboard shortcuts for locking (Ctrl+L / Ctrl+Shift+L)
  useGlobalShortcuts();

  // Determine if user has actively configured and enabled PIN protection
  // Only apply lock screen if PIN is explicitly enabled AND a PIN is actually configured, OR if securityLock.isLocked is true
  const isPinOrBiometricEnabled = Boolean(
    securitySettings?.pinEnabled && Boolean(securitySettings?.pin) || securityLock?.isLocked
  );

  // Local unlock state backed by sessionStorage ('isUnlocked')
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('isUnlocked') === 'true';
    } catch {
      return false;
    }
  });

  // 1. Ensure Firebase Auth uses browser local persistence so Google login survives page refresh & closure
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ensureAuthPersistence()
        .then(() => {
          console.log('[SecurityWrapper] Firebase Auth persistence verified as browserLocalPersistence');
        })
        .catch((err) => {
          console.warn('[SecurityWrapper] Firebase Auth persistence note:', err);
        });
    }
  }, []);

  // 2. Synchronize isUnlocked with sessionStorage changes (e.g. window focus, storage events)
  useEffect(() => {
    const syncLocalUnlockState = () => {
      try {
        const unlocked = sessionStorage.getItem('isUnlocked') === 'true';
        setIsUnlocked(unlocked);
      } catch {
        setIsUnlocked(false);
      }
    };

    window.addEventListener('focus', syncLocalUnlockState);
    window.addEventListener('storage', syncLocalUnlockState);
    return () => {
      window.removeEventListener('focus', syncLocalUnlockState);
      window.removeEventListener('storage', syncLocalUnlockState);
    };
  }, []);

  // 3. Local Lock Function - strictly locks the local UI when PIN is configured, never signs out of Google
  const lockAppLocally = useCallback(() => {
    if (!isPinOrBiometricEnabled) return;
    console.log('[Auto-Lock] Inactivity threshold reached. Locking local UI with PIN protection.');
    try {
      sessionStorage.removeItem('isUnlocked');
    } catch (e) {
      console.warn('Failed to remove isUnlocked from sessionStorage', e);
    }
    setIsUnlocked(false);
    storeLockApp();
  }, [storeLockApp, isPinOrBiometricEnabled]);

  // 4. Unlock Handler - unlocks local UI upon successful Face or PIN verification
  const handleUnlock = useCallback(() => {
    console.log('[Security] App unlocked successfully.');
    try {
      sessionStorage.setItem('isUnlocked', 'true');
    } catch (e) {
      console.warn('Failed to set isUnlocked in sessionStorage', e);
    }
    setIsUnlocked(true);
    storeUnlockApp();
    unlockLedger();
    lastActivityRef.current = Date.now();

    // If currently on /login, navigate to dashboard root
    if (location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [storeUnlockApp, location.pathname, navigate]);

  // 5. Inactivity Timer
  // Only applies when user is authenticated, has enabled PIN/biometrics, and autoLogout is active
  const timeoutMinutes = securitySettings?.inactivityTimeout ?? 30;
  const isAutoLogout = securitySettings?.autoLogoutEnabled !== false;
  const AUTO_LOCK_TIMEOUT_MS = Math.max(1, timeoutMinutes) * 60 * 1000;
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // Only track inactivity when user is authenticated with Firebase, has PIN configured, and is currently unlocked
    if (!activeUser || !isUnlocked || !isPinOrBiometricEnabled || !isAutoLogout) return;

    // Do not auto-lock while inside admin dashboard
    if (location.pathname.startsWith('/admin')) return;

    lastActivityRef.current = Date.now();

    let rafId: number;
    const handleUserActivity = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        lastActivityRef.current = Date.now();
      });
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      if (elapsed >= AUTO_LOCK_TIMEOUT_MS) {
        lockAppLocally();
      }
    }, 5000);

    return () => {
      cancelAnimationFrame(rafId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [activeUser, isUnlocked, isPinOrBiometricEnabled, isAutoLogout, AUTO_LOCK_TIMEOUT_MS, location.pathname, lockAppLocally]);

  // ===========================================================================
  // RENDER PRIORITY HIERARCHY
  // ===========================================================================

  // 0. Admin routes bypass normal app lock screen
  if (location.pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Priority A: Firebase auth is still loading -> show loading screen
  if (authLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center gap-4 text-white select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <ShieldCheck className="w-5 h-5 text-indigo-400 absolute" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold tracking-wide text-neutral-200">Smart Ledger X</p>
          <p className="text-xs text-neutral-500">Verifying secure authentication...</p>
        </div>
      </div>
    );
  }

  // Priority B: No authenticated Firebase user -> pass through to AppRoutes (renders LoginRoute)
  if (!activeUser) {
    return <>{children}</>;
  }

  // Priority C: Authenticated Firebase user with active PIN protection
  // Only present LockScreen if PIN is actually configured and session is not yet unlocked
  if (isPinOrBiometricEnabled) {
    const isLocallyUnlocked = isUnlocked && sessionStorage.getItem('isUnlocked') === 'true';
    if (!isLocallyUnlocked) {
      return <LockScreen onUnlock={handleUnlock} />;
    }
  }

  // Priority D: Authenticated Firebase user with no PIN enabled OR already unlocked
  // Render the main Smart Ledger X dashboard seamlessly
  return <>{children}</>;
}
