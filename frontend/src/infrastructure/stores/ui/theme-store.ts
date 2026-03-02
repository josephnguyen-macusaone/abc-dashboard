import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { THEMES } from '@/shared/constants';
import {
  saveTheme,
  type ThemeType,
  type ResolvedTheme,
  type ThemeData,
} from '@/shared/helpers/theme-utils';

export type { ThemeType, ResolvedTheme };

interface ThemeState {
  theme: ThemeType;
  actualTheme: ResolvedTheme;
  isHydrated: boolean;
  source: ThemeData['source'];

  setTheme: (theme: ThemeType) => void;
  setResolvedTheme: (resolved: ResolvedTheme) => void;
  setHydrated: (value: boolean) => void;
  /** Sync full state from getThemeData() (used by hydration component). */
  syncFromThemeData: (data: ThemeData) => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        theme: THEMES.LIGHT,
        actualTheme: 'light',
        isHydrated: false,
        source: 'default',

        setTheme: (newTheme) => {
          const resolved: ResolvedTheme =
            newTheme === THEMES.SYSTEM && typeof window !== 'undefined'
              ? window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
              : newTheme === THEMES.DARK
                ? 'dark'
                : 'light';
          set({ theme: newTheme, actualTheme: resolved, source: 'localStorage' });
          saveTheme(newTheme);
        },

        setResolvedTheme: (resolved) => {
          set({ actualTheme: resolved, source: 'system' });
        },

        setHydrated: (value) => {
          set({ isHydrated: value });
        },

        syncFromThemeData: (data) => {
          set({
            theme: data.theme,
            actualTheme: data.resolvedTheme,
            source: data.source,
          });
        },
      }),
      {
        name: 'theme-storage',
        partialize: (s) => ({ theme: s.theme }),
      }
    ),
    { name: 'theme-store' }
  )
);
