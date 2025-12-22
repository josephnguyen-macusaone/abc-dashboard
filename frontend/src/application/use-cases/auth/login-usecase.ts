import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { AuthResult } from '@/domain/entities/user-entity';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

export interface LoginUseCaseContract {
  execute: (
    email: string,
    password: string,
    correlationId?: string
  ) => Promise<AuthResult>;
}

/**
 * Application Use Case: Login
 * Orchestrates the login process following application-specific business rules
 */
export function createLoginUseCase(
  authRepository: IAuthRepository
): LoginUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'LoginUseCase',
  });

  function validateInput(email: string, password: string): void {
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

  function validateLoginResult(authResult: AuthResult): void {
    if (!authResult.isAuthenticated) {
      throw new Error('Authentication failed');
    }
    if (!authResult.user.isActiveUser()) {
      throw new Error('Account is not active');
    }
    const accountValidation = AuthDomainService.validateUserAccountStatus(authResult.user);
    if (!accountValidation.isValid) {
      throw new Error(accountValidation.reason);
    }
  }

  function handleLoginError(error: any, correlationId: string): Error {
    const errorMessage = error?.message || 'Login failed';

    if (errorMessage.includes('Invalid credentials')) {
      return new Error('Invalid email or password');
    }
    if (errorMessage.includes('Account locked')) {
      return new Error('Account is temporarily locked. Please try again later.');
    }
    if (errorMessage.includes('Too many attempts')) {
      return new Error('Too many failed login attempts. Please wait before trying again.');
    }

    useCaseLogger.error(`Unhandled login error: ${errorMessage}`, {
      correlationId,
      operation: 'login_unhandled_error',
      error: errorMessage,
    });

    return error instanceof Error ? error : new Error(errorMessage);
  }

  return {
    async execute(email: string, password: string, correlationId?: string): Promise<AuthResult> {
      const cid = correlationId || generateCorrelationId();

      try {
        // Validate input
        validateInput(email, password);

        // Login
        const authResult = await authRepository.login(email, password);

        // Validate login result
        validateLoginResult(authResult);

        // Return auth result
        return authResult;
      } catch (error) {
        // Log error
        useCaseLogger.error(`Failed to login`, {
          correlationId: cid,
          email,
          operation: 'login_usecase_error',
          error: error instanceof Error ? error.message : String(error),
        });

        // Throw error
        throw handleLoginError(error, cid);
      }
    },
  };
}

/**
 * Backward-compatible class wrapper.
 */
export class LoginUseCase implements LoginUseCaseContract {
  private readonly useCase = createLoginUseCase(this.authRepository);

  constructor(private readonly authRepository: IAuthRepository) {}

  execute(email: string, password: string, correlationId?: string): Promise<AuthResult> {
    return this.useCase.execute(email, password, correlationId);
  }
}
