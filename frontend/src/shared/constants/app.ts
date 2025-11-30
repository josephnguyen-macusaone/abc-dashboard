/**
 * Application Configuration and Feature Flags
 */

/**
 * Application Configuration
 */
export const APP_CONFIG = {
  NAME: 'MERN Auth App',
  VERSION: '1.0.0',
  DEFAULT_THEME: 'light', // Default theme is light, but system theme option is available
} as const;

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  ENABLE_DEBUG_MODE: false,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
} as const;