import { cacheMetrics, applicationMetrics } from '../../config/metrics.js';
import logger from '../../config/logger.js';

/**
 * Middleware to track cache operations
 */
export const cacheTrackingMiddleware = (req, res, next) => {
  // Monkey patch cache methods to track operations
  const originalGet = req.app.locals?.cache?.get;
  const originalSet = req.app.locals?.cache?.set;
  const originalDel = req.app.locals?.cache?.del;

  if (originalGet) {
    req.app.locals.cache.get = async function(key) {
      try {
        const result = await originalGet.call(this, key);
        if (result !== null && result !== undefined) {
          cacheMetrics.recordHit();
        } else {
          cacheMetrics.recordMiss();
        }
        return result;
      } catch (error) {
        cacheMetrics.recordMiss();
        throw error;
      }
    };
  }

  if (originalSet) {
    req.app.locals.cache.set = async function(key, value, ttl) {
      try {
        const result = await originalSet.call(this, key, value, ttl);
        cacheMetrics.recordSet();
        return result;
      } catch (error) {
        throw error;
      }
    };
  }

  if (originalDel) {
    req.app.locals.cache.del = async function(key) {
      try {
        const result = await originalDel.call(this, key);
        cacheMetrics.recordDelete();
        return result;
      } catch (error) {
        throw error;
      }
    };
  }

  next();
};

/**
 * Middleware to track user activity
 */
export const userActivityMiddleware = (req, res, next) => {
  // Extract user ID from JWT token if available
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Note: In a real implementation, you'd decode the JWT to get user ID
      // For now, we'll use a simplified approach
      const token = authHeader.substring(7);
      if (token && token.length > 10) { // Basic validation
        // In a real app, decode JWT to get user ID
        // For demo purposes, we'll use a hash of the token as user identifier
        const userId = Buffer.from(token.substring(0, 10)).toString('base64');
        applicationMetrics.recordActiveUser(userId);
      }
    } catch (error) {
      logger.warn('Could not extract user ID from token:', error.message);
    }
  }

  next();
};

/**
 * Middleware to track security events
 */
export const securityMetricsMiddleware = (req, res, next) => {
  // Track failed authentication attempts
  if (req.path.includes('/auth/login') && res.statusCode === 401) {
    applicationMetrics.recordFailedLogin();
  }

  // Track rate limited requests
  if (res.statusCode === 429) {
    applicationMetrics.recordRateLimitedRequest();
  }

  // Track suspicious activities (basic implementation)
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection attempts
    /eval\(/i // Code injection
  ];

  const requestData = `${req.url} ${JSON.stringify(req.body || {})} ${JSON.stringify(req.query || {})}`;
  if (suspiciousPatterns.some(pattern => pattern.test(requestData))) {
    applicationMetrics.recordSuspiciousActivity();
    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      correlationId: req.correlationId
    });
  }

  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests (>1000ms)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        correlationId: req.correlationId
      });
    }

    // Could add more performance metrics here
    // e.g., track requests by response time buckets
  });

  next();
};

export default {
  cacheTrackingMiddleware,
  userActivityMiddleware,
  securityMetricsMiddleware,
  performanceMiddleware
};
