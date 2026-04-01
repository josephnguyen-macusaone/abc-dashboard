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

// Keys to include in human-readable log line (skip nested objects like headers)
const IMPORTANT_META_KEYS = [
  'error',
  'userId',
  'correlationId',
  'duration',
  'statusCode',
  'method',
  'url',
];

function metaForDisplay(meta) {
  const out = {};
  for (const key of IMPORTANT_META_KEYS) {
    if (meta[key] === undefined) {
      continue;
    }
    const v = meta[key];
    out[key] = v instanceof Error ? v.message : v;
  }
  return out;
}

// Custom format with correlation ID (file / non-JSON)
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, ...meta } = info;

    let logMessage = `[${timestamp}][${level.toUpperCase()}]`;

    if (correlationId) {
      logMessage += `[${correlationId}]`;
    }
    if (userId) {
      logMessage += `[user:${userId}]`;
    }
    logMessage += ` ${message}`;

    const importantMeta = metaForDisplay(meta);
    if (Object.keys(importantMeta).length > 0) {
      const metaStr = Object.entries(importantMeta)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
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

    if (correlationId) {
      logMessage += `[${correlationId}]`;
    }
    if (userId) {
      logMessage += `[user:${userId}]`;
    }
    logMessage += ` ${message}`;

    const importantMeta = metaForDisplay(meta);
    if (Object.keys(importantMeta).length > 0) {
      const metaStr = Object.entries(importantMeta)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      logMessage += ` \x1b[37m${metaStr}\x1b[39m`;
    }

    if (stack && level === 'error') {
      logMessage += `\n${stack}`;
    }

    return logMessage;
  }),
  winston.format.colorize({ all: true })
);

// JSON format: one line per log for aggregators (LOG_FORMAT=json)
function serializeMeta(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (obj instanceof Error) {
    return { message: obj.message, name: obj.name, stack: obj.stack };
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeMeta);
  }
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeMeta(v);
    }
    return out;
  }
  return obj;
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'ISO' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const payload = {
      timestamp,
      level,
      message,
      ...serializeMeta(meta),
    };
    return JSON.stringify(payload);
  })
);

const useJsonFormat = config.LOG_FORMAT === 'json';
const consoleLogFormat = useJsonFormat ? jsonFormat : consoleFormat;

// Define transports
const transports = [
  new winston.transports.Console({
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    format: consoleLogFormat,
  }),
];

// Optional rotating file transports (LOG_TO_FILE=true). Default off — rely on stdout / Docker logs.
// When enabled: daily rotation, 20 MB per file, 14 days retention.
if (config.LOG_TO_FILE && config.NODE_ENV !== 'test') {
  const fileFormat = useJsonFormat ? jsonFormat : customFormat;
  const rotateBase = {
    dirname: 'logs',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
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

  // Request-aware logging: (message, meta?) — meta is merged with req.correlationId, req.user
  withRequest: (req) => {
    const baseMeta = {
      correlationId: req.correlationId,
      userId: req.user?._id,
    };
    return {
      error: (message, meta = {}) => logger.error(message, buildMeta({ ...baseMeta, ...meta })),
      warn: (message, meta = {}) => logger.warn(message, buildMeta({ ...baseMeta, ...meta })),
      info: (message, meta = {}) => logger.info(message, buildMeta({ ...baseMeta, ...meta })),
      http: (message, meta = {}) => logger.http(message, buildMeta({ ...baseMeta, ...meta })),
      debug: (message, meta = {}) => logger.debug(message, buildMeta({ ...baseMeta, ...meta })),
    };
  },

  // Context-aware logging: (message, meta?) — meta is merged with context and correlation ID
  createChild: (context) => ({
    error: (message, meta = {}) => logger.error(message, buildMeta({ ...context, ...meta })),
    warn: (message, meta = {}) => logger.warn(message, buildMeta({ ...context, ...meta })),
    info: (message, meta = {}) => logger.info(message, buildMeta({ ...context, ...meta })),
    http: (message, meta = {}) => logger.http(message, buildMeta({ ...context, ...meta })),
    debug: (message, meta = {}) => logger.debug(message, buildMeta({ ...context, ...meta })),
  }),

  startup: (message, meta = {}) => logger.info(message, buildMeta(meta)),
  security: (message, meta = {}) => logger.warn(message, buildMeta(meta)),
  database: (message, meta = {}) => logger.debug(message, buildMeta(meta)),
  api: (message, meta = {}) => logger.http(message, buildMeta(meta)),
  performance: (message, meta = {}) => logger.info(message, buildMeta(meta)),
};

export default enhancedLogger;
