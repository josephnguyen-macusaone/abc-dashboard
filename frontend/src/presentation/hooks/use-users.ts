import { useState, useCallback } from 'react';
import { useUserManagementService } from './use-user-management-service';
import { User, UserListParams, PaginatedUserList, UserStats, CreateUserDTO, UpdateUserDTO } from '@/application/dto/user-dto';

/**
 * Presentation Hook: Users Management
 * React hook providing user management operations with loading states and error handling
 */
export const useUsers = () => {
  const userService = useUserManagementService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUsers = useCallback(async (params: UserListParams): Promise<PaginatedUserList | null> => {
    return executeWithErrorHandling(
      () => userService.getUsers(params),
      'Failed to load users'
    );
  }, [userService, executeWithErrorHandling]);

  const createUser = useCallback(async (userData: CreateUserDTO): Promise<User | null> => {
    return executeWithErrorHandling(
      () => userService.createUser(userData),
      'Failed to create user'
    );
  }, [userService, executeWithErrorHandling]);

  const updateUser = useCallback(async (id: string, updates: UpdateUserDTO): Promise<User | null> => {
    return executeWithErrorHandling(
      () => userService.updateUser(id, updates),
      'Failed to update user'
    );
  }, [userService, executeWithErrorHandling]);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    const result = await executeWithErrorHandling(
      () => userService.deleteUser(id),
      'Failed to delete user'
    );
    return result !== null;
  }, [userService, executeWithErrorHandling]);

  const searchUsers = useCallback(async (query: string): Promise<User[] | null> => {
    return executeWithErrorHandling(
      () => userService.searchUsers({ query }),
      'Failed to search users'
    );
  }, [userService, executeWithErrorHandling]);

  const getUserStats = useCallback(async (): Promise<UserStats | null> => {
    return executeWithErrorHandling(
      () => userService.getUserStats(),
      'Failed to load user statistics'
    );
  }, [userService, executeWithErrorHandling]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,

    // Operations
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    searchUsers,
    getUserStats,

    // Utilities
    clearError,
  };
};
