import { User } from '@/domain/entities/user-entity';
import { COOKIE_CONFIG } from '@/shared/constants';
import logger from '@/shared/utils/logger';

/**
 * Infrastructure Service: Cookies
 * Handles browser cookie operations for server-side access
 */
export class CookieService {
  private static readonly logger = logger.createChild({
    component: 'CookieService',
  });
  /**
   * Set a cookie with default options
   */
  private static setCookie(
    name: string,
    value: string,
    options: {
      days?: number;
      path?: string;
      domain?: string;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
    } = {}
  ): void {
    if (typeof window === 'undefined') return;

    const {
        days = COOKIE_CONFIG.USER_EXPIRY_DAYS,
      path = '/',
        secure = COOKIE_CONFIG.SECURE,
      sameSite = COOKIE_CONFIG.SAME_SITE,
    } = options;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    let cookieString = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=${path}`;

    if (secure) {
      cookieString += ';Secure';
    }

    cookieString += `;SameSite=${sameSite}`;

    document.cookie = cookieString;
  }

  /**
   * Get a cookie value
   */
  private static getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    }

    return null;
  }

  /**
   * Remove a cookie
   */
  private static removeCookie(name: string, path: string = '/'): void {
    if (typeof window === 'undefined') return;

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};`;
  }

  /**
   * Token operations
   */
  static setToken(token: string, days: number = COOKIE_CONFIG.TOKEN_EXPIRY_DAYS): void {
    this.setCookie('token', token, { days, secure: COOKIE_CONFIG.SECURE, sameSite: COOKIE_CONFIG.SAME_SITE as 'Strict' | 'Lax' | 'None' });
  }

  static getToken(): string | null {
    return this.getCookie('token');
  }

  static removeToken(): void {
    this.removeCookie('token');
  }

  /**
   * User operations
   */
    static setUser(user: User, days: number = COOKIE_CONFIG.USER_EXPIRY_DAYS): void {
    const userData = JSON.stringify(user.toObject());
    this.setCookie('user', userData, { days, secure: COOKIE_CONFIG.SECURE, sameSite: COOKIE_CONFIG.SAME_SITE as 'Strict' | 'Lax' | 'None' });
  }

  static getUser(): User | null {
    try {
      const userData = this.getCookie('user');
      if (!userData) return null;

      const userObj = JSON.parse(userData);

      // Ensure name field exists - provide fallback if missing
      if (!userObj.name) {
        userObj.name = userObj.displayName || userObj.username || userObj.email?.split('@')[0] || 'User';
      }

      return User.fromObject(userObj);
    } catch (error) {
      CookieService.logger.warn('Failed to parse user from cookie', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  static removeUser(): void {
    this.removeCookie('user');
  }

  /**
   * Clear all authentication cookies
   */
  static clearAuthCookies(): void {
    this.removeToken();
    this.removeUser();
  }

  /**
   * Check if cookies are available
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      this.setCookie('__cookie_test__', 'test', { days: 0 });
      const test = this.getCookie('__cookie_test__');
      this.removeCookie('__cookie_test__');
      return test === 'test';
    } catch {
      return false;
    }
  }

  /**
   * Get all cookies as an object
   */
  static getAllCookies(): Record<string, string> {
    if (typeof window === 'undefined') return {};

    const cookies: Record<string, string> = {};
    const cookieString = document.cookie;

    if (!cookieString) return cookies;

    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });

    return cookies;
  }
}
