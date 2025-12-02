import bcrypt from 'bcryptjs';
import logger from '../../infrastructure/config/logger.js';
import { ValidationException } from '../../domain/exceptions/domain.exception.js';

/**
 * Authentication Service
 * Handles password hashing and verification with error handling
 */
export class AuthService {
  constructor() {
    this.saltRounds = 12;
    this.correlationId = null;
    this.operationId = null;
  }

  /**
   * Hash a plain password with validation and error handling
   * @param {string} password - Plain password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      // Validate input
      if (!password || typeof password !== 'string') {
        throw new ValidationException('Password must be a non-empty string');
      }

      if (password.length < 8) {
        throw new ValidationException('Password must be at least 8 characters long');
      }

      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      return hashedPassword;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }

      logger.error('Password hashing failed', {
        correlationId: this.correlationId,
        error: error.message,
        errorType: error.constructor.name,
      });

      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify a password against its hash with error handling
   * @param {string} plainPassword - Plain password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      // Validate inputs
      if (!plainPassword || typeof plainPassword !== 'string') {
        throw new ValidationException('Plain password must be a non-empty string');
      }

      if (!hashedPassword || typeof hashedPassword !== 'string') {
        throw new ValidationException('Hashed password must be a non-empty string');
      }

      const isValid = await bcrypt.compare(plainPassword, hashedPassword);

      return isValid;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }

      logger.error('Password verification failed', {
        correlationId: this.correlationId,
        error: error.message,
        errorType: error.constructor.name,
      });

      throw new Error(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * Generate a secure temporary password
   * @returns {string} Generated temporary password
   */
  generateTemporaryPassword() {
    try {
      // Generate a 12-character password with mixed case, numbers, and special characters
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const special = '!@#$%^&*';

      let password = '';

      // Ensure at least one character from each category
      password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
      password += special.charAt(Math.floor(Math.random() * special.length));

      // Fill remaining characters randomly
      const allChars = lowercase + uppercase + numbers + special;
      for (let i = 4; i < 12; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }

      // Shuffle the password
      password = password.split('').sort(() => Math.random() - 0.5).join('');

      return password;
    } catch (error) {
      logger.error('Temporary password generation failed', {
        correlationId: this.correlationId,
        error: error.message,
        errorType: error.constructor.name,
      });

      // Fallback: generate a simple but secure password
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return `Temp${timestamp}${random}!`;
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with score and feedback
   */
  validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        score: 0,
        feedback: ['Password must be a string'],
      };
    }

    let score = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) {
      score += 25;
    } else {
      feedback.push('Password must be at least 8 characters long');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('Password must contain at least one uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('Password must contain at least one lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 25;
    } else {
      feedback.push('Password must contain at least one number');
    }

    // Special character bonus
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 10;
    }

    // Length bonus
    if (password.length >= 12) {
      score += 10;
    }

    return {
      isValid: score >= 75, // Require 75% score
      score: Math.min(score, 100),
      feedback,
    };
  }

  /**
   * Set correlation ID for request tracking (used by DI container)
   * @param {string} correlationId - Request correlation ID
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_auth` : null;
  }
}
