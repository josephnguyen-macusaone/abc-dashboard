/**
 * Security related constants
 */

import { THEME_CONFIG } from './ui';

/**
 * Local Storage Keys
 * Theme cookie/local key is defined in THEME_CONFIG — keep in sync via THEME_CONFIG.COOKIE_KEY.
 */
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REFRESH_TOKEN: 'auth_refresh_token',
  THEME: THEME_CONFIG.COOKIE_KEY,
} as const;

/**
 * Cookie Configuration
 */
export const COOKIE_CONFIG = {
  TOKEN_EXPIRY_DAYS: 1, // Temporary: 24h for testing, will change to minutes later
  USER_EXPIRY_DAYS: 1, // Temporary: 24h for testing, will change to minutes later
  SECURE: process.env.NODE_ENV === 'production',
  SAME_SITE: 'Lax' as const,
} as const;