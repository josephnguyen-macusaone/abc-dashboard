/**
 * User Validator
 * Input validation for user management operations
 */
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { ROLES } from '../../shared/constants/roles.js';

const SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'username',
  'email',
  'displayName',
  'role',
  'isActive',
  'lastLogin',
];
const SEARCH_FIELD_OPTIONS = ['email', 'displayName', 'username', 'phone'];

export class UserValidator {
  static VALID_ROLES = Object.values(ROLES);

  /**
   * Validate create user input
   * @param {Object} input - Create user input data
   * @throws {ValidationException} If validation fails
   */
  static validateCreateUser(input) {
    const errors = UserValidator._collectCreateUserErrors(input);
    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }
    return true;
  }

  static _collectCreateUserErrors(input) {
    const errors = [];
    UserValidator._validateCreateUsername(input, errors);
    UserValidator._validateCreateEmail(input, errors);
    UserValidator._validateCreateDisplayName(input, errors);
    UserValidator._validateCreateRole(input, errors);
    UserValidator._validateCreatePhone(input, errors);
    return errors;
  }

  static _validateCreateUsername(input, errors) {
    if (!input.username || typeof input.username !== 'string') {
      errors.push({ field: 'username', message: 'Username is required' });
      return;
    }
    if (input.username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
      return;
    }
    if (input.username.length > 30) {
      errors.push({ field: 'username', message: 'Username must not exceed 30 characters' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
      errors.push({
        field: 'username',
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }
  }

  static _validateCreateEmail(input, errors) {
    if (!input.email || typeof input.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required' });
      return;
    }
    if (!UserValidator.isValidEmail(input.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }

  static _validateCreateDisplayName(input, errors) {
    if (!input.displayName || typeof input.displayName !== 'string') {
      errors.push({ field: 'displayName', message: 'Display name is required' });
      return;
    }
    if (input.displayName.length < 1) {
      errors.push({ field: 'displayName', message: 'Display name cannot be empty' });
      return;
    }
    if (input.displayName.length > 100) {
      errors.push({ field: 'displayName', message: 'Display name must not exceed 100 characters' });
    }
  }

  static _validateCreateRole(input, errors) {
    if (input.role && !UserValidator.VALID_ROLES.includes(input.role)) {
      errors.push({
        field: 'role',
        message: `Role must be one of: ${UserValidator.VALID_ROLES.join(', ')}`,
      });
    }
  }

  static _validateCreatePhone(input, errors) {
    if (input.phone && !UserValidator.isValidPhone(input.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }
  }

  /**
   * Validate update user input
   * @param {Object} input - Update user input data
   * @throws {ValidationException} If validation fails
   */
  static validateUpdateUser(input) {
    const errors = UserValidator._collectUpdateUserErrors(input);
    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }
    return true;
  }

  static _collectUpdateUserErrors(input) {
    const errors = [];
    UserValidator._validateUpdateUsername(input, errors);
    UserValidator._validateUpdateEmail(input, errors);
    UserValidator._validateUpdateDisplayName(input, errors);
    UserValidator._validateUpdateRole(input, errors);
    UserValidator._validateUpdatePhone(input, errors);
    UserValidator._validateUpdateIsActive(input, errors);
    return errors;
  }

  static _validateUpdateUsername(input, errors) {
    if (input.username === undefined) {
      return;
    }
    if (typeof input.username !== 'string' || input.username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
      return;
    }
    if (input.username.length > 30) {
      errors.push({ field: 'username', message: 'Username must not exceed 30 characters' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
      errors.push({
        field: 'username',
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }
  }

  static _validateUpdateEmail(input, errors) {
    if (input.email === undefined) {
      return;
    }
    if (typeof input.email !== 'string' || !UserValidator.isValidEmail(input.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }

  static _validateUpdateDisplayName(input, errors) {
    if (input.displayName === undefined) {
      return;
    }
    if (typeof input.displayName !== 'string' || input.displayName.length < 1) {
      errors.push({ field: 'displayName', message: 'Display name cannot be empty' });
      return;
    }
    if (input.displayName.length > 100) {
      errors.push({
        field: 'displayName',
        message: 'Display name must not exceed 100 characters',
      });
    }
  }

  static _validateUpdateRole(input, errors) {
    if (input.role !== undefined && !UserValidator.VALID_ROLES.includes(input.role)) {
      errors.push({
        field: 'role',
        message: `Role must be one of: ${UserValidator.VALID_ROLES.join(', ')}`,
      });
    }
  }

  static _validateUpdatePhone(input, errors) {
    if (
      input.phone !== undefined &&
      input.phone !== null &&
      !UserValidator.isValidPhone(input.phone)
    ) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }
  }

  static _validateUpdateIsActive(input, errors) {
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') {
      errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
    }
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
      sortBy: SORTABLE_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt',
      sortOrder: ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : 'desc',
    };
    UserValidator._applyListSearch(sanitized, query);
    UserValidator._applyListFieldFilters(sanitized, query);
    UserValidator._applyListDateFilters(sanitized, query);
    UserValidator._applyListRoleFilter(sanitized, query);
    UserValidator._applyListIsActiveFilter(sanitized, query);
    UserValidator._applyListManagedBy(sanitized, query);
    return sanitized;
  }

  static _applyListSearch(sanitized, query) {
    if (!query.search) {
      return;
    }
    sanitized.filters = sanitized.filters || {};
    sanitized.filters.search = query.search;
    if (query.searchField && SEARCH_FIELD_OPTIONS.includes(query.searchField)) {
      sanitized.filters.searchField = query.searchField;
    }
  }

  static _applyListFieldFilters(sanitized, query) {
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
  }

  static _applyListDateFilters(sanitized, query) {
    const setDate = (key, raw) => {
      if (!raw) {
        return;
      }
      const date = new Date(raw);
      if (isNaN(date.getTime())) {
        return;
      }
      sanitized.filters = sanitized.filters || {};
      sanitized.filters[key] = date.toISOString();
    };
    setDate('createdAtFrom', query.createdAtFrom);
    setDate('createdAtTo', query.createdAtTo);
    setDate('updatedAtFrom', query.updatedAtFrom);
    setDate('updatedAtTo', query.updatedAtTo);
    setDate('lastLoginFrom', query.lastLoginFrom);
    setDate('lastLoginTo', query.lastLoginTo);
  }

  static _applyListRoleFilter(sanitized, query) {
    if (!query.role) {
      return;
    }
    sanitized.filters = sanitized.filters || {};
    const validRoles = UserValidator.VALID_ROLES;
    if (typeof query.role === 'string') {
      if (query.role.includes(',')) {
        const roles = query.role
          .split(',')
          .map((v) => v.trim())
          .filter((r) => validRoles.includes(r));
        if (roles.length > 0) {
          sanitized.filters.role = roles;
        }
      } else if (validRoles.includes(query.role)) {
        sanitized.filters.role = query.role;
      }
    } else if (Array.isArray(query.role)) {
      const roles = query.role.filter((r) => validRoles.includes(r));
      if (roles.length > 0) {
        sanitized.filters.role = roles;
      }
    } else if (validRoles.includes(query.role)) {
      sanitized.filters.role = query.role;
    }
  }

  static _applyListIsActiveFilter(sanitized, query) {
    if (query.isActive === undefined) {
      return;
    }
    sanitized.filters = sanitized.filters || {};
    if (typeof query.isActive === 'string') {
      if (query.isActive.includes(',')) {
        const booleans = query.isActive
          .split(',')
          .map((v) => {
            const lower = v.trim().toLowerCase();
            if (lower === 'true') {
              return true;
            }
            if (lower === 'false') {
              return false;
            }
            return null;
          })
          .filter((v) => v !== null);
        if (booleans.length > 0) {
          sanitized.filters.isActive = booleans;
        }
      } else {
        const lower = query.isActive.toLowerCase();
        if (lower === 'true') {
          sanitized.filters.isActive = true;
        } else if (lower === 'false') {
          sanitized.filters.isActive = false;
        }
      }
    } else if (Array.isArray(query.isActive)) {
      const validBooleans = query.isActive.filter((v) => typeof v === 'boolean');
      if (validBooleans.length > 0) {
        sanitized.filters.isActive = validBooleans;
      }
    } else if (typeof query.isActive === 'boolean') {
      sanitized.filters.isActive = query.isActive;
    }
  }

  static _applyListManagedBy(sanitized, query) {
    if (query.managedBy) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.managedBy = query.managedBy;
    }
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
