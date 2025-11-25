import { v4 as uuidv4 } from 'uuid';

// Middleware to add correlation ID to each request
export const correlationIdMiddleware = (req, res, next) => {
  // Check if correlation ID is provided in headers, otherwise generate one
  req.correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();

  // Add correlation ID to response headers
  res.set('x-correlation-id', req.correlationId);

  // Store in res.locals for easy access in templates/views
  res.locals.correlationId = req.correlationId;

  next();
};
