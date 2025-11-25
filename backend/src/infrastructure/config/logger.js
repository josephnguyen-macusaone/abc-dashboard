import winston from 'winston';
import { config } from './config.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format with correlation ID
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, ...meta } = info;

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

    // Add metadata in dark gray color if present
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta);
      logMessage += ` \x1b[37m${metaStr}\x1b[39m`;
    }

    return logMessage;
  })
);

// Console format (with colors)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, stack, ...meta } = info;

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

    // Add metadata in dark gray color if present
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta);
      logMessage += ` \x1b[37m${metaStr}\x1b[39m`;
    }

    // Only include stack trace for errors
    if (stack && level === 'error') {
      logMessage += `\n${stack}`;
    }

    return logMessage;
  }),
  winston.format.colorize({ all: true })
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    format: consoleFormat,
  }),
];

// Add file transports in non-test environments
if (config.NODE_ENV !== 'test') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
    }),
    // All logs file
    new winston.transports.File({
      filename: 'logs/all.log',
      format: customFormat,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  transports,
});

// Enhanced logging methods with correlation ID support
const enhancedLogger = {
  // Original methods with optional metadata
  error: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.error(message, winstonMeta);
  },
  warn: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.warn(message, winstonMeta);
  },
  info: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.info(message, winstonMeta);
  },
  http: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.http(message, winstonMeta);
  },
  debug: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.debug(message, winstonMeta);
  },

  // Request-aware logging methods
  withRequest: (req) => ({
    error: (message) => logger.error(message, {
      correlationId: req.correlationId,
      userId: req.user?._id,
    }),
    warn: (message) => logger.warn(message, {
      correlationId: req.correlationId,
      userId: req.user?._id,
    }),
    info: (message) => logger.info(message, {
      correlationId: req.correlationId,
      userId: req.user?._id,
    }),
    http: (message) => logger.http(message, {
      correlationId: req.correlationId,
      userId: req.user?._id,
    }),
    debug: (message) => logger.debug(message, {
      correlationId: req.correlationId,
      userId: req.user?._id,
    }),
  }),

  // Context-aware logging for different parts of the application
  createChild: (context) => ({
    error: (message) => logger.error(message, context),
    warn: (message) => logger.warn(message, context),
    info: (message) => logger.info(message, context),
    http: (message) => logger.http(message, context),
    debug: (message) => logger.debug(message, context),
  }),

  // Application startup logging
  startup: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.info(message, winstonMeta);
  },

  // Security event logging
  security: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.warn(message, winstonMeta);
  },

  // Database operation logging
  database: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.debug(message, winstonMeta);
  },

  // API operation logging
  api: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.http(message, winstonMeta);
  },

  // Performance logging
  performance: (message, meta = {}) => {
    const { correlationId, userId, ...restMeta } = meta;
    const winstonMeta = { ...restMeta };
    if (correlationId) winstonMeta.correlationId = correlationId;
    if (userId) winstonMeta.userId = userId;
    return logger.info(message, winstonMeta);
  },
};

export default enhancedLogger;
