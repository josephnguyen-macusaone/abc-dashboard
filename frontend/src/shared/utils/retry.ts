import logger from './logger';

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
  timeout?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, 5xx server errors, and timeouts
    if (!error.response) return true; // Network errors
    const status = error.response?.status;
    return status >= 500 || status === 408 || status === 429;
  },
};

/**
 * Calculates delay for exponential backoff with jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
  return Math.min(delayWithJitter, config.maxDelay);
}

/**
 * Sleeps for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const correlationId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.debug(`Starting retry operation`, {
    correlationId,
    context,
    maxRetries: finalConfig.maxRetries,
    baseDelay: finalConfig.baseDelay,
  });

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.debug(`Retry operation succeeded on attempt ${attempt}`, {
          correlationId,
          context,
          attempt,
        });
      }
      return result;
    } catch (error) {
      const shouldRetry = attempt <= finalConfig.maxRetries &&
                          finalConfig.retryCondition!(error, attempt);

      if (!shouldRetry) {
        logger.warn(`Retry operation failed permanently after ${attempt} attempts`, {
          correlationId,
          context,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      const delay = calculateDelay(attempt, finalConfig);

      logger.warn(`Retry operation failed on attempt ${attempt}, retrying in ${delay}ms`, {
        correlationId,
        context,
        attempt,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Call onRetry callback if provided
      finalConfig.onRetry?.(error, attempt, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Retry logic error: maximum retries exceeded');
}

/**
 * Retries a synchronous function with exponential backoff
 */
export function retrySync<T>(
  fn: () => T,
  config: Partial<RetryConfig> = {},
  context?: string
): T {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const correlationId = `retry_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.debug(`Starting synchronous retry operation`, {
    correlationId,
    context,
    maxRetries: finalConfig.maxRetries,
  });

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const result = fn();
      if (attempt > 1) {
        logger.debug(`Synchronous retry operation succeeded on attempt ${attempt}`, {
          correlationId,
          context,
          attempt,
        });
      }
      return result;
    } catch (error) {
      const shouldRetry = attempt <= finalConfig.maxRetries &&
                          finalConfig.retryCondition!(error, attempt);

      if (!shouldRetry) {
        logger.warn(`Synchronous retry operation failed permanently after ${attempt} attempts`, {
          correlationId,
          context,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      const delay = calculateDelay(attempt, finalConfig);

      logger.warn(`Synchronous retry operation failed on attempt ${attempt}, retrying in ${delay}ms`, {
        correlationId,
        context,
        attempt,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Call onRetry callback if provided
      finalConfig.onRetry?.(error, attempt, delay);

      // Wait before retrying (this blocks the main thread, use with caution)
      const startTime = Date.now();
      while (Date.now() - startTime < delay) {
        // Busy wait - not ideal but necessary for synchronous retry
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Retry logic error: maximum retries exceeded');
}

/**
 * Creates a retry wrapper for functions
 */
export function withRetry<T extends (...args: any[]) => any>(
  fn: T,
  config: Partial<RetryConfig> = {},
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    return retryAsync(() => fn(...args), config, context);
  }) as T;
}

/**
 * Creates a retry wrapper for synchronous functions
 */
export function withRetrySync<T extends (...args: any[]) => any>(
  fn: T,
  config: Partial<RetryConfig> = {},
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    return retrySync(() => fn(...args), config, context);
  }) as T;
}

/**
 * Specialized retry configurations for different scenarios
 */
export const RETRY_CONFIGS = {
  // Network requests
  network: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryCondition: (error: any) => {
      // Retry on network errors and 5xx server errors
      return !error.response || error.response.status >= 500;
    },
  },

  // Database operations
  database: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
    retryCondition: (error: any) => {
      // Only retry on connection errors, not constraint violations
      return error.code === 'ECONNRESET' ||
             error.code === 'ENOTFOUND' ||
             error.code === 'ETIMEDOUT';
    },
  },

  // File operations
  fileSystem: {
    maxRetries: 1,
    baseDelay: 100,
    maxDelay: 1000,
    retryCondition: (error: any) => {
      // Only retry on specific file system errors
      return error.code === 'EMFILE' || error.code === 'ENFILE';
    },
  },

  // API calls with rate limiting
  api: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    retryCondition: (error: any) => {
      if (!error.response) return true; // Network errors
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    },
  },

  // Critical operations (lower retry count, higher priority)
  critical: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 15000,
    retryCondition: (error: any) => {
      // More aggressive retry for critical operations
      return !error.response || error.response.status >= 500 || error.response.status === 429;
    },
  },
} as const;

/**
 * Utility functions for common retry scenarios
 */
export const RetryUtils = {
  /**
   * Creates a network request with automatic retry
   */
  async fetchWithRetry(url: string, options?: RequestInit, config?: Partial<RetryConfig>) {
    return retryAsync(
      () => fetch(url, options).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      }),
      { ...RETRY_CONFIGS.network, ...config },
      `fetch_${url}`
    );
  },

  /**
   * Creates an API call with automatic retry
   */
  async apiCallWithRetry<T>(
    apiCall: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string
  ): Promise<T> {
    return retryAsync(apiCall, { ...RETRY_CONFIGS.api, ...config }, context);
  },

  /**
   * Creates a database operation with automatic retry
   */
  async dbOperationWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string
  ): Promise<T> {
    return retryAsync(operation, { ...RETRY_CONFIGS.database, ...config }, context);
  },
};
