/**
 * Retry Utility
 * Provides retry mechanisms with exponential backoff and jitter for transient failures
 */
// Use console for logging to avoid circular dependencies during module loading
// TODO: Replace with proper logger after initialization
const logger = console;

import { NetworkTimeoutException } from '../../domain/exceptions/domain.exception.js';

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ECONNRESET',
    'ETIMEDOUT',
    'ESOCKETTIMEDOUT',
    'MongoNetworkError',
    'MongoTimeoutError',
  ],
};

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff and optional jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 */
const calculateDelay = (attempt, config = {}) => {
  const {
    initialDelay = DEFAULT_CONFIG.initialDelay,
    maxDelay = DEFAULT_CONFIG.maxDelay,
    backoffMultiplier = DEFAULT_CONFIG.backoffMultiplier,
    jitter = DEFAULT_CONFIG.jitter,
  } = config;

  let delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  delay = Math.min(delay, maxDelay);

  if (jitter) {
    // Add random jitter (±25% of delay)
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
    delay = Math.max(0, delay);
  }

  return Math.floor(delay);
};

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @param {Array} retryableErrors - List of retryable error codes/types
 */
const isRetryableError = (error, retryableErrors = DEFAULT_CONFIG.retryableErrors) => {
  if (!error) {
    return false;
  }

  // Check error code
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Check error name
  if (error.name && retryableErrors.includes(error.name)) {
    return true;
  }

  // Check for network-related errors
  if (error.message) {
    const message = error.message.toLowerCase();
    if (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('service unavailable')
    ) {
      return true;
    }
  }

  // Check for HTTP status codes that indicate temporary issues
  if (error.statusCode) {
    return [408, 429, 500, 502, 503, 504].includes(error.statusCode);
  }

  if (error.response && error.response.status) {
    return [408, 429, 500, 502, 503, 504].includes(error.response.status);
  }

  return false;
};

/**
 * Execute a function with retry logic
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @param {string} operation - Operation name for logging
 */
export const withRetry = async (fn, options = {}, operation = 'unknown') => {
  const config = { ...DEFAULT_CONFIG, ...options };
  const {
    maxRetries,
    retryableErrors,
    onRetry,
    correlationId = `retry_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  } = config;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // If this is the last attempt, don't retry
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, retryableErrors)) {
        logger.warn(`${operation} failed with non-retryable error`, {
          correlationId,
          attempt,
          error: error.message,
          errorCode: error.code,
          errorName: error.name,
        });
        break;
      }

      const delay = calculateDelay(attempt, config);

      logger.warn(`${operation} failed, retrying in ${delay}ms`, {
        correlationId,
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: error.message,
        errorCode: error.code,
        errorName: error.name,
      });

      // Call retry callback if provided
      if (onRetry) {
        try {
          await onRetry(error, attempt, delay);
        } catch (callbackError) {
          logger.error('Error in retry callback', {
            correlationId,
            callbackError: callbackError.message,
          });
        }
      }

      await sleep(delay);
    }
  }

  // All retries exhausted, throw the last error
  logger.error(`${operation} failed after ${maxRetries + 1} attempts`, {
    correlationId,
    maxRetries,
    finalError: lastError.message,
  });

  throw lastError;
};

/**
 * Retry decorator for async methods
 * @param {Object} options - Retry options
 */
export const retryable =
  (options = {}) =>
  (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const operation = `${target.constructor.name}.${propertyKey}`;
      const correlationId = this.correlationId || options.correlationId;

      return withRetry(
        () => originalMethod.apply(this, args),
        { ...options, correlationId },
        operation
      );
    };

    return descriptor;
  };

/**
 * Specialized retry for database operations
 * @param {Function} fn - Database operation function
 * @param {Object} options - Additional retry options
 */
export const withDatabaseRetry = async (fn, options = {}) => {
  const dbRetryConfig = {
    maxRetries: 2, // Fewer retries for DB operations
    initialDelay: 500,
    retryableErrors: ['MongoNetworkError', 'MongoTimeoutError', 'ECONNREFUSED', 'ETIMEDOUT'],
    ...options,
  };

  return withRetry(fn, dbRetryConfig, 'database_operation');
};

/**
 * Specialized retry for external service calls
 * @param {Function} fn - External service call function
 * @param {Object} options - Additional retry options
 */
export const withServiceRetry = async (fn, options = {}) => {
  const serviceRetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    retryableErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ESOCKETTIMEDOUT',
      'EBADGATEWAY',
      'ESERVICEUNAVAILABLE',
    ],
    ...options,
  };

  return withRetry(fn, serviceRetryConfig, 'external_service_call');
};

/**
 * Create a timeout wrapper for operations
 * @param {Function} fn - Function to wrap with timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operation - Operation name for error context
 * @param {Object} options - Additional timeout options
 */
export const withTimeout = async (fn, timeoutMs = 5000, operation = 'operation', options = {}) => {
  const { correlationId, onTimeout, customMessage } = options;

  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const message = customMessage || `${operation} timed out after ${timeoutMs}ms`;
      const error = new NetworkTimeoutException(message);

      logger.warn('Operation timed out', {
        correlationId,
        operation,
        timeoutMs,
        customMessage,
      });

      if (onTimeout) {
        try {
          onTimeout(error, operation, timeoutMs);
        } catch (callbackError) {
          logger.error('Error in timeout callback', {
            correlationId,
            callbackError: callbackError.message,
          });
        }
      }

      reject(error);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Timeout presets for different operation types
 */
export const TimeoutPresets = {
  // Quick operations (validation, simple DB queries)
  QUICK: 2000, // 2 seconds

  // Normal operations (most API calls, DB operations)
  NORMAL: 10000, // 10 seconds

  // Slow operations (external API calls, file processing)
  SLOW: 30000, // 30 seconds

  // Very slow operations (bulk operations, reports)
  BULK: 120000, // 2 minutes

  // Email operations
  EMAIL: 45000, // 45 seconds

  // Database operations
  DATABASE: 15000, // 15 seconds

  // External service calls
  EXTERNAL_API: 20000, // 20 seconds
};

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  // Fast retries for quick operations
  FAST: {
    maxRetries: 2,
    initialDelay: 100,
    maxDelay: 1000,
  },

  // Standard retries for normal operations
  STANDARD: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  },

  // Slow retries for external services
  EXTERNAL_SERVICE: {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 30000,
  },

  // Conservative retries for critical operations
  CRITICAL: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 60000,
  },
};

export default {
  withRetry,
  retryable,
  withDatabaseRetry,
  withServiceRetry,
  withTimeout,
  RetryPresets,
  isRetryableError,
  calculateDelay,
};
