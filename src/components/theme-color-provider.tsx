'use client';

import * as React from 'react';
import { COLOR_THEME_STORAGE_KEY, type ColorThemeId } from '@/lib/themes';

interface ColorThemeContextValue {
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
}

const ColorThemeContext = React.createContext<ColorThemeContextValue | undefined>(undefined);

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = React.useState<ColorThemeId>('coral');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY) as ColorThemeId | null;
      const theme: ColorThemeId = stored && (stored === 'coral' || stored === 'professional') ? stored : 'coral';
      setColorThemeState(theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch {
      document.documentElement.setAttribute('data-theme', 'coral');
    }
  }, [mounted]);

  const setColorTheme = React.useCallback((theme: ColorThemeId) => {
    setColorThemeState(theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const ctx = React.useContext(ColorThemeContext);
  if (!ctx) {
    throw new Error('useColorTheme must be used within ColorThemeProvider');
  }
  return ctx;
}
