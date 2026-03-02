'use client';

import { useEffect, useRef } from 'react';
import { useThemeStore } from '@/infrastructure/stores/ui/theme-store';
import { THEMES } from '@/shared/constants';
import {
  getThemeData,
  applyThemeToDom,
  createSystemThemeListener,
  type ResolvedTheme,
} from '@/shared/helpers/theme-utils';

interface ThemeStoreHydrationProps {
  children: React.ReactNode;
  disableTransitionOnChange?: boolean;
}

/**
 * Hydrates theme from storage/cookie, applies theme to DOM, and subscribes to
 * store and system preference. Use this instead of ThemeProvider when using theme-store.
 */
export function ThemeStoreHydration({
  children,
  disableTransitionOnChange = false,
}: ThemeStoreHydrationProps) {
  const actualTheme = useThemeStore((s) => s.actualTheme);
  const theme = useThemeStore((s) => s.theme);
  const syncFromThemeData = useThemeStore((s) => s.syncFromThemeData);
  const setResolvedTheme = useThemeStore((s) => s.setResolvedTheme);
  const setHydrated = useThemeStore((s) => s.setHydrated);
  const appliedRef = useRef<ResolvedTheme | null>(null);

  // On mount: sync store from getThemeData(), apply DOM, mark hydrated
  useEffect(() => {
    const data = getThemeData();
    syncFromThemeData(data);
    applyThemeToDom(data.resolvedTheme, { disableTransitionOnChange });
    appliedRef.current = data.resolvedTheme;
    setHydrated(true);
  }, [syncFromThemeData, setHydrated, disableTransitionOnChange]);

  // Whenever actualTheme changes (from setTheme or setResolvedTheme), apply to DOM
  useEffect(() => {
    if (appliedRef.current === actualTheme) return;
    applyThemeToDom(actualTheme, { disableTransitionOnChange });
    appliedRef.current = actualTheme;
  }, [actualTheme, disableTransitionOnChange]);

  // When theme is SYSTEM, listen for system preference changes
  useEffect(() => {
    if (theme !== THEMES.SYSTEM) return;

    const cleanup = createSystemThemeListener((resolved) => {
      setResolvedTheme(resolved);
      applyThemeToDom(resolved, { disableTransitionOnChange });
      appliedRef.current = resolved;
    });

    return cleanup;
  }, [theme, setResolvedTheme, disableTransitionOnChange]);

  return <>{children}</>;
}
