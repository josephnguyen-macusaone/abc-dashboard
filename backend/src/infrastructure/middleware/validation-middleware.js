/**
 * Validation Middleware
 * Express middleware for request validation using Joi
 */
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import logger from '../config/logger.js';

/**
 * Validate request body
 *
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @return {Function} - The middleware function
 */
export const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    logger.warn('Validation failed', {
      errors,
      url: req.url,
      method: req.method,
    });

    return sendErrorResponse(res, 'VALIDATION_FAILED', {}, { details: errors });
  }

  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Validate query parameters
 *
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @return {Function} - The middleware function
 */
export const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return sendErrorResponse(res, 'INVALID_INPUT', { details: errors });
  }

  // Do not reassign req.query (getter-only in some routers). Store validated data separately
  // and merge into existing query object for downstream handlers.
  req.validatedQuery = value;
  if (req.query && typeof req.query === 'object') {
    Object.assign(req.query, value);
  }
  next();
};

/**
 * Validate route parameters
 *
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @return {Function} - The middleware function
 */
export const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return sendErrorResponse(res, 'INVALID_INPUT', { details: errors });
  }

  // Replace req.params with validated data
  req.params = value;
  next();
};
