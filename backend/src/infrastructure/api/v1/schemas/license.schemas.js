/**
 * License Management Validation Schemas
 * Joi schemas for license-related requests
 */
import Joi from 'joi';

// Ensure Joi is loaded properly
if (!Joi) {
  throw new Error('Joi library failed to load');
}

export const licenseSchemas = {
  /**
   * Get licenses query parameters schema
   */
  getLicenses: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.base': 'Page must be a number',
    }),

    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.base': 'Limit must be a number',
    }),

    search: Joi.string()
      .min(1)
      .max(255)
      .messages({
        'string.min': 'Search term must contain at least 1 character',
        'string.max': 'Search term cannot exceed 255 characters',
      })
      .description('General search term to search DBA field'),

    status: Joi.string()
      .valid('draft', 'active', 'expiring', 'expired', 'revoked', 'cancel', 'pending')
      .messages({
        'any.only':
          'Status must be one of: draft, active, expiring, expired, revoked, cancel, pending',
      }),

    dba: Joi.string().min(1).max(255).messages({
      'string.min': 'DBA search must contain at least 1 character',
      'string.max': 'DBA search cannot exceed 255 characters',
    }),

    sortBy: Joi.string()
      .valid(
        'id',
        'dba',
        'zip',
        'startDay',
        'status',
        'plan',
        'term',
        'lastPayment',
        'lastActive',
        'smsPurchased',
        'smsSent',
        'smsBalance',
        'agents',
        'agentsCost',
        'createdAt',
        'updatedAt'
      )
      .default('createdAt')
      .messages({
        'any.only':
          'sortBy must be one of: id, dba, zip, startDay, status, plan, term, lastPayment, lastActive, smsPurchased, smsSent, smsBalance, agents, agentsCost, createdAt, updatedAt',
      }),

    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': 'sortOrder must be asc or desc',
    }),
  }),

  /**
   * Create license schema
   */
  createLicense: Joi.object({
    key: Joi.string().trim().min(1).max(255).required().messages({
      'string.min': 'License key cannot be empty',
      'string.max': 'License key cannot exceed 255 characters',
      'any.required': 'License key is required',
      'string.empty': 'License key cannot be empty',
    }),

    product: Joi.string().trim().min(1).max(100).default('ABC Business Suite').messages({
      'string.min': 'Product cannot be empty',
      'string.max': 'Product cannot exceed 100 characters',
    }),

    dba: Joi.string().trim().allow('').max(255).required().messages({
      'string.max': 'DBA cannot exceed 255 characters',
      'any.required': 'DBA is required',
    }),

    zip: Joi.string().trim().max(10).messages({
      'string.max': 'ZIP code cannot exceed 10 characters',
    }),

    startDay: Joi.string().required().messages({
      'any.required': 'startDay is required',
      'string.empty': 'startDay cannot be empty',
    }),

    status: Joi.string()
      .valid('active', 'cancel', 'pending', 'expired')
      .default('pending')
      .messages({
        'any.only': 'Status must be one of: active, cancel, pending, expired',
      }),

    plan: Joi.string().valid('Basic', 'Premium', 'Enterprise').messages({
      'any.only': 'Plan must be one of: Basic, Premium, Enterprise',
    }),

    term: Joi.string().valid('monthly', 'yearly').messages({
      'any.only': 'Term must be one of: monthly, yearly',
    }),

    cancelDate: Joi.when('status', {
      is: 'cancel',
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }).messages({
      'any.required': 'Cancel date is required when status is cancel',
    }),

    lastPayment: Joi.number().min(0).messages({
      'number.min': 'Last payment must be greater than or equal to 0',
      'number.base': 'Last payment must be a number',
    }),

    smsPurchased: Joi.number().min(0).integer().messages({
      'number.min': 'SMS purchased must be greater than or equal to 0',
      'number.base': 'SMS purchased must be a number',
      'number.integer': 'SMS purchased must be an integer',
    }),

    smsSent: Joi.number().min(0).integer().messages({
      'number.min': 'SMS sent must be greater than or equal to 0',
      'number.base': 'SMS sent must be a number',
      'number.integer': 'SMS sent must be an integer',
    }),

    agents: Joi.number().min(0).integer().messages({
      'number.min': 'Agents must be greater than or equal to 0',
      'number.base': 'Agents must be a number',
      'number.integer': 'Agents must be an integer',
    }),

    agentsCost: Joi.number().min(0).messages({
      'number.min': 'Agents cost must be greater than or equal to 0',
      'number.base': 'Agents cost must be a number',
    }),

    agentsName: Joi.array().items(Joi.string()).messages({
      'array.base': 'Agents name must be an array',
    }),
  }),

  /**
   * Update license schema
   */
  updateLicense: Joi.object({
    dba: Joi.string().trim().allow('').max(255).messages({
      'string.max': 'DBA cannot exceed 255 characters',
    }),

    zip: Joi.string().trim().max(10).messages({
      'string.max': 'ZIP code cannot exceed 10 characters',
    }),

    startsAt: Joi.string().messages({
      'string.empty': 'Start date cannot be empty',
    }),

    status: Joi.string()
      .valid('draft', 'active', 'expiring', 'expired', 'revoked', 'cancel', 'pending')
      .messages({
        'any.only':
          'Status must be one of: draft, active, expiring, expired, revoked, cancel, pending',
      }),

    plan: Joi.string().valid('Basic', 'Premium', 'Enterprise').messages({
      'any.only': 'Plan must be one of: Basic, Premium, Enterprise',
    }),

    term: Joi.string().valid('monthly', 'yearly').messages({
      'any.only': 'Term must be one of: monthly, yearly',
    }),

    cancelDate: Joi.when('status', {
      is: 'cancel',
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }).messages({
      'any.required': 'Cancel date is required when status is cancel',
    }),

    lastPayment: Joi.number().min(0).messages({
      'number.min': 'Last payment must be greater than or equal to 0',
      'number.base': 'Last payment must be a number',
    }),

    smsPurchased: Joi.number().min(0).integer().messages({
      'number.min': 'SMS purchased must be greater than or equal to 0',
      'number.base': 'SMS purchased must be a number',
      'number.integer': 'SMS purchased must be an integer',
    }),

    smsSent: Joi.number().min(0).integer().messages({
      'number.min': 'SMS sent must be greater than or equal to 0',
      'number.base': 'SMS sent must be a number',
      'number.integer': 'SMS sent must be an integer',
    }),

    agents: Joi.number().min(0).integer().messages({
      'number.min': 'Agents must be greater than or equal to 0',
      'number.base': 'Agents must be a number',
      'number.integer': 'Agents must be an integer',
    }),

    agentsCost: Joi.number().min(0).messages({
      'number.min': 'Agents cost must be greater than or equal to 0',
      'number.base': 'Agents cost must be a number',
    }),

    agentsName: Joi.array().items(Joi.string()).messages({
      'array.base': 'Agents name must be an array',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),

  /**
   * Bulk update licenses schema
   */
  bulkUpdateLicenses: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required().messages({
            'any.required': 'License ID is required',
            'string.empty': 'License ID cannot be empty',
          }),
          updates: Joi.object({
            dba: Joi.string().trim().allow('').max(255).messages({
              'string.max': 'DBA cannot exceed 255 characters',
            }),
            zip: Joi.string().trim().max(10).messages({
              'string.max': 'ZIP code cannot exceed 10 characters',
            }),
            startsAt: Joi.string(),
            status: Joi.string().valid(
              'draft',
              'active',
              'expiring',
              'expired',
              'revoked',
              'cancel',
              'pending'
            ),
            plan: Joi.string().valid('Basic', 'Premium', 'Enterprise'),
            term: Joi.string().valid('monthly', 'yearly'),
            seatsTotal: Joi.number().min(1).integer(),
            cancelDate: Joi.when('status', {
              is: 'cancel',
              then: Joi.string().required(),
              otherwise: Joi.string(),
            }),
            lastPayment: Joi.number().min(0),
            smsPurchased: Joi.number().min(0).integer(),
            smsSent: Joi.number().min(0).integer(),
            agents: Joi.number().min(0).integer(),
            agentsCost: Joi.number().min(0),
            agentsName: Joi.array().items(Joi.string()),
          })
            .min(1)
            .messages({
              'object.min': 'At least one field must be provided for update',
            }),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one license update must be provided',
        'any.required': 'Updates array is required',
        'array.base': 'Updates must be an array',
      }),
  }),

  /**
   * Bulk create licenses schema
   */
  bulkCreateLicenses: Joi.object({
    licenses: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().trim().min(1).max(255).required(),
          product: Joi.string().trim().min(1).max(100).default('ABC Business Suite'),
          dba: Joi.string().trim().allow('').max(255).required().messages({
            'string.max': 'DBA cannot exceed 255 characters',
            'any.required': 'DBA is required',
          }),
          zip: Joi.string().trim().max(10),
          startDay: Joi.string().required(),
          status: Joi.string()
            .valid('draft', 'active', 'expiring', 'expired', 'revoked', 'cancel', 'pending')
            .default('pending'),
          plan: Joi.string().valid('Basic', 'Premium', 'Enterprise'),
          term: Joi.string().valid('monthly', 'yearly'),
          seatsTotal: Joi.number().min(1).integer().default(1),
          cancelDate: Joi.when('status', {
            is: 'cancel',
            then: Joi.string().required(),
            otherwise: Joi.string(),
          }),
          lastPayment: Joi.number().min(0),
          smsPurchased: Joi.number().min(0).integer(),
          smsSent: Joi.number().min(0).integer(),
          agents: Joi.number().min(0).integer(),
          agentsCost: Joi.number().min(0),
          agentsName: Joi.array().items(Joi.string()),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one license must be provided',
        'any.required': 'Licenses array is required',
        'array.base': 'Licenses must be an array',
      }),
  }),

  /**
   * Add license row schema (for grid operations)
   */
  addLicenseRow: Joi.object({
    dba: Joi.string().trim().max(255).allow('').messages({
      'string.max': 'DBA cannot exceed 255 characters',
    }),

    zip: Joi.string().trim().max(10).messages({
      'string.max': 'ZIP code cannot exceed 10 characters',
    }),

    startDay: Joi.string().messages({
      'string.empty': 'Start day cannot be empty',
    }),
  }),

  /**
   * Bulk delete licenses schema
   */
  bulkDeleteLicenses: Joi.object({
    ids: Joi.array().items(Joi.string().required()).min(1).required().messages({
      'array.min': 'At least one license ID must be provided',
      'any.required': 'IDs array is required',
      'array.base': 'IDs must be an array',
      'string.empty': 'License ID cannot be empty',
    }),
  }),

  /**
   * License ID parameter schema
   */
  licenseId: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'License ID is required',
      'string.empty': 'License ID cannot be empty',
    }),
  }),
};

export default licenseSchemas;
