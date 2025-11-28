/**
 * Profile Management Validation Schemas
 * Joi schemas for profile-related requests
 */
import Joi from 'joi';

// Ensure Joi is loaded properly
if (!Joi) {
  throw new Error('Joi library failed to load');
}

export const profileSchemas = {
  /**
   * Update profile request body schema
   */
  updateProfile: Joi.object({
    displayName: Joi.string().trim().min(1).max(100).optional().messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
    }),
    bio: Joi.string().max(500).allow('').optional().messages({
      'string.max': 'Bio cannot exceed 500 characters',
      'string.empty': 'Bio cannot be empty string, use null to clear',
    }),
    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .allow('')
      .optional()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
      }),
    avatarUrl: Joi.string()
      .allow('')
      .optional()
      .max(2000) // Reasonable URL length limit
      .messages({
        'string.base': 'Avatar URL must be a string',
        'string.max': 'Avatar URL cannot exceed 2000 characters',
      }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),

  /**
   * Profile ID parameter schema
   */
  profileId: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'Profile ID is required',
      'string.empty': 'Profile ID cannot be empty',
    }),
  }),
};
