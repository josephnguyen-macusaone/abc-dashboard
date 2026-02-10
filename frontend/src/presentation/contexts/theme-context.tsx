'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { THEMES, THEME_CONFIG } from '@/shared/constants';
import {
  getThemeData,
  saveTheme,
  resolveTheme,
  createSystemThemeListener,
  type ThemeData
} from '@/shared/helpers/theme-utils';

// Types for better type safety
export type ThemeType = (typeof THEMES)[keyof typeof THEMES];
export type ResolvedTheme = 'light' | 'dark';

/**
 * Theme Context Type
 * Enhanced with SSR support and better type safety
 */
interface ThemeContextType {
  // Current theme state
  theme: ThemeType;
  resolvedTheme: ResolvedTheme;

  // Actions
  setTheme: (theme: ThemeType) => void;

  // Metadata
  isHydrated: boolean;
  source: ThemeData['source'];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Theme Provider Props
 */
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeType;
  storageKey?: string;
  attribute?: string;
  disableTransitionOnChange?: boolean;
}

/**
 * Enhanced Theme Provider with SSR Support
 *
 * Features:
 * - SSR-compatible theme detection
 * - Cookie + localStorage persistence
 * - System theme detection with listeners
 * - Zero theme flash
 * - Hydration-safe
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = THEMES.LIGHT,
  storageKey = 'theme-storage',
  attribute = THEME_CONFIG.ATTRIBUTE,
  disableTransitionOnChange = false,
}) => {
  // Initialize with theme data from script or utilities
  const [themeData, setThemeData] = useState<ThemeData>(() => {
    // Try to get theme from pre-hydration script first
    if (typeof window !== 'undefined' && window.__THEME_DATA__) {
      try {
        return {
          theme: window.__THEME_DATA__.theme as ThemeType,
          resolvedTheme: window.__THEME_DATA__.resolvedTheme as ResolvedTheme,
          source: window.__THEME_DATA__.source as ThemeData['source'],
        };
      } catch (e) {
        // Ignore script data errors and use utility function
      }
    }

    // Fallback to utility function
    return getThemeData();
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme to DOM
  const applyTheme = useCallback((resolvedTheme: ResolvedTheme) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (disableTransitionOnChange) {
      // Disable all transitions during theme change, then re-enable after
      const css = document.createElement('style');
      css.textContent = '*, *::before, *::after { transition: none !important; }';
      css.setAttribute('data-theme-transition', '');
      document.head.appendChild(css);
    } else {
      // Enable theme transition: add class so CSS transitions run when we swap theme
      root.classList.add('theme-transition');
    }

    // Remove existing theme attributes/classes and apply new theme
    root.removeAttribute(attribute);
    root.classList.remove('light', 'dark');
    root.setAttribute(attribute, resolvedTheme);
    root.classList.add(resolvedTheme);

    // Re-enable normal behavior after transition (or immediately if transitions disabled)
    transitionTimeoutRef.current = setTimeout(() => {
      if (disableTransitionOnChange) {
        const existing = document.querySelector('[data-theme-transition]');
        if (existing) existing.remove();
      } else {
        root.classList.remove('theme-transition');
      }
      transitionTimeoutRef.current = null;
    }, THEME_CONFIG.TRANSITION_DURATION);
  }, [attribute, disableTransitionOnChange]);

  // Set theme function
  const setTheme = useCallback((newTheme: ThemeType) => {
    const resolvedTheme = resolveTheme(newTheme);

    // Update state
    setThemeData({
      theme: newTheme,
      resolvedTheme,
      source: 'localStorage', // User explicitly set theme
    });

    // Save to storage
    saveTheme(newTheme);

    // Apply to DOM
    applyTheme(resolvedTheme);
  }, [applyTheme]);

  // Handle system theme changes
  useEffect(() => {
    if (!isHydrated) return;

    // Only listen if current theme is system
    if (themeData.theme !== THEMES.SYSTEM) return;

    const cleanup = createSystemThemeListener((systemTheme) => {
      setThemeData(prev => ({
        ...prev,
        resolvedTheme: systemTheme,
        source: 'system',
      }));
      applyTheme(systemTheme);
    });

    return cleanup;
  }, [themeData.theme, isHydrated, applyTheme]);

  // Hydration and initial setup
  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);

    // Apply initial theme (in case it wasn't applied by the script)
    applyTheme(themeData.resolvedTheme);

    // Sync with any changes that happened during SSR
    const currentThemeData = getThemeData();
    if (
      currentThemeData.theme !== themeData.theme ||
      currentThemeData.resolvedTheme !== themeData.resolvedTheme
    ) {
      setThemeData(currentThemeData);
      applyTheme(currentThemeData.resolvedTheme);
    }
  }, [applyTheme]); // Remove themeData from deps to avoid loops

  // Cleanup transition timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, []);

  const value: ThemeContextType = {
    theme: themeData.theme,
    resolvedTheme: themeData.resolvedTheme,
    setTheme,
    isHydrated,
    source: themeData.source,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
