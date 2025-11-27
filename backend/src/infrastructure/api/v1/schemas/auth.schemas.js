/**
 * Authentication Validation Schemas
 * Joi schemas for authentication-related requests
 */
import Joi from 'joi';

// Ensure Joi is loaded properly
if (!Joi) {
  throw new Error('Joi library failed to load');
}

export const authSchemas = {
  /**
   * User registration schema
   */
  register: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .allow('')
      .optional()
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
        'string.empty': 'Username cannot be empty'
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } }) // Don't allow top-level domains for security
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty'
      }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) // At least one lowercase, uppercase, and number
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required',
        'string.empty': 'Password cannot be empty'
      }),

    firstName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name cannot be empty',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required',
        'string.empty': 'First name cannot be empty'
      }),

    lastName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name cannot be empty',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required',
        'string.empty': 'Last name cannot be empty'
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
  }),

  /**
   * User login schema
   */
  login: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty'
      }),

    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
        'string.empty': 'Password cannot be empty'
      })
  }),

  /**
   * Email verification schema
   */
  verifyEmail: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Verification token is required',
        'string.empty': 'Verification token cannot be empty'
      })
  }),

  /**
   * Password reset request schema
   */
  forgotPassword: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty'
      })
  }),

  requestPasswordReset: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty'
      })
  }),

  /**
   * Password reset schema
   */
  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required',
        'string.empty': 'Reset token cannot be empty'
      }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required',
        'string.empty': 'Password cannot be empty'
      })
  }),

  /**
   * Change password schema
   */
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required',
        'string.empty': 'Current password cannot be empty'
      }),

    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'New password is required',
        'string.empty': 'New password cannot be empty'
      })
  }),

  /**
   * Refresh token schema
   */
  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
        'string.empty': 'Refresh token cannot be empty'
      })
  })
};

export default authSchemas;
