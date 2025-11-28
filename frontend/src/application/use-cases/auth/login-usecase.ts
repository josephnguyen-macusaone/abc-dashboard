import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { AuthResult } from '@/domain/entities/user-entity';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Login
 * Orchestrates the login process following application-specific business rules
 */
export class LoginUseCase {
  private readonly logger = logger.createChild({
    component: 'LoginUseCase',
  });

  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Execute login use case
   */
  async execute(email: string, password: string, correlationId?: string): Promise<AuthResult> {
    const cid = correlationId || generateCorrelationId();

    try {
      // Validate input
      this.validateInput(email, password, cid);

      // Execute login through repository
      const authResult = await this.authRepository.login(email, password);

      // Apply additional application rules
      this.validateLoginResult(authResult, cid);

      return authResult;
    } catch (error) {
      this.logger.error(`Login use case failed`, {
        correlationId: cid,
        email,
        operation: 'login_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw with application-specific error handling
      throw this.handleLoginError(error, cid);
    }
  }

  /**
   * Validate login input
   */
  private validateInput(email: string, password: string, correlationId: string): void {
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    if (!AuthDomainService.validateEmailFormat(email)) {
      throw new Error('Invalid email format');
    }

    if (!password || !password.trim()) {
      throw new Error('Password is required');
    }

    if (password.length < 1) {
      throw new Error('Password cannot be empty');
    }
  }

  /**
   * Validate login result
   */
  private validateLoginResult(authResult: AuthResult, correlationId: string): void {
    if (!authResult.isAuthenticated) {
      throw new Error('Authentication failed');
    }

    // Check if account is active
    if (!authResult.user.isActiveUser()) {
      throw new Error('Account is not active');
    }

    // Additional application-specific validations can be added here
    const accountValidation = AuthDomainService.validateUserAccountStatus(authResult.user);
    if (!accountValidation.isValid) {
      throw new Error(accountValidation.reason);
    }
  }

  /**
   * Handle login errors with application-specific logic
   */
  private handleLoginError(error: any, correlationId: string): Error {
    // Map domain errors to application errors
    const errorMessage = error?.message || 'Login failed';

    // Add application-specific error handling
    if (errorMessage.includes('Invalid credentials')) {
      return new Error('Invalid email or password');
    }

    if (errorMessage.includes('Account locked')) {
      return new Error('Account is temporarily locked. Please try again later.');
    }

    if (errorMessage.includes('Too many attempts')) {
      return new Error('Too many failed login attempts. Please wait before trying again.');
    }

    // Log unhandled error
    this.logger.error(`Unhandled login error: ${errorMessage}`, {
      correlationId,
      operation: 'login_unhandled_error',
      error: errorMessage,
    });

    // Return original error if not handled specifically
    return error instanceof Error ? error : new Error(errorMessage);
  }
}
