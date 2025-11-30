'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { THEMES } from '@/shared/constants';

interface ThemeContextType {
  theme: (typeof THEMES)[keyof typeof THEMES];
  setTheme: (theme: (typeof THEMES)[keyof typeof THEMES]) => void;
  actualTheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<(typeof THEMES)[keyof typeof THEMES]>(THEMES.LIGHT);
  const [actualTheme, setActualTheme] = useState<'dark' | 'light'>('light');

  // Initialize theme from localStorage or set default to light
  useEffect(() => {
    let initialTheme = THEMES.LIGHT; // Default to light theme
    let initialActualTheme: 'light' | 'dark' = 'light';

    const stored = localStorage.getItem('theme-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const storedTheme = parsed.state?.theme;
        if (storedTheme && Object.values(THEMES).includes(storedTheme)) {
          initialTheme = storedTheme;
          initialActualTheme = storedTheme === THEMES.DARK ? 'dark' : 'light';
        }
      } catch (error) {
        console.warn('Failed to parse theme from localStorage:', error);
        // Clear corrupted data and use default
        localStorage.removeItem('theme-storage');
      }
    }

    // If no valid stored theme, ensure light theme is stored for future visits
    if (initialTheme === THEMES.LIGHT && !stored) {
      localStorage.setItem('theme-storage', JSON.stringify({
        state: { theme: THEMES.LIGHT },
        version: 0
      }));
    }

    // Set the initial state
    setThemeState(initialTheme);
    setActualTheme(initialActualTheme);

    // Apply initial theme to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (initialActualTheme === 'dark') {
      root.classList.add('dark');
    }
  }, []);

  // Update actual theme when theme changes
  useEffect(() => {
    const resolvedTheme = theme === THEMES.SYSTEM
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (theme as 'light' | 'dark');

    setActualTheme(resolvedTheme);

    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    }

    // Store in localStorage
    localStorage.setItem('theme-storage', JSON.stringify({
      state: { theme },
      version: 0
    }));
  }, [theme]);

  const setTheme = (newTheme: (typeof THEMES)[keyof typeof THEMES]) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
