'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { container } from '@/shared/di/container';
import { User, UserListParams, PaginatedUserList, UserStats, CreateUserDTO, UpdateUserDTO } from '@/application/dto/user-dto';


/**
 * User Context Type
 * Defines the contract for the user context
 */
interface UserContextType {
  // Operations
  getUsers: (params: UserListParams) => Promise<PaginatedUserList>;
  createUser: (userData: CreateUserDTO) => Promise<User>;
  updateUser: (id: string, updates: UpdateUserDTO) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  // Loading states
  loading: {
    getUsers: boolean;
    createUser: boolean;
    updateUser: boolean;
    deleteUser: boolean;
  };

  // Errors
  error: {
    getUsers: string | null;
    createUser: string | null;
    updateUser: string | null;
    deleteUser: string | null;
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
  const userService = container.userService;

  // Loading states
  const [loadingStates, setLoadingStates] = React.useState({
    getUsers: false,
    createUser: false,
    updateUser: false,
    deleteUser: false,
  });

  // Error states
  const [errorStates, setErrorStates] = React.useState({
    getUsers: null as string | null,
    createUser: null as string | null,
    updateUser: null as string | null,
    deleteUser: null as string | null,
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
      () => userService.getUsers(params),
      'getUsers',
      'Failed to load users'
    );
  }, [executeWithErrorHandling]);

  const createUser = useCallback(async (userData: CreateUserDTO): Promise<User> => {
    return executeWithErrorHandling(
      () => userService.createUser(userData),
      'createUser',
      'Failed to create user'
    );
  }, [executeWithErrorHandling]);

  const updateUser = useCallback(async (id: string, updates: UpdateUserDTO): Promise<User> => {
    return executeWithErrorHandling(
      () => userService.updateUser(id, updates),
      'updateUser',
      'Failed to update user'
    );
  }, [executeWithErrorHandling]);

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    return executeWithErrorHandling(
      () => userService.deleteUser(id),
      'deleteUser',
      'Failed to delete user'
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
    });
  }, []);

  const value: UserContextType = {
    // Operations
    getUsers,
    createUser,
    updateUser,
    deleteUser,

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