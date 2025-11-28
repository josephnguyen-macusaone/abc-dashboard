import { useState, useEffect, useCallback } from 'react';
import { useAuthService } from './use-auth-service';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { AuthResult, User, AuthTokens } from '@/domain/entities/user-entity';

/**
 * Presentation Hook: Authentication
 * React hook providing authentication operations with loading states and error handling
 */
export const useAuth = () => {
  const authService = useAuthService();
  const { user: storeUser, isAuthenticated: storeIsAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);

  const checkAuthStatus = useCallback(async (): Promise<AuthResult | null> => {
    // Use auth store state since backend auth status endpoint was removed
    if (storeIsAuthenticated && storeUser) {
      setAuthResult(AuthResult.authenticated(storeUser, new AuthTokens('', '')));
      return AuthResult.authenticated(storeUser, new AuthTokens('', ''));
    } else {
      setAuthResult(AuthResult.unauthenticated());
      return AuthResult.unauthenticated();
    }
  }, [storeIsAuthenticated, storeUser]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string,
    updateAuthResult: boolean = false
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      if (updateAuthResult && result instanceof AuthResult) {
        setAuthResult(result);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult | null> => {
    return executeWithErrorHandling(
      () => authService.login(email, password),
      'Login failed',
      true
    );
  }, [authService, executeWithErrorHandling]);

  const register = useCallback(async (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role?: string
  ): Promise<AuthResult | null> => {
    return executeWithErrorHandling(
      () => authService.register(username, firstName, lastName, email, password, role),
      'Registration failed',
      true
    );
  }, [authService, executeWithErrorHandling]);

  const logout = useCallback(async (): Promise<boolean> => {
    const result = await executeWithErrorHandling(
      () => authService.logout(),
      'Logout failed'
    );
    if (result !== null) {
      setAuthResult(AuthResult.unauthenticated());
      return true;
    }
    return false;
  }, [authService, executeWithErrorHandling]);

  const refreshToken = useCallback(async (): Promise<AuthTokens | null> => {
    return executeWithErrorHandling(
      () => authService.refreshToken(),
      'Failed to refresh token'
    );
  }, [authService, executeWithErrorHandling]);

  const verifyEmail = useCallback(async (email: string, token: string): Promise<{ user: User; message: string } | null> => {
    return executeWithErrorHandling(
      () => authService.verifyEmail(email, token),
      'Email verification failed'
    );
  }, [authService, executeWithErrorHandling]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const result = await executeWithErrorHandling(
      () => authService.changePassword(currentPassword, newPassword),
      'Password change failed'
    );
    return result !== null;
  }, [authService, executeWithErrorHandling]);

  const getProfile = useCallback(async (): Promise<User | null> => {
    return executeWithErrorHandling(
      () => authService.getCompleteProfile(),
      'Failed to load profile'
    );
  }, [authService, executeWithErrorHandling]);

  const updateProfile = useCallback(async (updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>): Promise<User | null> => {
    return executeWithErrorHandling(
      () => authService.updateProfile(updates),
      'Profile update failed'
    );
  }, [authService, executeWithErrorHandling]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed properties
  const isAuthenticated = authResult?.isAuthenticated ?? false;
  const user = authResult?.user ?? null;
  const tokens = authResult?.tokens ?? null;

  return {
    // State
    loading,
    error,
    isAuthenticated,
    user,
    tokens,

    // Operations
    login,
    register,
    logout,
    checkAuthStatus,
    refreshToken,
    verifyEmail,
    changePassword,
    getProfile,
    updateProfile,

    // Utilities
    clearError,
  };
};
