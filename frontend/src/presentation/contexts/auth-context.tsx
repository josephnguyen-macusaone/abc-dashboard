'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useErrorHandler } from './error-context';
import { User } from '@/domain/entities/user-entity';

/**
 * Auth Context Type
 * Defines the contract for the auth context
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  handleUpdateProfile: (updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>) => Promise<User>;
  handleChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const { handleAuthError } = useErrorHandler();

  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    initialize,
    login,
    logout,
    updateProfile,
    changePassword
  } = useAuthStore();

  // Initialize auth state on mount (client-side only)
  useEffect(() => {
    // Only initialize if we don't already have auth data (from SSR/persistence)
    if (typeof window !== 'undefined' && !user && !token) {
      initialize();
    } else if (typeof window !== 'undefined') {
      // If we have persisted data, just ensure isLoading is false
      useAuthStore.setState({ isLoading: false });
    }
  }, [initialize, user, token]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // Success toast is now handled by the login form component
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || '';
      if (!errorMessage.includes('verify your email') && !errorMessage.includes('Check your email')) {
        handleAuthError(error);
      }
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Success toast is now handled by the component using toast.promise
    } catch (error) {
      handleAuthError(error);
      throw error;
    }
  };

  const handleUpdateProfile = async (updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>) => {
    try {
      return await updateProfile(updates);
    } catch (error: unknown) {
      handleAuthError(error);
      throw error;
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await changePassword(currentPassword, newPassword);
    } catch (error: unknown) {
      handleAuthError(error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login: handleLogin,
    logout: handleLogout,
    updateProfile,
    changePassword,
    isLoading,
    isAuthenticated,
    handleUpdateProfile,
    handleChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
