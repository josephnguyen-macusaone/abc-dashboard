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
  emailVerificationRequired: boolean;
  emailVerificationMessage: string | null;

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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearEmailVerificationState: () => void;
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
          emailVerificationRequired: false,
          emailVerificationMessage: null,

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

              // Check if user is active (verified)
              if (!authResult.user.isActive) {
                throw new Error('Please verify your email before logging in. Check your email for the verification link.');
              }

              set({ token: authResult.tokens.accessToken });

              // Store tokens
              CookieService.setToken(authResult.tokens.accessToken);
              LocalStorageService.setToken(authResult.tokens.accessToken);

              if (authResult.tokens.refreshToken) {
                LocalStorageService.setRefreshToken(authResult.tokens.refreshToken);
              }

              // Fetch complete profile data after login to get merged user + profile data
              let userId = authResult.user.id;
              try {
                const profileData = await authService.getCompleteProfile();
                if (profileData) {
                  userId = profileData.id; // Update with profile data ID if different

                  // Create complete User entity from merged profile data
                  const completeUser = User.fromObject({
                    id: profileData.id,
                    name: profileData.displayName || profileData.username,
                    email: profileData.email,
                    role: profileData.role,
                    isActive: profileData.isActive,
                    avatar: profileData.avatarUrl,
                    displayName: profileData.displayName,
                    bio: profileData.bio,
                    phone: profileData.phone,
                    emailVerified: profileData.emailVerified,
                    lastLogin: new Date(),
                    updatedAt: new Date(),
                    createdAt: profileData.createdAt ? new Date(profileData.createdAt) : undefined
                  });

                  set({ user: completeUser });
                  CookieService.setUser(completeUser);
                  LocalStorageService.setUser(completeUser);
                  set({ isAuthenticated: true });

                  storeLogger.info('Profile data loaded after login', {
                    userId: completeUser.id,
                    hasAvatar: !!profileData.avatarUrl,
                    hasBio: !!profileData.bio,
                    phone: profileData.phone
                  });
                } else {
                  // Profile response invalid, create basic user from login data
                  throw new Error('Invalid profile response');
                }
              } catch (profileError) {
                // Profile fetch failed, create basic user from login data
                storeLogger.warn('Failed to fetch complete profile after login, using basic login data', {
                  userId,
                  error: profileError instanceof Error ? profileError.message : String(profileError)
                });

                const basicUser = User.fromObject({
                  id: authResult.user.id,
                  name: authResult.user.displayName || authResult.user.name,
                  email: authResult.user.email,
                  role: authResult.user.role,
                  isActive: authResult.user.isActive,
                  avatar: authResult.user.avatar,
                  displayName: authResult.user.displayName,
                  phone: authResult.user.phone,
                  lastLogin: new Date(),
                  updatedAt: new Date()
                });

                set({ user: basicUser });
                CookieService.setUser(basicUser);
                LocalStorageService.setUser(basicUser);
                set({ isAuthenticated: true });
              }
            } catch (error: any) {
              const errorMessage = getErrorMessage(error);

              // Check if this is an email verification error
              if (errorMessage.includes('verify your email') || errorMessage.includes('Check your email')) {
                set({
                  emailVerificationRequired: true,
                  emailVerificationMessage: errorMessage
                });
                return; // Don't throw error for email verification
              }

              throw new Error(errorMessage);
            } finally {
              set({ isLoading: false });
            }
          },

          register: async (username: string, firstName: string, lastName: string, email: string, password: string, role?: string) => {
            try {
              set({ isLoading: true });

              const registerResult = await authService.register(username, firstName, lastName, email, password, role);

              // Store user data (no tokens since user is not active yet)
              const registeredUser = User.fromObject({
                id: registerResult.user.id,
                name: registerResult.user.name,
                email: registerResult.user.email,
                role: registerResult.user.role,
                isActive: registerResult.user.isActive || false,
                avatar: registerResult.user.avatar,
                lastLogin: new Date(),
                updatedAt: new Date()
              });

              set({ user: registeredUser });
              CookieService.setUser(registeredUser);
              LocalStorageService.setUser(registeredUser);

              // User is registered but not active yet - no authentication
              set({ isAuthenticated: false });

              storeLogger.info('User registered successfully, awaiting email verification', {
                userId: registeredUser.id,
                email: registeredUser.email,
                isActive: registeredUser.isActive
              });
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

          verifyEmail: async (email: string, token: string) => {
            try {
              const response = await authService.verifyEmail(email, token);
              storeLogger.info('Email verification successful');
              return response;
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

          clearEmailVerificationState: () => set({
            emailVerificationRequired: false,
            emailVerificationMessage: null
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
