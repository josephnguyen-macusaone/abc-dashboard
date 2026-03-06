import { licenseSyncMonitor } from '../monitoring/license-sync-monitor.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import logger from '../../shared/utils/logger.js';

class RateLimiter {
  constructor() {
    this.requests = new Map();
    setInterval(() => this.cleanup(), 60000);
  }

  check(clientId, options = {}) {
    const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options;
    const now = Date.now();
    const windowStart = now - windowMs;

    let clientRequests = this.requests.get(clientId) || [];
    clientRequests = clientRequests.filter((ts) => ts > windowStart);
    this.requests.set(clientId, clientRequests);

    return {
      limited: clientRequests.length >= maxRequests,
      remainingRequests: Math.max(0, maxRequests - clientRequests.length),
      resetTime: new Date(now + windowMs),
      currentRequests: clientRequests.length,
    };
  }

  recordRequest(clientId) {
    const clientRequests = this.requests.get(clientId) || [];
    clientRequests.push(Date.now());
    this.requests.set(clientId, clientRequests);
  }

  cleanup() {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [clientId, requests] of this.requests.entries()) {
      const filtered = requests.filter((ts) => ts > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, filtered);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

/**
 * Express middleware for rate limiting
 * @param {Object} options - Rate limiting options
 */
export const createRateLimitMiddleware = (options = {}) => {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: _skipSuccessfulRequests = false,
    skipFailedRequests: _skipFailedRequests = false,
    keyGenerator = (_req) => _req.ip || _req.socket?.remoteAddress, // Default to IP-based limiting
    skip = (_req) => false, // Function to skip rate limiting for certain requests
    handler = null, // Custom handler for rate limited requests
  } = options;

  return (req, res, next) => {
    // Skip rate limiting if condition met
    if (skip(req)) {
      return next();
    }

    const clientId = keyGenerator(req);
    const checkResult = rateLimiter.check(clientId, { maxRequests, windowMs });

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': checkResult.remainingRequests,
      'X-RateLimit-Reset': checkResult.resetTime.toISOString(),
    });

    if (checkResult.limited) {
      // Record the rate limited request
      licenseSyncMonitor.createAlert('warning', 'RATE_LIMIT_EXCEEDED', {
        clientId,
        maxRequests,
        windowMs,
        endpoint: `${req.method} ${req.path}`,
      });

      logger.warn('Rate limit exceeded', {
        clientId,
        maxRequests,
        remainingRequests: checkResult.remainingRequests,
        resetTime: checkResult.resetTime,
        endpoint: `${req.method} ${req.path}`,
      });

      // Use custom handler or default response
      if (handler) {
        return handler(req, res, next);
      }

      const retryAfter = Math.ceil((checkResult.resetTime - new Date()) / 1000);
      return sendErrorResponse(
        res,
        'RATE_LIMIT_EXCEEDED',
        {},
        {
          retryAfter,
          limit: maxRequests,
          remaining: checkResult.remainingRequests,
          reset: checkResult.resetTime,
        }
      );
    }

    // Add response hook to record the request after it's processed
    const originalSend = res.send;
    res.send = function (data) {
      // Record the request (success/failure will be determined by status code)
      const successful = res.statusCode >= 200 && res.statusCode < 400;
      rateLimiter.recordRequest(clientId, successful);

      // Call original send method
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Pre-configured rate limiting middleware for different endpoints
 */

// General API rate limiting (higher limits for authenticated users)
export const generalApiRateLimit = createRateLimitMiddleware({
  maxRequests: 1000, // 1000 requests per 15 minutes for general API
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if authenticated, otherwise IP
  skip: (req) => req.path === '/health' || req.path === '/license-sync/health', // Skip health checks
});

// Strict rate limiting for sync operations
export const syncOperationRateLimit = createRateLimitMiddleware({
  maxRequests: 10, // Only 10 sync operations per hour
  windowMs: 60 * 60 * 1000, // 1 hour window
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    sendErrorResponse(res, 'RATE_LIMIT_EXCEEDED', {}, { retryAfter: 3600 });
  },
});

// Monitoring endpoint rate limiting (less restrictive)
export const monitoringRateLimit = createRateLimitMiddleware({
  maxRequests: 60, // 60 requests per minute for monitoring
  windowMs: 60 * 1000,
  keyGenerator: (req) => req.user?.id || req.ip,
});
