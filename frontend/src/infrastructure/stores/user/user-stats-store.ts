import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { userApi } from '@/infrastructure/api/users';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';

export interface UserStats {
  total: number;
  admin: number;
  manager: number;
  staff: number;
}

interface UserStatsState {
  // State
  stats: UserStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useUserStatsStore = create<UserStatsState>()(
  devtools(
    (set, get) => {
      const storeLogger = logger.createChild({
        component: 'UserStatsStore',
      });

      return {
        // Initial state
        stats: null,
        loading: false,
        error: null,

        fetchStats: async () => {
          const currentState = get();
          if (currentState.loading) {
            storeLogger.warn('Fetch stats already in progress, skipping duplicate call');
            return;
          }

          try {
            set({ loading: true, error: null });

            const response = await userApi.getUsers({ limit: 1 }); // Get minimal data for stats

            const stats: UserStats = {
              total: response.stats?.total || 0,
              admin: response.stats?.admin || 0,
              manager: response.stats?.manager || 0,
              staff: response.stats?.staff || 0,
            };

            set({ stats, loading: false });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch user stats', { error: errorMessage });
            throw error;
          }
        },

        clearError: () => set({ error: null }),

        reset: () => set({
          stats: null,
          loading: false,
          error: null,
        }),
      };
    },
    {
      name: 'user-stats-store',
    }
  )
);

// Selectors for better performance
export const selectUserStats = (state: { stats: UserStats | null }) => state.stats;
export const selectUserStatsLoading = (state: { loading: boolean }) => state.loading;
export const selectUserStatsError = (state: { error: string | null }) => state.error;