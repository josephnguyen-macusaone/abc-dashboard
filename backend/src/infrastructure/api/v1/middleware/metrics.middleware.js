import { cache, cacheKeys, cacheTTL } from '../../../config/redis.js';
import { cacheMetrics, applicationMetrics } from '../../../config/metrics.js';
import logger from '../../../config/logger.js';

/**
 * Middleware to track cache operations
 */
export const cacheTrackingMiddleware = (req, res, next) => {
  // Monkey patch cache methods to track operations
  const originalGet = req.app.locals?.cache?.get;
  const originalSet = req.app.locals?.cache?.set;
  const originalDel = req.app.locals?.cache?.del;

  if (originalGet) {
    req.app.locals.cache.get = async function (key) {
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
    req.app.locals.cache.set = async function (key, value, ttl) {
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
    req.app.locals.cache.del = async function (key) {
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
      if (token && token.length > 10) {
        // Basic validation
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
    /eval\(/i, // Code injection
  ];

  const requestData = `${req.url} ${JSON.stringify(req.body || {})} ${JSON.stringify(req.query || {})}`;
  if (suspiciousPatterns.some((pattern) => pattern.test(requestData))) {
    applicationMetrics.recordSuspiciousActivity();
    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      correlationId: req.correlationId,
    });
  }

  next();
};

/**
 * Cache invalidation middleware for write operations
 * Clears relevant cache entries when data is modified
 */
export const cacheInvalidationMiddleware = (req, res, next) => {
  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Only invalidate cache for successful write operations
  const shouldInvalidate = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

  if (shouldInvalidate) {
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache patterns based on the endpoint
        invalidateCacheForEndpoint(req.path, req.method).catch((error) => {
          logger.warn('Cache invalidation failed', {
            path: req.path,
            method: req.method,
            error: error.message,
          });
        });
      }
      return originalJson.call(this, data);
    };

    res.send = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && shouldInvalidate) {
        invalidateCacheForEndpoint(req.path, req.method).catch((error) => {
          logger.warn('Cache invalidation failed', {
            path: req.path,
            method: req.method,
            error: error.message,
          });
        });
      }
      return originalSend.call(this, data);
    };

    res.end = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && shouldInvalidate) {
        invalidateCacheForEndpoint(req.path, req.method).catch((error) => {
          logger.warn('Cache invalidation failed', {
            path: req.path,
            method: req.method,
            error: error.message,
          });
        });
      }
      return originalEnd.call(this, data);
    };
  }

  next();
};

/**
 * Invalidate cache entries based on the endpoint that was modified
 */
async function invalidateCacheForEndpoint(path, _method) {
  const patterns = [];

  // User-related endpoints
  if (path.includes('/users')) {
    patterns.push('api:GET:/api/v1/users*'); // Invalidate all user list queries
    if (path.match(/\/users\/\d+/)) {
      const userId = path.split('/').pop();
      patterns.push(`user:${userId}`); // Invalidate specific user cache
      patterns.push(`user:profile:${userId}`); // Invalidate user profile cache
    }
  }

  // License-related endpoints
  if (path.includes('/licenses')) {
    patterns.push('api:GET:/api/v1/licenses*'); // Invalidate all license queries
    if (path.match(/\/licenses\/\d+/)) {
      // Could add specific license invalidation here
    }
  }

  // Auth endpoints - clear all user-related caches
  if (path.includes('/auth')) {
    patterns.push('user:*');
    patterns.push('user:profile:*');
  }

  // Clear cache patterns
  for (const pattern of patterns) {
    try {
      // For in-memory cache, we need to clear all matching keys
      // In a real Redis setup, we'd use SCAN or KEYS
      if (pattern.includes('*')) {
        // Clear all cache entries that start with the pattern prefix
        const prefix = pattern.replace('*', '');
        // This is a simplified approach - in production with Redis,
        // you'd want to use more sophisticated pattern matching
        logger.debug('Would clear cache pattern:', { pattern, prefix });
      } else {
        await cache.del(pattern);
      }
    } catch (error) {
      logger.warn('Failed to clear cache pattern', { pattern, error: error.message });
    }
  }
}

/**
 * Response caching middleware for GET requests
 * Caches successful API responses to improve performance
 */
export const responseCachingMiddleware = (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Skip caching for certain paths that shouldn't be cached
  const skipCachePaths = ['/api/v1/health', '/api/v1/metrics', '/api-docs', '/swagger'];

  if (skipCachePaths.some((path) => req.path.includes(path))) {
    return next();
  }

  // Skip caching if user is authenticated (personalized responses)
  if (req.user) {
    return next();
  }

  // Create cache key from method, path, and query parameters
  const queryString = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
  const cacheKey = cacheKeys.apiResponse(req.method, req.path, queryString);

  // Check cache first
  cache
    .get(cacheKey)
    .then((cachedResponse) => {
      if (cachedResponse) {
        try {
          const parsed = JSON.parse(cachedResponse);
          // Set cache headers
          res.set({
            'X-Cache-Status': 'HIT',
            'Cache-Control': `public, max-age=${cacheTTL.apiResponse}`,
          });
          return res.json(parsed);
        } catch (error) {
          logger.warn('Failed to parse cached response', { cacheKey, error: error.message });
          // Continue to normal processing if cache parsing fails
        }
      }

      // Intercept the response to cache it
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Only cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const responseString = JSON.stringify(data);
            cache.set(cacheKey, responseString, cacheTTL.apiResponse).catch((error) => {
              logger.warn('Failed to cache response', { cacheKey, error: error.message });
            });
          } catch (error) {
            logger.warn('Failed to serialize response for caching', {
              cacheKey,
              error: error.message,
            });
          }
        }

        // Set cache headers
        res.set('X-Cache-Status', 'MISS');

        // Call original json method
        return originalJson(data);
      };

      next();
    })
    .catch((error) => {
      logger.warn('Cache lookup failed', { cacheKey, error: error.message });
      next();
    });
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
        correlationId: req.correlationId,
      });
    }

    // Could add more performance metrics here
    // e.g., track requests by response time buckets
  });

  next();
};

export default {
  cacheTrackingMiddleware,
  cacheInvalidationMiddleware,
  responseCachingMiddleware,
  userActivityMiddleware,
  securityMetricsMiddleware,
  performanceMiddleware,
};
