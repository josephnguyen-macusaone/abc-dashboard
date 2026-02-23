/**
 * API Response Transformer
 * Provides consistent response formatting across the API
 */

import { formatCanonicalError } from './error-responses.js';

export class ResponseTransformer {
  /**
   * Create a success response
   * @param {any} data - Response data
   * @param {string} message - Optional success message
   * @param {object} meta - Optional metadata (pagination, etc.)
   * @returns {object} Formatted response
   */
  static success(data = null, message = 'Success', meta = {}) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null) {
      response.data = data;
    }

    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Create a paginated success response
   * @param {Array} items - Array of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   * @param {string} message - Optional message
   * @returns {object} Formatted paginated response
   */
  static paginated(items, page, limit, total, message = 'Data retrieved successfully') {
    const totalPages = Math.ceil(total / limit);

    return this.success(items, message, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  }

  /**
   * Create a created response (for POST operations)
   * @param {any} data - Created resource data
   * @param {string} message - Optional success message
   * @returns {object} Formatted response
   */
  static created(data, message = 'Resource created successfully') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a no content response (for DELETE operations)
   * @param {string} message - Optional message
   * @returns {object} Formatted response
   */
  static noContent(message = 'Resource deleted successfully') {
    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an error response
   * @param {string} message - Error message
   * @param {object} errors - Optional error details
   * @returns {object} Formatted response
   */
  static error(message = 'An error occurred', errors = {}) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (Object.keys(errors).length > 0) {
      response.errors = errors;
    }

    return response;
  }
}

/**
 * Express response helpers
 * Add these methods to the Express response object
 */
export const responseHelpers = {
  /**
   * Send a success response
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {object} meta - Optional metadata
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  success(data = null, message = 'Success', meta = {}, statusCode = 200) {
    const response = ResponseTransformer.success(data, message, meta);
    return this.status(statusCode).json(response);
  },

  /**
   * Send a paginated response
   * @param {Array} items - Array of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   * @param {string} message - Success message
   */
  paginated(items, page, limit, total, message = 'Data retrieved successfully') {
    const response = ResponseTransformer.paginated(items, page, limit, total, message);
    return this.json(response);
  },

  /**
   * Send a created response
   * @param {any} data - Created resource data
   * @param {string} message - Success message
   */
  created(data, message = 'Resource created successfully') {
    const response = ResponseTransformer.created(data, message);
    return this.status(201).json(response);
  },

  /**
   * Send a no content response
   * @param {string} message - Success message
   */
  noContent(message = 'Resource deleted successfully') {
    const response = ResponseTransformer.noContent(message);
    return this.status(204).json(response);
  },

  /**
   * Send a not found response (404) - canonical error shape
   * @param {string} message - Error message
   */
  notFound(message = 'Resource not found') {
    const payload = formatCanonicalError('RESOURCE_NOT_FOUND', { customMessage: message });
    return this.status(payload.error.statusCode).json(payload);
  },

  /**
   * Send a bad request response (400) - canonical error shape
   * @param {string} message - Error message
   * @param {object} errors - Optional error details
   */
  badRequest(message = 'Bad request', errors = {}) {
    const payload = formatCanonicalError('INVALID_INPUT', {
      customMessage: message,
      details: Object.keys(errors).length > 0 ? errors : {},
    });
    return this.status(payload.error.statusCode).json(payload);
  },

  /**
   * Send an error response - canonical error shape
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {object} errors - Optional error details
   */
  error(message = 'An error occurred', statusCode = 500, errors = {}) {
    const errorKey =
      statusCode === 401
        ? 'TOKEN_MISSING'
        : statusCode === 403
          ? 'INSUFFICIENT_PERMISSIONS'
          : statusCode === 400
            ? 'INVALID_INPUT'
            : 'INTERNAL_SERVER_ERROR';
    const payload = formatCanonicalError(errorKey, {
      customMessage: message,
      details: Object.keys(errors).length > 0 ? errors : {},
    });
    return this.status(statusCode).json(payload);
  },
};

/**
 * Middleware to add response helpers to Express response object
 */
export const responseHelpersMiddleware = (req, res, next) => {
  // Add helper methods to response object
  Object.assign(res, responseHelpers);
  next();
};

export default ResponseTransformer;
