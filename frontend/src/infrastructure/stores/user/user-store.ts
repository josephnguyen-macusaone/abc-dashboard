import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, UserRole } from '@/domain/entities/user-entity';
import { userApi } from '@/infrastructure/api/users';
import { getErrorMessage } from '@/infrastructure/api/core/errors';
import logger from '@/shared/helpers/logger';
import { SortBy, SortOrder } from '@/types';

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

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  managerId?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role?: UserRole;
  phone?: string;
  isActive?: boolean;
  managerId?: string;
}

interface UserStoreState {
  // List state
  users: User[];
  filters: UserFilters;
  pagination: PaginationState;
  selectedUsers: string[];
  listLoading: boolean;
  listError: string | null;

  // Stats state
  stats: UserStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Form state
  currentUser: User | null;
  formLoading: boolean;
  formError: string | null;

  // Actions
  // List actions
  fetchUsers: (params?: Partial<UserFilters & { page?: number; limit?: number }>) => Promise<void>;
  setFilters: (filters: Partial<UserFilters>) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setSelectedUsers: (userIds: string[]) => void;
  clearListError: () => void;
  resetList: () => void;

  // Stats actions
  fetchStats: () => Promise<void>;
  clearStatsError: () => void;
  resetStats: () => void;

  // Form actions
  fetchUser: (id: string) => Promise<User | null>;
  createUser: (userData: CreateUserRequest) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  clearFormError: () => void;
  resetForm: () => void;

  // Combined actions
  clearAllErrors: () => void;
  reset: () => void;
}

