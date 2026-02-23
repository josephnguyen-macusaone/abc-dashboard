import {
  type LoginUseCaseContract,
  type LogoutUseCaseContract,
  type UpdateProfileUseCaseContract,
  type GetProfileUseCaseContract,
  type ChangePasswordUseCaseContract,
  UpdateProfileDTO,
} from '@/application/use-cases';
import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthResult, User, AuthTokens } from '@/domain/entities/user-entity';
import { useAuthStore } from '@/infrastructure/stores';
import { CookieService } from '@/infrastructure/storage/cookie-service';
import { LocalStorageService } from '@/infrastructure/storage/local-storage-service';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';
import { getErrorMessage } from '@/infrastructure/api/core/errors';

export interface AuthPorts {
  login: LoginUseCaseContract;
  logout: LogoutUseCaseContract;
  updateProfile: UpdateProfileUseCaseContract;
  getProfile: GetProfileUseCaseContract;
  changePassword: ChangePasswordUseCaseContract;
}

/**
 * Application Service: Authentication
 * Coordinates multiple use cases and provides high-level authentication operations
 */
export class AuthService {
  private readonly logger = logger.createChild({
    component: 'AuthService',
  });

  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly ports: AuthPorts
  ) {}

  /**
   * Authenticate user
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.ports.login.execute(email, password, correlationId);

      if (!result.isAuthenticated) {
        throw new Error('Invalid email or password');
      }

      return result;
    } catch (error) {
      this.logger.error(`Login error`, {
        correlationId,
        email,
        operation: 'login_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      await this.ports.logout.execute();
    } catch (error) {
      this.logger.warn(`Logout error (continuing logout locally)`, {
        correlationId,
        operation: 'logout_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Rehydrate auth state from storage and fetch profile when needed
   */
  async rehydrateAuth(): Promise<boolean> {
    const authStore = useAuthStore.getState();
    await authStore.initialize();

    if (authStore.isAuthenticated) {
      return true;
    }

    const token = authStore.token;
    if (!token) {
      return false;
    }

    try {
      const result = await this.ports.getProfile.execute();

      authStore.setUser(result);
      authStore.setToken(token);

      return true;
    } catch (error) {
      this.logger.warn('Auth rehydrate failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }


  /**
   * Refresh authentication tokens
   */
  async refreshToken(): Promise<AuthTokens> {
    const correlationId = generateCorrelationId();
    const authStore = useAuthStore.getState();
    const currentUser = await this.getCurrentUser();

    try {
      const tokens = await this.authRepository.refreshToken();

      // Persist and propagate tokens
      authStore.setToken(tokens.accessToken);
      CookieService.setToken(tokens.accessToken);
      LocalStorageService.setToken(tokens.accessToken);
      if (tokens.refreshToken) {
        LocalStorageService.setRefreshToken(tokens.refreshToken);
      }

      return tokens;
    } catch (error) {
      this.logger.error(`Token refresh error`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'token_refresh_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   * Note: Authentication status is managed by the auth store
   */
  async isAuthenticated(): Promise<boolean> {
    const authStore = useAuthStore.getState();

    if (authStore.isAuthenticated) {
      return true;
    }

    // Rehydrate store if needed
    await authStore.initialize();
    return useAuthStore.getState().isAuthenticated;
  }

  /**
   * Get current user
   * Note: Current user is managed by the auth store
   */
  async getCurrentUser(): Promise<User | null> {
    const authStore = useAuthStore.getState();
    if (authStore.user) {
      return authStore.user;
    }

    try {
      const result = await this.ports.getProfile.execute();
      authStore.setUser(result);
      return result;
    } catch (error) {
      this.logger.warn('Failed to fetch current user', {
        error: error instanceof Error ? error.message : String(error),
      });
    return null;
    }
  }

  /**
   * Get complete user profile (including profile data)
   */
  async getCompleteProfile(): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.ports.getProfile.execute();
      return result;
    } catch (error) {
      this.logger.error(`Get complete profile error`, {
        correlationId,
        operation: 'get_complete_profile_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }



  /**
   * Change current user's password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const correlationId = generateCorrelationId();
    const currentUser = await this.getCurrentUser();

    try {
      await this.ports.changePassword.execute({
        currentPassword,
        newPassword,
      });
    } catch (error) {
      this.logger.error(`Password change failed`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'password_change_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileDTO): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.ports.updateProfile.execute(updates);
      return result;
    } catch (error) {
      this.logger.error(`Profile update error`, {
        correlationId,
        updates: Object.keys(updates),
        operation: 'profile_update_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
