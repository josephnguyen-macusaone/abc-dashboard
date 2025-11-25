import logger from '../../../config/logger.js';

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

// Handle MongoDB Cast Errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle MongoDB Duplicate Field Errors
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} - '${value}'. Please use another value!`;
  return new AppError(message, 400);
};

// Handle MongoDB Validation Errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JWT Errors
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

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
    correlationId: req.correlationId
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

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      correlationId
    });
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

    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      correlationId
    });
  }
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
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

    // MongoDB CastError
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    // MongoDB Duplicate Key Error
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    // MongoDB Validation Error
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    // JWT Error
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    // JWT Expired Error
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
