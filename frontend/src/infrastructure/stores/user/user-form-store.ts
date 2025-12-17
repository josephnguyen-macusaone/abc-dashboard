import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User, UserRole } from '@/domain/entities/user-entity';
import { userApi } from '@/infrastructure/api/users';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';

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

interface UserFormState {
  // State
  currentUser: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchUser: (id: string) => Promise<User | null>;
  createUser: (userData: CreateUserRequest) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  reassignStaff: (staffId: string, managerId: string) => Promise<User>;
  clearError: () => void;
  reset: () => void;
}

export const useUserFormStore = create<UserFormState>()(
  devtools(
    (set, get) => {
      const storeLogger = logger.createChild({
        component: 'UserFormStore',
      });

      return {
        // Initial state
        currentUser: null,
        loading: false,
        error: null,

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

            set({ loading: false });

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

            // Update current user if it's the same one being edited
            set(state => ({
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

            // Clear current user if it's the one being deleted
            set(state => ({
              currentUser: state.currentUser?.id === id ? null : state.currentUser,
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

            // Update current user if it's the same one being reassigned
            set(state => ({
              currentUser: state.currentUser?.id === staffId ? updatedUser : state.currentUser,
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

        clearError: () => set({ error: null }),

        reset: () => set({
          currentUser: null,
          loading: false,
          error: null,
        }),
      };
    },
    {
      name: 'user-form-store',
    }
  )
);

// Selectors for better performance
export const selectCurrentUser = (state: { currentUser: User | null }) => state.currentUser;
export const selectUserFormLoading = (state: { loading: boolean }) => state.loading;
export const selectUserFormError = (state: { error: string | null }) => state.error;