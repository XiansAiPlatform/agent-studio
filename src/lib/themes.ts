/**
 * Color theme definitions for the application.
 * Themes override primary, secondary, accent, ring, and chart colors.
 *
 * Names are Scandinavian-influenced:
 *   lingon — lingonberry (warm coral red)
 *   fjord  — Norwegian fjord (deep navy blue)
 *   skog   — Swedish/Norwegian for "forest" (deep forest green)
 */

export type ColorThemeId = 'lingon' | 'fjord' | 'skog' | 'zenith';

export const COLOR_THEMES: Record<
  ColorThemeId,
  { id: ColorThemeId; name: string; primarySwatch: string }
> = {
  lingon: {
    id: 'lingon',
    name: 'Lingon',
    primarySwatch: '#E85D4A',
  },
  fjord: {
    id: 'fjord',
    name: 'Fjord',
    primarySwatch: '#0F4C81',
  },
  skog: {
    id: 'skog',
    name: 'Skog',
    primarySwatch: '#1B3A2B',
  },
  zenith: {
    id: 'zenith',
    name: 'Zenith',
    primarySwatch: '#CC0000',
  },
};

export const DEFAULT_COLOR_THEME: ColorThemeId = 'lingon';

export const COLOR_THEME_STORAGE_KEY = 'agent-studio-color-theme';

/** Stores the tenant ID whose theme was last applied as default (not a user manual pick) */
export const COLOR_THEME_TENANT_KEY = 'agent-studio-color-theme-tenant';

/**
 * Stores a JSON map of tenantId → ColorThemeId for tenants where the user has
 * manually chosen a theme, overriding the tenant default.
 * e.g. { "tenant-abc": "zenith", "tenant-xyz": "skog" }
 */
export const COLOR_THEME_USER_OVERRIDES_KEY = 'agent-studio-color-theme-overrides';
