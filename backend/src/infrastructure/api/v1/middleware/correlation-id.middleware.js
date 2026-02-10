import { v4 as uuidv4 } from 'uuid';
import logger from '../../../config/logger.js';

// Middleware to add correlation ID to each request
export const correlationIdMiddleware = async (req, res, next) => {
  // Check if correlation ID is provided in headers, otherwise generate one
  req.correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();

  // Add correlation ID to response headers
  res.set('x-correlation-id', req.correlationId);

  // Store in res.locals for easy access in templates/views
  res.locals.correlationId = req.correlationId;

  // Set correlation ID on Awilix container for dependency injection (lazy load to avoid circular dependencies)
  try {
    const { awilixContainer } = await import('../../../../shared/kernel/container.js');
    awilixContainer.setCorrelationId(req.correlationId);
  } catch (error) {
    // Silently continue if container is not available yet
    logger.warn('Could not set correlation ID on Awilix container', { error: error.message });
  }

  next();
};
