'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { useToast } from './toast-context';
import { useErrorHandler } from '@/presentation/contexts/error-context';
import { User } from '@/domain/entities/user-entity';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (email: string,  token: string) => Promise<{ user: User; message: string }>;
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
  handleVerifyEmail: (email: string, token: string) => Promise<{ user: User; message: string }>;
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
  const toast = useToast();
  const { handleAuthError } = useErrorHandler();

  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    initialize,
    login,
    register,
    logout,
    verifyEmail,
    updateProfile,
    changePassword
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || '';
      if (!errorMessage.includes('verify your email') && !errorMessage.includes('Check your email')) {
        handleAuthError(error);
      }
      throw error;
    }
  };

  const handleRegister = async (username: string, firstName: string, lastName: string, email: string, password: string, role?: string) => {
    try {
      await register(username, firstName, lastName, email, password, role);
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  const handleVerifyEmail = async (email: string, token: string) => {
    try {
      return await verifyEmail(email, token);
    } catch (error: any) {
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
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await changePassword(currentPassword, newPassword);
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    verifyEmail,
    updateProfile,
    changePassword,
    isLoading,
    isAuthenticated,
    handleVerifyEmail,
    handleUpdateProfile,
    handleChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
