/**
 * Token Manager with Proactive Refresh
 * Handles JWT token lifecycle, proactive refresh scheduling, and token validation
 */

import logger from './logger';
import { STORAGE_KEYS } from '@/shared/constants';

export interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export interface TokenManagerConfig {
  refreshThresholdMinutes: number; // Refresh token this many minutes before expiry
  minRefreshIntervalMinutes: number; // Minimum time between refresh attempts
  maxRefreshRetries: number; // Maximum number of refresh retry attempts
}

export class TokenManager {
  private refreshTimeoutId: NodeJS.Timeout | null = null;
  private lastRefreshAttempt = 0;
  private refreshInProgress = false;
  private onTokenExpired?: () => void;
  private onTokenRefreshed?: (newToken: string) => void;

  constructor(
    private config: TokenManagerConfig,
    private refreshTokenFn: () => Promise<boolean>,
    callbacks?: {
      onTokenExpired?: () => void;
      onTokenRefreshed?: (newToken: string) => void;
    }
  ) {
    this.onTokenExpired = callbacks?.onTokenExpired;
    this.onTokenRefreshed = callbacks?.onTokenRefreshed;

    logger.createChild({
      component: 'TokenManager',
    });
  }

  /**
   * Decode JWT token payload
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (error) {
      logger.error('Failed to decode token', {
        error: error instanceof Error ? error.message : String(error),
        category: 'token-management'
      });
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Get token expiration time in milliseconds
   */
  getTokenExpirationTime(token: string): number | null {
    const payload = this.decodeToken(token);
    return payload ? payload.exp * 1000 : null;
  }

  /**
   * Check if token is close to expiry
   */
  isTokenCloseToExpiry(token: string): boolean {
    const expirationTime = this.getTokenExpirationTime(token);
    if (!expirationTime) return true;

    const thresholdTime = this.config.refreshThresholdMinutes * 60 * 1000;
    const timeUntilExpiry = expirationTime - Date.now();

    return timeUntilExpiry <= thresholdTime;
  }

  /**
   * Schedule proactive token refresh
   */
  scheduleTokenRefresh(token: string): void {
    // Clear any existing timeout
    this.clearScheduledRefresh();

    if (!token || this.isTokenExpired(token)) {
      // Token is already expired, handle immediately
      this.onTokenExpired?.();
      return;
    }

    const expirationTime = this.getTokenExpirationTime(token);
    if (!expirationTime) {
      logger.warn('Could not determine token expiration time', {
        category: 'token-management'
      });
      return;
    }

    const refreshTime = expirationTime - (this.config.refreshThresholdMinutes * 60 * 1000);
    const timeUntilRefresh = refreshTime - Date.now();

    if (timeUntilRefresh <= 0) {
      // Token expires soon, refresh immediately
      this.attemptTokenRefresh();
      return;
    }

    // Schedule refresh
    this.refreshTimeoutId = setTimeout(() => {
      this.attemptTokenRefresh();
    }, timeUntilRefresh);

    logger.debug('Scheduled token refresh', {
      timeUntilRefresh: Math.round(timeUntilRefresh / 1000),
      refreshTime: new Date(refreshTime).toISOString(),
      category: 'token-management'
    });
  }

  /**
   * Attempt to refresh the token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    if (this.refreshInProgress) {
      logger.debug('Token refresh already in progress, skipping', {
        category: 'token-management'
      });
      return false;
    }

    // Check minimum refresh interval
    const timeSinceLastRefresh = Date.now() - this.lastRefreshAttempt;
    const minIntervalMs = this.config.minRefreshIntervalMinutes * 60 * 1000;

    if (timeSinceLastRefresh < minIntervalMs) {
      logger.debug('Token refresh too soon, skipping', {
        timeSinceLastRefresh: Math.round(timeSinceLastRefresh / 1000),
        minInterval: this.config.minRefreshIntervalMinutes,
        category: 'token-management'
      });
      return false;
    }

    this.refreshInProgress = true;
    this.lastRefreshAttempt = Date.now();

    try {
      logger.info('Attempting proactive token refresh', {
        category: 'token-management'
      });

      const success = await this.refreshTokenFn();

      if (success) {
        logger.info('Proactive token refresh successful', {
          category: 'token-management'
        });

        // Notify that token was refreshed
        this.onTokenRefreshed?.('refreshed-token');

        // Get the new token to schedule next refresh
        // Note: We'll need to get this from storage after refresh
        // For now, we'll rely on the auth store to call scheduleTokenRefresh again
        return true;
      } else {
        logger.warn('Proactive token refresh failed', {
          category: 'token-management'
        });

        // If refresh fails, handle token expiration
        this.onTokenExpired?.();
        return false;
      }
    } catch (error) {
      logger.error('Proactive token refresh error', {
        error: error instanceof Error ? error.message : String(error),
        category: 'token-management'
      });

      // On error, handle token expiration
      this.onTokenExpired?.();
      return false;
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Clear any scheduled token refresh
   */
  clearScheduledRefresh(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }

  /**
   * Force immediate token refresh
   */
  async forceRefresh(): Promise<boolean> {
    this.clearScheduledRefresh();
    return await this.attemptTokenRefresh();
  }

  /**
   * Get token manager stats
   */
  getStats() {
    const token = this.getCurrentToken();
    const payload = token ? this.decodeToken(token) : null;

    return {
      hasScheduledRefresh: this.refreshTimeoutId !== null,
      refreshInProgress: this.refreshInProgress,
      lastRefreshAttempt: this.lastRefreshAttempt,
      tokenExpired: token ? this.isTokenExpired(token) : true,
      tokenCloseToExpiry: token ? this.isTokenCloseToExpiry(token) : true,
      tokenExpirationTime: payload ? new Date(payload.exp * 1000).toISOString() : null,
      timeUntilExpiry: payload ? Math.max(0, payload.exp * 1000 - Date.now()) : 0
    };
  }

  /**
   * Get current token from storage
   */
  private getCurrentToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Try cookies first
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    return getCookie('token') || localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearScheduledRefresh();
    this.onTokenExpired = undefined;
    this.onTokenRefreshed = undefined;
  }
}

/**
 * Create a token manager with default configuration
 */
export function createTokenManager(
  refreshTokenFn: () => Promise<boolean>,
  callbacks?: {
    onTokenExpired?: () => void;
    onTokenRefreshed?: (newToken: string) => void;
  }
): TokenManager {
  const config: TokenManagerConfig = {
    refreshThresholdMinutes: 5, // Refresh 5 minutes before expiry
    minRefreshIntervalMinutes: 1, // Minimum 1 minute between refresh attempts
    maxRefreshRetries: 3
  };

  return new TokenManager(config, refreshTokenFn, callbacks);
}