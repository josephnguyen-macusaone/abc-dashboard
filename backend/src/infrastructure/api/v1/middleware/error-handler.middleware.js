import logger from '../../../config/logger.js';
import {
  sendErrorResponse,
  formatCanonicalError,
} from '../../../../shared/http/error-responses.js';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, correlationId = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.correlationId = correlationId;

    Error.captureStackTrace(this, this.constructor);
  }
}

// PostgreSQL error codes (see https://www.postgresql.org/docs/current/errcodes-appendix.html)
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_NOT_NULL_VIOLATION = '23502';
const PG_CHECK_VIOLATION = '23514';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

// Handle PostgreSQL invalid input (e.g. invalid UUID, invalid type conversion)
const handleInvalidInputPG = (err) => {
  const message = err.detail ? `Invalid input: ${err.detail}` : err.message || 'Invalid input data';
  return new AppError(message, 400);
};

// Handle PostgreSQL unique constraint violation (409 Conflict)
const handleUniqueViolationPG = (err) => {
  const field = err.column || err.constraint || 'field';
  const message = err.detail
    ? `Duplicate value: ${err.detail}`
    : `Duplicate field value: ${field}. Please use another value!`;
  return new AppError(message, 409);
};

// Handle PostgreSQL foreign key violation
const handleForeignKeyViolationPG = (err) => {
  const message = err.detail
    ? `Referenced record not found: ${err.detail}`
    : 'Referenced record not found';
  return new AppError(message, 400);
};

// Handle PostgreSQL not null / check violations
const handleConstraintViolationPG = (err) => {
  const message = err.detail
    ? `Constraint violation: ${err.detail}`
    : err.message || 'Invalid input data';
  return new AppError(message, 400);
};

// Handle JWT Errors
const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Send error in development
const sendErrorDev = (err, req, res) => {
  logger.error('Development Error Response', {
    correlationId: req.correlationId,
    message: err.message,
    statusCode: err.statusCode,
    status: err.status,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user._id : null,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    correlationId: req.correlationId,
  });
};

// Send error in production
const sendErrorProd = (err, req, res) => {
  const correlationId = req.correlationId;

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn('Operational Error Response', {
      correlationId,
      message: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user._id : null,
    });

    // Map operational errors to centralized error system (canonical shape)
    let errorKey = 'INTERNAL_SERVER_ERROR';
    if (err.statusCode === 401) {
      errorKey = err.message?.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    } else if (err.statusCode === 400) {
      errorKey = 'INVALID_INPUT';
    } else if (err.statusCode === 409) {
      errorKey = 'RESOURCE_ALREADY_EXISTS';
    }

    const payload = formatCanonicalError(errorKey, { customMessage: err.message });
    return res.status(payload.error.statusCode).json(payload);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Programming Error Response', {
      correlationId,
      message: err.message,
      statusCode: 500,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user._id : null,
    });

    // Use centralized error system for programming errors
    return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
  }
};

// Global error handler
// Note: next is required in Express error handler signature but not used
export const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Add correlation ID to the error if it doesn't have one
  if (!err.correlationId && req.correlationId) {
    err.correlationId = req.correlationId;
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.correlationId = req.correlationId;

    // PostgreSQL unique constraint violation
    if (err.code === PG_UNIQUE_VIOLATION) {
      error = handleUniqueViolationPG(err);
    }
    // PostgreSQL invalid text representation (e.g. invalid UUID)
    else if (err.code === PG_INVALID_TEXT_REPRESENTATION) {
      error = handleInvalidInputPG(err);
    }
    // PostgreSQL foreign key violation
    else if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      error = handleForeignKeyViolationPG(err);
    }
    // PostgreSQL not null / check violations
    else if (err.code === PG_NOT_NULL_VIOLATION || err.code === PG_CHECK_VIOLATION) {
      error = handleConstraintViolationPG(err);
    }
    // JWT Error
    else if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    // JWT Expired Error
    else if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, req, res);
  }
};
