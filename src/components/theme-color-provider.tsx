'use client';

import * as React from 'react';
import {
  COLOR_THEME_STORAGE_KEY,
  COLOR_THEME_TENANT_KEY,
  COLOR_THEME_USER_OVERRIDES_KEY,
  DEFAULT_COLOR_THEME,
  COLOR_THEMES,
  type ColorThemeId,
} from '@/lib/themes';
import { useTenantStore } from '@/store/tenant-store';

interface ColorThemeContextValue {
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
}

const ColorThemeContext = React.createContext<ColorThemeContextValue | undefined>(undefined);

function applyTheme(theme: ColorThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
}

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

const VALID_THEMES = Object.keys(COLOR_THEMES) as ColorThemeId[];

function readOverrides(): Record<string, ColorThemeId> {
  try {
    const raw = localStorage.getItem(COLOR_THEME_USER_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeOverride(tenantId: string, theme: ColorThemeId) {
  try {
    const overrides = readOverrides();
    overrides[tenantId] = theme;
    localStorage.setItem(COLOR_THEME_USER_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

function getUserOverrideForTenant(tenantId: string): ColorThemeId | null {
  const overrides = readOverrides();
  const override = overrides[tenantId];
  return override && VALID_THEMES.includes(override) ? override : null;
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = React.useState<ColorThemeId>(DEFAULT_COLOR_THEME);
  const [mounted, setMounted] = React.useState(false);

  const getCurrentTenant = useTenantStore((s) => s.getCurrentTenant);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const tenants = useTenantStore((s) => s.tenants);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // When tenants are loaded or current tenant changes, resolve the correct theme:
  // 1. User's per-tenant manual override (highest priority)
  // 2. Tenant's configured theme
  // 3. Fallback to stored generic pref or app default
  React.useEffect(() => {
    if (!mounted) return;

    if (currentTenantId && tenants.length > 0) {
      const tenantEntry = getCurrentTenant();
      const tenantTheme = tenantEntry?.tenant.theme;

      // Check if the user has manually overridden for this specific tenant
      const userOverride = getUserOverrideForTenant(currentTenantId);

      if (userOverride) {
        setColorThemeState(userOverride);
        applyTheme(userOverride);
        writeStorage(COLOR_THEME_STORAGE_KEY, userOverride);
      } else if (tenantTheme) {
        // Apply tenant-configured theme
        setColorThemeState(tenantTheme);
        applyTheme(tenantTheme);
        writeStorage(COLOR_THEME_STORAGE_KEY, tenantTheme);
        writeStorage(COLOR_THEME_TENANT_KEY, currentTenantId);
      } else {
        // No tenant theme — fall back to stored generic pref or app default
        const stored = readStorage(COLOR_THEME_STORAGE_KEY) as ColorThemeId | null;
        const resolved = stored && VALID_THEMES.includes(stored) ? stored : DEFAULT_COLOR_THEME;
        setColorThemeState(resolved);
        applyTheme(resolved);
      }
    } else if (!currentTenantId) {
      // No tenant context yet — use stored pref or default
      const stored = readStorage(COLOR_THEME_STORAGE_KEY) as ColorThemeId | null;
      const resolved = stored && VALID_THEMES.includes(stored) ? stored : DEFAULT_COLOR_THEME;
      setColorThemeState(resolved);
      applyTheme(resolved);
    }
  }, [mounted, currentTenantId, tenants, getCurrentTenant]);

  const setColorTheme = React.useCallback((theme: ColorThemeId) => {
    setColorThemeState(theme);
    applyTheme(theme);
    writeStorage(COLOR_THEME_STORAGE_KEY, theme);

    // Record the user's manual choice per tenant so it survives tenant switches
    if (currentTenantId) {
      writeOverride(currentTenantId, theme);
    }
  }, [currentTenantId]);

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
