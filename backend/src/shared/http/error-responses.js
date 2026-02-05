import logger from '../../infrastructure/config/logger.js';

// Error definitions - centralized error metadata
export const ERROR_LIST = {
  // Authentication errors
  INVALID_CREDENTIALS: {
    statusCode: 401,
    message: 'Invalid email or password',
    category: 'authentication',
  },

  ACCOUNT_DEACTIVATED: {
    statusCode: 401,
    message: 'Account is deactivated. Please contact support.',
    category: 'authentication',
  },

  ACCOUNT_LOCKED: {
    statusCode: 429,
    message: 'Account temporarily locked due to too many failed attempts',
    category: 'authentication',
    additionalData: (retryAfter) => ({
      retryAfter,
      retryAfterMinutes: Math.ceil(retryAfter / 60),
    }),
  },

  TOKEN_EXPIRED: {
    statusCode: 401,
    message: 'Your session has expired. Please log in again.',
    category: 'authentication',
  },

  INVALID_TOKEN: {
    statusCode: 401,
    message: 'Invalid authentication token',
    category: 'authentication',
  },

  TOKEN_MISSING: {
    statusCode: 401,
    message: 'Authentication token is required',
    category: 'authentication',
  },

  INSUFFICIENT_PERMISSIONS: {
    statusCode: 403,
    message: 'You do not have permission to perform this action',
    category: 'authorization',
  },

  // User management errors
  USER_NOT_FOUND: {
    statusCode: 404,
    message: 'User not found',
    category: 'user_management',
  },

  EMAIL_ALREADY_EXISTS: {
    statusCode: 409,
    message: 'An account with this email already exists',
    category: 'user_management',
  },

  RESOURCE_ALREADY_EXISTS: {
    statusCode: 409,
    message: 'Resource already exists',
    category: 'resource_management',
  },

  BUSINESS_RULE_VIOLATION: {
    statusCode: 400,
    message: 'Business rule violation',
    category: 'business_logic',
  },

  INVALID_EMAIL_FORMAT: {
    statusCode: 400,
    message: 'Please provide a valid email address',
    category: 'validation',
  },

  PASSWORD_TOO_WEAK: {
    statusCode: 400,
    message:
      'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
    category: 'validation',
  },

  PASSWORDS_DONT_MATCH: {
    statusCode: 400,
    message: 'Passwords do not match',
    category: 'validation',
  },

  // Email verification errors
  EMAIL_NOT_VERIFIED: {
    statusCode: 403,
    message: 'Please verify your email address before proceeding',
    category: 'verification',
  },

  INVALID_VERIFICATION_TOKEN: {
    statusCode: 400,
    message: 'Invalid or expired verification link',
    category: 'verification',
  },

  EMAIL_ALREADY_VERIFIED: {
    statusCode: 400,
    message: 'Email address is already verified',
    category: 'verification',
  },

  // Password reset errors
  INVALID_RESET_TOKEN: {
    statusCode: 400,
    message: 'Invalid or expired password reset link',
    category: 'password_reset',
  },

  RESET_TOKEN_EXPIRED: {
    statusCode: 400,
    message: 'Password reset link has expired. Please request a new one.',
    category: 'password_reset',
  },

  // General validation errors
  MISSING_REQUIRED_FIELD: {
    statusCode: 400,
    message: 'Required field is missing',
    category: 'validation',
  },

  INVALID_FIELD_VALUE: {
    statusCode: 400,
    message: 'Invalid field value',
    category: 'validation',
  },

  INVALID_INPUT: {
    statusCode: 400,
    message: 'Invalid input provided',
    category: 'validation',
  },

  VALIDATION_FAILED: {
    statusCode: 400,
    message: 'Validation failed',
    category: 'validation',
  },

  // File upload errors
  FILE_TOO_LARGE: {
    statusCode: 413,
    message: 'File size exceeds the maximum allowed limit',
    category: 'file_upload',
  },

  INVALID_FILE_TYPE: {
    statusCode: 400,
    message: 'File type not allowed',
    category: 'file_upload',
  },

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: {
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
    category: 'rate_limiting',
    additionalData: (retryAfter) => ({
      retryAfter,
      retryAfterMinutes: Math.ceil(retryAfter / 60),
    }),
  },

  // Database errors
  DATABASE_ERROR: {
    statusCode: 500,
    message: 'A database error occurred. Please try again.',
    category: 'database',
  },

  // External service errors
  EMAIL_SERVICE_ERROR: {
    statusCode: 500,
    message: 'Email service is temporarily unavailable. Please try again later.',
    category: 'external_service',
  },

  // Security errors
  SUSPICIOUS_ACTIVITY: {
    statusCode: 400,
    message: 'Suspicious activity detected',
    category: 'security',
  },

  // General server errors
  INTERNAL_SERVER_ERROR: {
    statusCode: 500,
    message: 'An unexpected error occurred. Please try again.',
    category: 'server',
  },

  SERVICE_UNAVAILABLE: {
    statusCode: 503,
    message: 'Service is temporarily unavailable. Please try again later.',
    category: 'server',
  },

  // API specific errors
  ENDPOINT_NOT_FOUND: {
    statusCode: 404,
    message: 'The requested endpoint was not found',
    category: 'api',
  },

  METHOD_NOT_ALLOWED: {
    statusCode: 405,
    message: 'HTTP method not allowed for this endpoint',
    category: 'api',
  },

  UNSUPPORTED_MEDIA_TYPE: {
    statusCode: 415,
    message: 'Unsupported media type',
    category: 'api',
  },

  // Infrastructure errors
  NETWORK_TIMEOUT: {
    statusCode: 408,
    message: '{{operation}} timed out. Please try again.',
    category: 'infrastructure',
    template: true,
  },

  EXTERNAL_SERVICE_UNAVAILABLE: {
    statusCode: 503,
    message: '{{service}} is temporarily unavailable. Please try again later.',
    category: 'infrastructure',
    template: true,
  },

  CONCURRENT_MODIFICATION: {
    statusCode: 409,
    message: '{{resource}} was modified by another process. Please refresh and try again.',
    category: 'infrastructure',
    template: true,
  },

  // Security errors
  SECURITY_VIOLATION: {
    statusCode: 400,
    message: 'Security violation detected',
    category: 'security',
  },

  // Data integrity errors
  DATA_INTEGRITY_VIOLATION: {
    statusCode: 422,
    message: 'Data integrity violation',
    category: 'data',
  },
};

