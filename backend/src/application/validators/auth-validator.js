/**
 * Auth Validator
 * Input validation for authentication operations
 */
import { ValidationException } from '../../domain/exceptions/domain.exception.js';

export class AuthValidator {
  /**
   * Validate login input
   * @param {Object} input - Login input data
   * @throws {ValidationException} If validation fails
   */
  static validateLogin(input) {
    const errors = [];

    if (!input.email || typeof input.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!this.isValidEmail(input.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!input.password || typeof input.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Validate registration input
   * @param {Object} input - Registration input data
   * @throws {ValidationException} If validation fails
   */
  static validateRegister(input) {
    const errors = [];

    // Username validation
    if (!input.username || typeof input.username !== 'string') {
      errors.push({ field: 'username', message: 'Username is required' });
    } else if (input.username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    } else if (input.username.length > 30) {
      errors.push({ field: 'username', message: 'Username must not exceed 30 characters' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
      errors.push({
        field: 'username',
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    // Email validation
    if (!input.email || typeof input.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!this.isValidEmail(input.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Password validation
    if (!input.password || typeof input.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required' });
    } else {
      const passwordValidation = this.validatePassword(input.password);
      if (!passwordValidation.isValid) {
        errors.push(
          ...passwordValidation.errors.map((msg) => ({ field: 'password', message: msg }))
        );
      }
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Validate password change input
   * @param {Object} input - Password change input data
   * @throws {ValidationException} If validation fails
   */
  static validatePasswordChange(input) {
    const errors = [];

    if (!input.currentPassword || typeof input.currentPassword !== 'string') {
      errors.push({ field: 'currentPassword', message: 'Current password is required' });
    }

    if (!input.newPassword || typeof input.newPassword !== 'string') {
      errors.push({ field: 'newPassword', message: 'New password is required' });
    } else {
      const passwordValidation = this.validatePassword(input.newPassword);
      if (!passwordValidation.isValid) {
        errors.push(
          ...passwordValidation.errors.map((msg) => ({ field: 'newPassword', message: msg }))
        );
      }
    }

    if (input.currentPassword && input.newPassword && input.currentPassword === input.newPassword) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be different from current password',
      });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Validate refresh token input
   * @param {Object} input - Refresh token input
   * @throws {ValidationException} If validation fails
   */
  static validateRefreshToken(input) {
    if (!input.refreshToken || typeof input.refreshToken !== 'string') {
      throw new ValidationException('Refresh token is required');
    }
    return true;
  }

  /**
   * Validate password reset request
   * @param {Object} input - Password reset request input
   * @throws {ValidationException} If validation fails
   */
  static validatePasswordResetRequest(input) {
    if (!input.email || typeof input.email !== 'string') {
      throw new ValidationException('Email is required');
    }
    if (!this.isValidEmail(input.email)) {
      throw new ValidationException('Invalid email format');
    }
    return true;
  }

  /**
   * Validate password reset
   * @param {Object} input - Password reset input
   * @throws {ValidationException} If validation fails
   */
  static validatePasswordReset(input) {
    const errors = [];

    if (!input.token || typeof input.token !== 'string') {
      errors.push({ field: 'token', message: 'Reset token is required' });
    }

    if (!input.newPassword || typeof input.newPassword !== 'string') {
      errors.push({ field: 'newPassword', message: 'New password is required' });
    } else {
      const passwordValidation = this.validatePassword(input.newPassword);
      if (!passwordValidation.isValid) {
        errors.push(
          ...passwordValidation.errors.map((msg) => ({ field: 'newPassword', message: msg }))
        );
      }
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  static validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default AuthValidator;
