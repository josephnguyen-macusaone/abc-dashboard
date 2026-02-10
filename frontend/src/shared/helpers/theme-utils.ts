import { THEMES } from '@/shared/constants';
import type { ThemeType, ResolvedTheme } from '@/presentation/contexts/theme-context';

/**
 * Theme utilities for consistent theme handling across SSR and client
 */

export interface ThemeData {
  theme: ThemeType;
  resolvedTheme: ResolvedTheme;
  source: 'cookie' | 'localStorage' | 'system' | 'default';
}

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set cookie value
 */
export function setCookie(name: string, value: string, options: {
  maxAge?: number;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
} = {}) {
  if (typeof document === 'undefined') return;

  const { maxAge = 31536000, path = '/', secure, sameSite = 'lax' } = options;

  let cookie = `${name}=${value}; max-age=${maxAge}; path=${path}`;

  if (secure) cookie += '; secure';
  if (sameSite) cookie += `; samesite=${sameSite}`;

  document.cookie = cookie;
}

/**
 * Get theme from cookies (server-safe)
 */
export function getThemeFromCookies(): ThemeType | null {
  const cookieTheme = getCookie('theme');
  if (cookieTheme && Object.values(THEMES).includes(cookieTheme as ThemeType)) {
    return cookieTheme as ThemeType;
  }
  return null;
}

/**
 * Get theme from localStorage (client-only)
 */
export function getThemeFromStorage(): ThemeType | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('theme-storage');
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { theme?: string } };
      const storageTheme = parsed.state?.theme;
      if (storageTheme && Object.values(THEMES).includes(storageTheme as ThemeType)) {
        return storageTheme as ThemeType;
      }
    }
  } catch (e) {
    // Clear corrupted data
    localStorage.removeItem('theme-storage');
  }

  return null;
}

/**
 * Resolve theme to actual light/dark value
 */
export function resolveTheme(theme: ThemeType): ResolvedTheme {
  if (theme === THEMES.SYSTEM) {
    if (typeof window === 'undefined') {
      // Server-side: default to light
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return theme === THEMES.DARK ? 'dark' : 'light';
}

/**
 * Get complete theme data with fallback chain
 */
export function getThemeData(): ThemeData {
  // Priority: cookies (SSR) > localStorage > system > default

  let theme: ThemeType = THEMES.LIGHT;
  let source: ThemeData['source'] = 'default';

  // Try cookies first (for SSR)
  const cookieTheme = getThemeFromCookies();
  if (cookieTheme) {
    theme = cookieTheme;
    source = 'cookie';
  } else {
    // Try localStorage
    const storageTheme = getThemeFromStorage();
    if (storageTheme) {
      theme = storageTheme;
      source = 'localStorage';
    } else {
      // Check system preference
      if (typeof window !== 'undefined') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = systemPrefersDark ? THEMES.DARK : THEMES.LIGHT;
        source = 'system';
      }
    }
  }

  return {
    theme,
    resolvedTheme: resolveTheme(theme),
    source
  };
}

/**
 * Save theme to both cookie and localStorage
 */
export function saveTheme(theme: ThemeType) {
  // Save to cookie for SSR
  setCookie('theme', theme, {
    maxAge: 31536000, // 1 year
    path: '/',
    sameSite: 'lax'
  });

  // Save to localStorage for client-side persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme-storage', JSON.stringify({
      state: { theme },
      version: 0
    }));
  }
}

/**
 * Listen for system theme changes
 */
export function createSystemThemeListener(callback: (resolvedTheme: ResolvedTheme) => void) {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}