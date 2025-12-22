import { THEMES } from '@/shared/constants';
import type { ThemeType } from '@/presentation/contexts/theme-context';

/**
 * Theme Script Component
 *
 * Injects an inline script that runs immediately before React hydration
 * to apply the correct theme and prevent theme flash.
 *
 * This script:
 * 1. Reads theme from cookies (for SSR support)
 * 2. Falls back to localStorage
 * 3. Applies theme to document element immediately
 * 4. Sets a global variable for React to use
 */
export function ThemeScript() {
  // Script that runs before React hydration
  const scriptContent = `
    (function() {
      try {
        // Function to get cookie value
        function getCookie(name) {
          const value = '; ' + document.cookie;
          const parts = value.split('; ' + name + '=');
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        }

        // Valid theme values (injected at build time)
        const validThemes = ['light', 'dark', 'system'];
        const LIGHT_THEME = 'light';
        const DARK_THEME = 'dark';
        const SYSTEM_THEME = 'system';

        // Function to get stored theme
        function getStoredTheme() {
          // Priority: cookies (SSR) > localStorage (Zustand) > default

          // Try cookies first (for SSR support)
          const cookieTheme = getCookie('theme');
          if (cookieTheme && validThemes.includes(cookieTheme)) {
            return cookieTheme;
          }

          // Try Zustand localStorage (theme-storage key)
          try {
            const stored = localStorage.getItem('theme-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              const localTheme = parsed.state?.theme;
              if (localTheme && validThemes.includes(localTheme)) {
                return localTheme;
              }
            }
          } catch (e) {
            // Ignore localStorage errors
          }

          // Default to light theme
          return LIGHT_THEME;
        }

        // Function to resolve actual theme (light/dark)
        function resolveTheme(theme) {
          if (theme === SYSTEM_THEME) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return theme === DARK_THEME ? 'dark' : 'light';
        }

        // Get and apply theme immediately
        const theme = getStoredTheme();
        const resolvedTheme = resolveTheme(theme);

        // Apply theme to document immediately
        const root = document.documentElement;
        root.setAttribute('data-theme', resolvedTheme);

        // Also apply class for backward compatibility
        root.classList.remove('light', 'dark');
        if (resolvedTheme === 'dark') {
          root.classList.add('dark');
        }

        // Store resolved theme globally for React
        window.__THEME_DATA__ = {
          theme: theme,
          resolvedTheme: resolvedTheme,
          source: getCookie('theme') ? 'cookie' : 'localStorage'
        };

      } catch (e) {
        // Fallback: apply light theme
        const root = document.documentElement;
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
        window.__THEME_DATA__ = {
          theme: 'light',
          resolvedTheme: 'light',
          source: 'default'
        };
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: scriptContent,
      }}
    />
  );
}

// Type for the global theme data
declare global {
  interface Window {
    __THEME_DATA__?: {
      theme: string;
      resolvedTheme: string;
      source: 'cookie' | 'localStorage' | 'fallback';
    };
  }
}