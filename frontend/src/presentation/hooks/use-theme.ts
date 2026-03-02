import { useThemeStore } from '@/infrastructure/stores/ui/theme-store';
import { useCallback, useMemo } from 'react';
import { THEMES } from '@/shared/constants';

/**
 * Theme hook backed by Zustand theme-store. Selector-based to avoid broad re-renders.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const actualTheme = useThemeStore((s) => s.actualTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isHydrated = useThemeStore((s) => s.isHydrated);
  const source = useThemeStore((s) => s.source);

  const themeState = useMemo(
    () => ({
      isLight: actualTheme === 'light',
      isDark: actualTheme === 'dark',
      isSystem: theme === THEMES.SYSTEM,
      isLightTheme: theme === THEMES.LIGHT,
      isDarkTheme: theme === THEMES.DARK,
    }),
    [actualTheme, theme]
  );

  const setLightTheme = useCallback(() => setTheme(THEMES.LIGHT), [setTheme]);
  const setDarkTheme = useCallback(() => setTheme(THEMES.DARK), [setTheme]);
  const setSystemTheme = useCallback(() => setTheme(THEMES.SYSTEM), [setTheme]);

  const toggleTheme = useCallback(() => {
    if (theme === THEMES.SYSTEM) {
      setTheme(actualTheme === 'light' ? THEMES.DARK : THEMES.LIGHT);
    } else {
      setTheme(theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
    }
  }, [theme, actualTheme, setTheme]);

  return {
    theme,
    resolvedTheme: actualTheme,
    setTheme,
    isHydrated,
    source,
    ...themeState,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    toggleTheme,
    getThemeLabel: () => {
      switch (theme) {
        case THEMES.LIGHT:
          return 'Light';
        case THEMES.DARK:
          return 'Dark';
        case THEMES.SYSTEM:
          return 'System';
        default:
          return 'Unknown';
      }
    },
    getResolvedThemeLabel: () => (actualTheme === 'dark' ? 'Dark' : 'Light'),
  };
}

/**
 * Hook for theme-aware conditional rendering (avoids hydration mismatch).
 */
export function useThemeAware() {
  const isHydrated = useThemeStore((s) => s.isHydrated);
  const actualTheme = useThemeStore((s) => s.actualTheme);

  return {
    isHydrated,
    resolvedTheme: actualTheme,
    renderWhenHydrated: (children: React.ReactNode) => (isHydrated ? children : null),
    withThemeClass: (className: string) =>
      isHydrated ? `${className} theme-${actualTheme}` : className,
  };
}
