/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication.
 * Uses the unified cache (Redis when CACHE_TYPE=redis, else in-memory) to reduce DB round-trips.
 * Reads token from Authorization header or HttpOnly cookie.
 */

import { ROLES, hasPermission } from '../../shared/constants/roles.js';
import logger from '../../shared/utils/logger.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import { getTokenFromRequest } from '../../shared/http/auth-cookies.js';
import { cache, cacheKeys, cacheTTL } from '../config/redis.js';

/** In-flight user load promises by userId to avoid thundering herd (multiple parallel requests all hitting DB before cache is set). */
const inFlightUserLoads = new Map();

export class AuthMiddleware {
  /**
   * @param {import('../../shared/services/token-service.js').TokenService} tokenService
   * @param {import('../../infrastructure/repositories/user-repository.js').UserRepository} userRepository
   */
  constructor(tokenService, userRepository) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
  }

  /**
   * Set correlation ID for request tracking (used by DI container)
   *
   * @param {string} correlationId - Request correlation ID
   */
  setCorrelationId(correlationId) {
    // Set correlation ID on the services this middleware depends on
    if (this.tokenService && typeof this.tokenService.setCorrelationId === 'function') {
      this.tokenService.setCorrelationId(correlationId);
    }
    if (this.userRepository && typeof this.userRepository.setCorrelationId === 'function') {
      this.userRepository.setCorrelationId(correlationId);
    }
  }

  /**
   * Authenticate user using JWT token
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @return {Promise<void>} - Promise that resolves to void
   */
  authenticate = async (req, res, next) => {
    try {
      const token = getTokenFromRequest(req);

      if (!token) {
        return sendErrorResponse(res, 'TOKEN_MISSING');
      }

      // Verify token
      const decoded = this.tokenService.verifyToken(token);
      const userId = decoded.userId;

      // Find user: cache first, then single-flight DB load so parallel requests share one lookup
      const cacheKey = cacheKeys.authUser(userId);
      let loadPromise = inFlightUserLoads.get(userId);
      if (!loadPromise) {
        loadPromise = (async () => {
          const cached = await cache.get(cacheKey);
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch {
              // cached value is not JSON — treat as a miss
            }
          }
          const u = await this.userRepository.findById(userId);
          if (!u) {
            return null;
          }
          await cache.set(cacheKey, u, cacheTTL.authUser);
          return u;
        })();
        inFlightUserLoads.set(userId, loadPromise);
        loadPromise.finally(() => {
          inFlightUserLoads.delete(userId);
        });
      }
      const user = await loadPromise;
      if (!user) {
        return sendErrorResponse(res, 'USER_NOT_FOUND');
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      return sendErrorResponse(res, 'INVALID_TOKEN');
    }
  };

  /**
   * Authorize based on resource ownership
   * Users can only access their own resources
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @return {Promise<void>} - Promise that resolves to void
   */
  authorizeSelf = (req, res, next) => {
    const resourceId = req.params.id;
    const isOwner = req.user.id === resourceId || req.user._id?.toString() === resourceId;

    if (!isOwner) {
      return sendErrorResponse(res, 'INSUFFICIENT_PERMISSIONS');
    }
    next();
  };

  /**
   * Authorize based on user roles and permissions
   *
   * @param {string[]} requiredPermissions - Array of required permissions
   * @return {Function} - The middleware function
   */
  authorize = (requiredPermissions) => (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(res, 'TOKEN_MISSING');
    }

    // Check if user has any of the required permissions
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      hasPermission(req.user.role, permission)
    );

    if (!hasRequiredPermission) {
      return sendErrorResponse(res, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };

  /**
   * Authorize admin only access
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @return {Promise<void>} - Promise that resolves to void
   */
  requireAdmin = (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(res, 'TOKEN_MISSING');
    }

    if (req.user.role !== ROLES.ADMIN) {
      return sendErrorResponse(res, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };

  /**
   * Optional authentication - doesn't fail if no token
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @return {Promise<void>} - Promise that resolves to void
   */
  optionalAuth = async (req, res, next) => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) {
        req.user = null;
        return next();
      }

      try {
        const decoded = this.tokenService.verifyToken(token);
        const userId = decoded?.userId;
        if (!userId) {
          req.user = null;
          return next();
        }

        // Use same cache + single-flight pattern as authenticate (SEC-7)
        const cacheKey = cacheKeys.authUser(userId);
        let loadPromise = inFlightUserLoads.get(userId);
        if (!loadPromise) {
          loadPromise = (async () => {
            const cached = await cache.get(cacheKey);
            if (cached) {
              try {
                return JSON.parse(cached);
              } catch {
                // cache miss — fall through to DB
              }
            }
            const u = await this.userRepository.findById(userId);
            if (!u) {
              return null;
            }
            await cache.set(cacheKey, u, cacheTTL.authUser);
            return u;
          })();
          inFlightUserLoads.set(userId, loadPromise);
          loadPromise.finally(() => inFlightUserLoads.delete(userId));
        }

        req.user = await loadPromise;
      } catch (tokenError) {
        req.user = null;
        logger.debug('Optional auth token verification failed', {
          correlationId: req.correlationId,
          error: tokenError.message,
        });
      }
    } catch (error) {
      logger.error('Optional auth middleware error', {
        error: error.message,
        correlationId: req.correlationId,
      });
      req.user = null;
    }

    next();
  };
}

// Export middleware functions that resolve from Awilix container
// Using lazy resolution to avoid circular dependencies
const getAuthMiddleware = async () => {
  const { awilixContainer } = await import('../../shared/kernel/container.js');
  return awilixContainer.getAuthMiddleware();
};

export const authenticate = async (req, res, next) =>
  (await getAuthMiddleware()).authenticate(req, res, next);
export const optionalAuth = async (req, res, next) =>
  (await getAuthMiddleware()).optionalAuth(req, res, next);
