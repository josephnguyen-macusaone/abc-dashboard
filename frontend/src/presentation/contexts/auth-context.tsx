'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { useToast } from '@/presentation/hooks/use-toast';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
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
      throw error; // Re-throw the error from the store
    }
  };

  const handleRegister = async (firstName: string, lastName: string, email: string, password: string, role?: string) => {
    try {
      await register(firstName, lastName, email, password, role);
    } catch (error: any) {
      throw error; // Re-throw the error from the store
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
