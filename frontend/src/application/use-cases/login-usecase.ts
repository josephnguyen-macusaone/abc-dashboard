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
      this.logger.debug(`Executing login use case`, {
        correlationId: cid,
        email,
        operation: 'login_usecase_start',
      });

      // Validate input
      this.validateInput(email, password, cid);

      // Execute login through repository
      const authResult = await this.authRepository.login(email, password);

      // Apply additional application rules
      this.validateLoginResult(authResult, cid);

      this.logger.debug(`Login use case completed successfully`, {
        correlationId: cid,
        userId: authResult.isAuthenticated ? authResult.user.id : undefined,
        operation: 'login_usecase_success',
      });

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
      this.logger.warn(`Login validation failed: email required`, {
        correlationId,
        email,
        operation: 'login_validation_error',
      });
      throw new Error('Email is required');
    }

    if (!AuthDomainService.validateEmailFormat(email)) {
      this.logger.warn(`Login validation failed: invalid email format`, {
        correlationId,
        email,
        operation: 'login_validation_error',
      });
      throw new Error('Invalid email format');
    }

    if (!password || !password.trim()) {
      this.logger.warn(`Login validation failed: password required`, {
        correlationId,
        email,
        operation: 'login_validation_error',
      });
      throw new Error('Password is required');
    }

    if (password.length < 1) {
      this.logger.warn(`Login validation failed: password empty`, {
        correlationId,
        email,
        operation: 'login_validation_error',
      });
      throw new Error('Password cannot be empty');
    }
  }

  /**
   * Validate login result
   */
  private validateLoginResult(authResult: AuthResult, correlationId: string): void {
    if (!authResult.isAuthenticated) {
      this.logger.warn(`Login result validation failed: not authenticated`, {
        correlationId,
        userId: authResult.user?.id,
        operation: 'login_result_validation_error',
      });
      throw new Error('Authentication failed');
    }

    // Temporarily allow login even for inactive accounts (for admin/setup purposes)
    // TODO: Re-enable this check after running database seed
    // if (!authResult.user.isActiveUser()) {
    //   this.logger.warn(`Login result validation failed: account inactive`, {
    //     correlationId,
    //     userId: authResult.user.id,
    //     operation: 'login_result_validation_error',
    //   });
    //   throw new Error('Account is not active');
    // }

    // Additional application-specific validations can be added here
    // Temporarily allow login even for accounts with status issues (for admin/setup purposes)
    // TODO: Re-enable this check after running database seed
    // const accountValidation = AuthDomainService.validateUserAccountStatus(authResult.user);
    // if (!accountValidation.isValid) {
    //   this.logger.warn(`Login result validation failed: ${accountValidation.reason}`, {
    //     correlationId,
    //     userId: authResult.user.id,
    //     operation: 'login_result_validation_error',
    //     reason: accountValidation.reason,
    //   });
    //   throw new Error(accountValidation.reason);
    // }

    this.logger.debug(`Login result validation passed`, {
      correlationId,
      userId: authResult.user.id,
      operation: 'login_result_validation_success',
    });
  }

  /**
   * Handle login errors with application-specific logic
   */
  private handleLoginError(error: any, correlationId: string): Error {
    // Map domain errors to application errors
    const errorMessage = error?.message || 'Login failed';

    // Add application-specific error handling
    if (errorMessage.includes('Invalid credentials')) {
      this.logger.warn(`🔒 Login failed: invalid credentials`, {
        correlationId,
        operation: 'login_credential_error',
      });
      return new Error('Invalid email or password');
    }

    if (errorMessage.includes('Account locked')) {
      this.logger.warn(`🔒 Login failed: account locked`, {
        correlationId,
        operation: 'login_account_locked',
      });
      return new Error('Account is temporarily locked. Please try again later.');
    }

    if (errorMessage.includes('Too many attempts')) {
      this.logger.warn(`🔒 Login failed: too many attempts`, {
        correlationId,
        operation: 'login_rate_limit',
      });
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
