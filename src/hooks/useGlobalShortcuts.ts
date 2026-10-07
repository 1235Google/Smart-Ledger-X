import { useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';

export function useGlobalShortcuts() {
  const { lockLedger, securityLock } = useStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;

    if (mod && key === 'l' && !event.altKey) {
      // 6. Do not trigger if on public login page, if already locked, or if modal is open
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        return;
      }
      if (securityLock?.isLocked) {
        return;
      }
      if (document.querySelector('.ledger-lock-overlay') || document.querySelector('[role="dialog"]')) {
        return;
      }

      const shortcut = event.shiftKey 
        ? (event.metaKey ? 'Cmd+Shift+L' : 'Ctrl+Shift+L') 
        : (event.metaKey ? 'Cmd+L' : 'Ctrl+L');

      console.log("[SecurityShortcut] Ledger lock shortcut detected");
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      lockLedger({
        reason: 'keyboard_shortcut',
        shortcut
      });
    }
  }, [lockLedger, securityLock?.isLocked]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown]);
}
