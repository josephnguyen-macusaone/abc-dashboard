import logger from '../config/logger.js';
import { licenseSyncMonitor } from '../monitoring/license-sync-monitor.js';

/**
 * Rate Limiting Middleware
 * Implements sliding window rate limiting for API endpoints
 * Uses in-memory storage (for production, consider Redis or database)
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map(); // Map of clientId -> request timestamps
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean up every minute
  }

  /**
   * Check if request should be rate limited
   * @param {string} clientId - Unique identifier for the client (IP, user ID, etc.)
   * @param {Object} options - Rate limiting options
   * @returns {Object} Rate limit check result
   */
  check(clientId, options = {}) {
    const {
      maxRequests = 100,      // Max requests per window
      windowMs = 15 * 60 * 1000, // 15 minutes window
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
    } = options;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request history for this client
    let clientRequests = this.requests.get(clientId);
    if (!clientRequests) {
      clientRequests = [];
      this.requests.set(clientId, clientRequests);
    }

    // Remove old requests outside the window
    clientRequests = clientRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(clientId, clientRequests);

    // Check if limit exceeded
    const isLimited = clientRequests.length >= maxRequests;

    return {
      limited: isLimited,
      remainingRequests: Math.max(0, maxRequests - clientRequests.length),
      resetTime: new Date(now + windowMs),
      currentRequests: clientRequests.length,
    };
  }

  /**
   * Record a request for rate limiting
   * @param {string} clientId - Unique identifier for the client
   * @param {boolean} successful - Whether the request was successful
   */
  recordRequest(clientId, successful = true) {
    const clientRequests = this.requests.get(clientId) || [];
    clientRequests.push(Date.now());
    this.requests.set(clientId, clientRequests);
  }

  /**
   * Clean up old request data
   * @private
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // Keep data for 30 minutes max
    const cutoff = now - maxAge;

    for (const [clientId, requests] of this.requests.entries()) {
      const filtered = requests.filter(timestamp => timestamp > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, filtered);
      }
    }

    logger.debug('Rate limiter cleanup completed', {
      activeClients: this.requests.size,
      totalRequests: Array.from(this.requests.values()).reduce((sum, reqs) => sum + reqs.length, 0),
    });
  }

  /**
   * Get rate limiting statistics
   */
  getStats() {
    const now = Date.now();
    const stats = {
      activeClients: this.requests.size,
      totalRequests: 0,
      requestsPerMinute: 0,
      topClients: [],
    };

    const lastMinute = now - 60000;

    // Calculate statistics
    const clientStats = [];
    for (const [clientId, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(ts => ts > lastMinute).length;
      const totalRequests = requests.length;

      stats.totalRequests += totalRequests;
      stats.requestsPerMinute += recentRequests;

      clientStats.push({
        clientId,
        totalRequests,
        recentRequests,
      });
    }

    // Get top 10 clients by request count
    stats.topClients = clientStats
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    return stats;
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

/**
 * Express middleware for rate limiting
 * @param {Object} options - Rate limiting options
 */
export const createRateLimitMiddleware = (options = {}) => {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip, // Default to IP-based limiting
    skip = (req) => false, // Function to skip rate limiting for certain requests
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

      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((checkResult.resetTime - new Date()) / 1000),
        limit: maxRequests,
        remaining: checkResult.remainingRequests,
        reset: checkResult.resetTime,
      });
    }

    // Add response hook to record the request after it's processed
    const originalSend = res.send;
    res.send = function(data) {
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
    res.status(429).json({
      error: 'Sync operation rate limit exceeded',
      message: 'Too many sync operations. Please wait before attempting another sync.',
      retryAfter: 3600, // 1 hour
    });
  },
});

// Monitoring endpoint rate limiting (less restrictive)
export const monitoringRateLimit = createRateLimitMiddleware({
  maxRequests: 60, // 60 requests per minute for monitoring
  windowMs: 60 * 1000,
  keyGenerator: (req) => req.user?.id || req.ip,
});