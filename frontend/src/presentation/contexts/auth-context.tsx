'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { useToast } from '@/presentation/hooks/use-toast';
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
  const { toast } = useToast();
  const { handleAuthError } = useErrorHandler();

  // Use Zustand store
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
    } catch (error: any) {
      handleAuthError(error);
      throw error; // Re-throw for component-level handling if needed
    }
  };

  const handleRegister = async (username: string, firstName: string, lastName: string, email: string, password: string, role?: string) => {
    try {
      await register(username, firstName, lastName, email, password, role);
    } catch (error: any) {
      handleAuthError(error);
      throw error; // Re-throw for component-level handling if needed
    }
  };


  const handleLogout = async () => {
    try {
      await logout();

      // Show success toast
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
        variant: "default",
      });

      router.push('/login');
    } catch (error) {
      // Logout should not fail navigation
      router.push('/login');
    }
  };

  const handleVerifyEmail = async (email: string, token: string) => {
    try {
      return await verifyEmail(email, token);
    } catch (error: any) {
      handleAuthError(error);
      throw error; // Re-throw for component-level handling if needed
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
      throw error; // Re-throw for component-level handling if needed
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await changePassword(currentPassword, newPassword);
    } catch (error: any) {
      handleAuthError(error);
      throw error; // Re-throw for component-level handling if needed
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
