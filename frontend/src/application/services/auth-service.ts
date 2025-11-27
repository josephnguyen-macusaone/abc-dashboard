import { LoginUseCase } from '@/application/use-cases/login-usecase';
import { RegisterUseCase } from '@/application/use-cases/register-usecase';
import { LogoutUseCase } from '@/application/use-cases/logout-usecase';
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
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  /**
   * Authenticate user
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.warn(`🔒 Login attempt for email: ${email}`, {
        correlationId,
        email,
        operation: 'login_attempt',
      });

      const startTime = Date.now();
      const result = await this.loginUseCase.execute(email, password);
      const duration = Date.now() - startTime;

      if (result.isAuthenticated) {
        this.logger.warn(`🔒 Login successful for user: ${result.user.id}`, {
          correlationId,
          userId: result.user.id,
          email,
          operation: 'login_success',
        });

        this.logger.info(`⚡ Login operation completed`, {
          correlationId,
          userId: result.user.id,
          duration,
          operation: 'login',
        });
      } else {
        this.logger.warn(`🔒 Login failed for email: ${email}`, {
          correlationId,
          email,
          operation: 'login_failed',
        });
      }

      return result;
    } catch (error) {
      this.logger.warn(`🔒 Login error for email: ${email}`, {
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
      this.logger.warn(`🔒 Registration attempt for email: ${email}`, {
        correlationId,
        email,
        name,
        role: role || 'staff',
        operation: 'registration_attempt',
      });

      const startTime = Date.now();
      const result = await this.registerUseCase.execute(username, firstName, lastName, email, password, role);
      const duration = Date.now() - startTime;

      if (result.isAuthenticated) {
        this.logger.warn(`🔒 Registration successful for user: ${result.user.id}`, {
          correlationId,
          userId: result.user.id,
          email,
          name,
          role: result.user.role,
          operation: 'registration_success',
        });

        this.logger.info(`👤 New user registered: ${result.user.name} (${result.user.email})`, {
          correlationId,
          userId: result.user.id,
          operation: 'user_registration',
        });

        this.logger.info(`⚡ Registration operation completed`, {
          correlationId,
          userId: result.user.id,
          duration,
          operation: 'registration',
        });
      } else {
        this.logger.warn(`🔒 Registration failed for email: ${email}`, {
          correlationId,
          email,
          operation: 'registration_failed',
        });
      }

      return result;
    } catch (error) {
      this.logger.warn(`🔒 Registration error for email: ${email}`, {
        correlationId,
        email,
        name,
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
      // Get current user before logout for logging
      const currentUser = await this.getCurrentUser();

      this.logger.warn(`🔒 Logout initiated`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'logout_attempt',
      });

      const startTime = Date.now();
      await this.logoutUseCase.execute();
      const duration = Date.now() - startTime;

      this.logger.warn(`🔒 Logout successful`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'logout_success',
      });

      this.logger.info(`👤 User logged out`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'user_logout',
      });

      this.logger.info(`⚡ Logout operation completed`, {
        correlationId,
        userId: currentUser?.id,
        duration,
        operation: 'logout',
      });
    } catch (error) {
      this.logger.warn(`🔒 Logout error`, {
        correlationId,
        operation: 'logout_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current authentication status
   */
  async getAuthStatus(): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      const startTime = Date.now();
      const result = await this.authRepository.getAuthStatus();
      const duration = Date.now() - startTime;

      this.logger.debug(`Auth status check completed`, {
        correlationId,
        userId: result.isAuthenticated ? result.user.id : undefined,
        isAuthenticated: result.isAuthenticated,
        duration,
        operation: 'auth_status_check',
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get auth status`, {
        correlationId,
        operation: 'auth_status_error',
        error: error instanceof Error ? error.message : String(error),
      });
      return AuthResult.unauthenticated();
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshToken(): Promise<AuthTokens> {
    const correlationId = generateCorrelationId();
    const currentUser = await this.getCurrentUser();

    try {
      this.logger.debug(`Token refresh initiated`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'token_refresh_attempt',
      });

      const startTime = Date.now();
      const tokens = await this.authRepository.refreshToken();
      const duration = Date.now() - startTime;

      this.logger.warn(`🔒 Token refresh successful`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'token_refresh_success',
      });

      this.logger.info(`⚡ Token refresh operation completed`, {
        correlationId,
        userId: currentUser?.id,
        duration,
        operation: 'token_refresh',
      });

      return tokens;
    } catch (error) {
      this.logger.warn(`🔒 Token refresh failed`, {
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
   */
  async isAuthenticated(): Promise<boolean> {
    const authStatus = await this.getAuthStatus();
    return authStatus.isAuthenticated;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const authStatus = await this.getAuthStatus();
    return authStatus.isAuthenticated ? authStatus.user : null;
  }

  /**
   * Get complete user profile (including profile data)
   */
  async getCompleteProfile(): Promise<any> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`🌐 Making get profile API call`, {
        correlationId,
        operation: 'get_profile_api_request',
      });

      const startTime = Date.now();
      const profileData = await this.authRepository.getProfile();
      const duration = Date.now() - startTime;

      this.logger.http(`Get profile API call successful`, {
        correlationId,
        duration,
        operation: 'get_profile_api_success',
      });

      return profileData;
    } catch (error) {
      this.logger.http(`Get profile API call failed`, {
        correlationId,
        operation: 'get_profile_api_error',
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
      this.logger.warn(`🔒 Email verification initiated`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'email_verification_attempt',
      });

      const startTime = Date.now();
      const response = await this.authRepository.verifyEmail(email, token);
      const duration = Date.now() - startTime;

      this.logger.warn(`🔒 Email verification successful`, {
        correlationId,
        userId: currentUser?.id,
        verifiedUserId: response.user.id,
        operation: 'email_verification_success',
      });

      this.logger.info(`👤 User email verified`, {
        correlationId,
        userId: currentUser?.id,
        verifiedUserId: response.user.id,
        operation: 'email_verification',
      });

      return response;

      this.logger.info(`⚡ Email verification completed`, {
        correlationId,
        userId: currentUser?.id,
        duration,
        operation: 'email_verification',
      });
    } catch (error) {
      this.logger.warn(`🔒 Email verification failed`, {
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
      this.logger.warn(`🔒 Password change initiated`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'password_change_attempt',
      });

      const startTime = Date.now();
      await this.authRepository.changePassword(currentPassword, newPassword);
      const duration = Date.now() - startTime;

      this.logger.warn(`🔒 Password change successful`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'password_change_success',
      });

      this.logger.info(`👤 User password changed`, {
        correlationId,
        userId: currentUser?.id,
        operation: 'password_change',
      });

      this.logger.info(`⚡ Password change completed`, {
        correlationId,
        userId: currentUser?.id,
        duration,
        operation: 'password_change',
      });
    } catch (error) {
      this.logger.warn(`🔒 Password change failed`, {
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
  async updateProfile(updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>): Promise<User> {
    const correlationId = generateCorrelationId();
    const currentUser = await this.getCurrentUser();

    try {
      this.logger.info(`👤 Profile update initiated`, {
        correlationId,
        userId: currentUser?.id,
        updates: Object.keys(updates),
        operation: 'profile_update_attempt',
      });

      const startTime = Date.now();
      const updatedUser = await this.authRepository.updateProfile(updates);
      const duration = Date.now() - startTime;

      this.logger.info(`👤 Profile update successful`, {
        correlationId,
        userId: updatedUser.id,
        updates: Object.keys(updates),
        operation: 'profile_update_success',
      });

      this.logger.info(`⚡ Profile update completed`, {
        correlationId,
        userId: updatedUser.id,
        duration,
        operation: 'profile_update',
      });

      return updatedUser;
    } catch (error) {
      this.logger.error(`Profile update failed`, {
        correlationId,
        userId: currentUser?.id,
        updates: Object.keys(updates),
        operation: 'profile_update_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

}
