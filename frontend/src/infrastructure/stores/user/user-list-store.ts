import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User } from '@/domain/entities/user-entity';
import { userApi } from '@/infrastructure/api/users';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';

export interface UserStats {
  total: number;
  admin: number;
  manager: number;
  staff: number;
}

export interface UserFilters {
  // Search
  search?: string;
  searchField?: 'email' | 'displayName' | 'username' | 'phone';
  displayName?: string;

  // Multi-select filters
  role?: string | string[];
  isActive?: boolean | boolean[];

  // Sort
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Date ranges
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;

  // Manager filter
  managedBy?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListState {
  // State
  users: User[];
  loading: boolean;
  error: string | null;
  filters: UserFilters;
  pagination: PaginationState;
  selectedUsers: string[];
  stats: UserStats | null;

  // Actions
  fetchUsers: (params?: Partial<UserFilters & { page?: number; limit?: number }>) => Promise<void>;
  setFilters: (filters: UserFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setSelectedUsers: (userIds: string[]) => void;
  clearError: () => void;
  reset: () => void;
}

export const useUserListStore = create<UserListState>()(
  devtools(
    (set, get) => {
      const storeLogger = logger.createChild({
        component: 'UserListStore',
      });

      return {
        // Initial state
        users: [],
        loading: false,
        error: null,
        filters: {},
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        selectedUsers: [],
        stats: null,

        fetchUsers: async (params = {}) => {
          // Prevent concurrent API calls, but allow different page requests
          const currentState = get();
          if (currentState.loading) {
            const currentPage = currentState.pagination.page;
            const requestedPage = params.page ?? currentPage;
            // Allow the call if it's for a different page (navigation)
            if (requestedPage === currentPage) {
              storeLogger.warn('Fetch users already in progress for same page, skipping duplicate call');
              return;
            }
            storeLogger.info(`Allowing concurrent call for different page: ${requestedPage} (current: ${currentPage})`);
          }

          try {
            set({ loading: true, error: null });

            const currentFilters = get().filters;
            const currentPagination = get().pagination;

            // Merge current filters with new params (like license store)
            const mergedParams = {
              ...currentFilters,
              page: params.page ?? currentPagination.page,
              limit: params.limit ?? currentPagination.limit,
              ...params,
            };

            // Convert boolean values to strings for API (API expects string values)
            const queryParams: any = {
              ...mergedParams,
              // Convert isActive: boolean | boolean[] → string | string[]
              isActive: mergedParams.isActive !== undefined
                ? (Array.isArray(mergedParams.isActive)
                  ? mergedParams.isActive.map(v => String(v))
                  : String(mergedParams.isActive))
                : undefined,
            };

            // Remove undefined values from queryParams before sending to API
            Object.keys(queryParams).forEach(key => {
              if (queryParams[key] === undefined) {
                delete queryParams[key];
              }
            });

            const response = await userApi.getUsers(queryParams);

            // Convert plain objects to User entities
            const users = response.users.map(userData => User.fromObject(userData));

            // Extract stats from response
            const stats: UserStats | null = response.stats ? {
              total: response.stats.total || 0,
              admin: response.stats.admin || 0,
              manager: response.stats.manager || 0,
              staff: response.stats.staff || 0,
            } : null;

            // Store the filters that were used (like license store)
            const newFilters: UserFilters = {
              search: queryParams.search,
              searchField: queryParams.searchField,
              displayName: queryParams.displayName,
              role: queryParams.role,
              isActive: queryParams.isActive,
              sortBy: queryParams.sortBy,
              sortOrder: queryParams.sortOrder,
              createdAtFrom: queryParams.createdAtFrom,
              createdAtTo: queryParams.createdAtTo,
              updatedAtFrom: queryParams.updatedAtFrom,
              updatedAtTo: queryParams.updatedAtTo,
              lastLoginFrom: queryParams.lastLoginFrom,
              lastLoginTo: queryParams.lastLoginTo,
              managedBy: queryParams.managedBy,
            };

            // Remove undefined values
            Object.keys(newFilters).forEach(key => {
              if (newFilters[key as keyof UserFilters] === undefined) {
                delete newFilters[key as keyof UserFilters];
              }
            });

            set({
              users,
              pagination: {
                ...response.pagination,
                total: response.stats?.total ?? 0,
              },
              filters: newFilters,
              stats,
              loading: false
            });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch users', { error: errorMessage });
            throw error;
          }
        },

        setFilters: (filters: UserFilters) => {
          set({ filters });
          storeLogger.debug('Filters updated', { filters });
        },

        setPagination: (pagination: Partial<PaginationState>) => {
          set(state => ({
            pagination: { ...state.pagination, ...pagination }
          }));
        },

        setSelectedUsers: (userIds: string[]) => {
          set({ selectedUsers: userIds });
        },

        clearError: () => set({ error: null }),

        reset: () => set({
          users: [],
          loading: false,
          error: null,
          filters: {},
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          selectedUsers: [],
          stats: null,
        }),
      };
    },
    {
      name: 'user-list-store',
    }
  )
);

// Selectors for better performance
export const selectUsers = (state: { users: User[] }) => state.users;
export const selectUserFilters = (state: { filters: UserFilters }) => state.filters;
export const selectUserPagination = (state: { pagination: PaginationState }) => state.pagination;
export const selectUserStats = (state: { stats: UserStats | null }) => state.stats;
export const selectUserLoading = (state: { loading: boolean }) => state.loading;
export const selectUserError = (state: { error: string | null }) => state.error;