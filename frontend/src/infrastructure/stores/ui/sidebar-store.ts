import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface SidebarState {
  // State
  isCollapsed: boolean;

  // Responsive state (derived, not persisted)
  isMobile: boolean;

  // Actions
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobile: (isMobile: boolean) => void;
  resetToDefaults: () => void;

  // Getters
  getEffectiveWidth: () => number; // Returns collapsed width when collapsed, full width otherwise
}

// Constants
export const SIDEBAR_CONSTANTS = {
  DEFAULT_WIDTH: 256, // 16rem (w-64)
  COLLAPSED_WIDTH: 64, // 4rem (w-16)
  MOBILE_BREAKPOINT: 1024, // lg breakpoint
} as const;

export const useSidebarStore = create<SidebarState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isCollapsed: false,
        isMobile: false,

        // Actions
        toggleCollapsed: () => {
          set((state) => ({
            isCollapsed: !state.isCollapsed,
          }));
        },

        setCollapsed: (collapsed: boolean) => {
          set({ isCollapsed: collapsed });
        },

        setMobile: (isMobile: boolean) => {
          set({ isMobile });
        },

        resetToDefaults: () => {
          set({
            isCollapsed: false,
          });
        },

        // Getters
        getEffectiveWidth: () => {
          const state = get();
          if (state.isMobile) {
            return state.isCollapsed ? 0 : SIDEBAR_CONSTANTS.DEFAULT_WIDTH;
          }
          return state.isCollapsed ? SIDEBAR_CONSTANTS.COLLAPSED_WIDTH : SIDEBAR_CONSTANTS.DEFAULT_WIDTH;
        },
      }),
      {
        name: 'sidebar-storage',
        partialize: (state) => ({
          isCollapsed: state.isCollapsed,
        }),
        // Skip hydration on server side
        skipHydration: typeof window === 'undefined',
      }
    ),
    {
      name: 'sidebar-store',
    }
  )
);