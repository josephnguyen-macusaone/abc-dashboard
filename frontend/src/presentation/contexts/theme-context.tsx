'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { THEMES } from '@/shared/constants';

/**
 * Theme Context Type
 * Defines the contract for the theme context
 */
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

// Helper function to get initial theme synchronously
const getInitialTheme = (): { theme: (typeof THEMES)[keyof typeof THEMES]; actualTheme: 'dark' | 'light' } => {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return { theme: THEMES.LIGHT, actualTheme: 'light' };
  }

  let initialTheme: (typeof THEMES)[keyof typeof THEMES] = THEMES.LIGHT;
  let initialActualTheme: 'light' | 'dark' = 'light';

  const stored = localStorage.getItem('theme-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { theme?: string } };
      const storedTheme = parsed.state?.theme;
      const themeValues = Object.values(THEMES) as string[];
      if (storedTheme && themeValues.includes(storedTheme)) {
        initialTheme = storedTheme as (typeof THEMES)[keyof typeof THEMES];
        initialActualTheme = storedTheme === THEMES.DARK ? 'dark' : 'light';
      }
    } catch {
      // Clear corrupted data and use default
      localStorage.removeItem('theme-storage');
    }
  }

  return { theme: initialTheme, actualTheme: initialActualTheme };
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
}) => {
  // Initialize theme synchronously to prevent flash
  const initialThemeData = getInitialTheme();
  const [theme, setThemeState] = useState<(typeof THEMES)[keyof typeof THEMES]>(initialThemeData.theme);
  const [actualTheme, setActualTheme] = useState<'dark' | 'light'>(initialThemeData.actualTheme);

  // Apply initial theme to document immediately (client-side only)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (initialThemeData.actualTheme === 'dark') {
      root.classList.add('dark');
    }
  }, []);

  // Initialize theme storage if not present
  useEffect(() => {
    const stored = localStorage.getItem('theme-storage');
    if (!stored) {
      localStorage.setItem('theme-storage', JSON.stringify({
        state: { theme: THEMES.LIGHT },
        version: 0
      }));
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
