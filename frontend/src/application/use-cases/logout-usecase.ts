import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Logout
 * Orchestrates the logout process following application-specific business rules
 */
export class LogoutUseCase {
  private readonly logger = logger.createChild({
    component: 'LogoutUseCase',
  });

  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Execute logout use case
   */
  async execute(correlationId?: string): Promise<void> {
    const cid = correlationId || generateCorrelationId();

    try {
      this.logger.debug(`Executing logout use case`, {
        correlationId: cid,
        operation: 'logout_usecase_start',
      });

      // Execute logout through repository
      await this.authRepository.logout();

      // Additional application cleanup can be performed here
      this.performApplicationCleanup(cid);

      this.logger.debug(`Logout use case completed successfully`, {
        correlationId: cid,
        operation: 'logout_usecase_success',
      });
    } catch (error) {
      // Log the error but don't fail the logout operation
      this.logger.warn(`Logout use case encountered an error`, {
        correlationId: cid,
        operation: 'logout_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });

      // Still perform local cleanup even if API call fails
      this.performApplicationCleanup(cid);

      // For logout, we typically don't throw errors to ensure user gets logged out locally
      // But we could throw if it's a critical error
    }
  }

  /**
   * Perform application-specific cleanup after logout
   */
  private performApplicationCleanup(correlationId: string): void {
    // Clear any cached data
    this.clearApplicationCache(correlationId);

    // Reset any application state
    this.resetApplicationState(correlationId);

    // Log the logout event
    this.logLogoutEvent(correlationId);
  }

  /**
   * Clear application cache
   */
  private clearApplicationCache(correlationId: string): void {
    try {
      // Clear local storage cache
      if (typeof window !== 'undefined') {
        // Clear specific cache keys (example)
        localStorage.removeItem('user_preferences');
        localStorage.removeItem('dashboard_filters');

        // Clear session storage
        sessionStorage.clear();
      }

      this.logger.debug(`Application cache cleared successfully`, {
        correlationId,
        operation: 'cache_clear_success',
      });
    } catch (error) {
      this.logger.warn(`Failed to clear application cache`, {
        correlationId,
        operation: 'cache_clear_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reset application state
   */
  private resetApplicationState(correlationId: string): void {
    try {
      // Reset any global state or context
      // This could include resetting forms, clearing navigation state, etc.
      // For now, this is a placeholder for future state management cleanup

      this.logger.debug(`Application state reset successfully`, {
        correlationId,
        operation: 'state_reset_success',
      });
    } catch (error) {
      this.logger.warn(`Failed to reset application state`, {
        correlationId,
        operation: 'state_reset_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Log logout event for analytics/auditing
   */
  private logLogoutEvent(correlationId: string): void {
    try {
      // Log logout event (could be sent to analytics service)
      this.logger.info(`👤 User logout event recorded`, {
        correlationId,
        operation: 'logout_event_logged',
      });

      // In a real application, this might send to analytics:
      // analytics.track('user_logout', { timestamp: new Date(), correlationId });
    } catch (error) {
      this.logger.warn(`Failed to log logout event`, {
        correlationId,
        operation: 'logout_event_log_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
