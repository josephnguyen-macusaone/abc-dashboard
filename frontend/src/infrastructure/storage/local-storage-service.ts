import { User, AuthTokens } from '@/domain/entities/user-entity';
import logger from '@/shared/utils/logger';
import { STORAGE_KEYS } from '@/shared/constants';

/**
 * Infrastructure Service: Local Storage
 * Handles browser local storage and session storage operations
 */
export class LocalStorageService {
  private static readonly logger = logger.createChild({
    component: 'LocalStorageService',
  });
  private static get TOKEN_KEY() { return STORAGE_KEYS.TOKEN; }
  private static get USER_KEY() { return STORAGE_KEYS.USER; }
  private static get REFRESH_TOKEN_KEY() { return STORAGE_KEYS.REFRESH_TOKEN; }
  private static get THEME_KEY() { return STORAGE_KEYS.THEME; }

  /**
   * Token operations
   */
  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to store token', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to retrieve token', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to remove token', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * User operations
   */
  static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user.toObject()));
    } catch (error) {
      LocalStorageService.logger.warn('Failed to store user', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      if (!userData) return null;

      const userObj = JSON.parse(userData);

      // Ensure name field exists - provide fallback if missing
      if (!userObj.name) {
        userObj.name = userObj.displayName || userObj.username || userObj.email?.split('@')[0] || 'User';
      }

      return User.fromObject(userObj);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to retrieve user', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  static removeUser(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to remove user', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Refresh token operations
   */
  static setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to store refresh token', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to retrieve refresh token', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  static removeRefreshToken(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to remove refresh token', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Theme operations
   */
  static setTheme(theme: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to store theme', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static getTheme(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(this.THEME_KEY);
    } catch (error) {
      LocalStorageService.logger.warn('Failed to retrieve theme', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  static clearAuthData(): void {
    this.removeToken();
    this.removeUser();
    this.removeRefreshToken();
  }

  /**
   * Clear all data
   */
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
    } catch (error) {
      LocalStorageService.logger.warn('Failed to clear localStorage', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}
