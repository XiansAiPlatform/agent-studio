'use client';

import * as React from 'react';
import {
  DEFAULT_COLOR_THEME,
  COLOR_THEMES,
  type ColorThemeId,
} from '@/lib/themes';
import { useTenantStore } from '@/store/tenant-store';

interface ColorThemeContextValue {
  colorTheme: ColorThemeId;
}

const ColorThemeContext = React.createContext<ColorThemeContextValue | undefined>(undefined);

function applyTheme(theme: ColorThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
}

function isValidTheme(id: string | null | undefined): id is ColorThemeId {
  return !!id && id in COLOR_THEMES;
}

/**
 * Applies the color theme for the current tenant.
 *
 * The tenant's theme (configured by a tenant admin on the Branding page and
 * stored server-side) is the single source of truth. There is no per-user
 * override: every member of a tenant sees the same theme. When a tenant has no
 * theme set, the application default is used.
 */
export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = React.useState<ColorThemeId>(DEFAULT_COLOR_THEME);
  const [mounted, setMounted] = React.useState(false);

  const getCurrentTenant = useTenantStore((s) => s.getCurrentTenant);
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const tenants = useTenantStore((s) => s.tenants);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Re-resolve whenever the current tenant changes or the tenant list updates
  // (e.g. after an admin saves a new theme via the Branding page).
  React.useEffect(() => {
    if (!mounted) return;

    const tenantTheme = currentTenantId ? getCurrentTenant()?.tenant.theme : undefined;
    const resolved = isValidTheme(tenantTheme) ? tenantTheme : DEFAULT_COLOR_THEME;
    setColorThemeState(resolved);
    applyTheme(resolved);
  }, [mounted, currentTenantId, tenants, getCurrentTenant]);

  return (
    <ColorThemeContext.Provider value={{ colorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}
