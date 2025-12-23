// Enhanced Frontend Logger - Optimized for performance, memory, and reduced noise

import { CircularBuffer } from './buffer';

// Define log levels (matching backend)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
} as const;

type LogLevel = keyof typeof levels;

// Define colors for console (CSS colors instead of ANSI)
const colors = {
  error: '#ef4444', // red-500
  warn: '#f59e0b',  // amber-500
  info: '#10b981',  // emerald-500
  http: '#8b5cf6',  // violet-500
  debug: '#3b82f6', // blue-500
  trace: '#6b7280', // gray-500
} as const;

// Current environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Environment-based configuration
const LOG_CONFIG = {
  // Log levels by environment
  levels: {
    production: 'warn' as LogLevel,
    development: 'debug' as LogLevel,
    test: 'error' as LogLevel,
  },

  // Sampling rates (percentage of logs to keep) - reduced for less noise
  sampling: {
    http: isProduction ? 0.01 : 0.3,     // 1% in prod, 30% in dev (reduced from 10%)
    debug: isProduction ? 0.005 : 0.5,   // 0.5% in prod, 50% in dev (reduced from 5%)
    trace: isProduction ? 0.001 : 0.05,  // 0.1% in prod, 5% in dev (reduced from 1%)
    info: isProduction ? 0.05 : 1.0,     // 5% in prod, 100% in dev (reduced from 20%)
  },

  // Categories to suppress in production - expanded list
  suppressedCategories: isProduction ? [
    'tracing',
    'performance',
    'component-lifecycle',
    'api-details',
    'api-debug',
    'cache-debug',
    'store-debug'
  ] : [
    // Suppress noisy categories in development too
    'api-details', // HTTP request/response logs
  ],

  // Maximum logs per minute to prevent spam - reduced
  rateLimit: {
    enabled: isProduction,
    maxLogsPerMinute: 30, // Reduced from 60
    windowMs: 60000,
  },

  // Performance monitoring - disabled in production
  performance: {
    enabled: !isProduction,
    slowLogThreshold: 10, // Increased threshold
  },

  // Memory management - smaller history in production
  memory: {
    maxHistorySize: isProduction ? 10 : 30, // Further reduced
    maxPerformanceMetrics: 50, // Reduced
    enableMemoryMonitoring: !isProduction,
  },

  // Batch logging for performance
  batching: {
    enabled: isProduction,
    batchSize: 10,
    flushInterval: 100, // ms
  },
} as const;

// Rate limiting state
let logCount = 0;
let rateLimitWindowStart = Date.now();

// Performance monitoring with size limit
const logPerformanceMetrics = new Map<string, number>();

// Batch logging queue
interface QueuedLog {
  level: LogLevel;
  message: string;
  meta: any;
  timestamp: number;
}

