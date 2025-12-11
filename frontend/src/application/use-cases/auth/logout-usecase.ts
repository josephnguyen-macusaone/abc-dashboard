import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

export interface LogoutUseCaseContract {
  execute: (correlationId?: string) => Promise<void>;
}

function performApplicationCleanup(correlationId: string): void {
  clearApplicationCache();
  resetApplicationState();
  logLogoutEvent(correlationId);
}

function clearApplicationCache(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('dashboard_filters');
      sessionStorage.clear();
    }
  } catch {
    // non-fatal
  }
}

function resetApplicationState(): void {
  try {
    // placeholder for state reset hooks
  } catch {
    // non-fatal
  }
}

function logLogoutEvent(correlationId: string): void {
  try {
    // placeholder for analytics hook
    logger.info('User logout', { correlationId, operation: 'user_logout' });
  } catch {
    // non-fatal
  }
}

export function createLogoutUseCase(
  authRepository: IAuthRepository
): LogoutUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'LogoutUseCase',
  });

  return {
    async execute(correlationId?: string): Promise<void> {
      const cid = correlationId || generateCorrelationId();
      try {
        await authRepository.logout();
        performApplicationCleanup(cid);
      } catch (error) {
        useCaseLogger.warn('Logout use case encountered an error; proceeding with local cleanup', {
          correlationId: cid,
          operation: 'logout_usecase_warn',
          error: error instanceof Error ? error.message : String(error),
        });
        performApplicationCleanup(cid);
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
