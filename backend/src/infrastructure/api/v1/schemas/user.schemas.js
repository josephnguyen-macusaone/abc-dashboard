/**
 * User Management Validation Schemas
 * Joi schemas for user-related requests
 */
import Joi from 'joi';

// Ensure Joi is loaded properly
if (!Joi) {
  throw new Error('Joi library failed to load');
}

export const userSchemas = {
  /**
   * Get users query parameters schema
   */
  getUsers: Joi.object({
    // Pagination
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.base': 'Page must be a number',
    }),

    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.base': 'Limit must be a number',
    }),

    // ========================================================================
    // Multi-field Search
    // ========================================================================
    search: Joi.string().min(1).max(100).messages({
      'string.min': 'Search term must contain at least 1 character',
      'string.max': 'Search term cannot exceed 100 characters',
    }),

    searchField: Joi.string().valid('email', 'displayName', 'username', 'phone').messages({
      'any.only': 'searchField must be one of: email, displayName, username, phone',
    }),

    // Individual field filters
    email: Joi.string().min(1).max(254).messages({
      'string.min': 'Email search must contain at least 1 character',
      'string.max': 'Email search cannot exceed 254 characters',
    }),

    username: Joi.string().min(1).max(30).messages({
      'string.min': 'Username must be at least 1 character long',
      'string.max': 'Username cannot exceed 30 characters',
    }),

    displayName: Joi.string().min(1).max(100).messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
    }),

    phone: Joi.string().min(1).max(20).messages({
      'string.min': 'Phone search must contain at least 1 character',
      'string.max': 'Phone search cannot exceed 20 characters',
    }),

    // ========================================================================
    // Date Range Filters
    // ========================================================================

    // Created date range
    createdAtFrom: Joi.date().iso().messages({
      'date.base': 'createdAtFrom must be a valid date',
      'date.format': 'createdAtFrom must be in ISO 8601 format',
    }),

    createdAtTo: Joi.date().iso().messages({
      'date.base': 'createdAtTo must be a valid date',
      'date.format': 'createdAtTo must be in ISO 8601 format',
    }),

    // Updated date range
    updatedAtFrom: Joi.date().iso().messages({
      'date.base': 'updatedAtFrom must be a valid date',
      'date.format': 'updatedAtFrom must be in ISO 8601 format',
    }),

    updatedAtTo: Joi.date().iso().messages({
      'date.base': 'updatedAtTo must be a valid date',
      'date.format': 'updatedAtTo must be in ISO 8601 format',
    }),

    // Last login date range
    lastLoginFrom: Joi.date().iso().messages({
      'date.base': 'lastLoginFrom must be a valid date',
      'date.format': 'lastLoginFrom must be in ISO 8601 format',
    }),

    lastLoginTo: Joi.date().iso().messages({
      'date.base': 'lastLoginTo must be a valid date',
      'date.format': 'lastLoginTo must be in ISO 8601 format',
    }),

    // ========================================================================
    // Advanced Filters
    // ========================================================================

    // Role filter - support single value, array, or comma-separated string
    role: Joi.alternatives()
      .try(
        Joi.string().valid('admin', 'manager', 'staff'),
        Joi.array().items(Joi.string().valid('admin', 'manager', 'staff')),
        Joi.string().regex(/^admin|manager|staff(,admin|,manager|,staff)*$/)
      )
      .messages({
        'any.only': 'Role must be one of: admin, manager, staff',
        'array.includesOne': 'Role array must contain only valid roles',
        'string.pattern.base': 'Role must be comma-separated valid roles',
      }),

    // Active status filter - support single value, array, or comma-separated string
    isActive: Joi.alternatives()
      .try(
        Joi.boolean(),
        Joi.array().items(Joi.boolean()),
        Joi.string().regex(/^(true|false)(,(true|false))*$/)
      )
      .messages({
        'boolean.base': 'isActive must be a boolean',
        'array.includesOne': 'isActive array must contain only boolean values',
        'string.pattern.base': 'isActive must be comma-separated true/false values',
      }),

    // Managed by filter
    managedBy: Joi.string().messages({
      'string.base': 'managedBy must be a string (user ID)',
    }),

    // Sorting
    sortBy: Joi.string()
      .valid(
        'createdAt',
        'updatedAt',
        'email',
        'username',
        'displayName',
        'role',
        'isActive',
        'lastLogin'
      )
      .default('createdAt')
      .messages({
        'any.only':
          'sortBy must be one of: createdAt, updatedAt, email, username, displayName, role, isActive, lastLogin',
      }),

    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': 'sortOrder must be asc or desc',
    }),
  }),

  /**
   * Create user schema
   */
  createUser: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .allow('', null)
      .messages({
        'string.min': 'Username must be at least 3 characters long if provided',
        'string.max': 'Username cannot exceed 30 characters',
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty',
      }),

    displayName: Joi.string().trim().min(1).max(100).messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
      'string.empty': 'Display name cannot be empty',
    }),

    firstName: Joi.string().trim().min(1).max(50).required().messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
      'string.empty': 'First name cannot be empty',
    }),

    lastName: Joi.string().trim().min(1).max(50).required().messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
      'string.empty': 'Last name cannot be empty',
    }),

    avatarUrl: Joi.string().uri().messages({
      'string.uri': 'Avatar URL must be a valid URI',
    }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('', null)
      .messages({
        'string.pattern.base': 'Phone number must be in valid format',
      }),

    role: Joi.string().valid('admin', 'manager', 'staff').default('staff').messages({
      'any.only': 'Role must be one of: admin, manager, staff',
      'string.base': 'Role must be a string',
    }),
  }),

  /**
   * Update user profile schema
   */
  updateUser: Joi.object({
    displayName: Joi.string().trim().min(1).max(100).messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
    }),

    avatarUrl: Joi.string().uri().allow('').messages({
      'string.uri': 'Avatar URL must be a valid URI',
    }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Phone number must be in valid format',
      }),

    role: Joi.string().valid('admin', 'manager', 'staff').messages({
      'any.only': 'Role must be one of: admin, manager, staff',
    }),

    isActive: Joi.boolean().messages({
      'boolean.base': 'isActive must be a boolean',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),

  /**
   * Update profile schema (self-update)
   */
  updateProfile: Joi.object({
    displayName: Joi.string().trim().min(1).max(100).messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
    }),

    avatarUrl: Joi.string().uri().allow('').messages({
      'string.uri': 'Avatar URL must be a valid URI',
    }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Phone number must be in valid format',
      }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),

  /**
   * Update avatar schema
   */
  updateAvatar: Joi.object({
    avatarUrl: Joi.string().uri().allow('').messages({
      'string.uri': 'Avatar URL must be a valid URI',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'Avatar URL must be provided',
    }),

  /**
   * User ID parameter schema
   */
  userId: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'User ID is required',
      'string.empty': 'User ID cannot be empty',
    }),
  }),
};

export default userSchemas;
