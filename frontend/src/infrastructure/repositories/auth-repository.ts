import { IAuthRepository } from '../../domain/repositories/i-auth-repository';
import { User, AuthResult, AuthTokens, UserRole } from '../../domain/entities/user-entity';
import { authApi } from '../api';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Infrastructure Repository: Authentication
 * Concrete implementation of IAuthRepository using external API
 */
export class AuthRepository implements IAuthRepository {
  private readonly logger = logger.createChild({
    component: 'AuthRepository',
  });
  async login(email: string, password: string): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`🌐 Making login API call`, {
        correlationId,
        email,
        operation: 'login_api_request',
      });

      const startTime = Date.now();
      const response = await authApi.login({ email, password });
      const duration = Date.now() - startTime;

      const user = User.fromObject(response.user);
      const tokens = new AuthTokens(response.tokens.accessToken, response.tokens.refreshToken);

      this.logger.http(`Login API call successful`, {
        correlationId,
        userId: user.id,
        duration,
        operation: 'login_api_success',
      });

      return AuthResult.authenticated(user, tokens);
    } catch (error) {
      this.logger.http(`Login API call failed`, {
        correlationId,
        email,
        operation: 'login_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Let the use case handle error transformation
    }
  }

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role?: string
  ): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      const userRole = (role as UserRole) || UserRole.STAFF;

      this.logger.http(`Making register API call`, {
        correlationId,
        email,
        firstName,
        lastName,
        role: userRole,
        operation: 'register_api_request',
      });

      const startTime = Date.now();
      const response = await authApi.register({
        email,
        password,
        firstName,
        lastName,
        role: userRole,
      });
      const duration = Date.now() - startTime;

      const user = User.fromObject(response.user);
      const tokens = new AuthTokens(response.tokens.accessToken, response.tokens.refreshToken);

      this.logger.http(`Register API call successful`, {
        correlationId,
        userId: user.id,
        duration,
        operation: 'register_api_success',
      });

      return AuthResult.authenticated(user, tokens);
    } catch (error) {
      this.logger.http(`Register API call failed`, {
        correlationId,
        email,
        firstName,
        lastName,
        operation: 'register_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`Making logout API call`, {
        correlationId,
        operation: 'logout_api_request',
      });

      const startTime = Date.now();
      await authApi.logout();
      const duration = Date.now() - startTime;

      this.logger.http(`Logout API call successful`, {
        correlationId,
        duration,
        operation: 'logout_api_success',
      });
    } catch (error) {
      // Logout should not fail - we still want to clear local state
      this.logger.http(`Logout API call failed`, {
        correlationId,
        operation: 'logout_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAuthStatus(): Promise<AuthResult> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`Making getAuthStatus API call`, {
        correlationId,
        operation: 'auth_status_api_request',
      });

      const startTime = Date.now();
      const response = await authApi.getStatus();
      const duration = Date.now() - startTime;

      if (response.isAuthenticated && response.user) {
        const user = User.fromObject(response.user);
        const tokens = new AuthTokens(''); // Token would be in cookies/storage

        this.logger.http(`Auth status API call successful - authenticated`, {
          correlationId,
          userId: user.id,
          duration,
          operation: 'auth_status_api_success',
        });

        return AuthResult.authenticated(user, tokens);
      }

      this.logger.http(`Auth status API call successful - not authenticated`, {
        correlationId,
        duration,
        operation: 'auth_status_api_success',
      });

      return AuthResult.unauthenticated();
    } catch (error) {
      this.logger.http(`Auth status API call failed`, {
        correlationId,
        operation: 'auth_status_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      return AuthResult.unauthenticated();
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`Making refresh token API call`, {
        correlationId,
        operation: 'refresh_token_api_request',
      });

      const startTime = Date.now();
      const response = await authApi.refreshToken();
      const duration = Date.now() - startTime;

      const tokens = new AuthTokens(response.tokens.accessToken, response.tokens.refreshToken);

      this.logger.http(`Refresh token API call successful`, {
        correlationId,
        duration,
        operation: 'refresh_token_api_success',
      });

      return tokens;
    } catch (error) {
      this.logger.http(`Refresh token API call failed`, {
        correlationId,
        operation: 'refresh_token_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`Making verify email API call`, {
        correlationId,
        operation: 'verify_email_api_request',
      });

      const startTime = Date.now();
      await authApi.verifyEmail(token);
      const duration = Date.now() - startTime;

      this.logger.http(`Verify email API call successful`, {
        correlationId,
        duration,
        operation: 'verify_email_api_success',
      });
    } catch (error) {
      this.logger.http(`Verify email API call failed`, {
        correlationId,
        operation: 'verify_email_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }


  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      this.logger.http(`Making change password API call`, {
        correlationId,
        operation: 'change_password_api_request',
      });

      const startTime = Date.now();
      await authApi.changePassword(currentPassword, newPassword);
      const duration = Date.now() - startTime;

      this.logger.http(`Change password API call successful`, {
        correlationId,
        duration,
        operation: 'change_password_api_success',
      });
    } catch (error) {
      this.logger.http(`Change password API call failed`, {
        correlationId,
        operation: 'change_password_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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

    try {
      this.logger.http(`Making update profile API call`, {
        correlationId,
        updates: Object.keys(updates),
        operation: 'update_profile_api_request',
      });

      const startTime = Date.now();
      const response = await authApi.updateProfile(updates);
      const duration = Date.now() - startTime;

      const user = User.fromObject(response);

      this.logger.http(`Update profile API call successful`, {
        correlationId,
        userId: user.id,
        updates: Object.keys(updates),
        duration,
        operation: 'update_profile_api_success',
      });

      return user;
    } catch (error) {
      this.logger.http(`Update profile API call failed`, {
        correlationId,
        updates: Object.keys(updates),
        operation: 'update_profile_api_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