const logQueue: QueuedLog[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Lazy string formatting cache
const formatCache = new Map<string, string>();
const CACHE_SIZE_LIMIT = 1000;

// Get current log level based on environment
const getCurrentLogLevel = (): LogLevel => {
  return LOG_CONFIG.levels[process.env.NODE_ENV as keyof typeof LOG_CONFIG.levels] || 'info';
};

// Check if message should be logged based on current level
const shouldLog = (level: LogLevel): boolean => {
  return levels[level] <= levels[getCurrentLogLevel()];
};

// Check if message should be sampled
const shouldSample = (level: LogLevel, category?: string): boolean => {
  // Always log errors and warnings
  if (level === 'error' || level === 'warn') return true;

  // Check category suppression
  if (category && LOG_CONFIG.suppressedCategories.includes(category)) {
    return false;
  }

  // Apply sampling
  const sampleRate = LOG_CONFIG.sampling[level] ?? 1.0;
  return Math.random() < sampleRate;
};

// Rate limiting check
const checkRateLimit = (): boolean => {
  if (!LOG_CONFIG.rateLimit.enabled) return true;

  const now = Date.now();
  if (now - rateLimitWindowStart > LOG_CONFIG.rateLimit.windowMs) {
    logCount = 0;
    rateLimitWindowStart = now;
  }

  if (logCount >= LOG_CONFIG.rateLimit.maxLogsPerMinute) {
    return false;
  }

  logCount++;
  return true;
};

// Format timestamp (MM-DD HH:mm:ss format like backend) with caching
const formatTimestamp = (): string => {
  const now = Date.now();
  const cacheKey = `ts_${Math.floor(now / 1000)}`; // Cache per second

  const cached = formatCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const formatted = `${month}-${day} ${hours}:${minutes}:${seconds}`;

  // Cache management
  if (formatCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = formatCache.keys().next().value;
    if (firstKey) {
      formatCache.delete(firstKey);
    }
  }
  formatCache.set(cacheKey, formatted);

  return formatted;
};

// Format log message (optimized format with lazy evaluation)
const formatMessage = (
  level: LogLevel,
  message: string,
  meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}
): string => {
  // Create cache key for message formatting
  const cacheKey = `${level}_${message}_${meta.correlationId || ''}_${meta.userId || ''}_${meta.category || ''}`;

  // Use cached format if available (only for non-error logs to save memory)
  if (level !== 'error') {
    const cached = formatCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const timestamp = formatTimestamp();
  const { correlationId, userId, category, ...restMeta } = meta;

  let logMessage = `[${timestamp}][${level.toUpperCase()}]`;

  // Add correlation ID only if present and not too long
  if (correlationId && correlationId.length <= 12) {
    logMessage += `[${correlationId}]`;
  }

  // Add user ID only if present
  if (userId && typeof userId === 'string' && userId.length <= 8) {
    logMessage += `[u:${userId}]`;
  }

  // Add category if present and relevant
  if (category && !LOG_CONFIG.suppressedCategories.includes(category)) {
    logMessage += `[${category}]`;
  }

  logMessage += ` ${message}`;

  // Cache non-error messages
  if (level !== 'error' && formatCache.size < CACHE_SIZE_LIMIT) {
    formatCache.set(cacheKey, logMessage);
  }

  return logMessage;
};

// Flush batched logs
const flushLogQueue = (): void => {
  if (logQueue.length === 0) return;

  const logsToFlush = logQueue.splice(0, LOG_CONFIG.batching.batchSize);

  // Use requestAnimationFrame for smooth console output
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      logsToFlush.forEach(({ level, message, meta }) => {
        logToConsoleImmediate(level, message, meta);
      });
    });
  } else {
    logsToFlush.forEach(({ level, message, meta }) => {
      logToConsoleImmediate(level, message, meta);
    });
  }

  // Schedule next flush if queue has more items
  if (logQueue.length > 0) {
    flushTimer = setTimeout(flushLogQueue, LOG_CONFIG.batching.flushInterval);
  } else {
    flushTimer = null;
  }
};

// Optimized console logging with performance monitoring and batching
const logToConsole = (
  level: LogLevel,
  message: string,
  meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}
): void => {
  // Early returns for performance
  if (!shouldLog(level)) return;
  if (!shouldSample(level, meta.category)) return;
  if (!checkRateLimit()) return;

  // Batch logging in production for better performance
  if (LOG_CONFIG.batching.enabled && level !== 'error') {
    logQueue.push({
      level,
      message,
      meta,
      timestamp: Date.now(),
    });

    if (!flushTimer) {
      flushTimer = setTimeout(flushLogQueue, LOG_CONFIG.batching.flushInterval);
    }
    return;
  }

  // Immediate logging for errors or when batching is disabled
  logToConsoleImmediate(level, message, meta);
};

// Immediate console logging (used for errors or when batching is disabled)
const logToConsoleImmediate = (
  level: LogLevel,
  message: string,
  meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}
): void => {
  const startTime = LOG_CONFIG.performance.enabled ? (typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now()) : 0;

  const formattedMessage = formatMessage(level, message, meta);
  const { correlationId, userId, category, ...restMeta } = meta;

  // Use appropriate console method
  const consoleMethod = level === 'error' ? 'error' :
                       level === 'warn' ? 'warn' :
                       level === 'trace' ? 'debug' : 'log';

  // Simple logging in production for performance
  if (isProduction) {
    console[consoleMethod](formattedMessage);
    if (Object.keys(restMeta).length > 0 && level === 'error') {
      console[consoleMethod]('Details:', restMeta);
    }
  } else {
    // Enhanced logging in development
  const styles = [
    `color: ${colors[level]}`,
    'font-weight: bold',
    'font-family: monospace'
  ].join(';');

  console.groupCollapsed(`%c${formattedMessage}`, styles);

    // Add metadata if present and not too verbose
    if (Object.keys(restMeta).length > 0 && Object.keys(restMeta).length <= 10) {
      console.log('Details:', restMeta);
    } else if (Object.keys(restMeta).length > 10) {
      console.log('Details: [Too many fields to display]');
  }

  // Add stack trace for errors
  if (level === 'error' && restMeta.stack) {
    console.error('Stack trace:', restMeta.stack);
  }

  console.groupEnd();
  }

  // Performance monitoring
  if (LOG_CONFIG.performance.enabled && startTime) {
    const endTime = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();
    const duration = endTime - startTime;
    if (duration > LOG_CONFIG.performance.slowLogThreshold) {
      // Limit performance metrics size
      if (logPerformanceMetrics.size >= LOG_CONFIG.memory.maxPerformanceMetrics) {
        const firstKey = logPerformanceMetrics.keys().next().value;
        if (firstKey) {
          logPerformanceMetrics.delete(firstKey);
        }
      }
      logPerformanceMetrics.set(`${level}:${message.substring(0, 50)}`, duration);
    }
  }
};

