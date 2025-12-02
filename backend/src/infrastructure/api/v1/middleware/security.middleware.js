import logger from '../../../config/logger.js';
import { config } from '../../../config/config.js';
import { cache } from '../../../config/redis.js';
import { sendErrorResponse } from '../../../../shared/http/error-responses.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY_PREFIX = 'failed_attempts:';

// Account lockout middleware
export const accountLockout = async (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const cacheKey = `${CACHE_KEY_PREFIX}${clientIP}`;

  try {
    let attempts = null;

    if (cache) {
      // Try to get from cache
      attempts = await cache.get(cacheKey);
      if (attempts) {
        attempts = JSON.parse(attempts);
      }
    }

    if (attempts && attempts.count >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLockout = Date.now() - attempts.lockoutTime;
      if (timeSinceLockout < LOCKOUT_DURATION) {
        const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLockout) / 60000); // minutes

        logger.warn('Account lockout triggered', {
          correlationId: req.correlationId,
          clientIP,
          attempts: attempts.count,
          remainingTime: `${remainingTime} minutes`,
        });

        return sendErrorResponse(res, 'ACCOUNT_LOCKED', { retryAfter: remainingTime * 60 });
      } else {
        // Reset lockout after duration
        if (cache) {
          await cache.del(cacheKey);
        }
      }
    }
  } catch (error) {
    // If cache fails, allow the request (fail open)
    logger.warn('Failed to check account lockout status:', error.message);
  }

  next();
};

// Track failed login attempts
export const trackFailedLogin = async (req) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const cacheKey = `${CACHE_KEY_PREFIX}${clientIP}`;

  try {
    let attempts = { count: 0, lockoutTime: null };

    if (cache) {
      // Try to get existing attempts from cache
      const existing = await cache.get(cacheKey);
      if (existing) {
        attempts = JSON.parse(existing);
      }
    }

    attempts.count += 1;

    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
      attempts.lockoutTime = Date.now();
      logger.warn('Account locked due to failed attempts', {
        correlationId: req.correlationId,
        clientIP,
        attempts: attempts.count,
      });
    }

    if (cache) {
      // Store in cache with expiration (lockout duration + some buffer)
      const ttl = Math.max(LOCKOUT_DURATION, 24 * 60 * 60 * 1000); // At least 24 hours
      await cache.set(cacheKey, JSON.stringify(attempts), ttl);
    }
  } catch (error) {
    // If cache fails, log but don't block the security response
    logger.warn('Failed to track failed login attempt:', error.message);
  }
};

// Reset failed attempts on successful login
export const resetFailedAttempts = async (req) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const cacheKey = `${CACHE_KEY_PREFIX}${clientIP}`;

  try {
    if (cache) {
      await cache.del(cacheKey);
    }

    logger.info('Failed attempts reset after successful login', {
      correlationId: req.correlationId,
      clientIP,
    });
  } catch (error) {
    // If cache fails, log but don't affect the login success
    logger.warn('Failed to reset failed attempts:', error.message);
  }
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.example.com;"
  );

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), speaker=(), fullscreen=()'
  );

  // HSTS (HTTP Strict Transport Security) - only in production
  if (config.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// Request size limiter with more specific limits
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length']);

  if (contentLength && contentLength > 10 * 1024 * 1024) {
    // 10MB
    logger.warn('Request too large', {
      correlationId: req.correlationId,
      contentLength,
      url: req.url,
      method: req.method,
    });

    return sendErrorResponse(res, 'FILE_TOO_LARGE');
  }

  next();
};

// SQL injection and NoSQL injection prevention (additional layer)
export const injectionProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /(\$where|\$regex|\$ne|\$gt|\$lt|\$in|\$nin)/i, // MongoDB operators
    /(<script|javascript:|on\w+\s*=)/i, // XSS patterns
  ];

  const checkObject = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            logger.warn('Suspicious input detected', {
              correlationId: req.correlationId,
              field: currentPath,
              pattern: pattern.toString(),
              value: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
            });

            return sendErrorResponse(res, 'INVALID_INPUT');
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  };

  if (req.body) {
    const suspicious = checkObject(req.body);
    if (suspicious) {
      return;
    }
  }

  if (req.query) {
    const suspicious = checkObject(req.query);
    if (suspicious) {
      return;
    }
  }

  next();
};

// Rate limiting with different tiers
export const createRateLimit = (windowMs, maxRequests, message) => {
  const requests = new Map();

  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [ip, timestamps] of requests.entries()) {
      requests.set(
        ip,
        timestamps.filter((timestamp) => timestamp > windowStart)
      );
      if (requests.get(ip).length === 0) {
        requests.delete(ip);
      }
    }

    // Get current requests for this IP
    const clientRequests = requests.get(clientIP) || [];

    if (clientRequests.length >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        correlationId: req.correlationId,
        clientIP,
        requestCount: clientRequests.length,
        windowMs,
        maxRequests,
      });

      return sendErrorResponse(res, 'RATE_LIMIT_EXCEEDED', { retryAfter: Math.ceil(windowMs / 1000) });
    }

    // Add current request
    clientRequests.push(now);
    requests.set(clientIP, clientRequests);

    next();
  };
};

// Note: Cleanup is handled automatically by cache TTL
// No manual cleanup needed when using in-memory cache
