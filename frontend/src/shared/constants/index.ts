// Shared Constants - Application-wide constants

/**
 * Validates and normalizes the API base URL
 * Ensures the URL has a valid http:// or https:// scheme for CORS requests
 */
const validateAndNormalizeBaseURL = (url: string | undefined): string => {
  const DEFAULT_URL = 'http://localhost:5000/api';

  // If URL is empty, undefined, or null, use default
  if (!url || url.trim() === '') {
    return DEFAULT_URL;
  }

  const trimmedUrl = url.trim();

  // Check if URL already has http:// or https:// protocol
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    try {
      // Validate it's a proper URL
      new URL(trimmedUrl);
      return trimmedUrl;
    } catch {
      // Invalid URL format, use default
      console.warn(`Invalid API URL format: "${trimmedUrl}". Using default: ${DEFAULT_URL}`);
      return DEFAULT_URL;
    }
  }

  // If no protocol, assume http:// for localhost, https:// for others
  if (trimmedUrl.startsWith('localhost') || trimmedUrl.startsWith('127.0.0.1')) {
    return `http://${trimmedUrl}`;
  }

  // For other URLs without protocol, default to https://
  console.warn(`API URL missing protocol: "${trimmedUrl}". Assuming https://`);
  return `https://${trimmedUrl}`;
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: validateAndNormalizeBaseURL(process.env.NEXT_PUBLIC_API_URL),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * Application Routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
} as const;

/**
 * User Roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

/**
 * User Role Labels
 */
export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.STAFF]: 'Staff',
} as const;

/**
 * Theme Options
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

/**
 * Form Validation
 */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;

/**
 * Application Configuration
 */
export const APP_CONFIG = {
  NAME: 'MERN Auth App',
  VERSION: '1.0.0',
  DEFAULT_THEME: THEMES.DARK,
} as const;

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  ENABLE_DEBUG_MODE: false,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
} as const;

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  SESSION_TIMEOUT_MINUTES: 1440, // 24 hours
  TOKEN_REFRESH_THRESHOLD_MINUTES: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

/**
 * UI Constants
 */
export const UI = {
  TOAST_DURATION: 5000,
  ENABLE_ANIMATIONS: true,
  SIDEBAR_DEFAULT_OPEN: true,
  MODAL_Z_INDEX: 50,
  DRAWER_Z_INDEX: 40,
  DROPDOWN_Z_INDEX: 30,
} as const;

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
  TOKEN_EXPIRY_DAYS: 7,
  USER_EXPIRY_DAYS: 7,
  SECURE: process.env.NODE_ENV === 'production',
  SAME_SITE: 'Lax' as const,
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error - please check your connection',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  SERVER_ERROR: 'Server error - please try again later',
  VALIDATION_ERROR: 'Please check your input and try again',
} as const;