// Store logs in memory using circular buffer for efficient memory management
const logHistory = new CircularBuffer<{
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  category?: string;
}>(LOG_CONFIG.memory.maxHistorySize);

const addToHistory = (level: LogLevel, message: string, meta?: any): void => {
  if (!isDevelopment && !LOG_CONFIG.memory.enableMemoryMonitoring) return;

  logHistory.push({
    timestamp: formatTimestamp(),
    level,
    message,
    meta,
    category: meta?.category,
  });
};

// Export log history for debugging
export const getLogHistory = (): Array<{
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  category?: string;
}> => {
  return logHistory.getAll();
};

// Clear log history
export const clearLogHistory = (): void => {
  logHistory.clear();
};

// Get memory usage statistics
export const getMemoryStats = (): {
  logHistorySize: number;
  logHistoryCapacity: number;
  performanceMetricsSize: number;
  formatCacheSize: number;
  queueSize: number;
} => {
  return {
    logHistorySize: logHistory.length,
    logHistoryCapacity: logHistory.capacity,
    performanceMetricsSize: logPerformanceMetrics.size,
    formatCacheSize: formatCache.size,
    queueSize: logQueue.length,
  };
};

// Clear all caches and queues
export const clearAllCaches = (): void => {
  formatCache.clear();
  logQueue.length = 0;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
};

// Get performance metrics
export const getLogPerformanceMetrics = (): Record<string, number> => {
  return Object.fromEntries(logPerformanceMetrics);
};

// Clear performance metrics
export const clearLogPerformanceMetrics = (): void => {
  logPerformanceMetrics.clear();
};

