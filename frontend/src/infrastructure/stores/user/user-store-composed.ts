import { useUserListStore } from './user-list-store';
import { useUserStatsStore } from './user-stats-store';
import { useUserFormStore } from './user-form-store';

// Composed user store that combines all user-related stores
export const useUserStore = () => {
  const listStore = useUserListStore();
  const statsStore = useUserStatsStore();
  const formStore = useUserFormStore();

  return {
    // List operations
    users: listStore.users,
    userFilters: listStore.filters,
    userPagination: listStore.pagination,
    selectedUsers: listStore.selectedUsers,
    usersLoading: listStore.loading,
    usersError: listStore.error,

    // Stats from list store (more efficient since user list API already provides them)
    userStats: listStore.stats,
    statsLoading: listStore.loading,
    statsError: listStore.error,

    // Form operations
    currentUser: formStore.currentUser,
    formLoading: formStore.loading,
    formError: formStore.error,

    // Combined loading state
    isLoading: listStore.loading || statsStore.loading || formStore.loading,

    // Combined error state (prioritize form errors, then list errors, then stats errors)
    error: formStore.error || listStore.error || statsStore.error,

    // Actions
    fetchUsers: listStore.fetchUsers,
    setUserFilters: listStore.setFilters,
    setUserPagination: listStore.setPagination,
    setSelectedUsers: listStore.setSelectedUsers,
    fetchUserStats: statsStore.fetchStats,
    fetchUser: formStore.fetchUser,
    createUser: formStore.createUser,
    updateUser: formStore.updateUser,
    deleteUser: formStore.deleteUser,
    reassignStaff: formStore.reassignStaff,

    // Clear errors
    clearUserListError: listStore.clearError,
    clearUserStatsError: statsStore.clearError,
    clearUserFormError: formStore.clearError,

    // Reset
    resetUserList: listStore.reset,
    resetUserStats: statsStore.reset,
    resetUserForm: formStore.reset,
  };
};

// Re-export individual stores for direct access when needed
export { useUserListStore, useUserStatsStore, useUserFormStore };

// Re-export types
export type { UserFilters, PaginationState, UserStats } from './user-list-store';
export type { CreateUserRequest, UpdateUserRequest } from './user-form-store';