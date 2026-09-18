import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { auth } from '../lib/firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import LockScreen from './LockScreen';
import { ShieldCheck } from 'lucide-react';

interface SecurityWrapperProps {
  children: React.ReactNode;
}

export default function SecurityWrapper({ children }: SecurityWrapperProps) {
  const { 
    currentUser, 
    isAuthReady, 
    isUnlocked: storeIsUnlocked,
    unlockApp: storeUnlockApp, 
    lockApp: storeLockApp 
  } = useStore();
  
  const location = useLocation();
  const navigate = useNavigate();

  // Local unlock state backed by sessionStorage ('isUnlocked')
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('isUnlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Synchronize with store unlock status
  useEffect(() => {
    const isNowUnlocked = storeIsUnlocked || (typeof window !== 'undefined' && sessionStorage.getItem('isUnlocked') === 'true');
    if (isNowUnlocked) {
      setIsUnlocked(true);
    }
  }, [storeIsUnlocked, currentUser]);

  // 1. Ensure Firebase Auth uses browser local persistence so Google login survives page refresh & auto-lock
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence)
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

  // 3. Local Lock Function - strictly locks the local UI without signing out of Firebase/Google
  const lockAppLocally = useCallback(() => {
    console.log('[Auto-Lock] 5 minutes of inactivity reached. Locking local UI.');
    try {
      sessionStorage.removeItem('isUnlocked');
    } catch (e) {
      console.warn('Failed to remove isUnlocked from sessionStorage', e);
    }
    setIsUnlocked(false);
    storeLockApp();
  }, [storeLockApp]);

  // 4. Unlock Handler - unlocks local UI upon successful Face or PIN verification
  const handleUnlock = useCallback(() => {
    console.log('[Security] App unlocked successfully via Face / PIN.');
    try {
      sessionStorage.setItem('isUnlocked', 'true');
    } catch (e) {
      console.warn('Failed to set isUnlocked in sessionStorage', e);
    }
    setIsUnlocked(true);
    storeUnlockApp();
    lastActivityRef.current = Date.now();

    // If currently on /login, navigate to dashboard root
    if (location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [storeUnlockApp, location.pathname, navigate]);

  // 5. Inactivity Timer (5 Minutes)
  // Tracks user activity: on 5 minutes of inactivity, locks local UI only.
  // Never calls signOut(auth), never clears Firebase session, never clears localStorage.
  const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // Only track inactivity when user is authenticated with Firebase and currently unlocked
    if (!currentUser || !isUnlocked) return;

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
    }, 1000);

    return () => {
      cancelAnimationFrame(rafId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser, isUnlocked, location.pathname, lockAppLocally]);

  // ===========================================================================
  // RENDER PRIORITY HIERARCHY
  // ===========================================================================

  // 0. Admin routes bypass normal app lock screen
  if (location.pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Priority A: Firebase auth is still loading -> show loading screen
  if (!isAuthReady) {
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

  // Priority B: NO Firebase user OR currently on /login -> render routes (let Login / LoginRoute handle)
  if (!currentUser || location.pathname === '/login') {
    return <>{children}</>;
  }

  // Priority C: There IS a Firebase user, but not unlocked
  // Render local lock screen: Face Unlock first priority, PIN fallback second priority
  const isLocallyUnlocked = isUnlocked || storeIsUnlocked || (typeof window !== 'undefined' && sessionStorage.getItem('isUnlocked') === 'true');
  if (!isLocallyUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  // Priority D: There IS a Firebase user AND unlocked
  // Render the main Smart Ledger X dashboard
  return <>{children}</>;
}
