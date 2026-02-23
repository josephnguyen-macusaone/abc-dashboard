import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/domain/entities/user-entity';
import { authApi } from '@/infrastructure/api/auth';
import { httpClient } from '@/infrastructure/api/core/client';
import { CookieService } from '@/infrastructure/storage/cookie-service';
import { LocalStorageService } from '@/infrastructure/storage/local-storage-service';
import { getLoginErrorMessage } from '@/infrastructure/api/core/errors';
import logger from '@/shared/helpers/logger';
import { container } from '@/shared/di/container';
import { createTokenManager, TokenManager } from '@/shared/helpers/token-manager';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;

  // Password reset state
  passwordResetSent: boolean;
  passwordResetEmail: string | null;

  // Token management
  tokenManager: TokenManager | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  canAccessProtectedRoutes: () => boolean;
  updateProfile: (updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>) => Promise<User>;
  refreshCurrentUser: () => Promise<User | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearPasswordResetState: () => void;

  // Token management actions
  scheduleTokenRefresh: () => void;
  getTokenStats: () => any;
  handleAuthFailure: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => {
        // Initialize logger
        const storeLogger = logger.createChild({
          component: 'AuthStore',
        });

        return {
          // Initial state
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
          isLoggingOut: false,
          passwordResetSent: false,
          passwordResetEmail: null,
          tokenManager: null,

          // Initialize auth state from storage
          initialize: async () => {
            // Skip if already initialized (has user/token from persistence)
            const currentState = get();
            if (currentState.user && currentState.token) {
              set({ isAuthenticated: true, isLoading: false });
              // Schedule token refresh for existing token
              get().scheduleTokenRefresh();
              return;
            }

            try {
              set({ isLoading: true });

              // Try to get stored auth data
              const storedToken = CookieService.getToken() || LocalStorageService.getToken();
              const storedUser = CookieService.getUser() || LocalStorageService.getUser();

              if (storedToken) {
                set({ token: storedToken });
                httpClient.setAuthToken(storedToken);

                // Initialize token manager and schedule refresh
                const tokenManager = createTokenManager(
                  () => get().refreshToken(),
                  {
                    onTokenExpired: () => get().handleAuthFailure(),
                    onTokenRefreshed: (newToken) => {
                      set({ token: newToken });
                      httpClient.setAuthToken(newToken);
                    }
                  }
                );
                set({ tokenManager });
                tokenManager.scheduleTokenRefresh(storedToken);
              }

              if (storedUser) {
                set({ user: storedUser });
              }

              // If we have token but no user (e.g. user cookie expired), fetch profile
              if (storedToken && !storedUser) {
                try {
                  const profileData = await authApi.getProfile();
                  const user = User.fromObject(profileData as unknown as Record<string, unknown>);
                  set({ user });
                  CookieService.setUser(user);
                  LocalStorageService.setUser(user);
                } catch (profileError) {
                  storeLogger.warn('Could not restore user from token, clearing auth', {
                    error: profileError instanceof Error ? profileError.message : String(profileError)
                  });
                  set({ token: null, user: null });
                  httpClient.setAuthToken(null);
                  CookieService.clearAuthCookies();
                  LocalStorageService.clearAuthData();
                }
              }

              set({ isAuthenticated: !!(get().user && get().token) });
            } catch (error) {
              storeLogger.error('Error initializing auth', { error: error instanceof Error ? error.message : String(error) });
            } finally {
              set({ isLoading: false });
            }
          },

          login: async (email: string, password: string) => {
            try {
              set({ isLoading: true });

              const authResult = await authApi.login({ email, password });

              // Check if user requires password change
              if (authResult.user?.requiresPasswordChange) {
                // Store user data but don't authenticate yet
                const user = User.fromObject(authResult.user as unknown as Record<string, unknown>);
                set({ user });
                CookieService.setUser(user);
                LocalStorageService.setUser(user);
                set({ isAuthenticated: false });
                return;
              }

              // Check if user is active
              if (!authResult.user?.isActive) {
                throw new Error('Please verify your email before logging in. Check your email for the verification link.');
              }

              // Store token
              set({ token: authResult.tokens.accessToken });
              httpClient.setAuthToken(authResult.tokens.accessToken);

              // Initialize token manager and schedule refresh
              const tokenManager = createTokenManager(
                () => get().refreshToken(),
                {
                  onTokenExpired: () => get().handleAuthFailure(),
                  onTokenRefreshed: (newToken) => {
                    set({ token: newToken });
                    httpClient.setAuthToken(newToken);
                  }
                }
              );
              set({ tokenManager });
              tokenManager.scheduleTokenRefresh(authResult.tokens.accessToken);

              // Store tokens
              CookieService.setToken(authResult.tokens.accessToken);
              LocalStorageService.setToken(authResult.tokens.accessToken);

              if (authResult.tokens.refreshToken) {
                LocalStorageService.setRefreshToken(authResult.tokens.refreshToken);
              }

              // Fetch complete profile data
              try {
                const profileData = await authApi.getProfile();
                const completeUser = User.fromObject({
                  ...profileData,
                  lastLogin: new Date(),
                  updatedAt: new Date()
                });

                set({ user: completeUser });
                CookieService.setUser(completeUser);
                LocalStorageService.setUser(completeUser);
                set({ isAuthenticated: true });
              } catch (profileError) {
                // Fallback to login response data
                const basicUser = User.fromObject({
                  ...authResult.user,
                  lastLogin: new Date(),
                  updatedAt: new Date()
                });

                set({ user: basicUser });
                CookieService.setUser(basicUser);
                LocalStorageService.setUser(basicUser);
                set({ isAuthenticated: true });

                storeLogger.warn('Profile fetch failed, using basic login data', {
                  error: profileError instanceof Error ? profileError.message : String(profileError)
                });
              }
            } catch (error: unknown) {
              const errorMessage = getLoginErrorMessage(error);
              throw new Error(errorMessage);
            } finally {
              set({ isLoading: false });
            }
          },

          refreshToken: async (): Promise<boolean> => {
            try {
              const refreshToken = LocalStorageService.getRefreshToken();
              if (!refreshToken) {
                return false;
              }

              const newTokens = await authApi.refreshToken();

              set({ token: newTokens.tokens.accessToken });
              httpClient.setAuthToken(newTokens.tokens.accessToken);

              CookieService.setToken(newTokens.tokens.accessToken);
              LocalStorageService.setToken(newTokens.tokens.accessToken);

              if (newTokens.tokens.refreshToken) {
                LocalStorageService.setRefreshToken(newTokens.tokens.refreshToken);
              }

              // Re-schedule token refresh with new token
              const tokenManager = get().tokenManager;
              if (tokenManager) {
                tokenManager.scheduleTokenRefresh(newTokens.tokens.accessToken);
              }

              return true;
            } catch (error) {
              storeLogger.warn('Token refresh failed', {
                error: error instanceof Error ? error.message : String(error)
              });

              // Clear authentication state
              set({ user: null, token: null, isAuthenticated: false });
              CookieService.clearAuthCookies();
              LocalStorageService.clearAuthData();
              httpClient.setAuthToken(null);

              // Clean up token manager
              const tokenManager = get().tokenManager;
              if (tokenManager) {
                tokenManager.destroy();
                set({ tokenManager: null });
              }

              return false;
            }
          },

          canAccessProtectedRoutes: () => {
            const state = get();
            return state.isAuthenticated;
          },

          updateProfile: async (updates) => {
            try {
              const response = await authApi.updateProfile(updates);
              const updatedUser = User.fromObject(response.user as unknown as Record<string, unknown>);

              set({ user: updatedUser });
              CookieService.setUser(updatedUser);
              LocalStorageService.setUser(updatedUser);

              return updatedUser;
            } catch (error) {
              storeLogger.warn('Profile update failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          changePassword: async (currentPassword: string, newPassword: string) => {
            try {
              await container.authService.changePassword(currentPassword, newPassword);
            } catch (error) {
              storeLogger.warn('Password change failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          requestPasswordReset: async (email: string) => {
            try {
              set({ isLoading: true });
              // Note: Backend doesn't return data for security, just success/error
              await authApi.forgotPassword(email);

              set({
                passwordResetSent: true,
                passwordResetEmail: email
              });
            } catch (error) {
              storeLogger.warn('Password reset request failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            } finally {
              set({ isLoading: false });
            }
          },

          resetPassword: async (token: string, newPassword: string) => {
            try {
              set({ isLoading: true });
              await authApi.resetPassword(token, newPassword);

              // Clear password reset state
              set({
                passwordResetSent: false,
                passwordResetEmail: null
              });
            } catch (error) {
              storeLogger.warn('Password reset failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            } finally {
              set({ isLoading: false });
            }
          },

          logout: async () => {
            // Prevent multiple simultaneous logout calls
            if (get().isLoggingOut) {
              storeLogger.info('Logout already in progress, skipping duplicate call');
              return;
            }

            set({ isLoggingOut: true });

            try {
              // Use the logout use case which handles API call and cleanup
              await container.logoutUseCase.execute();

              // Clear local state after use case completes
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoggingOut: false,
                passwordResetSent: false,
                passwordResetEmail: null
              });

              // Clean up token manager
              const tokenManager = get().tokenManager;
              if (tokenManager) {
                tokenManager.destroy();
                set({ tokenManager: null });
              }

              // Logout completed - detailed logging handled by use case
            } catch (error) {
              storeLogger.error('Logout failed', {
                error: error instanceof Error ? error.message : String(error)
              });

              // Still clear local state even if logout use case fails
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoggingOut: false,
                passwordResetSent: false,
                passwordResetEmail: null
              });

              // Clean up token manager even on logout failure
              const tokenManager = get().tokenManager;
              if (tokenManager) {
                tokenManager.destroy();
                set({ tokenManager: null });
              }

              throw error; // Re-throw to let caller handle the error
            }
          },

          // Direct setters
          setUser: (user: User | null) => set({ user, isAuthenticated: !!(user && get().token) }),
          setToken: (token: string | null) => {
            set({ token });
            httpClient.setAuthToken(token);
            set({ isAuthenticated: !!(get().user && token) });
          },
          setLoading: (isLoading: boolean) => set({ isLoading }),

          refreshCurrentUser: async () => {
            try {
              const profileData = await authApi.getProfile();
              const user = User.fromObject(profileData as unknown as Record<string, unknown>);

              set({ user });
              CookieService.setUser(user);
              LocalStorageService.setUser(user);

              return user;
            } catch (error) {
              storeLogger.error('Failed to refresh current user', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          clearPasswordResetState: () => set({
            passwordResetSent: false,
            passwordResetEmail: null
          }),

          // Handle auth failure (called by token manager)
          handleAuthFailure: async () => {
            storeLogger.warn('Token expired, handling auth failure', {
              category: 'auth-expiry'
            });

            // Clear authentication state
            set({ user: null, token: null, isAuthenticated: false });
            CookieService.clearAuthCookies();
            LocalStorageService.clearAuthData();
            httpClient.setAuthToken(null);

            // Clean up token manager
            const tokenManager = get().tokenManager;
            if (tokenManager) {
              tokenManager.destroy();
              set({ tokenManager: null });
            }

            // Redirect to login if in browser
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          },

          // Schedule token refresh for current token
          scheduleTokenRefresh: () => {
            const token = get().token;
            const tokenManager = get().tokenManager;

            if (token && tokenManager) {
              tokenManager.scheduleTokenRefresh(token);
            }
          },

          // Get token management stats
          getTokenStats: () => {
            const tokenManager = get().tokenManager;
            return tokenManager ? tokenManager.getStats() : null;
          },
        };
      },
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
          // Don't persist isLoggingOut or tokenManager as they are temporary/runtime objects
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
