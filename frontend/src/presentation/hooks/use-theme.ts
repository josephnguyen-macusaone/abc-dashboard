import { useTheme as useThemeContext } from '@/presentation/contexts/theme-context';
import { useCallback, useMemo } from 'react';
import { THEMES } from '@/shared/constants';
import type { ThemeType } from '@/presentation/contexts/theme-context';

/**
 * Enhanced theme hook with performance optimizations and convenience methods
 */
export function useTheme() {
  const context = useThemeContext();

  // Memoized computed values to prevent unnecessary re-renders
  const themeState = useMemo(() => ({
    isLight: context.resolvedTheme === 'light',
    isDark: context.resolvedTheme === 'dark',
    isSystem: context.theme === THEMES.SYSTEM,
    isLightTheme: context.theme === THEMES.LIGHT,
    isDarkTheme: context.theme === THEMES.DARK,
  }), [context.resolvedTheme, context.theme]);

  // Optimized theme setters
  const setLightTheme = useCallback(() => {
    context.setTheme(THEMES.LIGHT);
  }, [context.setTheme]);

  const setDarkTheme = useCallback(() => {
    context.setTheme(THEMES.DARK);
  }, [context.setTheme]);

  const setSystemTheme = useCallback(() => {
    context.setTheme(THEMES.SYSTEM);
  }, [context.setTheme]);

  const toggleTheme = useCallback(() => {
    if (context.theme === THEMES.SYSTEM) {
      // If system theme, toggle to opposite of resolved theme
      context.setTheme(context.resolvedTheme === 'light' ? THEMES.DARK : THEMES.LIGHT);
    } else {
      // Toggle between light and dark
      context.setTheme(context.theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
    }
  }, [context.theme, context.resolvedTheme, context.setTheme]);

  return {
    // Original context values
    ...context,

    // Computed boolean states
    ...themeState,

    // Convenience methods
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    toggleTheme,

    // Utility methods
    getThemeLabel: () => {
      switch (context.theme) {
        case THEMES.LIGHT: return 'Light';
        case THEMES.DARK: return 'Dark';
        case THEMES.SYSTEM: return 'System';
        default: return 'Unknown';
      }
    },

    getResolvedThemeLabel: () => {
      return context.resolvedTheme === 'dark' ? 'Dark' : 'Light';
    },
  };
}

/**
 * Hook for theme-aware conditional rendering
 * Prevents hydration mismatches by only rendering after hydration
 */
export function useThemeAware() {
  const { isHydrated, resolvedTheme } = useTheme();

  return {
    isHydrated,
    resolvedTheme,
    // Only render theme-dependent content after hydration
    renderWhenHydrated: (children: React.ReactNode) => isHydrated ? children : null,
    // Render with theme class applied
    withThemeClass: (className: string) =>
      isHydrated ? `${className} theme-${resolvedTheme}` : className,
  };
}