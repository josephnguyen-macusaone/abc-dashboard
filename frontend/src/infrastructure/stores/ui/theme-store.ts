import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { THEMES } from '@/shared/constants';

interface ThemeState {
  // State
  theme: (typeof THEMES)[keyof typeof THEMES];
  actualTheme: 'light' | 'dark'; // The resolved theme (light or dark)

  // Actions
  setTheme: (theme: (typeof THEMES)[keyof typeof THEMES]) => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state - default to light theme
        theme: THEMES.LIGHT,
        actualTheme: 'light',

        // Initialize theme - persist middleware handles loading from storage
        initialize: () => {
          // Apply the current theme to DOM on initialization
          const currentState = get();
          const root = document.documentElement;
          root.classList.remove('light', 'dark');

          // Apply theme class based on current state
          if (currentState.actualTheme === 'dark') {
            root.classList.add('dark');
          }
          // Light theme uses default :root variables (no class needed)
        },

          setTheme: (newTheme: (typeof THEMES)[keyof typeof THEMES]) => {
          let resolvedTheme: 'light' | 'dark' = 'light'; // Default to light

          if (newTheme === THEMES.SYSTEM) {
            // Follow system preference when system theme is selected
            resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          } else {
            resolvedTheme = newTheme as 'light' | 'dark';
          }

          set({ theme: newTheme, actualTheme: resolvedTheme });

          // Apply theme to DOM
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          if (resolvedTheme === 'dark') {
            root.classList.add('dark');
          }
          // For light theme, rely on default :root variables (no class needed)

          // Persist middleware handles storage automatically
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
