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
  silent?: boolean; // Disable all retry logging
  logLevel?: 'none' | 'errors' | 'minimal' | 'verbose'; // Control logging verbosity
}

/**
 * Default retry configuration - optimized for reduced logging noise
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
  silent: false,
  logLevel: 'minimal', // Default to minimal logging to reduce noise
};

/**
 * Determine if logging should happen based on log level
 */
function shouldLogRetry(config: RetryConfig, event: 'start' | 'attempt' | 'success' | 'failure', attempt?: number): boolean {
  if (config.silent) return false;

  switch (config.logLevel) {
    case 'none':
      return false;
    case 'errors':
      return event === 'failure';
    case 'minimal':
      return event === 'failure' || (event === 'success' && typeof attempt === 'number' && attempt > 1);
    case 'verbose':
    default:
      return true;
  }
}

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

  // Only log start in verbose mode
  if (shouldLogRetry(finalConfig, 'start')) {
    logger.performance(`Starting retry operation`, {
    correlationId,
    context,
    maxRetries: finalConfig.maxRetries,
      category: 'retry',
  });
  }

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const result = await fn();

      // Only log success if it took multiple attempts (not on first try)
      if (attempt > 1 && shouldLogRetry(finalConfig, 'success', attempt)) {
        logger.performance(`Operation succeeded after ${attempt} attempts`, {
          correlationId,
          context,
          attempt,
          category: 'retry',
        });
      }

      return result;
    } catch (error) {
      const shouldRetry = attempt <= finalConfig.maxRetries &&
                          finalConfig.retryCondition!(error, attempt);

      if (!shouldRetry) {
        // Always log final failures (critical errors)
        logger.error(`Operation failed after ${attempt} attempts`, {
          correlationId,
          context,
          attempt,
          error: error instanceof Error ? error.message : String(error),
          category: 'retry',
        });
        throw error;
      }

      const delay = calculateDelay(attempt, finalConfig);

      // Only log retry attempts in verbose mode or on high attempt numbers
      if (shouldLogRetry(finalConfig, 'attempt', attempt)) {
        logger.warn(`Retry attempt ${attempt}/${finalConfig.maxRetries + 1} in ${delay}ms`, {
        correlationId,
        context,
        attempt,
          totalAttempts: finalConfig.maxRetries + 1,
        delay,
          category: 'retry',
      });
      }

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

  // Only log start in verbose mode
  if (shouldLogRetry(finalConfig, 'start')) {
    logger.performance(`Starting synchronous retry operation`, {
    correlationId,
    context,
    maxRetries: finalConfig.maxRetries,
      category: 'retry',
  });
  }

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const result = fn();

      // Only log success if it took multiple attempts
      if (attempt > 1 && shouldLogRetry(finalConfig, 'success', attempt)) {
        logger.performance(`Synchronous operation succeeded after ${attempt} attempts`, {
          correlationId,
          context,
          attempt,
          category: 'retry',
        });
      }

      return result;
    } catch (error) {
      const shouldRetry = attempt <= finalConfig.maxRetries &&
                          finalConfig.retryCondition!(error, attempt);

      if (!shouldRetry) {
        // Always log final failures
        logger.error(`Synchronous operation failed after ${attempt} attempts`, {
          correlationId,
          context,
          attempt,
          error: error instanceof Error ? error.message : String(error),
          category: 'retry',
        });
        throw error;
      }

      const delay = calculateDelay(attempt, finalConfig);

      // Only log retry attempts in verbose mode
      if (shouldLogRetry(finalConfig, 'attempt', attempt)) {
        logger.warn(`Synchronous retry attempt ${attempt}/${finalConfig.maxRetries + 1} in ${delay}ms`, {
        correlationId,
        context,
        attempt,
          totalAttempts: finalConfig.maxRetries + 1,
        delay,
          category: 'retry',
      });
      }

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
 * Specialized retry configurations for different scenarios - optimized for reduced logging
 */
export const RETRY_CONFIGS = {
  // Network requests - minimal logging to reduce API noise
  network: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    logLevel: 'minimal' as const,
    retryCondition: (error: any) => {
      // Retry on network errors and 5xx server errors
      return !error.response || error.response.status >= 500;
    },
  },

  // Database operations - silent mode for background ops
  database: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
    logLevel: 'errors' as const, // Only log errors
    retryCondition: (error: any) => {
      // Only retry on connection errors, not constraint violations
      return error.code === 'ECONNRESET' ||
             error.code === 'ENOTFOUND' ||
             error.code === 'ETIMEDOUT';
    },
  },

  // File operations - very quiet
  fileSystem: {
    maxRetries: 1,
    baseDelay: 100,
    maxDelay: 1000,
    logLevel: 'errors' as const, // Only log errors
    retryCondition: (error: any) => {
      // Only retry on specific file system errors
      return error.code === 'EMFILE' || error.code === 'ENFILE';
    },
  },

  // API calls with rate limiting - reduced logging
  api: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    logLevel: 'minimal' as const,
    retryCondition: (error: any) => {
      if (!error.response) return true; // Network errors
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    },
  },

  // Critical operations - more verbose for debugging
  critical: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 15000,
    logLevel: 'minimal' as const, // Still minimal but with more attempts
    retryCondition: (error: any) => {
      // More aggressive retry for critical operations
      return !error.response || error.response.status >= 500 || error.response.status === 429;
    },
  },

  // Silent operations - no logging at all
  silent: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    silent: true,
    logLevel: 'none' as const,
    retryCondition: (error: any) => {
      return !error.response || error.response.status >= 500;
    },
  },
} as const;

/**
 * Utility functions for common retry scenarios - with optimized logging
 */
export const RetryUtils = {
  /**
   * Creates a network request with automatic retry (minimal logging)
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
   * Creates an API call with automatic retry (minimal logging)
   */
  async apiCallWithRetry<T>(
    apiCall: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string
  ): Promise<T> {
    return retryAsync(apiCall, { ...RETRY_CONFIGS.api, ...config }, context);
  },

  /**
   * Creates a database operation with automatic retry (error-only logging)
   */
  async dbOperationWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string
  ): Promise<T> {
    return retryAsync(operation, { ...RETRY_CONFIGS.database, ...config }, context);
  },

  /**
   * Creates a silent operation with retry (no logging)
   */
  async silentRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string
  ): Promise<T> {
    return retryAsync(operation, { ...RETRY_CONFIGS.silent, ...config }, context);
  },

  /**
   * Creates a retry wrapper with custom logging level
   */
  withLoggingLevel<T extends (...args: any[]) => any>(
    fn: T,
    logLevel: RetryConfig['logLevel'] = 'minimal',
    context?: string
  ): T {
    return ((...args: Parameters<T>) => {
      return retryAsync(
        () => fn(...args),
        { logLevel },
        context || fn.name || 'wrapped_function'
      );
    }) as T;
  },
};
