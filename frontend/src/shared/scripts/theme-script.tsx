/**
 * Theme Script Component
 *
 * Injects a secure script that runs immediately before React hydration
 * to apply the correct theme and prevent theme flash.
 *
 * Security improvements:
 * - Uses Next.js Script component with security attributes
 * - Minimizes inline script content
 * - Sanitizes cookie/localStorage access
 * - No dynamic content injection
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  // Execute before hydration to avoid theme flash and script-tag hydration warnings.
  const initThemeScript = `
    (function() {
      try {
      // Valid theme values - hardcoded for security
      const VALID_THEMES = ['light', 'dark', 'system'];
      const LIGHT_THEME = 'light';
      const DARK_THEME = 'dark';
      const SYSTEM_THEME = 'system';

      // Secure cookie reader - no dynamic evaluation
      function getCookie(name) {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
          const cookieValue = parts.pop().split(';').shift();
          // Basic validation - only allow expected theme values
          return VALID_THEMES.includes(cookieValue) ? cookieValue : null;
        }
        return null;
      }

      // Secure localStorage reader with error handling
      function getStoredTheme() {
        // Priority: cookies (SSR) > localStorage (Zustand) > default
        const cookieTheme = getCookie('theme');
        if (cookieTheme) return cookieTheme;

        try {
          const stored = localStorage.getItem('theme-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const localTheme = parsed.state?.theme;
            if (VALID_THEMES.includes(localTheme)) {
              return localTheme;
            }
          }
        } catch (e) {
          // Ignore localStorage errors - don't expose to console
        }

        return LIGHT_THEME;
      }

      // Resolve theme to light/dark
      function resolveTheme(theme) {
        if (theme === SYSTEM_THEME) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme === DARK_THEME ? 'dark' : 'light';
      }

      // Apply theme securely
      const theme = getStoredTheme();
      const resolvedTheme = resolveTheme(theme);

      // Secure DOM manipulation - only set expected values
      const root = document.documentElement;
      if (resolvedTheme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        root.classList.remove('light');
        root.classList.add('dark');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
        root.classList.add('light');
      }

      // Secure global variable - only expected data
      window.__THEME_DATA__ = {
        theme: theme,
        resolvedTheme: resolvedTheme,
        source: getCookie('theme') ? 'cookie' : 'localStorage'
      };
      } catch (e) {
        const root = document.documentElement;
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
        root.classList.add('light');
        window.__THEME_DATA__ = {
          theme: 'light',
          resolvedTheme: 'light',
          source: 'fallback'
        };
      }
    })();
  `;

  return (
    <script
      id="theme-init"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: initThemeScript,
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