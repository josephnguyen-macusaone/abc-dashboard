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
import { createTokenManager, TokenManager, TokenManagerStats } from '@/shared/helpers/token-manager';

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
  signup: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'agent' | 'tech' | 'accountant';
    username?: string;
    phone?: string;
  }) => Promise<void>;
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
  getTokenStats: () => TokenManagerStats | null;
  handleAuthFailure: () => Promise<void>;
  /** True if current token is expired (or missing). Used to enforce consistent logout on protected routes. */
  isTokenExpired: () => boolean;
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
          // Initial state — isLoading: true so children block until initialize() resolves
          user: null,
          token: null,
          isLoading: true,
          isAuthenticated: false,
          isLoggingOut: false,
          passwordResetSent: false,
          passwordResetEmail: null,
          tokenManager: null,

          // Initialize auth state (HttpOnly cookies: always verify via getProfile)
          // Never trust persisted state without verifying the HttpOnly cookie is still valid.
          initialize: async () => {
            try {
              set({ isLoading: true });

              const storedUser = CookieService.getUser() || LocalStorageService.getUser();
              if (storedUser) {
                set({ user: storedUser });
              }

              // Token is in HttpOnly cookie - verify via getProfile
              try {
                const profileData = await authApi.getProfile();
                const user = User.fromObject(profileData as unknown as Record<string, unknown>);
                set({ user, isAuthenticated: true });
                CookieService.setUser(user);
                LocalStorageService.setUser(user);

                const tokenManager = createTokenManager(
                  () => get().refreshToken(),
                  {
                    onTokenExpired: () => get().handleAuthFailure(),
                    onTokenRefreshed: () => { /* token in cookie */ }
                  }
                );
                set({ tokenManager });
                tokenManager.schedulePeriodicRefresh(55); // Refresh ~5 min before 1h expiry
              } catch (profileError: unknown) {
                // Only clear auth state for auth errors (401/403 = expired/invalid credentials).
                // Preserve state on transient failures (network timeout, backend unavailable)
                // so the user isn't logged out just because the server is temporarily down.
                const status = (profileError as { status?: number })?.status;
                const isAuthError = status === 401 || status === 403;
                if (isAuthError) {
                  set({ user: null, isAuthenticated: false });
                  CookieService.clearAuthCookies();
                  LocalStorageService.clearAuthData();
                } else {
                  // Non-auth error: keep persisted user so the UI isn't blank,
                  // but mark as unauthenticated so protected routes re-verify.
                  set({ isAuthenticated: false });
                  storeLogger.debug('getProfile failed with non-auth error during init, will retry on next navigation', {
                    status,
                    error: profileError instanceof Error ? profileError.message : String(profileError),
                  });
                }
              }
            } catch (error) {
              storeLogger.error('Error initializing auth', { error: error instanceof Error ? error.message : String(error) });
            } finally {
              set({ isLoading: false });
            }
          },

          signup: async (payload) => {
            try {
              set({ isLoading: true });

              const authResult = await authApi.signup(payload);

              // Token stored in HttpOnly cookie by backend - no client storage
              set({ token: null });

              const tokenManager = createTokenManager(
                () => get().refreshToken(),
                {
                  onTokenExpired: () => get().handleAuthFailure(),
                  onTokenRefreshed: () => { /* token in cookie */ }
                }
              );
              set({ tokenManager });
              tokenManager.schedulePeriodicRefresh(55);

              // Fetch complete profile data to normalize client state
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
                const basicUser = User.fromObject({
                  ...authResult.user,
                  lastLogin: new Date(),
                  updatedAt: new Date()
                });

                set({ user: basicUser });
                CookieService.setUser(basicUser);
                LocalStorageService.setUser(basicUser);
                set({ isAuthenticated: true });

                storeLogger.warn('Profile fetch failed after signup, using signup data', {
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

              // Token stored in HttpOnly cookie by backend - no client storage
              set({ token: null });

              const tokenManager = createTokenManager(
                () => get().refreshToken(),
                {
                  onTokenExpired: () => get().handleAuthFailure(),
                  onTokenRefreshed: () => { /* token in cookie */ }
                }
              );
              set({ tokenManager });
              tokenManager.schedulePeriodicRefresh(55); // Refresh ~5 min before 1h expiry

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
              await authApi.refreshToken();

              // Re-schedule periodic refresh (token in HttpOnly cookie)
              const tokenManager = get().tokenManager;
              if (tokenManager) {
                tokenManager.schedulePeriodicRefresh(55);
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
          setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
          setToken: (token: string | null) => {
            set({ token, isAuthenticated: !!(get().user && token) });
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

            // Clear authentication state (backend logout clears HttpOnly cookies)
            set({ user: null, token: null, isAuthenticated: false });
            CookieService.clearAuthCookies();
            LocalStorageService.clearAuthData();

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

          // Schedule token refresh (HttpOnly: use periodic; else use token-based)
          scheduleTokenRefresh: () => {
            const token = get().token;
            const tokenManager = get().tokenManager;

            if (tokenManager) {
              if (token) {
                tokenManager.scheduleTokenRefresh(token);
              } else {
                tokenManager.schedulePeriodicRefresh(55); // HttpOnly: refresh ~5 min before 1h expiry
              }
            }
          },

          // Get token management stats
          getTokenStats: () => {
            const tokenManager = get().tokenManager;
            return tokenManager ? tokenManager.getStats() : null;
          },

          isTokenExpired: (): boolean => {
            // With HttpOnly cookies we cannot read token - assume not expired
            const token = get().token;
            if (!token) return false;
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const now = Math.floor(Date.now() / 1000);
              return typeof payload.exp === 'number' && payload.exp < now;
            } catch {
              return false;
            }
          },
        };
      },
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          // Token in HttpOnly cookie - not persisted
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
