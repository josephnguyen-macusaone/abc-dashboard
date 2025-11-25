// Frontend Logger - Matching backend format with correlation ID support

// Define log levels (matching backend)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

type LogLevel = keyof typeof levels;

// Define colors for console (CSS colors instead of ANSI)
const colors = {
  error: '#ef4444', // red-500
  warn: '#f59e0b',  // amber-500
  info: '#10b981',  // emerald-500
  http: '#8b5cf6',  // violet-500
  debug: '#3b82f6', // blue-500
} as const;

// Current environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Get current log level based on environment
const getCurrentLogLevel = (): LogLevel => {
  return isProduction ? 'info' : 'debug';
};

// Format timestamp (MM-DD HH:mm:ss format like backend)
const formatTimestamp = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Format log message (matching backend format)
const formatMessage = (
  level: LogLevel,
  message: string,
  meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}
): string => {
  const timestamp = formatTimestamp();
  const { correlationId, userId, ...restMeta } = meta;

  let logMessage = `[${timestamp}][${level.toUpperCase()}]`;

  // Add correlation ID only if present
  if (correlationId) {
    logMessage += `[${correlationId}]`;
  }

  // Add user ID only if present
  if (userId) {
    logMessage += `[user:${userId}]`;
  }

  logMessage += ` ${message}`;

  return logMessage;
};

// Check if message should be logged based on current level
const shouldLog = (level: LogLevel): boolean => {
  return levels[level] <= levels[getCurrentLogLevel()];
};

// Console logging with colors and structured format
const logToConsole = (
  level: LogLevel,
  message: string,
  meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}
): void => {
  if (!shouldLog(level)) return;

  const formattedMessage = formatMessage(level, message, meta);
  const { correlationId, userId, ...restMeta } = meta;

  // Create styled console message
  const styles = [
    `color: ${colors[level]}`,
    'font-weight: bold',
    'font-family: monospace'
  ].join(';');

  console.groupCollapsed(`%c${formattedMessage}`, styles);

  // Add metadata if present
  if (Object.keys(restMeta).length > 0) {
    console.log('Metadata:', restMeta);
  }

  // Add stack trace for errors
  if (level === 'error' && restMeta.stack) {
    console.error('Stack trace:', restMeta.stack);
  }

  console.groupEnd();
};

// Store logs in memory for debugging (only in development)
const logHistory: Array<{
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
}> = [];

const addToHistory = (level: LogLevel, message: string, meta?: any): void => {
  if (!isDevelopment) return;

  logHistory.push({
    timestamp: formatTimestamp(),
    level,
    message,
    meta,
  });

  // Keep only last 100 logs
  if (logHistory.length > 100) {
    logHistory.shift();
  }
};

// Export log history for debugging
export const getLogHistory = (): typeof logHistory => {
  return [...logHistory];
};

// Clear log history
export const clearLogHistory = (): void => {
  logHistory.length = 0;
};

// Generate correlation ID
export const generateCorrelationId = (): string => {
  return `fe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Enhanced logging methods with correlation ID support
const enhancedLogger = {
  // Original methods with optional metadata
  error: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('error', message, meta);
    logToConsole('error', message, meta);
  },

  warn: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('warn', message, meta);
    logToConsole('warn', message, meta);
  },

  info: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('info', message, meta);
    logToConsole('info', message, meta);
  },

  http: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('http', message, meta);
    logToConsole('http', message, meta);
  },

  debug: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    addToHistory('debug', message, meta);
    logToConsole('debug', message, meta);
  },

  // Request-aware logging methods (for API calls)
  withCorrelationId: (correlationId: string) => ({
    error: (message: string, meta: { userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.error(message, { correlationId, ...meta }),
    warn: (message: string, meta: { userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.warn(message, { correlationId, ...meta }),
    info: (message: string, meta: { userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.info(message, { correlationId, ...meta }),
    http: (message: string, meta: { userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.http(message, { correlationId, ...meta }),
    debug: (message: string, meta: { userId?: string; [key: string]: any } = {}) =>
      enhancedLogger.debug(message, { correlationId, ...meta }),
  }),

  // Context-aware logging for different parts of the application
  createChild: (context: {
    correlationId?: string;
    userId?: string;
    component?: string;
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
  }),

  // Application startup logging
  startup: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.info(`🚀 ${message}`, meta);
  },

  // Security event logging
  security: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.warn(`🔒 ${message}`, meta);
  },

  // API operation logging
  api: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.http(`🌐 ${message}`, meta);
  },

  // User action logging
  user: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    [key: string]: any;
  } = {}): void => {
    enhancedLogger.info(`👤 ${message}`, meta);
  },

  // Performance logging
  performance: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    duration?: number;
    [key: string]: any;
  } = {}): void => {
    const perfMessage = meta.duration ? `${message} (${meta.duration}ms)` : message;
    enhancedLogger.info(`⚡ ${perfMessage}`, meta);
  },

  // Error boundary logging
  errorBoundary: (message: string, meta: {
    correlationId?: string;
    userId?: string;
    error?: Error;
    componentStack?: string;
    [key: string]: any;
  } = {}): void => {
    const errorMeta = {
      ...meta,
      stack: meta.error?.stack,
      componentStack: meta.componentStack,
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
  withCorrelationId,
  createChild,
  startup,
  security,
  api,
  user,
  performance,
  errorBoundary,
} = enhancedLogger;