// Generate correlation ID
export const generateCorrelationId = (): string => {
  return `fe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Enhanced logging methods with correlation ID and category support
const enhancedLogger = {
  // Original methods with optional metadata
  error: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('error', message, meta);
    logToConsole('error', message, meta);
  },

  warn: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('warn', message, meta);
    logToConsole('warn', message, meta);
  },

  info: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('info', message, meta);
    logToConsole('info', message, meta);
  },

  http: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('http', message, meta);
    logToConsole('http', message, meta);
  },

  debug: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('debug', message, meta);
    logToConsole('debug', message, meta);
  },

  trace: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('trace', message, meta);
    logToConsole('trace', message, meta);
  },

  // Request-aware logging methods (for API calls)
  withCorrelationId: (correlationId: string) => ({
    error: (message: string, meta: { userId?: string; category?: string; [key: string]: any } = {}) =>
      enhancedLogger.error(message, { correlationId, ...meta }),
    warn: (message: string, meta: { userId?: string; category?: string; [key: string]: any } = {}) =>
      enhancedLogger.warn(message, { correlationId, ...meta }),
    info: (message: string, meta: { userId?: string; category?: string; [key: string]: any } = {}) =>
      enhancedLogger.info(message, { correlationId, ...meta }),
    http: (message: string, meta: { userId?: string; category?: string; [key: string]: any } = {}) =>
      enhancedLogger.http(message, { correlationId, ...meta }),
    debug: (message: string, meta: { userId?: string; category?: string; [key: string]: any } = {}) =>
      enhancedLogger.debug(message, { correlationId, ...meta }),
    trace: (message: string, meta: { userId?: string; category?: string; [key: string]: any } = {}) =>
      enhancedLogger.trace(message, { correlationId, ...meta }),
  }),

  // Context-aware logging for different parts of the application
  createChild: (context: {
    correlationId?: string;
    userId?: string;
    component?: string;
    category?: string;
    [key: string]: any;
  }) => ({
    error: (message: string, meta: { [key: string]: any } = {}) =>
      enhancedLogger.error(message, { ...context, ...meta }),
    warn: (message: string, meta: { [key: string]: any } = {}) =>
      enhancedLogger.warn(message, { ...context, ...meta }),
    info: (message: string, meta: { [key: string]: any } = {}) =>
      enhancedLogger.info(message, { ...context, ...meta }),
    http: (message: string, meta: { [key: string]: any } = {}) =>
      enhancedLogger.http(message, { ...context, ...meta }),
    debug: (message: string, meta: { [key: string]: any } = {}) =>
      enhancedLogger.debug(message, { ...context, ...meta }),
    trace: (message: string, meta: { [key: string]: any } = {}) =>
      enhancedLogger.trace(message, { ...context, ...meta }),
  }),

  // Category-specific logging methods
  createCategory: (category: string) => ({
    error: (message: string, meta: { correlationId?: string; userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.error(message, { category, ...meta }),
    warn: (message: string, meta: { correlationId?: string; userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.warn(message, { category, ...meta }),
    info: (message: string, meta: { correlationId?: string; userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.info(message, { category, ...meta }),
    http: (message: string, meta: { correlationId?: string; userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.http(message, { category, ...meta }),
    debug: (message: string, meta: { correlationId?: string; userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.debug(message, { category, ...meta }),
    trace: (message: string, meta: { correlationId?: string; userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.trace(message, { category, ...meta }),
  }),

  // Application startup logging
  startup: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.info(`🚀 ${message}`, { category: 'startup', ...meta });
  },

  // Security event logging
  security: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.warn(`🔒 ${message}`, { category: 'security', ...meta });
  },

  // API operation logging
  api: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.http(`🌐 ${message}`, { category: 'api', ...meta });
  },

  // User action logging
  user: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.info(`👤 ${message}`, { category: 'user-action', ...meta });
  },

  // Performance logging
  performance: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    duration?: number;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    const perfMessage = meta.duration ? `${message} (${meta.duration}ms)` : message;
    enhancedLogger.info(`⚡ ${perfMessage}`, { category: 'performance', ...meta });
  },

  // Performance timing utility
  time: (label: string) => {
    const start = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();
    return {
      end: (meta?: { correlationId?: string; userId?: string; [key: string]: any }) => {
        const end = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();
        const duration = end - start;
        enhancedLogger.performance(`${label} completed`, {
          duration: Math.round(duration),
          category: 'performance',
          ...meta,
        });
        return duration;
      }
    };
  },

  // Tracing logging
  tracing: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    traceId?: string;
    spanId?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.trace(`🔍 ${message}`, { category: 'tracing', ...meta });
  },

  // Component lifecycle logging
  component: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    component?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.debug(`🧩 ${message}`, { category: 'component-lifecycle', ...meta });
  },

  // Error boundary logging (concise version for production)
  errorBoundary: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    error?: Error;
    componentStack?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    // Create concise error summary for production readability
    const errorMessage = meta.error?.message || 'Unknown error';
    const errorName = meta.error?.name || 'Error';

    // Summarize component stack (first few lines only)
    const componentStackSummary = meta.componentStack
      ? meta.componentStack.split('\n').slice(0, 3).join('\n').trim()
      : 'No component stack available';

    const conciseMeta = {
      correlationId: meta.correlationId,
      errorId: meta.errorId,
      errorType: errorName,
      errorMessage: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
      componentStackSummary,
      hasFullStack: !!meta.componentStack,
      level: meta.level || 'component',
      category: 'error-boundary',
    };

    enhancedLogger.error(`💥 ${message}`, conciseMeta);
  },

  // Detailed error boundary logging (for when full details are needed)
  errorBoundaryDetailed: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    error?: Error;
    componentStack?: string;
    category?: string;
    [key: string]: any;
  } = {}): void => {
    const errorMeta = {
      ...meta,
      stack: meta.error?.stack,
      componentStack: meta.componentStack,
      category: 'error-boundary',
    };
    enhancedLogger.error(`💥 ${message}`, errorMeta);
  },
};

export default enhancedLogger;

// Export individual methods for convenience
export const {
  error,
  warn,
  info,
  http,
  debug,
  trace,
  withCorrelationId,
  createChild,
  createCategory,
  startup,
  security,
  api,
  user,
  performance,
  time,
  tracing,
  component,
  errorBoundary,
  errorBoundaryDetailed,
} = enhancedLogger;
