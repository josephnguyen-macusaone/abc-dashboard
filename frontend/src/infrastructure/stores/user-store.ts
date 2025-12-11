import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User, UserRole } from '@/domain/entities/user-entity';
import { userApi } from '@/infrastructure/api/users';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  managedBy?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResponse {
  users: User[];
  pagination: PaginationState;
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

interface UserState {
  // State
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  filters: UserFilters;
  pagination: PaginationState;
  selectedUsers: string[];

  // Actions
  fetchUsers: (params?: Partial<UserFilters & { page?: number; limit?: number }>) => Promise<void>;
  fetchUser: (id: string) => Promise<User | null>;
  createUser: (userData: CreateUserRequest) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  reassignStaff: (staffId: string, managerId: string) => Promise<User>;
  getUserStats: () => Promise<any>;
  setFilters: (filters: UserFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setSelectedUsers: (userIds: string[]) => void;
  clearError: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => {
      const storeLogger = logger.createChild({
        component: 'UserStore',
      });

      return {
        // Initial state
        users: [],
        currentUser: null,
        loading: false,
        error: null,
        filters: {},
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        selectedUsers: [],

        fetchUsers: async (params = {}) => {
          try {
            set({ loading: true, error: null });

            const currentFilters = get().filters;
            const currentPagination = get().pagination;

            const queryParams = {
              ...currentFilters,
              ...currentPagination,
              ...params,
            };

            const response = await userApi.getUsers(queryParams);

            // Convert plain objects to User entities
            const users = response.users.map(userData => User.fromObject(userData));

            set({
              users,
              pagination: response.pagination,
              loading: false
            });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch users', { error: errorMessage });
            throw error;
          }
        },

        fetchUser: async (id: string) => {
          try {
            set({ loading: true, error: null });

            const userData = await userApi.getUser(id);
            const user = User.fromObject(userData);

            set({ currentUser: user, loading: false });

            return user;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch user', { userId: id, error: errorMessage });
            throw error;
          }
        },

        createUser: async (userData: CreateUserRequest) => {
          try {
            set({ loading: true, error: null });

            const response = await userApi.createUser({
              username: userData.username,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              phone: userData.phone,
              managerId: userData.managerId,
            });

            const newUser = User.fromObject(response.user);

            // Add to users list if we're on the current page
            set(state => ({
              users: [...state.users, newUser],
              loading: false
            }));

            return newUser;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to create user', { error: errorMessage });
            throw error;
          }
        },

        updateUser: async (id: string, userData: UpdateUserRequest) => {
          try {
            set({ loading: true, error: null });

            const response = await userApi.updateUser(id, userData);
            const updatedUser = User.fromObject(response.user);

            // Update user in the list
            set(state => ({
              users: state.users.map(user =>
                user.id === id ? updatedUser : user
              ),
              currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
              loading: false
            }));

            return updatedUser;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to update user', { userId: id, error: errorMessage });
            throw error;
          }
        },

        deleteUser: async (id: string) => {
          try {
            set({ loading: true, error: null });

            await userApi.deleteUser(id);

            // Remove user from the list
            set(state => ({
              users: state.users.filter(user => user.id !== id),
              selectedUsers: state.selectedUsers.filter(userId => userId !== id),
              loading: false
            }));
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to delete user', { userId: id, error: errorMessage });
            throw error;
          }
        },

        reassignStaff: async (staffId: string, managerId: string) => {
          try {
            set({ loading: true, error: null });

            const response = await userApi.updateUser(staffId, { managerId });
            const updatedUser = User.fromObject(response.user);

            // Update user in the list
            set(state => ({
              users: state.users.map(user =>
                user.id === staffId ? updatedUser : user
              ),
              loading: false
            }));

            return updatedUser;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to reassign staff', { staffId, managerId, error: errorMessage });
            throw error;
          }
        },

        getUserStats: async () => {
          try {
            set({ loading: true, error: null });

            const stats = await userApi.getUserStats();

            set({ loading: false });

            return stats;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch user stats', { error: errorMessage });
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
          currentUser: null,
          loading: false,
          error: null,
          filters: {},
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          selectedUsers: [],
        }),
      };
    },
    {
      name: 'user-store',
    }
  )
);

// Selectors to encourage consistent derived access
export const selectUsers = (state: { users: User[] }) => state.users;
export const selectUserFilters = (state: { filters: UserFilters }) => state.filters;
export const selectUserPagination = (state: { pagination: PaginationState }) => state.pagination;
export const selectUserLoading = (state: { loading: boolean }) => state.loading;