export const useUserStore = create<UserStoreState>()(
  devtools(
    persist(
      (set, get) => {
        const storeLogger = logger.createChild({
          component: 'UserStore',
        });

        return {
          // Initial state
          users: [],
          filters: {},
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          selectedUsers: [],
          listLoading: false,
          listError: null,

          stats: null,
          statsLoading: false,
          statsError: null,

          currentUser: null,
          formLoading: false,
          formError: null,

          // List actions
          fetchUsers: async (params = {}) => {
            const currentState = get();

            if (currentState.listLoading) {
              return;
            }

            try {
              set({ listLoading: true, listError: null });

              const currentFilters = currentState.filters;
              const currentPagination = currentState.pagination;

              const queryParams = {
                ...currentFilters,
                page: params.page ?? currentPagination.page,
                limit: params.limit ?? currentPagination.limit,
                ...params,
              };

              // Clean undefined values
              Object.keys(queryParams).forEach(key => {
                if (queryParams[key as keyof typeof queryParams] === undefined) {
                  delete queryParams[key as keyof typeof queryParams];
                }
              });

              // Handle array values for API
              const apiParams = {
                ...queryParams,
                role: Array.isArray(queryParams.role) ? queryParams.role.join(',') : queryParams.role,
                isActive: Array.isArray(queryParams.isActive)
                  ? queryParams.isActive.map(val => String(val))
                  : queryParams.isActive !== undefined
                    ? String(queryParams.isActive)
                    : undefined,
                sortBy: queryParams.sortBy as SortBy,
                sortOrder: queryParams.sortOrder as SortOrder,
              };

              const response = await userApi.getUsers(apiParams);

              if (!response.users) {
                throw new Error('Get users response missing data');
              }

              const users = response.users.map(userData => User.fromObject(userData as unknown as Record<string, unknown>));

              // Merge API pagination with our required total field
              const apiPagination = response.pagination || {
                page: apiParams.page || 1,
                limit: apiParams.limit || 20,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
              };

              set({
                users,
                pagination: {
                  page: apiPagination.page,
                  limit: apiPagination.limit,
                  total: response.stats?.total || users.length,
                  totalPages: apiPagination.totalPages
                },
                stats: response.stats || null,
                listLoading: false
              });
            } catch (error) {
              const errorMessage = getErrorMessage(error);
              set({ listError: errorMessage, listLoading: false });
              storeLogger.error('Failed to fetch users', { error: errorMessage });
              throw error;
            }
          },

          setFilters: (newFilters) => {
            set((state) => ({
              filters: { ...state.filters, ...newFilters }
            }));
          },

          setPagination: (newPagination) => {
            set((state) => ({
              pagination: { ...state.pagination, ...newPagination }
            }));
          },

          setSelectedUsers: (userIds) => set({ selectedUsers: userIds }),

          clearListError: () => set({ listError: null }),

          resetList: () => set({
            users: [],
            filters: {},
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            selectedUsers: [],
            listLoading: false,
            listError: null
          }),

          // Stats actions
          fetchStats: async () => {
            const currentState = get();
            if (currentState.statsLoading) {
              storeLogger.warn('Fetch stats already in progress, skipping duplicate call');
              return;
            }

            try {
              set({ statsLoading: true, statsError: null });

              // Use the list API with minimal data to get stats efficiently
              const response = await userApi.getUsers({ limit: 1 });

              if (!response.stats) {
                throw new Error('Stats response missing data');
              }

              set({
                stats: response.stats,
                statsLoading: false
              });
            } catch (error) {
              const errorMessage = getErrorMessage(error);
              set({ statsError: errorMessage, statsLoading: false });
              storeLogger.error('Failed to fetch user stats', { error: errorMessage });
              throw error;
            }
          },

          clearStatsError: () => set({ statsError: null }),

          resetStats: () => set({
            stats: null,
            statsLoading: false,
            statsError: null
          }),

          // Form actions
          fetchUser: async (id) => {
            try {
              set({ formLoading: true, formError: null });

              const response = await userApi.getUser(id);
              const user = User.fromObject(response as unknown as Record<string, unknown>);

              set({ currentUser: user, formLoading: false });
              return user;
            } catch (error) {
              const errorMessage = getErrorMessage(error);
              set({ formError: errorMessage, formLoading: false });
              storeLogger.error('Failed to fetch user', { userId: id, error: errorMessage });
              throw error;
            }
          },

          createUser: async (userData) => {
            try {
              set({ formLoading: true, formError: null });

              const response = await userApi.createUser(userData);
              const user = User.fromObject(response as unknown as Record<string, unknown>);

              set({ currentUser: user, formLoading: false });

              // Refresh the user list to include the new user
              get().fetchUsers();

              return user;
            } catch (error) {
              const errorMessage = getErrorMessage(error);
              set({ formError: errorMessage, formLoading: false });
              storeLogger.error('Failed to create user', { error: errorMessage });
              throw error;
            }
          },

          updateUser: async (id, userData) => {
            try {
              set({ formLoading: true, formError: null });

              const response = await userApi.updateUser(id, userData);
              const user = User.fromObject(response as unknown as Record<string, unknown>);

              set({ currentUser: user, formLoading: false });

              // Refresh the user list to reflect changes
              get().fetchUsers();

              return user;
            } catch (error) {
              const errorMessage = getErrorMessage(error);
              set({ formError: errorMessage, formLoading: false });
              storeLogger.error('Failed to update user', { userId: id, error: errorMessage });
              throw error;
            }
          },

          deleteUser: async (id) => {
            try {
              set({ formLoading: true, formError: null });

              await userApi.deleteUser(id);

              set({ formLoading: false });

              // Refresh the user list to remove the deleted user
              get().fetchUsers();

              // Clear current user if it was the deleted one
              const currentUser = get().currentUser;
              if (currentUser?.id === id) {
                set({ currentUser: null });
              }
            } catch (error) {
              const errorMessage = getErrorMessage(error);
              set({ formError: errorMessage, formLoading: false });
              storeLogger.error('Failed to delete user', { userId: id, error: errorMessage });
              throw error;
            }
          },

          clearFormError: () => set({ formError: null }),

          resetForm: () => set({
            currentUser: null,
            formLoading: false,
            formError: null
          }),

          // Combined actions
          clearAllErrors: () => set({
            listError: null,
            statsError: null,
            formError: null
          }),

          reset: () => {
            get().resetList();
            get().resetStats();
            get().resetForm();
          },
        };
      },
      {
        name: 'user-store',
        partialize: (state) => ({
          filters: state.filters,
          pagination: state.pagination,
          selectedUsers: state.selectedUsers,
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

// Types are exported above for backward compatibility