import React, { createContext, useContext, useState, useEffect } from 'react';

export type M3ThemeMode = 'light' | 'dark' | 'system';
export type M3ColorPalette = 'google-blue' | 'emerald' | 'purple' | 'amber';

interface M3ThemeContextType {
  mode: M3ThemeMode;
  resolvedTheme: 'light' | 'dark';
  palette: M3ColorPalette;
  setMode: (mode: M3ThemeMode) => void;
  setPalette: (palette: M3ColorPalette) => void;
  toggleTheme: () => void;
}

const M3ThemeContext = createContext<M3ThemeContextType | undefined>(undefined);

export const M3ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<M3ThemeMode>(() => {
    const saved = localStorage.getItem('smart_ledger_admin_theme_mode');
    return (saved as M3ThemeMode) || 'dark';
  });

  const [palette, setPaletteState] = useState<M3ColorPalette>(() => {
    const saved = localStorage.getItem('smart_ledger_admin_palette');
    return (saved as M3ColorPalette) || 'google-blue';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  const setMode = (newMode: M3ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('smart_ledger_admin_theme_mode', newMode);
  };

  const setPalette = (newPalette: M3ColorPalette) => {
    setPaletteState(newPalette);
    localStorage.setItem('smart_ledger_admin_palette', newPalette);
  };

  const toggleTheme = () => {
    const nextMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  };

  return (
    <M3ThemeContext.Provider value={{ mode, resolvedTheme, palette, setMode, setPalette, toggleTheme }}>
      <div 
        data-theme={resolvedTheme} 
        data-palette={palette}
        className={resolvedTheme === 'dark' ? 'dark' : ''}
      >
        {children}
      </div>
    </M3ThemeContext.Provider>
  );
};

export const useM3Theme = () => {
  const context = useContext(M3ThemeContext);
  if (!context) {
    throw new Error('useM3Theme must be used within an M3ThemeProvider');
  }
  return context;
};
