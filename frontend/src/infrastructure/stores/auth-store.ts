import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, UserRole } from '@/domain/entities/user-entity';
import { authApi } from '@/infrastructure/api/auth';
import { httpClient } from '@/infrastructure/api/client';
import { CookieService } from '@/infrastructure/storage/cookie-service';
import { LocalStorageService } from '@/infrastructure/storage/local-storage-service';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  emailVerificationRequired: boolean;
  emailVerificationMessage: string | null;

  // Password reset state
  passwordResetSent: boolean;
  passwordResetEmail: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  verifyEmail: (email: string, token: string) => Promise<{ user: User; message: string }>;
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
  clearEmailVerificationState: () => void;
  clearPasswordResetState: () => void;
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
          isLoading: true,
          isAuthenticated: false,
          emailVerificationRequired: false,
          emailVerificationMessage: null,
          passwordResetSent: false,
          passwordResetEmail: null,

          // Initialize auth state from storage
          initialize: async () => {
            try {
              set({ isLoading: true });

              // Try to get stored auth data
              const storedToken = CookieService.getToken() || LocalStorageService.getToken();
              const storedUser = CookieService.getUser() || LocalStorageService.getUser();

              if (storedToken) {
                set({ token: storedToken });
                httpClient.setAuthToken(storedToken);
              }

              if (storedUser) {
                set({ user: storedUser });
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
                const user = User.fromObject(authResult.user);
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

                storeLogger.info('Login successful', {
                  userId: completeUser.id,
                  role: completeUser.role
                });
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
            } catch (error: any) {
              const errorMessage = getErrorMessage(error);

              // Check if this is an email verification error
              if (errorMessage.includes('verify your email') || errorMessage.includes('Check your email')) {
                set({
                  emailVerificationRequired: true,
                  emailVerificationMessage: errorMessage
                });
                return;
              }

              throw new Error(errorMessage);
            } finally {
              set({ isLoading: false });
            }
          },

          register: async (username: string, firstName: string, lastName: string, email: string, password: string, role?: string) => {
            try {
              set({ isLoading: true });

              const registerResult = await authApi.register({
                username,
                firstName,
                lastName,
                email,
                password,
                role: role as UserRole
              });

              const registeredUser = User.fromObject({
                ...registerResult.user,
                isActive: false, // New users are not active until email verification
                lastLogin: new Date(),
                updatedAt: new Date()
              });

              set({ user: registeredUser });
              CookieService.setUser(registeredUser);
              LocalStorageService.setUser(registeredUser);
              set({ isAuthenticated: false });

              storeLogger.info('User registered successfully', {
                userId: registeredUser.id,
                email: registeredUser.email
              });
            } catch (error: any) {
              throw new Error(getErrorMessage(error));
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

              storeLogger.info('Token refresh successful');
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

              return false;
            }
          },

          verifyEmail: async (token: string) => {
            try {
              const response = await authApi.verifyEmail(token);
              const user = User.fromObject(response.user);

              set({ user });
              CookieService.setUser(user);
              LocalStorageService.setUser(user);

              storeLogger.info('Email verification successful');
              return { user, message: response.message };
            } catch (error) {
              storeLogger.warn('Email verification failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          canAccessProtectedRoutes: () => {
            const state = get();
            return state.isAuthenticated && state.user?.isActive === true;
          },

          updateProfile: async (updates) => {
            try {
              const response = await authApi.updateProfile(updates);
              const updatedUser = User.fromObject(response.user);

              set({ user: updatedUser });
              CookieService.setUser(updatedUser);
              LocalStorageService.setUser(updatedUser);

              storeLogger.info('Profile update successful');
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
              await authApi.changePassword({
                currentPassword,
                newPassword
              });
              storeLogger.info('Password change successful');
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

              storeLogger.info('Password reset request successful');
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

              storeLogger.info('Password reset successful');
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
            try {
              await authApi.logout();
            } catch (error) {
              storeLogger.warn('Logout API call failed', {
                error: error instanceof Error ? error.message : String(error)
              });
            } finally {
              // Always clear local state
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                passwordResetSent: false,
                passwordResetEmail: null
              });
              CookieService.clearAuthCookies();
              LocalStorageService.clearAuthData();
              httpClient.setAuthToken(null);
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
              const user = User.fromObject(profileData);

              set({ user });
              CookieService.setUser(user);
              LocalStorageService.setUser(user);

              storeLogger.info('Current user refreshed successfully', { userId: user.id });
              return user;
            } catch (error) {
              storeLogger.error('Failed to refresh current user', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          clearEmailVerificationState: () => set({
            emailVerificationRequired: false,
            emailVerificationMessage: null
          }),

          clearPasswordResetState: () => set({
            passwordResetSent: false,
            passwordResetEmail: null
          }),
        };
      },
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
