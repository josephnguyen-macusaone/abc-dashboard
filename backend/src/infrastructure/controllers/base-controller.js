/**
 * Base Controller
 * Provides standardized error handling and common controller functionality
 */
import logger from '../config/logger.js';
import { errorMonitor } from '../../shared/utils/error-monitor.js';
import {
  ValidationException,
  ResourceNotFoundException,
  InsufficientPermissionsException,
  InvalidCredentialsException,
  AccountDeactivatedException,
  NetworkTimeoutException,
  ExternalServiceUnavailableException,
  ConcurrentModificationException,
  SecurityViolationException,
  RateLimitExceededException,
  DataIntegrityViolationException
} from '../../domain/exceptions/domain.exception.js';

export class BaseController {
  /**
   * Handle errors in a standardized way
   * @param {Error} error - The error that occurred
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Object} context - Additional context for logging
   */
  handleError(error, req, res, context = {}) {
    const correlationId = req.correlationId || this.generateCorrelationId();
    const operation = context.operation || 'unknown_operation';

    // Set correlation ID on container for this request (fire and forget)
    import('../../shared/kernel/container.js').then(({ container }) => {
      try {
        container.setCorrelationId(correlationId);
      } catch (containerError) {
        logger.warn('Could not set correlation ID on container', {
          correlationId,
          error: containerError.message
        });
      }
    }).catch(containerError => {
      logger.warn('Could not import container for correlation ID setting', {
        correlationId,
        error: containerError.message
      });
    });

    // Record error with monitoring system
    errorMonitor.recordError(error, {
      operation,
      userId: req.user?.id,
      correlationId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...context
    });

    // Enhanced error logging with full context
    logger.error(`${operation} failed`, {
      correlationId,
      operation,
      userId: req.user?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        category: error.category
      },
      requestContext: {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...context
      }
    });

    // Handle Domain Exceptions (business logic errors)
    if (error instanceof ValidationException) {
      return this._handleValidationError(error, res);
    }

    if (error instanceof ResourceNotFoundException) {
      return this._handleResourceNotFoundError(error, res);
    }

    if (error instanceof InsufficientPermissionsException) {
      return this._handlePermissionError(error, res);
    }

    if (error instanceof InvalidCredentialsException) {
      return this._handleAuthError(error, res);
    }

    if (error instanceof AccountDeactivatedException) {
      return this._handleAccountError(error, res);
    }

    if (error instanceof NetworkTimeoutException) {
      return this._handleNetworkTimeoutError(error, res);
    }

    if (error instanceof ExternalServiceUnavailableException) {
      return this._handleExternalServiceUnavailableError(error, res);
    }

    if (error instanceof ConcurrentModificationException) {
      return this._handleConcurrentModificationError(error, res);
    }

    if (error instanceof SecurityViolationException) {
      return this._handleSecurityViolationError(error, res);
    }

    if (error instanceof RateLimitExceededException) {
      return this._handleRateLimitError(error, res);
    }

    if (error instanceof DataIntegrityViolationException) {
      return this._handleDataIntegrityError(error, res);
    }

    // Handle Infrastructure Errors (database, network, external services)
    if (this._isDatabaseError(error)) {
      return this._handleDatabaseError(error, res);
    }

    if (this._isNetworkError(error)) {
      return this._handleNetworkError(error, res);
    }

    if (this._isExternalServiceError(error)) {
      return this._handleExternalServiceError(error, res);
    }

    if (this._isTimeoutError(error)) {
      return this._handleTimeoutError(error, res);
    }

