import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { CookieService } from '@/infrastructure/storage/cookie-service';
import { LocalStorageService } from '@/infrastructure/storage/local-storage-service';
import { httpClient } from '@/infrastructure/api/core/client';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

export interface LogoutUseCaseContract {
  execute: (correlationId?: string) => Promise<void>;
}

/**
 * Application Use Case: Logout
 * Handles the business logic for logging out a user
 */
export function createLogoutUseCase(
  authRepository: IAuthRepository
): LogoutUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'LogoutUseCase',
  });

  /*
    Executes the logout use case
  */
  return {
    async execute(correlationId?: string): Promise<void> {
      const cid = correlationId || generateCorrelationId();

      // Generate correlation ID
      try {
        // Attempt API logout (non-blocking if it fails)
        await authRepository.logout();
      } catch (error) {
        // Log API failures as warnings
        useCaseLogger.warn('API logout failed; proceeding with local cleanup', {
          correlationId: cid,
          operation: 'logout_api_failed',
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with cleanup even if API call fails
      }

      // Always perform local cleanup
      try {
        CookieService.clearAuthCookies();
        LocalStorageService.clearAuthData();
        httpClient.setAuthToken(null);

        // Log successful cleanup (only in development)
        if (process.env.NODE_ENV === 'development') {
          useCaseLogger.debug('Auth cleanup completed', {
            correlationId: cid,
            category: 'auth-debug',
            operation: 'auth_cleanup_success'
          });
        }
      } catch (error) {
        useCaseLogger.warn('Auth cleanup failed', {
          correlationId: cid,
          operation: 'auth_cleanup_error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  };
}

/**
 * Backward-compatible class wrapper.
 */
export class LogoutUseCase implements LogoutUseCaseContract {
  private readonly useCase = createLogoutUseCase(this.authRepository);

  constructor(private readonly authRepository: IAuthRepository) {}

  execute(correlationId?: string): Promise<void> {
    return this.useCase.execute(correlationId);
  }
}
