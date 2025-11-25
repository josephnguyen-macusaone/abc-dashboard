import logger from '../../infrastructure/config/logger.js';

// Error definitions - centralized error metadata
export const ERROR_LIST = {
  // Authentication errors
  INVALID_CREDENTIALS: {
    statusCode: 401,
    message: 'Invalid email or password',
    category: 'authentication'
  },

  ACCOUNT_DEACTIVATED: {
    statusCode: 401,
    message: 'Account is deactivated. Please contact support.',
    category: 'authentication'
  },

  ACCOUNT_LOCKED: {
    statusCode: 429,
    message: 'Account temporarily locked due to too many failed attempts',
    category: 'authentication',
    additionalData: (retryAfter) => ({
      retryAfter,
      retryAfterMinutes: Math.ceil(retryAfter / 60)
    })
  },

  TOKEN_EXPIRED: {
    statusCode: 401,
    message: 'Your session has expired. Please log in again.',
    category: 'authentication'
  },

  INVALID_TOKEN: {
    statusCode: 401,
    message: 'Invalid authentication token',
    category: 'authentication'
  },

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: {
    statusCode: 403,
    message: 'Access denied. Required role: {{requiredRole}}',
    category: 'authorization',
    template: true
  },

  // Validation errors
  VALIDATION_FAILED: {
    statusCode: 400,
    message: 'Validation failed',
    category: 'validation'
  },

  REQUIRED_FIELD_MISSING: {
    statusCode: 400,
    message: 'Required field missing: {{fieldName}}',
    category: 'validation',
    template: true
  },

  INVALID_FIELD_VALUE: {
    statusCode: 400,
    message: 'Invalid value for field: {{fieldName}}',
    category: 'validation',
    template: true
  },

  INVALID_EMAIL_FORMAT: {
    statusCode: 400,
    message: 'Invalid email format',
    category: 'validation'
  },

  EMAIL_ALREADY_EXISTS: {
    statusCode: 409,
    message: 'Email address already registered',
    category: 'validation'
  },

  PASSWORD_TOO_WEAK: {
    statusCode: 400,
    message: 'Password does not meet security requirements',
    category: 'validation'
  },

  PASSWORD_MISMATCH: {
    statusCode: 400,
    message: 'Passwords do not match',
    category: 'validation'
  },

  // Resource errors
  RESOURCE_NOT_FOUND: {
    statusCode: 404,
    message: 'Resource not found',
    category: 'resource'
  },

  RESOURCE_ALREADY_EXISTS: {
    statusCode: 409,
    message: 'Resource already exists',
    category: 'resource'
  },


  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
    category: 'rate_limiting',
    additionalData: (retryAfter) => ({
      retryAfter,
      retryAfterMinutes: Math.ceil(retryAfter / 60)
    })
  },

  // Server errors
  INTERNAL_SERVER_ERROR: {
    statusCode: 500,
    message: 'Internal server error',
    category: 'server'
  },

  DATABASE_ERROR: {
    statusCode: 500,
    message: 'Database operation failed',
    category: 'server'
  },

  EXTERNAL_SERVICE_ERROR: {
    statusCode: 502,
    message: 'External service unavailable',
    category: 'server'
  },

  // Email errors
  EMAIL_SEND_FAILED: {
    statusCode: 500,
    message: 'Failed to send email',
    category: 'email'
  },

  // Business logic errors
  BUSINESS_RULE_VIOLATION: {
    statusCode: 422,
    message: 'Business rule violation: {{rule}}',
    category: 'business',
    template: true
  }
};

// Error response generator
export class ErrorResponse {
  constructor(errorKey, templateData = {}, additionalData = {}) {
    const errorDefinition = ERROR_LIST[errorKey];

    if (!errorDefinition) {
      throw new Error(`Unknown error key: ${errorKey}`);
    }

    this.statusCode = errorDefinition.statusCode;
    this.category = errorDefinition.category;

    // Handle template messages
    if (errorDefinition.template) {
      this.message = this.interpolateTemplate(errorDefinition.message, templateData);
    } else {
      this.message = errorDefinition.message;
    }

    // Add additional data if provided
    if (errorDefinition.additionalData) {
      this.additionalData = errorDefinition.additionalData(additionalData);
    } else {
      this.additionalData = additionalData;
    }

    // Log the error
    this.logError(errorKey, templateData);
  }

  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  logError(errorKey, templateData) {
    const logData = {
      errorKey,
      category: this.category,
      statusCode: this.statusCode,
      templateData,
      additionalData: this.additionalData
    };

    // Log based on severity
    if (this.statusCode >= 500) {
      logger.error(`Server Error [${errorKey}]: ${this.message}`, logData);
    } else if (this.statusCode >= 400 && this.statusCode < 500) {
      logger.warn(`Client Error [${errorKey}]: ${this.message}`, logData);
    } else {
      logger.info(`Error [${errorKey}]: ${this.message}`, logData);
    }
  }

  toResponse() {
    const response = {
      success: false,
      error: {
        code: this.statusCode,
        message: this.message,
        category: this.category
      }
    };

    if (Object.keys(this.additionalData).length > 0) {
      response.error.details = this.additionalData;
    }

    return response;
  }
}

// Convenience functions for common errors
export const createErrorResponse = (errorKey, templateData = {}, additionalData = {}) => {
  const errorResponse = new ErrorResponse(errorKey, templateData, additionalData);
  return errorResponse.toResponse();
};

export const sendErrorResponse = (res, errorKey, templateData = {}, additionalData = {}) => {
  const errorResponse = new ErrorResponse(errorKey, templateData, additionalData);
  return res.status(errorResponse.statusCode).json(errorResponse.toResponse());
};

// Middleware for handling async errors
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // If error has a status code, use it; otherwise use internal server error
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal server error';

      logger.error('Async error caught by middleware:', {
        message,
        stack: error.stack,
        statusCode
      });

      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode,
          message,
          category: 'server'
        }
      });
    });
  };
};

export default {
  ERROR_LIST,
  ErrorResponse,
  createErrorResponse,
  sendErrorResponse,
  asyncErrorHandler
};
