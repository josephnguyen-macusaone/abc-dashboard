import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/domain/entities/user-entity';
import { AuthService } from '@/application/services/auth-service';
import { LoginUseCase } from '@/application/use-cases/login-usecase';
import { RegisterUseCase } from '@/application/use-cases/register-usecase';
import { LogoutUseCase } from '@/application/use-cases/logout-usecase';
import { AuthRepository } from '@/infrastructure/repositories/auth-repository';
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

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
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
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => {
        // Initialize Clean Architecture services
        const authRepository = new AuthRepository();
        const loginUseCase = new LoginUseCase(authRepository);
        const registerUseCase = new RegisterUseCase(authRepository);
        const logoutUseCase = new LogoutUseCase(authRepository);
        const authService = new AuthService(
          authRepository,
          loginUseCase,
          registerUseCase,
          logoutUseCase
        );

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

              // If we have a token but no user, try to get user from API
              if (storedToken && !storedUser) {
                try {
                  const currentUser = await authService.getCurrentUser();
                  if (currentUser) {
                    set({ user: currentUser });
                    CookieService.setUser(currentUser);
                    LocalStorageService.setUser(currentUser);
                  }
                } catch (error) {
                  // Token might be invalid, clear it
                  storeLogger.warn('Failed to get current user', { error: error instanceof Error ? error.message : String(error) });
                  CookieService.clearAuthCookies();
                  LocalStorageService.clearAuthData();
                  httpClient.setAuthToken(null);
                  set({ user: null, token: null });
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

              const authResult = await authService.login(email, password);

              set({ token: authResult.tokens.accessToken });

              // Store tokens
              CookieService.setToken(authResult.tokens.accessToken);
              LocalStorageService.setToken(authResult.tokens.accessToken);

              if (authResult.tokens.refreshToken) {
                LocalStorageService.setRefreshToken(authResult.tokens.refreshToken);
              }

              // Fetch fresh profile data after successful login
              try {
                const profileResponse = await authService.getCurrentUser();

                if (profileResponse) {
                  // Transform the API response to User entity
                  const profileUser = User.fromObject({
                    id: profileResponse.id,
                    name: profileResponse.name,
                    email: profileResponse.email,
                    role: profileResponse.role,
                    isActive: true,
                    avatar: profileResponse.avatar,
                    lastLogin: new Date(),
                    updatedAt: new Date()
                  });

                  set({ user: profileUser });
                  CookieService.setUser(profileUser);
                  LocalStorageService.setUser(profileUser);
                }

              } catch (profileError) {
                // If profile fetch fails, fall back to login response user data
                storeLogger.warn('Profile fetch failed after login, using login response data', {
                  error: profileError instanceof Error ? profileError.message : String(profileError)
                });

                set({ user: authResult.user });
                CookieService.setUser(authResult.user);
                LocalStorageService.setUser(authResult.user);
              }

              set({ isAuthenticated: true });
            } catch (error: any) {
              throw new Error(getErrorMessage(error));
            } finally {
              set({ isLoading: false });
            }
          },

          register: async (firstName: string, lastName: string, email: string, password: string, role?: string) => {
            try {
              set({ isLoading: true });

              const authResult = await authService.register(firstName, lastName, email, password, password, role);

              set({ token: authResult.tokens.accessToken });

              // Store tokens
              CookieService.setToken(authResult.tokens.accessToken);
              LocalStorageService.setToken(authResult.tokens.accessToken);

              if (authResult.tokens.refreshToken) {
                LocalStorageService.setRefreshToken(authResult.tokens.refreshToken);
              }

              // Fetch fresh profile data after successful registration
              try {
                const profileResponse = await authService.getCurrentUser();

                if (profileResponse) {
                  // Transform the API response to User entity
                  const profileUser = User.fromObject({
                    id: profileResponse.id,
                    name: profileResponse.name,
                    email: profileResponse.email,
                    role: profileResponse.role,
                    isActive: true,
                    avatar: profileResponse.avatar,
                    lastLogin: new Date(),
                    updatedAt: new Date()
                  });

                  set({ user: profileUser });
                  CookieService.setUser(profileUser);
                  LocalStorageService.setUser(profileUser);
                }

              } catch (profileError) {
                // If profile fetch fails, fall back to registration response user data
                storeLogger.warn('Profile fetch failed after registration, using registration response data', {
                  error: profileError instanceof Error ? profileError.message : String(profileError)
                });

                set({ user: authResult.user });
                CookieService.setUser(authResult.user);
                LocalStorageService.setUser(authResult.user);
              }

              set({ isAuthenticated: true });
            } catch (error: any) {
              throw new Error(getErrorMessage(error));
            } finally {
              set({ isLoading: false });
            }
          },

          refreshToken: async (): Promise<boolean> => {
            try {
              // Check if we have a refresh token
              const refreshToken = LocalStorageService.getRefreshToken();
              if (!refreshToken) {
                storeLogger.warn('No refresh token available');
                return false;
              }

              const newTokens = await authService.refreshToken();

              // Update token in store and http client
              set({ token: newTokens.accessToken });
              httpClient.setAuthToken(newTokens.accessToken);

              // Store new tokens
              CookieService.setToken(newTokens.accessToken);
              LocalStorageService.setToken(newTokens.accessToken);

              if (newTokens.refreshToken) {
                LocalStorageService.setRefreshToken(newTokens.refreshToken);
              }

              storeLogger.info('Token refresh successful');
              return true;
            } catch (error) {
              storeLogger.warn('Token refresh failed', {
                error: error instanceof Error ? error.message : String(error)
              });

              // Clear authentication state on refresh failure
              set({ user: null, token: null, isAuthenticated: false });
              CookieService.clearAuthCookies();
              LocalStorageService.clearAuthData();
              httpClient.setAuthToken(null);

              return false;
            }
          },

          verifyEmail: async (token: string) => {
            try {
              await authService.verifyEmail(token);
              storeLogger.info('Email verification successful');
            } catch (error) {
              storeLogger.warn('Email verification failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          updateProfile: async (updates) => {
            try {
              const updatedUser = await authService.updateProfile(updates);

              // Update user in store
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
              await authService.changePassword(currentPassword, newPassword);
              storeLogger.info('Password change successful');
            } catch (error) {
              storeLogger.warn('Password change failed', {
                error: error instanceof Error ? error.message : String(error)
              });
              throw error;
            }
          },

          logout: async () => {
            try {
              await authService.logout();
            } catch (error) {
              // Logout should not fail the operation
              storeLogger.warn('Logout API call failed', {
                error: error instanceof Error ? error.message : String(error)
              });
            } finally {
              // Always clear local state and storage
              set({ user: null, token: null, isAuthenticated: false });
              CookieService.clearAuthCookies();
              LocalStorageService.clearAuthData();
              httpClient.setAuthToken(null);
            }
          },

          // Direct setters for flexibility
          setUser: (user: User | null) => set({ user, isAuthenticated: !!(user && get().token) }),
          setToken: (token: string | null) => {
            set({ token });
            httpClient.setAuthToken(token);
            set({ isAuthenticated: !!(get().user && token) });
          },
          setLoading: (isLoading: boolean) => set({ isLoading }),
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
