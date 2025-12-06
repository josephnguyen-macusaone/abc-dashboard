/**
 * Security related constants
 */

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REFRESH_TOKEN: 'auth_refresh_token',
  THEME: 'theme',
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