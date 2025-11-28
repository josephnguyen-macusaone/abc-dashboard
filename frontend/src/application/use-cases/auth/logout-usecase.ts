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
      // Execute logout through repository
      await this.authRepository.logout();

      // Additional application cleanup can be performed here
      this.performApplicationCleanup(cid);
    } catch (error) {
      // Log the error but don't fail the logout operation

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
    } catch (error) {
      // Failed to clear application cache - continue with logout
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
    } catch (error) {
      // Failed to reset application state - continue with logout
    }
  }

  /**
   * Log logout event for analytics/auditing
   */
  private logLogoutEvent(correlationId: string): void {
    try {
      // Log logout event (could be sent to analytics service)
      // In a real application, this might send to analytics:
      // analytics.track('user_logout', { timestamp: new Date(), correlationId });
    } catch (error) {
      // Failed to log logout event - continue with logout
    }
  }
}
