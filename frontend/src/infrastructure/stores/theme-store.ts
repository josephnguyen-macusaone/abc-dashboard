import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { THEMES } from '@/shared/constants';
import { STORAGE_KEYS } from '@/shared/constants';

interface ThemeState {
  // State
  theme: (typeof THEMES)[keyof typeof THEMES];
  actualTheme: 'light' | 'dark'; // The resolved theme (dark or light)

      // Actions
  setTheme: (theme: (typeof THEMES)[keyof typeof THEMES]) => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: THEMES.DARK,
        actualTheme: THEMES.DARK,

        // Initialize theme from localStorage and system preference
        initialize: () => {
          const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as (typeof THEMES)[keyof typeof THEMES];
          if (storedTheme) {
            get().setTheme(storedTheme);
          } else {
            // Check system preference if no stored theme
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
            get().setTheme(systemTheme);
          }
        },

          setTheme: (newTheme: (typeof THEMES)[keyof typeof THEMES]) => {
          let resolvedTheme: 'light' | 'dark' = THEMES.DARK; // Default to dark

          if (newTheme === THEMES.SYSTEM) {
            resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
          } else {
            resolvedTheme = newTheme;
          }

          set({ theme: newTheme, actualTheme: resolvedTheme });

          // Apply theme to DOM
          const root = document.documentElement;
          root.classList.remove(THEMES.LIGHT, THEMES.DARK);
          root.classList.add(resolvedTheme);

          // Store preference
          localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        },
      }),
      {
        name: 'theme-storage',
        partialize: (state) => ({
          theme: state.theme,
        }),
      }
    ),
    {
      name: 'theme-store',
    }
  )
);
