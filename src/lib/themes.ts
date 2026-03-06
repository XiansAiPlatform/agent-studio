/**
 * Color theme definitions for the application.
 * Themes override primary, secondary, accent, ring, and chart colors.
 */

export type ColorThemeId = 'coral' | 'professional';

export const COLOR_THEMES: Record<
  ColorThemeId,
  { id: ColorThemeId; name: string; primarySwatch: string }
> = {
  coral: {
    id: 'coral',
    name: 'Coral',
    primarySwatch: '#E85D4A',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    primarySwatch: '#0F4C81',
  },
};

export const DEFAULT_COLOR_THEME: ColorThemeId = 'coral';

export const COLOR_THEME_STORAGE_KEY = 'agent-studio-color-theme';
