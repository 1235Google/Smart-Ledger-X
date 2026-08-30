import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { createNotification } from '../lib/notificationService';
import LockScreen from './LockScreen';

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const { securitySettings, isAuthenticated, isLocked, lockApp, logout, currentUser } = useStore();
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const autoLockTimeRef = useRef(securitySettings.autoLockTime ?? 2);
  const inactivityTimeoutRef = useRef(securitySettings.inactivityTimeout ?? 30);
  const autoLogoutEnabledRef = useRef(securitySettings.autoLogoutEnabled !== false);

  // Keep refs in sync with settings
  useEffect(() => {
    autoLockTimeRef.current = securitySettings.autoLockTime ?? 2;
    inactivityTimeoutRef.current = securitySettings.inactivityTimeout ?? 30;
    autoLogoutEnabledRef.current = securitySettings.autoLogoutEnabled !== false;
    lastActivityRef.current = Date.now(); // reset on settings update
  }, [securitySettings.autoLockTime, securitySettings.inactivityTimeout, securitySettings.autoLogoutEnabled]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let rafId: number;
    const handleActivity = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        lastActivityRef.current = Date.now();
      });
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveMs = now - lastActivityRef.current;
      const inactiveMinutes = inactiveMs / (60 * 1000);

      // 1. Automatic Inactivity Logout Check (Default 30 minutes)
      const timeoutLimit = inactivityTimeoutRef.current || 30;
      if (autoLogoutEnabledRef.current && timeoutLimit > 0 && inactiveMinutes >= timeoutLimit) {
        console.warn(`[SecurityWrapper] Inactivity timeout reached (${timeoutLimit}m). Automatically signing out.`);
        createNotification({
          title: 'Session Expired',
          message: `You were automatically signed out due to ${timeoutLimit} minutes of inactivity.`,
          type: 'security_session_expired'
        });
        logout().then(() => {
          navigate('/login');
        });
        return;
      }

      // 2. Local App PIN Lock Check (e.g. 2m or 5m)
      const lockTime = autoLockTimeRef.current;
      if (securitySettings.pinEnabled && !isLocked && lockTime > 0 && inactiveMinutes >= lockTime) {
        console.log(`[SecurityWrapper] Auto-lock threshold reached (${lockTime}m). Locking app.`);
        lockApp();
      }
    }, 2000);

    return () => {
      cancelAnimationFrame(rafId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated, isLocked, securitySettings.pinEnabled, lockApp, logout, navigate]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => {
      lastActivityRef.current = Date.now();
    }} />;
  }

  return <>{children}</>;
}
