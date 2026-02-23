/**
 * Base Controller
 * Provides standardized error handling and common controller functionality
 */
import logger from '../config/logger.js';
import { errorMonitor } from '../../shared/utils/monitoring/error-monitor.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
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
  DataIntegrityViolationException,
} from '../../domain/exceptions/domain.exception.js';

const DOMAIN_EXCEPTION_HANDLERS = [
  [ValidationException, '_handleValidationError'],
  [ResourceNotFoundException, '_handleResourceNotFoundError'],
  [InsufficientPermissionsException, '_handlePermissionError'],
  [InvalidCredentialsException, '_handleAuthError'],
  [AccountDeactivatedException, '_handleAccountError'],
  [NetworkTimeoutException, '_handleNetworkTimeoutError'],
  [ExternalServiceUnavailableException, '_handleExternalServiceUnavailableError'],
  [ConcurrentModificationException, '_handleConcurrentModificationError'],
  [SecurityViolationException, '_handleSecurityViolationError'],
  [RateLimitExceededException, '_handleRateLimitError'],
  [DataIntegrityViolationException, '_handleDataIntegrityError'],
];

const DOMAIN_EXCEPTION_CLASSES = new Set([
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
  DataIntegrityViolationException,
]);

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

    // Note: Correlation ID is now handled by correlation middleware
    // No need to manually set it on container here

    // Record error with monitoring system
    errorMonitor.recordError(error, {
      operation,
      userId: req.user?.id,
      correlationId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...context,
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
        category: error.category,
      },
      requestContext: {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...context,
      },
    });

    // Handle Domain Exceptions (business logic errors)
    for (const [ExceptionClass, handlerName] of DOMAIN_EXCEPTION_HANDLERS) {
      if (error instanceof ExceptionClass) {
        return this[handlerName](error, res);
      }
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
    return sendErrorResponse(res, 'VALIDATION_FAILED', {}, { customMessage: error.message });
  }

  _handleResourceNotFoundError(error, res) {
    return sendErrorResponse(res, 'RESOURCE_NOT_FOUND', {}, { customMessage: error.message });
  }

  _handlePermissionError(error, res) {
    return sendErrorResponse(res, 'INSUFFICIENT_PERMISSIONS');
  }

  _handleAuthError(error, res) {
    return sendErrorResponse(res, 'INVALID_CREDENTIALS');
  }

  _handleAccountError(error, res) {
    return sendErrorResponse(res, 'ACCOUNT_DEACTIVATED');
  }

  _handleNetworkTimeoutError(error, res) {
    return sendErrorResponse(res, 'NETWORK_TIMEOUT', { operation: 'Operation' });
  }

  _handleExternalServiceUnavailableError(error, res) {
    return sendErrorResponse(res, 'EXTERNAL_SERVICE_UNAVAILABLE', { service: 'External service' });
  }

  _handleConcurrentModificationError(error, res) {
    return sendErrorResponse(res, 'CONCURRENT_MODIFICATION', { resource: 'Resource' });
  }

  _handleSecurityViolationError(error, res) {
    return sendErrorResponse(res, 'SECURITY_VIOLATION');
  }

  _handleRateLimitError(error, res) {
    const retryAfter = error.additionalData?.retryAfter || 60;
    res.set('Retry-After', retryAfter);
    return sendErrorResponse(res, 'RATE_LIMIT_EXCEEDED', {}, { retryAfter });
  }

  _handleDataIntegrityError(error, res) {
    return sendErrorResponse(res, 'DATA_INTEGRITY_VIOLATION');
  }

  _handleDatabaseError(error, res) {
    logger.error('Database error occurred', {
      errorName: error.name,
      errorCode: error.code,
      errorCodeName: error.codeName,
    });

    // PostgreSQL unique constraint violation (23505)
    if (error.code === '23505') {
      return sendErrorResponse(res, 'RESOURCE_ALREADY_EXISTS');
    }
    // PostgreSQL foreign key / not null / check violations
    if (['23503', '23502', '23514', '22P02'].includes(error.code)) {
      return sendErrorResponse(res, 'INVALID_INPUT');
    }

    return sendErrorResponse(res, 'DATABASE_ERROR');
  }

  _handleNetworkError(error, res) {
    return sendErrorResponse(res, 'EXTERNAL_SERVICE_UNAVAILABLE', { service: 'Network service' });
  }

  _handleExternalServiceError(error, res) {
    return sendErrorResponse(res, 'EXTERNAL_SERVICE_UNAVAILABLE', { service: 'External service' });
  }

  _handleTimeoutError(error, res) {
    return sendErrorResponse(res, 'NETWORK_TIMEOUT', { operation: 'Request' });
  }

  _handleGenericError(error, res, _correlationId, _operation) {
    return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
  }

  // Error type detection methods

  _isDatabaseError(error) {
    const pgErrorCodes = ['23505', '23503', '23502', '23514', '22P02'];
    return pgErrorCodes.includes(error.code) || (error.name === 'ValidationError' && error.errors);
  }

  _isNetworkError(error) {
    return (
      error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET'
    );
  }

  _isExternalServiceError(error) {
    return (
      error.code === 'EBADGATEWAY' ||
      error.code === 'ESERVICEUNAVAILABLE' ||
      (error.response && error.response.status >= 500)
    );
  }

  _isTimeoutError(error) {
    return (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ESOCKETTIMEDOUT' ||
      error.message?.includes('timeout')
    );
  }

  // Utility methods for controllers

  /**
   * Validate required fields in request body
   */
  validateRequired(req, fields) {
    const missing = fields.filter((field) => !req.body[field]);
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
      const args = Array.isArray(params) ? params : [params];
      return await useCase.execute(...args);
    } catch (error) {
      if (DOMAIN_EXCEPTION_CLASSES.has(error.constructor)) {
        throw error;
      }
      throw new Error(`${context.operation || 'Use case'} failed: ${error.message}`);
    }
  }
}
