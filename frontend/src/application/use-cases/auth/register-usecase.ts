import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { AuthResult } from '@/domain/entities/user-entity';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Register
 * Orchestrates the user registration process following application-specific business rules
 */
export class RegisterUseCase {
  private readonly logger = logger.createChild({
    component: 'RegisterUseCase',
  });

  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Execute registration use case
   */
  async execute(
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role?: string,
    correlationId?: string
  ): Promise<AuthResult> {
    const cid = correlationId || generateCorrelationId();

    try {
      // Validate input
      this.validateInput(firstName, lastName, email, password, cid);

      // Determine user role
      const userRole = AuthDomainService.getDefaultRole(role);

      // Execute registration through repository
      const authResult = await this.authRepository.register(username, firstName, lastName, email, password, userRole);

      // Apply additional application rules
      this.validateRegistrationResult(authResult, cid);

      return authResult;
    } catch (error) {
      this.logger.error(`Registration use case failed`, {
        correlationId: cid,
        email,
        firstName,
        lastName,
        operation: 'registration_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw with application-specific error handling
      throw this.handleRegistrationError(error, cid);
    }
  }

  /**
   * Validate registration input
   */
  private validateInput(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    correlationId: string
  ): void {
    // Validate first name
    if (!firstName || !firstName.trim()) {
      throw new Error('First name is required');
    }

    if (firstName.trim().length < 1) {
      throw new Error('First name must be at least 1 character long');
    }

    if (firstName.trim().length > 25) {
      throw new Error('First name must be less than 25 characters long');
    }

    // Validate last name
    if (!lastName || !lastName.trim()) {
      throw new Error('Last name is required');
    }

    if (lastName.trim().length < 1) {
      throw new Error('Last name must be at least 1 character long');
    }

    if (lastName.trim().length > 25) {
      throw new Error('Last name must be less than 25 characters long');
    }

    // Validate email
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    if (!AuthDomainService.validateEmailFormat(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!password || !password.trim()) {
      throw new Error('Password is required');
    }


    // Validate password strength
    const passwordValidation = AuthDomainService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join('. '));
    }
  }

  /**
   * Validate registration result
   */
  private validateRegistrationResult(authResult: AuthResult, correlationId: string): void {
    if (!authResult.isAuthenticated) {
      throw new Error('Registration failed to authenticate user');
    }

    // Note: New users are inactive until email verification
    // The isActiveUser() check is not applied during registration

    // Note: Account status validation is not applied during registration
    // New users are inactive until email verification
  }

  /**
   * Handle registration errors with application-specific logic
   */
  private handleRegistrationError(error: any, correlationId: string): Error {
    const errorMessage = error?.message || 'Registration failed';

    // Map domain errors to application errors
    if (errorMessage.includes('Email already exists')) {
      return new Error('An account with this email already exists');
    }

    if (errorMessage.includes('Invalid role')) {
      return new Error('Invalid user role specified');
    }

    if (errorMessage.includes('Password too weak')) {
      return new Error('Password does not meet security requirements');
    }

    // Log unhandled error
    this.logger.error(`Unhandled registration error: ${errorMessage}`, {
      correlationId,
      operation: 'registration_unhandled_error',
      error: errorMessage,
    });

    // Return original error if not handled specifically
    return error instanceof Error ? error : new Error(errorMessage);
  }
}
