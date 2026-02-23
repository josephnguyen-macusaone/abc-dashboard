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
      sortBy: [
        'createdAt',
        'username',
        'email',
        'displayName',
        'role',
        'isActive',
        'lastLogin',
      ].includes(query.sortBy)
        ? query.sortBy
        : 'createdAt',
      sortOrder: ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : 'desc',
    };

    // ========================================================================
    // ENHANCED: Search filters (Phase 2.1)
    // ========================================================================
    if (query.search) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.search = query.search;

      // Search field selector (optional)
      if (
        query.searchField &&
        ['email', 'displayName', 'username', 'phone'].includes(query.searchField)
      ) {
        sanitized.filters.searchField = query.searchField;
      }
    }

    // Individual field filters
    if (query.email) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.email = query.email;
    }
    if (query.username) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.username = query.username;
    }
    if (query.displayName) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.displayName = query.displayName;
    }
    if (query.phone) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.phone = query.phone;
    }

    // ========================================================================
    // ENHANCED: Date range filters (Phase 2.2)
    // ========================================================================

    // Created date range
    if (query.createdAtFrom) {
      const date = new Date(query.createdAtFrom);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.createdAtFrom = date.toISOString();
      }
    }
    if (query.createdAtTo) {
      const date = new Date(query.createdAtTo);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.createdAtTo = date.toISOString();
      }
    }

    // Updated date range
    if (query.updatedAtFrom) {
      const date = new Date(query.updatedAtFrom);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.updatedAtFrom = date.toISOString();
      }
    }
    if (query.updatedAtTo) {
      const date = new Date(query.updatedAtTo);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.updatedAtTo = date.toISOString();
      }
    }

    // Last login date range
    if (query.lastLoginFrom) {
      const date = new Date(query.lastLoginFrom);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.lastLoginFrom = date.toISOString();
      }
    }
    if (query.lastLoginTo) {
      const date = new Date(query.lastLoginTo);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.lastLoginTo = date.toISOString();
      }
    }

    // ========================================================================
    // ENHANCED: Advanced filters (Phase 2.3)
    // ========================================================================

    // Role filter - support single value or array
    if (query.role) {
      sanitized.filters = sanitized.filters || {};

      if (typeof query.role === 'string') {
        // Handle comma-separated string
        if (query.role.includes(',')) {
          const parts = query.role.split(',');
          const roles = parts.map((v) => v.trim()).filter((r) => this.VALID_ROLES.includes(r));
          if (roles.length > 0) {
            sanitized.filters.role = roles;
          }
        } else if (this.VALID_ROLES.includes(query.role)) {
          sanitized.filters.role = query.role;
        }
      } else if (Array.isArray(query.role)) {
        // Filter to only include valid roles
        const validRoles = query.role.filter((r) => this.VALID_ROLES.includes(r));
        if (validRoles.length > 0) {
          sanitized.filters.role = validRoles;
        }
      } else if (this.VALID_ROLES.includes(query.role)) {
        sanitized.filters.role = query.role;
      }
    }

    // Active status filter - support single value or array
    if (query.isActive !== undefined) {
      sanitized.filters = sanitized.filters || {};

      if (typeof query.isActive === 'string') {
        // Handle comma-separated string
        if (query.isActive.includes(',')) {
          const parts = query.isActive.split(',');
          const booleans = parts
            .map((v) => {
              const lower = v.trim().toLowerCase();
              if (lower === 'true') {
                return true;
              }
              if (lower === 'false') {
                return false;
              }
              return null; // invalid
            })
            .filter((v) => v !== null);

          if (booleans.length > 0) {
            sanitized.filters.isActive = booleans;
          }
        } else {
          // Handle single string boolean
          const lower = query.isActive.toLowerCase();
          if (lower === 'true') {
            sanitized.filters.isActive = true;
          } else if (lower === 'false') {
            sanitized.filters.isActive = false;
          }
        }
      } else if (Array.isArray(query.isActive)) {
        // Filter to only include boolean values
        const validBooleans = query.isActive.filter((v) => typeof v === 'boolean');
        if (validBooleans.length > 0) {
          sanitized.filters.isActive = validBooleans;
        }
      } else if (typeof query.isActive === 'boolean') {
        sanitized.filters.isActive = query.isActive;
      }
    }

    // Managed by filter
    if (query.managedBy) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.managedBy = query.managedBy;
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
