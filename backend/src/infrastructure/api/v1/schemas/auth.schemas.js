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
   * User login schema
   */
  login: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty',
      }),

    password: Joi.string().required().messages({
      'any.required': 'Password is required',
      'string.empty': 'Password cannot be empty',
    }),
  }),

  /**
   * Email verification/confirmation schema
   * Accepts either token (for registration verification) or action (for authenticated user confirmation)
   */
  verifyEmail: Joi.object()
    .keys({
      token: Joi.string().messages({
        'string.empty': 'Verification token cannot be empty',
      }),
      action: Joi.string().valid('confirm').messages({
        'any.only': 'Action must be "confirm"',
      }),
    })
    .xor('token', 'action')
    .messages({
      'object.xor':
        'Either token (for verification) or action (for confirmation) must be provided, but not both',
      'object.missing':
        'Either token (for verification) or action (for confirmation) must be provided',
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
        'string.empty': 'Email cannot be empty',
      }),
  }),

  requestPasswordReset: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.empty': 'Email cannot be empty',
      }),
  }),

  /**
   * Password reset schema
   */
  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
      'string.empty': 'Reset token cannot be empty',
    }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base':
          'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required',
        'string.empty': 'Password cannot be empty',
      }),
  }),

  /**
   * Change password schema
   */
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
      'string.empty': 'Current password cannot be empty',
    }),

    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'string.pattern.base':
          'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'New password is required',
        'string.empty': 'New password cannot be empty',
      }),
  }),

  /**
   * Refresh token schema
   */
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
      'string.empty': 'Refresh token cannot be empty',
    }),
  }),
};

export default authSchemas;