    // Handle Generic Errors
    return this._handleGenericError(error, res, correlationId, operation);
  }

  /**
   * Generate a correlation ID for request tracking
   */
  generateCorrelationId(operation = 'unknown') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${operation}_${timestamp}_${random}`;
  }

  /**
   * Get correlation ID from request or generate one
   * @param {Object} req - Express request object
   * @param {string} operation - Operation name for ID generation
   */
  getCorrelationId(req, operation = 'unknown') {
    return req.correlationId || this.generateCorrelationId(operation);
  }

  /**
   * Create child correlation ID for sub-operations
   * @param {string} parentId - Parent correlation ID
   * @param {string} subOperation - Sub-operation name
   */
  createChildCorrelationId(parentId, subOperation) {
    return `${parentId}_${subOperation}`;
  }

  // Private error handling methods for different error types

  _handleValidationError(error, res) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 400,
        type: 'VALIDATION_ERROR',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleResourceNotFoundError(error, res) {
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 404,
        type: 'RESOURCE_NOT_FOUND',
        category: error.category,
        details: error.message
      }
    });
  }

  _handlePermissionError(error, res) {
    return res.status(error.statusCode || 403).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 403,
        type: 'PERMISSION_DENIED',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleAuthError(error, res) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 401,
        type: 'AUTHENTICATION_ERROR',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleAccountError(error, res) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 401,
        type: 'ACCOUNT_ERROR',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleNetworkTimeoutError(error, res) {
    return res.status(error.statusCode || 408).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 408,
        type: 'NETWORK_TIMEOUT',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleExternalServiceUnavailableError(error, res) {
    return res.status(error.statusCode || 503).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 503,
        type: 'EXTERNAL_SERVICE_UNAVAILABLE',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleConcurrentModificationError(error, res) {
    return res.status(error.statusCode || 409).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 409,
        type: 'CONCURRENT_MODIFICATION',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleSecurityViolationError(error, res) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 400,
        type: 'SECURITY_VIOLATION',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleRateLimitError(error, res) {
    const retryAfter = error.additionalData?.retryAfter || 60;
    res.set('Retry-After', retryAfter);

    return res.status(error.statusCode || 429).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 429,
        type: 'RATE_LIMIT_EXCEEDED',
        category: error.category,
        details: error.message,
        retryAfter,
        retryAfterMinutes: Math.ceil(retryAfter / 60)
      }
    });
  }

  _handleDataIntegrityError(error, res) {
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      error: {
        code: error.statusCode || 422,
        type: 'DATA_INTEGRITY_VIOLATION',
        category: error.category,
        details: error.message
      }
    });
  }

  _handleDatabaseError(error, res) {
    logger.error('Database error occurred', {
      errorName: error.name,
      errorCode: error.code,
      errorCodeName: error.codeName,
      collection: error.collection
    });

    if (error.code === 11000) { // Duplicate key error
      return res.status(409).json({
        success: false,
        message: 'A field value conflicts with existing data.',
        error: {
          code: 409,
          type: 'DUPLICATE_ERROR',
          category: 'database',
          details: 'Duplicate key constraint violation'
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Database error occurred. Please try again.',
      error: {
        code: 500,
        type: 'DATABASE_ERROR',
        category: 'database',
        details: error.message
      }
    });
  }

  _handleNetworkError(error, res) {
    return res.status(503).json({
      success: false,
      message: 'Network connection error. Please try again later.',
      error: {
        code: 503,
        type: 'NETWORK_ERROR',
        category: 'network',
        details: error.message
      }
    });
  }

  _handleExternalServiceError(error, res) {
    return res.status(502).json({
      success: false,
      message: 'External service is temporarily unavailable. Please try again later.',
      error: {
        code: 502,
        type: 'EXTERNAL_SERVICE_ERROR',
        category: 'external_service',
        details: error.message
      }
    });
  }

  _handleTimeoutError(error, res) {
    return res.status(408).json({
      success: false,
      message: 'Request timed out. Please try again.',
      error: {
        code: 408,
        type: 'TIMEOUT_ERROR',
        category: 'timeout',
        details: error.message
      }
    });
  }

  _handleGenericError(error, res, correlationId, operation) {
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      error: {
        code: 500,
        type: 'INTERNAL_ERROR',
        category: 'server',
        correlationId,
        operation
      }
    });
  }

  // Error type detection methods

  _isDatabaseError(error) {
    return error.name === 'MongoError' ||
           error.name === 'MongoServerError' ||
           error.name === 'ValidationError' ||
           error.code === 11000;
  }

  _isNetworkError(error) {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNRESET';
  }

  _isExternalServiceError(error) {
    return error.code === 'EBADGATEWAY' ||
           error.code === 'ESERVICEUNAVAILABLE' ||
           (error.response && error.response.status >= 500);
  }

  _isTimeoutError(error) {
    return error.code === 'ETIMEDOUT' ||
           error.code === 'ESOCKETTIMEDOUT' ||
           error.message?.includes('timeout');
  }

  // Utility methods for controllers

  /**
   * Validate required fields in request body
   */
  validateRequired(req, fields) {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      throw new ValidationException(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Get authenticated user ID from request
   */
  getUserId(req) {
    if (!req.user || !req.user.id) {
      throw new InsufficientPermissionsException('Authentication required');
    }
    return req.user.id;
  }

  /**
   * Execute use case with error handling
   */
  async executeUseCase(useCase, params, context = {}) {
    try {
      // Handle both single object and array of parameters
      if (Array.isArray(params)) {
        return await useCase.execute(...params);
      } else {
        return await useCase.execute(params);
      }
    } catch (error) {
      // Re-throw domain exceptions as-is, wrap others
      if (error instanceof ValidationException ||
          error instanceof ResourceNotFoundException ||
          error instanceof InsufficientPermissionsException ||
          error instanceof InvalidCredentialsException ||
          error instanceof AccountDeactivatedException ||
          error instanceof NetworkTimeoutException ||
          error instanceof ExternalServiceUnavailableException ||
          error instanceof ConcurrentModificationException ||
          error instanceof SecurityViolationException ||
          error instanceof RateLimitExceededException ||
          error instanceof DataIntegrityViolationException) {
        throw error;
      }
      throw new Error(`${context.operation || 'Use case'} failed: ${error.message}`);
    }
  }
}
