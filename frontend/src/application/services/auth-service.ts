import { LoginUseCase, RegisterUseCase, LogoutUseCase, UpdateProfileUseCase, GetProfileUseCase, UpdateProfileDTO } from '@/application/use-cases';
import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthResult, User, AuthTokens } from '@/domain/entities/user-entity';
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
    private readonly registerUseCase: RegisterUseCase,
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
   * Register new user
   */
  async register(
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role?: string
  ): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.registerUseCase.execute(username, firstName, lastName, email, password, role);
      if (!result.isAuthenticated) {
        throw new Error('This email is already registered');
      }
      return result;
    } catch (error) {
      this.logger.error(`Registration error`, {
        correlationId,
        email,
        operation: 'registration_error',
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
    const currentUser = await this.getCurrentUser();

    try {
      const tokens = await this.authRepository.refreshToken();
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
    // Authentication status is now managed locally by the auth store
    return false;
  }

  /**
   * Get current user
   * Note: Current user is managed by the auth store
   */
  async getCurrentUser(): Promise<User | null> {
    // Current user is now managed locally by the auth store
    return null;
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
   * Verify email with token
   */
  async verifyEmail(email: string, token: string): Promise<{ user: User; message: string }> {
    const correlationId = generateCorrelationId();
    const currentUser = await this.getCurrentUser();

    try {
      const response = await this.authRepository.verifyEmail(email, token);
      return response;
    } catch (error) {
      this.logger.error(`Email verification failed`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'email_verification_error',
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
