/**
 * Validation Middleware
 * Express middleware for request validation using Joi
 */
import { sendErrorResponse } from '../../shared/http/error-responses.js';
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

    return sendErrorResponse(res, 'VALIDATION_FAILED', { details: errors });
  }

  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Validate query parameters
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

  // Replace req.query with validated data
  req.query = value;
  next();
};

/**
 * Validate route parameters
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
