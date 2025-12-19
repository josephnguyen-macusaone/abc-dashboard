import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { User, AuthResult, AuthTokens, UserRole } from '@/domain/entities/user-entity';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { authApi } from '@/infrastructure/api/auth';
import { UserProfileDto } from '@/application/dto/api-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Infrastructure Repository: Authentication
 * Concrete implementation of IAuthRepository using external API
 */
export class AuthRepository implements IAuthRepository {
  private readonly logger = logger.createChild({
    component: 'AuthRepository',
  });

  /**
   * Standardized logging utilities for consistent operation tracking
   * Only logs errors and warnings to reduce noise
   */
  private createOperationLogger(operation: string) {
    return {
      start: (correlationId: string, metadata?: Record<string, unknown>) => {
        // Only log start in development for debugging
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(`Starting ${operation}`, {
          correlationId,
            category: 'api-details',
          ...metadata,
          });
        }
      },

      success: (correlationId: string, duration: number, metadata?: Record<string, unknown>) => {
        // Only log slow operations (>1s) to reduce noise
        if (duration > 1000) {
          this.logger.warn(`${operation} completed slowly`, {
          correlationId,
          duration,
            category: 'performance',
          ...metadata,
          });
        }
      },

      error: (correlationId: string, error: string, metadata?: Record<string, unknown>) =>
        this.logger.error(`${operation} failed`, {
          correlationId,
          operation: `${operation}_error`,
          error,
          category: 'api-error',
          ...metadata,
        }),
    };
  }

  /**
   * Handles API errors consistently across all methods
   */
  private handleApiError(error: unknown, operation: string, correlationId: string): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logger = this.createOperationLogger(operation);
    logger.error(correlationId, errorMessage);
    return error instanceof Error ? error : new Error(errorMessage);
  }
  async login(email: string, password: string): Promise<AuthResult> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('login');

    try {
      logger.start(correlationId, { email });

      const startTime = Date.now();
      const response = await authApi.login({ email, password });
      const duration = Date.now() - startTime;

      // Map backend UserDto to frontend User entity format
      // Handle missing name field by using email as fallback
      const userData = {
        id: response.user.id,
        name: response.user.name || response.user.email.split('@')[0] || 'User',
        email: response.user.email,
        role: AuthDomainService.getDefaultRole(response.user.role),
        isActive: response.user.isActive,
        createdAt: new Date(response.user.createdAt),
      };

      const user = User.fromObject(userData);
      const tokens = new AuthTokens(response.tokens.accessToken, response.tokens.refreshToken);

      logger.success(correlationId, duration, { userId: user.id });

      return AuthResult.authenticated(user, tokens);
    } catch (error) {
      throw this.handleApiError(error, 'login', correlationId);
    }
  }


  async logout(): Promise<void> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('logout');

    try {
      logger.start(correlationId);

      const startTime = Date.now();
      await authApi.logout();
      const duration = Date.now() - startTime;

      logger.success(correlationId, duration);
    } catch (error) {
      throw this.handleApiError(error, 'logout', correlationId);
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('refresh_token');

    try {
      logger.start(correlationId);

      const startTime = Date.now();
      const response = await authApi.refreshToken();
      const duration = Date.now() - startTime;

      const tokens = new AuthTokens(response.tokens.accessToken, response.tokens.refreshToken);

      logger.success(correlationId, duration);

      return tokens;
    } catch (error) {
      throw this.handleApiError(error, 'refresh_token', correlationId);
    }
  }



  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('change_password');

    try {
      logger.start(correlationId);

      const startTime = Date.now();
      await authApi.changePassword({ currentPassword, newPassword });
      const duration = Date.now() - startTime;

      logger.success(correlationId, duration);
    } catch (error) {
      throw this.handleApiError(error, 'change_password', correlationId);
    }
  }

  async getProfile(): Promise<User> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('get_profile');

    try {
      logger.start(correlationId);

      const startTime = Date.now();
      const response = await authApi.getProfile();
      const duration = Date.now() - startTime;

      // Map UserProfileDto to User domain entity
      const user = this.mapUserProfileToDomain(response);

      logger.success(correlationId, duration);

      return user;
    } catch (error) {
      throw this.handleApiError(error, 'get_profile', correlationId);
    }
  }

  /**
   * Maps a UserProfileDto from the API to a User domain entity
   */
  private mapUserProfileToDomain(userProfile: UserProfileDto): User {
    // Ensure we have a valid name field - use displayName, then username, then email prefix as fallback
    const name = userProfile.displayName || userProfile.username || userProfile.email.split('@')[0] || 'User';

    const normalizedRole = AuthDomainService.getDefaultRole(userProfile.role);

    return User.fromObject({
      id: userProfile.id,
      name: name,
      email: userProfile.email,
      role: normalizedRole,
      isActive: userProfile.isActive,
      username: userProfile.username,
      avatar: userProfile.avatarUrl,
      displayName: userProfile.displayName,
      phone: userProfile.phone,
      bio: userProfile.bio,
      isFirstLogin: userProfile.isFirstLogin,
      langKey: userProfile.langKey,
      updatedAt: new Date(userProfile.updatedAt),
      createdAt: new Date(userProfile.createdAt),
      createdBy: userProfile.createdBy,
      lastModifiedBy: userProfile.lastModifiedBy,
    });
  }

  async updateProfile(updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>): Promise<User> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('update_profile');

    try {
      logger.start(correlationId, { updates: Object.keys(updates) });

      const startTime = Date.now();
      const response = await authApi.updateProfile(updates);
      const duration = Date.now() - startTime;

      // Map backend user response to frontend User entity format
      // Handle missing name field by using email as fallback
      const userData = {
        id: response.user.id,
        name: response.user.name || response.user.email.split('@')[0] || 'User',
        email: response.user.email,
        role: AuthDomainService.getDefaultRole(response.user.role),
        isActive: response.user.isActive,
        createdAt: new Date(response.user.createdAt),
      };

      const user = User.fromObject(userData);

      logger.success(correlationId, duration, { userId: user.id, updates: Object.keys(updates) });

      return user;
    } catch (error) {
      throw this.handleApiError(error, 'update_profile', correlationId);
    }
  }
}