/**
 * Error Response Transformer
 * Formats error responses consistently across the API
 */
export class ErrorResponseTransformer {
  /**
   * Create a standardized error response
   * @param {string} errorKey - Key from ERROR_LIST
   * @param {object} additionalData - Additional data to include
   * @param {Error} originalError - Original error for logging
   * @returns {object} Formatted error response
   */
  static transform(errorKey, additionalData = {}, originalError = null) {
    const errorConfig = ERROR_LIST[errorKey];

    if (!errorConfig) {
      logger.error(`Unknown error key: ${errorKey}`);
      return this.transform('INTERNAL_SERVER_ERROR');
    }

    // Log the error if original error provided
    if (originalError) {
      logger.error(`Error ${errorKey}:`, {
        message: originalError.message,
        stack: originalError.stack,
        category: errorConfig.category,
      });
    }

    const response = {
      success: false,
      message: errorConfig.message,
      error: errorKey,
      category: errorConfig.category,
      timestamp: new Date().toISOString(),
    };

    // Add additional data if provided
    if (errorConfig.additionalData) {
      const extraData = errorConfig.additionalData(additionalData.retryAfter || additionalData);
      Object.assign(response, extraData);
    }

    // Add any additional custom data
    if (Object.keys(additionalData).length > 0 && !errorConfig.additionalData) {
      response.details = additionalData;
    }

    return response;
  }

  /**
   * Create error response from Error object
   * @param {Error} error - Error object
   * @param {string} fallbackKey - Fallback error key if mapping fails
   * @returns {object} Formatted error response
   */
  static fromError(error, fallbackKey = 'INTERNAL_SERVER_ERROR') {
    // Try to map error types to known error keys
    let errorKey = fallbackKey;

    if (error.name === 'ValidationError') {
      errorKey = 'INVALID_INPUT';
    } else if (error.name === 'CastError') {
      errorKey = 'INVALID_INPUT';
    } else if (error.message.includes('not found')) {
      errorKey = 'ENDPOINT_NOT_FOUND';
    }

    return this.transform(errorKey, {}, error);
  }
}

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
    } else if (additionalData.customMessage) {
      // Use custom message if provided (for ValidationException)
      this.message = additionalData.customMessage;
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
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      data[key] !== undefined ? data[key] : match
    );
  }

  logError(errorKey, templateData) {
    const logData = {
      errorKey,
      category: this.category,
      statusCode: this.statusCode,
      templateData,
      additionalData: this.additionalData,
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
        category: this.category,
      },
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

  // Ensure CORS headers are included for error responses
  res.header('Access-Control-Allow-Origin', res.req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  return res.status(errorResponse.statusCode).json(errorResponse.toResponse());
};

/**
 * Express error response helpers
 */
export const errorResponseHelpers = {
  /**
   * Send an error response
   * @param {string} errorKey - Key from ERROR_LIST
   * @param {object} additionalData - Additional data
   * @param {Error} originalError - Original error for logging
   */
  error(errorKey, additionalData = {}, originalError = null) {
    const response = ErrorResponseTransformer.transform(errorKey, additionalData, originalError);
    return this.status(response.statusCode || 500).json(response);
  },

  /**
   * Send error response from Error object
   * @param {Error} error - Error object
   * @param {string} fallbackKey - Fallback error key
   */
  fromError(error, fallbackKey = 'INTERNAL_SERVER_ERROR') {
    const response = ErrorResponseTransformer.fromError(error, fallbackKey);
    return this.status(response.statusCode || 500).json(response);
  },
};

/**
 * Middleware to add error response helpers to Express response object
 */
export const errorResponseHelpersMiddleware = (req, res, next) => {
  // Add error helper methods to response object
  Object.assign(res, errorResponseHelpers);
  next();
};

export default {
  ERROR_LIST,
  ErrorResponse,
  ErrorResponseTransformer,
  errorResponseHelpers,
  errorResponseHelpersMiddleware,
  createErrorResponse,
  sendErrorResponse,
};
