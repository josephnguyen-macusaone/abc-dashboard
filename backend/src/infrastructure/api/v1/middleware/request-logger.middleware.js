import logger from '../../../config/logger.js';

// Middleware to log incoming requests
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestLogger = logger.withRequest(req);

  // Log the incoming request
  requestLogger.http(`Incoming ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    headers: {
      'content-type': req.get('Content-Type'),
      'user-agent': req.get('User-Agent'),
      'x-correlation-id': req.get('x-correlation-id'),
    },
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;

    requestLogger.http(`Outgoing ${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    });

    originalEnd.apply(this, args);
  };

  next();
};
