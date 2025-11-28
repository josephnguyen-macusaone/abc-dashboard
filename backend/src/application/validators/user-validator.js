/**
 * User Validator
 * Input validation for user management operations
 */
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { ROLES } from '../../shared/constants/roles.js';

export class UserValidator {
  static VALID_ROLES = Object.values(ROLES);

  /**
   * Validate create user input
   * @param {Object} input - Create user input data
   * @throws {ValidationException} If validation fails
   */
  static validateCreateUser(input) {
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

    // Display name validation
    if (!input.displayName || typeof input.displayName !== 'string') {
      errors.push({ field: 'displayName', message: 'Display name is required' });
    } else if (input.displayName.length < 1) {
      errors.push({ field: 'displayName', message: 'Display name cannot be empty' });
    } else if (input.displayName.length > 100) {
      errors.push({ field: 'displayName', message: 'Display name must not exceed 100 characters' });
    }

    // Role validation (optional, defaults to staff)
    if (input.role && !this.VALID_ROLES.includes(input.role)) {
      errors.push({
        field: 'role',
        message: `Role must be one of: ${this.VALID_ROLES.join(', ')}`,
      });
    }

    // Phone validation (optional)
    if (input.phone && !this.isValidPhone(input.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Validate update user input
   * @param {Object} input - Update user input data
   * @throws {ValidationException} If validation fails
   */
  static validateUpdateUser(input) {
    const errors = [];

    // Username validation (if provided)
    if (input.username !== undefined) {
      if (typeof input.username !== 'string' || input.username.length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
      } else if (input.username.length > 30) {
        errors.push({ field: 'username', message: 'Username must not exceed 30 characters' });
      } else if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
        errors.push({
          field: 'username',
          message: 'Username can only contain letters, numbers, and underscores',
        });
      }
    }

    // Email validation (if provided)
    if (input.email !== undefined) {
      if (typeof input.email !== 'string' || !this.isValidEmail(input.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }
    }

    // Display name validation (if provided)
    if (input.displayName !== undefined) {
      if (typeof input.displayName !== 'string' || input.displayName.length < 1) {
        errors.push({ field: 'displayName', message: 'Display name cannot be empty' });
      } else if (input.displayName.length > 100) {
        errors.push({
          field: 'displayName',
          message: 'Display name must not exceed 100 characters',
        });
      }
    }

    // Role validation (if provided)
    if (input.role !== undefined && !this.VALID_ROLES.includes(input.role)) {
      errors.push({
        field: 'role',
        message: `Role must be one of: ${this.VALID_ROLES.join(', ')}`,
      });
    }

    // Phone validation (if provided)
    if (input.phone !== undefined && input.phone !== null && !this.isValidPhone(input.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }

    // isActive validation (if provided)
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') {
      errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }

  /**
   * Validate user ID
   * @param {string} id - User ID
   * @throws {ValidationException} If validation fails
   */
  static validateUserId(id) {
    if (!id || typeof id !== 'string') {
      throw new ValidationException('User ID is required');
    }
    // MongoDB ObjectId format
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      throw new ValidationException('Invalid user ID format');
    }
    return true;
  }

  /**
   * Validate list users query
   * @param {Object} query - Query parameters
   * @returns {Object} Sanitized query
   */
  static validateListQuery(query) {
    const sanitized = {
      page: Math.max(1, parseInt(query.page) || 1),
      limit: Math.min(100, Math.max(1, parseInt(query.limit) || 10)),
      sortBy: ['createdAt', 'username', 'email', 'displayName', 'role'].includes(query.sortBy)
        ? query.sortBy
        : 'createdAt',
      sortOrder: ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : 'desc',
    };

    // Add filters if provided
    if (query.email) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.email = query.email;
    }
    if (query.username) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.username = query.username;
    }
    if (query.role && this.VALID_ROLES.includes(query.role)) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.role = query.role;
    }

    return sanitized;
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

  /**
   * Validate phone format
   * @param {string} phone - Phone to validate
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    // Allow various phone formats
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  }
}

export default UserValidator;
