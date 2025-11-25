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
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string,
    role?: string,
    correlationId?: string
  ): Promise<AuthResult> {
    const cid = correlationId || generateCorrelationId();

    try {
      this.logger.debug(`Executing registration use case`, {
        correlationId: cid,
        email,
        firstName,
        lastName,
        role: role || 'staff',
        operation: 'registration_usecase_start',
      });

      // Validate input
      this.validateInput(firstName, lastName, email, password, confirmPassword, cid);

      // Determine user role
      const userRole = AuthDomainService.getDefaultRole(role);

      // Combine first and last name
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Execute registration through repository
      const authResult = await this.authRepository.register(fullName, email, password, userRole);

      // Apply additional application rules
      this.validateRegistrationResult(authResult, cid);

      this.logger.debug(`Registration use case completed successfully`, {
        correlationId: cid,
        userId: authResult.isAuthenticated ? authResult.user.id : undefined,
        email,
        firstName,
        lastName,
        operation: 'registration_usecase_success',
      });

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
    confirmPassword: string,
    correlationId: string
  ): void {
    // Validate first name
    if (!firstName || !firstName.trim()) {
      this.logger.warn(`Registration validation failed: first name required`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('First name is required');
    }

    if (firstName.trim().length < 1) {
      this.logger.warn(`Registration validation failed: first name too short`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('First name must be at least 1 character long');
    }

    if (firstName.trim().length > 25) {
      this.logger.warn(`Registration validation failed: first name too long`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('First name must be less than 25 characters long');
    }

    // Validate last name
    if (!lastName || !lastName.trim()) {
      this.logger.warn(`Registration validation failed: last name required`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('Last name is required');
    }

    if (lastName.trim().length < 1) {
      this.logger.warn(`Registration validation failed: last name too short`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('Last name must be at least 1 character long');
    }

    if (lastName.trim().length > 25) {
      this.logger.warn(`Registration validation failed: last name too long`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('Last name must be less than 25 characters long');
    }

    // Validate email
    if (!email || !email.trim()) {
      this.logger.warn(`Registration validation failed: email required`, {
        correlationId,
        name,
        operation: 'registration_validation_error',
      });
      throw new Error('Email is required');
    }

    if (!AuthDomainService.validateEmailFormat(email)) {
      this.logger.warn(`Registration validation failed: invalid email format`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!password || !password.trim()) {
      this.logger.warn(`Registration validation failed: password required`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('Password is required');
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      this.logger.warn(`Registration validation failed: passwords don't match`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
      });
      throw new Error('Passwords do not match');
    }

    // Validate password strength
    const passwordValidation = AuthDomainService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      this.logger.warn(`Registration validation failed: weak password`, {
        correlationId,
        email,
        operation: 'registration_validation_error',
        errors: passwordValidation.errors,
      });
      throw new Error(passwordValidation.errors.join('. '));
    }
  }

  /**
   * Validate registration result
   */
  private validateRegistrationResult(authResult: AuthResult, correlationId: string): void {
    if (!authResult.isAuthenticated) {
      this.logger.warn(`Registration result validation failed: not authenticated`, {
        correlationId,
        userId: authResult.user?.id,
        operation: 'registration_result_validation_error',
      });
      throw new Error('Registration failed to authenticate user');
    }

    if (!authResult.user.isActiveUser()) {
      this.logger.warn(`Registration result validation failed: account inactive`, {
        correlationId,
        userId: authResult.user.id,
        operation: 'registration_result_validation_error',
      });
      throw new Error('New account is not active. Please contact administrator.');
    }

    // Additional application-specific validations can be added here
    const accountValidation = AuthDomainService.validateUserAccountStatus(authResult.user);
    if (!accountValidation.isValid) {
      this.logger.warn(`Registration result validation failed: ${accountValidation.reason}`, {
        correlationId,
        userId: authResult.user.id,
        operation: 'registration_result_validation_error',
        reason: accountValidation.reason,
      });
      throw new Error(`Registration successful but ${accountValidation.reason}`);
    }

    this.logger.debug(`Registration result validation passed`, {
      correlationId,
      userId: authResult.user.id,
      operation: 'registration_result_validation_success',
    });
  }

  /**
   * Handle registration errors with application-specific logic
   */
  private handleRegistrationError(error: any, correlationId: string): Error {
    const errorMessage = error?.message || 'Registration failed';

    // Map domain errors to application errors
    if (errorMessage.includes('Email already exists')) {
      this.logger.warn(`🔒 Registration failed: email already exists`, {
        correlationId,
        operation: 'registration_duplicate_email',
      });
      return new Error('An account with this email already exists');
    }

    if (errorMessage.includes('Invalid role')) {
      this.logger.warn(`Registration failed: invalid role`, {
        correlationId,
        operation: 'registration_invalid_role',
      });
      return new Error('Invalid user role specified');
    }

    if (errorMessage.includes('Password too weak')) {
      this.logger.warn(`Registration failed: password too weak`, {
        correlationId,
        operation: 'registration_weak_password',
      });
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
