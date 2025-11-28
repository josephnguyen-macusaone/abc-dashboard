'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useThemeStore } from '@/infrastructure/stores/theme-store';
import { APP_CONFIG, THEMES } from '@/shared/constants';

interface ThemeContextType {
  theme: (typeof THEMES)[keyof typeof THEMES];
  setTheme: (theme: (typeof THEMES)[keyof typeof THEMES]) => void;
  actualTheme: 'dark' | 'light' | 'system';
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
  defaultTheme?: (typeof THEMES)[keyof typeof THEMES];
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = APP_CONFIG.DEFAULT_THEME,
}) => {
  const { theme, actualTheme, setTheme, initialize } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
