import { IAuthRepository } from '../../domain/repositories/i-auth-repository';
import { User, AuthResult, AuthTokens, UserRole } from '../../domain/entities/user-entity';
import { authApi } from '../api/auth';
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
   */
  private createOperationLogger(operation: string) {
    return {
      start: (correlationId: string, metadata?: Record<string, unknown>) =>
        this.logger.http(`Starting ${operation}`, {
          correlationId,
          operation: `${operation}_start`,
          ...metadata,
        }),

      success: (correlationId: string, duration: number, metadata?: Record<string, unknown>) =>
        this.logger.http(`${operation} completed`, {
          correlationId,
          duration,
          operation: `${operation}_success`,
          ...metadata,
        }),

      error: (correlationId: string, error: string, metadata?: Record<string, unknown>) =>
        this.logger.http(`${operation} - API call failed`, {
          correlationId,
          operation: `${operation}_error`,
          error,
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
        role: response.user.role,
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

  async register(
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role?: string
  ): Promise<AuthResult> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('register');

    try {
      const userRole = (role as UserRole) || UserRole.STAFF;

      logger.start(correlationId, { email, firstName, lastName, role: userRole });

      const startTime = Date.now();
      const response = await authApi.register({
        username,
        email,
        password,
        firstName,
        lastName,
        role: userRole,
      });
      const duration = Date.now() - startTime;

      // Map backend UserDto to frontend User entity format
      // Handle missing name field by using email as fallback
      const userData = {
        id: response.user.id,
        name: response.user.name || response.user.email.split('@')[0] || 'User',
        email: response.user.email,
        role: response.user.role,
        isActive: response.user.isActive,
        createdAt: new Date(response.user.createdAt),
      };

      const user = User.fromObject(userData);
      const tokens = new AuthTokens(response.tokens.accessToken, response.tokens.refreshToken);

      logger.success(correlationId, duration, { userId: user.id });

      return AuthResult.authenticated(user, tokens);
    } catch (error) {
      throw this.handleApiError(error, 'register', correlationId);
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
      // Logout should not fail - we still want to clear local state
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(correlationId, errorMessage);
      // Don't rethrow logout errors
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

  async verifyEmail(email: string, token: string): Promise<{ user: User; message: string }> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('verify_email');

    try {
      logger.start(correlationId, { email });

      const startTime = Date.now();
      const response = await authApi.verifyEmail(token);
      const duration = Date.now() - startTime;

      // Map backend UserDto to frontend User entity format
      // Handle missing name field by using email as fallback
      const userData = {
        id: response.user.id,
        name: response.user.name || response.user.email.split('@')[0] || 'User',
        email: response.user.email,
        role: response.user.role,
        isActive: response.user.isActive,
        createdAt: new Date(response.user.createdAt),
      };

      const user = User.fromObject(userData);

      logger.success(correlationId, duration, { userId: user.id });

      return { user, message: response.message };
    } catch (error) {
      throw this.handleApiError(error, 'verify_email', correlationId);
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

    return User.fromObject({
      id: userProfile.id,
      name: name,
      email: userProfile.email,
      role: userProfile.role,
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
        role: response.user.role,
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
