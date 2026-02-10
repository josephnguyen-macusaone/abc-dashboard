/**
 * Profile Validator
 * Input validation for profile management operations
 */
import { ValidationException } from '../../domain/exceptions/domain.exception.js';

export class ProfileValidator {
  /**
   * Validate update profile input
   * @param {Object} input - Update profile input data
   * @throws {ValidationException} If validation fails
   */
  static validateUpdateProfile(input) {
    const errors = [];

    // Display name validation (if provided)
    if (input.displayName !== undefined) {
      if (typeof input.displayName !== 'string') {
        errors.push({ field: 'displayName', message: 'Display name must be a string' });
      } else if (input.displayName.length === 0) {
        errors.push({ field: 'displayName', message: 'Display name cannot be empty' });
      } else if (input.displayName.length > 100) {
        errors.push({
          field: 'displayName',
          message: 'Display name must not exceed 100 characters',
        });
      }
    }

    // Bio validation (if provided)
    if (input.bio !== undefined && input.bio !== null) {
      if (typeof input.bio !== 'string') {
        errors.push({ field: 'bio', message: 'Bio must be a string' });
      } else if (input.bio.length > 500) {
        errors.push({ field: 'bio', message: 'Bio must not exceed 500 characters' });
      }
    }

    // Phone validation (if provided)
    if (input.phone !== undefined && input.phone !== null && input.phone !== '') {
      if (!this.isValidPhone(input.phone)) {
        errors.push({ field: 'phone', message: 'Invalid phone number format' });
      }
    }

    // Avatar URL validation (if provided)
    if (input.avatarUrl !== undefined && input.avatarUrl !== null && input.avatarUrl !== '') {
      if (!this.isValidUrl(input.avatarUrl)) {
        errors.push({ field: 'avatarUrl', message: 'Invalid avatar URL format' });
      }
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Check if profile update has any valid fields
   * @param {Object} input - Update input
   * @returns {boolean}
   */
  static hasValidUpdates(input) {
    const validFields = ['displayName', 'bio', 'phone', 'avatarUrl'];
    return validFields.some((field) => input[field] !== undefined);
  }

  /**
   * Sanitize profile update input
   * @param {Object} input - Raw input
   * @returns {Object} Sanitized input with only allowed fields
   */
  static sanitizeUpdateInput(input) {
    const sanitized = {};
    const allowedFields = ['displayName', 'bio', 'phone', 'avatarUrl'];

    for (const field of allowedFields) {
      if (input[field] !== undefined) {
        sanitized[field] = input[field];
      }
    }

    return sanitized;
  }

  /**
   * Validate phone format
   * @param {string} phone - Phone to validate
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  static isValidUrl(url) {
    // Simple URL validation using regex (URL constructor is not available in Node.js ESM modules without import)
    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    return urlRegex.test(url);
  }
}

export default ProfileValidator;
