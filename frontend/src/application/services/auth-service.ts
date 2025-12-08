import { LoginUseCase, LogoutUseCase, UpdateProfileUseCase, GetProfileUseCase, UpdateProfileDTO } from '@/application/use-cases';
import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthResult, User, AuthTokens } from '@/domain/entities/user-entity';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { CookieService } from '@/infrastructure/storage/cookie-service';
import { LocalStorageService } from '@/infrastructure/storage/local-storage-service';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

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
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly getProfileUseCase: GetProfileUseCase
  ) {}

  /**
   * Authenticate user
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.loginUseCase.execute(email, password);
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
      await this.logoutUseCase.execute();
    } catch (error) {
      this.logger.error(`Logout error`, {
        correlationId,
        operation: 'logout_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
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
      const profileData = await this.getProfileUseCase.execute();
      authStore.setUser(profileData);
      return profileData;
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
      const profileData = await this.getProfileUseCase.execute();
      return profileData;
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
      await this.authRepository.changePassword(currentPassword, newPassword);
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
      const updatedUser = await this.updateProfileUseCase.execute(updates);
      return updatedUser;
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
