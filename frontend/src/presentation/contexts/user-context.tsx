'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { container } from '@/shared/di/container';
import { User, UserListParams, PaginatedUserList, UserStats, CreateUserDTO, UpdateUserDTO } from '@/application/dto/user-dto';

interface UserContextType {
  // Operations
  getUsers: (params: UserListParams) => Promise<PaginatedUserList>;
  createUser: (userData: CreateUserDTO) => Promise<User>;
  updateUser: (id: string, updates: UpdateUserDTO) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getUserStats: () => Promise<UserStats>;

  // Loading states
  loading: {
    getUsers: boolean;
    createUser: boolean;
    updateUser: boolean;
    deleteUser: boolean;
    getUserStats: boolean;
  };

  // Errors
  error: {
    getUsers: string | null;
    createUser: string | null;
    updateUser: string | null;
    deleteUser: string | null;
    getUserStats: string | null;
  };

  // Utility functions
  clearError: (operation: keyof UserContextType['error']) => void;
  clearAllErrors: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const userManagementService = container.userManagementService;

  // Loading states
  const [loadingStates, setLoadingStates] = React.useState({
    getUsers: false,
    createUser: false,
    updateUser: false,
    deleteUser: false,
    getUserStats: false,
  });

  // Error states
  const [errorStates, setErrorStates] = React.useState({
    getUsers: null as string | null,
    createUser: null as string | null,
    updateUser: null as string | null,
    deleteUser: null as string | null,
    getUserStats: null as string | null,
  });

  const executeWithErrorHandling = useCallback(async <T = any>(
    operation: () => Promise<T>,
    operationName: keyof typeof loadingStates,
    errorMessage: string
  ): Promise<T> => {
    setLoadingStates(prev => ({ ...prev, [operationName]: true }));
    setErrorStates(prev => ({ ...prev, [operationName]: null }));

    try {
      const result = await operation();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      setErrorStates(prev => ({ ...prev, [operationName]: message }));
      throw err;
    } finally {
      setLoadingStates(prev => ({ ...prev, [operationName]: false }));
    }
  }, []);

  const getUsers = useCallback(async (params: UserListParams): Promise<PaginatedUserList> => {
    return executeWithErrorHandling(
      () => userManagementService.getUsers(params),
      'getUsers',
      'Failed to load users'
    );
  }, [executeWithErrorHandling]);

  const createUser = useCallback(async (userData: CreateUserDTO): Promise<User> => {
    return executeWithErrorHandling(
      () => userManagementService.createUser(userData),
      'createUser',
      'Failed to create user'
    );
  }, [executeWithErrorHandling]);

  const updateUser = useCallback(async (id: string, updates: UpdateUserDTO): Promise<User> => {
    return executeWithErrorHandling(
      () => userManagementService.updateUser(id, updates),
      'updateUser',
      'Failed to update user'
    );
  }, [executeWithErrorHandling]);

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    return executeWithErrorHandling(
      () => userManagementService.deleteUser(id),
      'deleteUser',
      'Failed to delete user'
    );
  }, [executeWithErrorHandling]);

  const getUserStats = useCallback(async (): Promise<UserStats> => {
    return executeWithErrorHandling(
      () => userManagementService.getUserStats(),
      'getUserStats',
      'Failed to load user statistics'
    );
  }, [executeWithErrorHandling]);

  const clearError = useCallback((operation: keyof UserContextType['error']) => {
    setErrorStates(prev => ({ ...prev, [operation]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrorStates({
      getUsers: null,
      createUser: null,
      updateUser: null,
      deleteUser: null,
      getUserStats: null,
    });
  }, []);

  const value: UserContextType = {
    // Operations
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,

    // Loading states
    loading: loadingStates,

    // Errors
    error: errorStates,

    // Utility functions
    clearError,
    clearAllErrors,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};