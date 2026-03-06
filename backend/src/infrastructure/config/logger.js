import winston from 'winston';
import 'winston-daily-rotate-file';
import { config } from './config.js';
import { getCorrelationId } from '../../shared/utils/correlation-context.js';

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
      // Only show important metadata, not full JSON objects
      const importantKeys = ['error', 'userId', 'correlationId', 'duration', 'statusCode'];
      const importantMeta = {};
      for (const key of importantKeys) {
        if (meta[key] !== undefined) {
          importantMeta[key] = meta[key];
        }
      }

      const metaStr =
        Object.keys(importantMeta).length > 0
          ? Object.entries(importantMeta)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')
          : '';
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
      // Only show important metadata, not full JSON objects
      const importantKeys = ['error', 'userId', 'correlationId', 'duration', 'statusCode'];
      const importantMeta = {};
      for (const key of importantKeys) {
        if (meta[key] !== undefined) {
          importantMeta[key] = meta[key];
        }
      }

      const metaStr =
        Object.keys(importantMeta).length > 0
          ? Object.entries(importantMeta)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')
          : '';
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

// Add rotating file transports in non-test environments.
// Logs rotate daily, capped at 20 MB per file, kept for 14 days.
if (config.NODE_ENV !== 'test') {
  const rotateBase = {
    dirname: 'logs',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat,
    zippedArchive: true,
  };

  const errorFileTransport = new winston.transports.DailyRotateFile({
    ...rotateBase,
    filename: 'error-%DATE%.log',
    level: 'error',
  });
  const allFileTransport = new winston.transports.DailyRotateFile({
    ...rotateBase,
    filename: 'all-%DATE%.log',
  });

  // Prevent unhandled 'error' events from crashing the process when the logs
  // directory is not writable (e.g. a read-only bind mount on first deploy).
  // Console transport continues to work, so Docker logs remain intact.
  errorFileTransport.on('error', (err) => {
    process.stderr.write(`[logger] Cannot write error log file: ${err.message}\n`);
  });
  allFileTransport.on('error', (err) => {
    process.stderr.write(`[logger] Cannot write all log file: ${err.message}\n`);
  });

  transports.push(errorFileTransport, allFileTransport);
}

// Create the logger instance
const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  transports,
});

// Build a meta object, automatically injecting the AsyncLocalStorage
// correlation ID when the caller hasn't provided one explicitly.
function buildMeta(meta) {
  const { correlationId, userId, ...restMeta } = meta;
  const winstonMeta = { ...restMeta };
  // Explicit correlationId wins; fall back to the async-local context value.
  const cid = correlationId ?? getCorrelationId();
  if (cid) {
    winstonMeta.correlationId = cid;
  }
  if (userId) {
    winstonMeta.userId = userId;
  }
  return winstonMeta;
}

// Enhanced logging methods with automatic correlation ID injection
const enhancedLogger = {
  error: (message, meta = {}) => logger.error(message, buildMeta(meta)),
  warn: (message, meta = {}) => logger.warn(message, buildMeta(meta)),
  info: (message, meta = {}) => logger.info(message, buildMeta(meta)),
  http: (message, meta = {}) => logger.http(message, buildMeta(meta)),
  debug: (message, meta = {}) => logger.debug(message, buildMeta(meta)),

  // Request-aware logging methods
  withRequest: (req) => ({
    error: (message) =>
      logger.error(message, {
        correlationId: req.correlationId,
        userId: req.user?._id,
      }),
    warn: (message) =>
      logger.warn(message, {
        correlationId: req.correlationId,
        userId: req.user?._id,
      }),
    info: (message) =>
      logger.info(message, {
        correlationId: req.correlationId,
        userId: req.user?._id,
      }),
    http: (message) =>
      logger.http(message, {
        correlationId: req.correlationId,
        userId: req.user?._id,
      }),
    debug: (message) =>
      logger.debug(message, {
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

  startup: (message, meta = {}) => logger.info(message, buildMeta(meta)),
  security: (message, meta = {}) => logger.warn(message, buildMeta(meta)),
  database: (message, meta = {}) => logger.debug(message, buildMeta(meta)),
  api: (message, meta = {}) => logger.http(message, buildMeta(meta)),
  performance: (message, meta = {}) => logger.info(message, buildMeta(meta)),
};

export default enhancedLogger;
