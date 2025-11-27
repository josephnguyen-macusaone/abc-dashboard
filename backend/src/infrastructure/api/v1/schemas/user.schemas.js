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
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'Page must be at least 1',
        'number.base': 'Page must be a number'
      }),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
        'number.base': 'Limit must be a number'
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .messages({
        'string.email': 'Please provide a valid email address'
      }),

    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      }),

    displayName: Joi.string()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Display name cannot be empty',
        'string.max': 'Display name cannot exceed 100 characters'
      }),

    hasAvatar: Joi.boolean()
      .messages({
        'boolean.base': 'hasAvatar must be a boolean'
      }),

    hasBio: Joi.boolean()
      .messages({
        'boolean.base': 'hasBio must be a boolean'
      }),

    sortBy: Joi.string()
      .valid('createdAt', 'email', 'username', 'displayName')
      .default('createdAt')
      .messages({
        'any.only': 'sortBy must be one of: createdAt, email, username, displayName'
      }),

    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': 'sortOrder must be asc or desc'
      })
  }),

  /**
   * Create user schema
   */
  createUser: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .required()
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
        'any.required': 'Username is required',
        'string.empty': 'Username cannot be empty'
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty'
      }),

    displayName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Display name cannot be empty',
        'string.max': 'Display name cannot exceed 100 characters',
        'any.required': 'Display name is required',
        'string.empty': 'Display name cannot be empty'
      }),

    avatarUrl: Joi.string()
      .uri()
      .messages({
        'string.uri': 'Avatar URL must be a valid URI'
      }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Phone number must be in valid format'
      })
  }),

  /**
   * Update user profile schema
   */
  updateUser: Joi.object({
    displayName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Display name cannot be empty',
        'string.max': 'Display name cannot exceed 100 characters'
      }),

    avatarUrl: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Avatar URL must be a valid URI'
      }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Phone number must be in valid format'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  /**
   * Update profile schema (self-update)
   */
  updateProfile: Joi.object({
    displayName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Display name cannot be empty',
        'string.max': 'Display name cannot exceed 100 characters'
      }),

    avatarUrl: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Avatar URL must be a valid URI'
      }),


    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Phone number must be in valid format'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  /**
   * Update avatar schema
   */
  updateAvatar: Joi.object({
    avatarUrl: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Avatar URL must be a valid URI'
      })
  }).min(1).messages({
    'object.min': 'Avatar URL must be provided'
  }),

  /**
   * User ID parameter schema
   */
  userId: Joi.object({
    id: Joi.string()
      .required()
      .messages({
        'any.required': 'User ID is required',
        'string.empty': 'User ID cannot be empty'
      })
  })
};

export default userSchemas;
