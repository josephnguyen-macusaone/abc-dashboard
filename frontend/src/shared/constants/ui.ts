/**
 * UI/UX related constants
 */

import type { ColumnDefinition } from '@/types';

/**
 * Theme Options
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

/**
 * Theme Configuration
 */
export const THEME_CONFIG = {
  // CSS attribute used for theme application
  ATTRIBUTE: 'data-theme',

  // Storage keys
  COOKIE_KEY: 'theme',
  STORAGE_KEY: 'theme-storage',

  // Default theme
  DEFAULT_THEME: THEMES.LIGHT,

  // Transition settings
  TRANSITION_DURATION: 200, // ms
} as const;
