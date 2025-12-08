/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */
import { ROLES, hasPermission } from '../../shared/constants/roles.js';
import logger from '../config/logger.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
export class AuthMiddleware {
  constructor(tokenService, userRepository) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
  }

  /**
   * Set correlation ID for request tracking (used by DI container)
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
   */
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        return sendErrorResponse(res, 'TOKEN_MISSING');
      }

      // Verify token
      const decoded = this.tokenService.verifyToken(token);

      // Find user
      const user = await this.userRepository.findById(decoded.userId);
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
   * @param {string[]} requiredPermissions - Array of required permissions
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
   */
  requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (req.user.role !== ROLES.ADMIN) {
      return sendErrorResponse(res, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };

  /**
   * Optional authentication - doesn't fail if no token
   */
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      logger.debug('Optional auth check', {
        correlationId: req.correlationId,
        hasAuthHeader: !!authHeader,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      });

      if (token) {
        try {
          // Verify token
          const decoded = this.tokenService.verifyToken(token);

          logger.debug('Token decoded', {
            correlationId: req.correlationId,
            userId: decoded?.userId,
            hasUserId: !!(decoded && decoded.userId),
          });

          // Find user
          if (decoded && decoded.userId) {
            const user = await this.userRepository.findById(decoded.userId);

            if (user) {
              req.user = user;
              logger.debug('User found and attached', {
                correlationId: req.correlationId,
                userId: user.id,
                userRole: user.role,
                userEmail: user.email,
              });
            } else {
              req.user = null;
              logger.warn('User not found for token', {
                correlationId: req.correlationId,
                userId: decoded.userId,
              });
            }
          } else {
            req.user = null;
            logger.warn('No userId in decoded token', {
              correlationId: req.correlationId,
              decodedKeys: decoded ? Object.keys(decoded) : null,
            });
          }
        } catch (tokenError) {
          // Token is invalid or expired, but don't fail the request
          // Just continue without user attached
          req.user = null;
          logger.warn('Token verification failed', {
            correlationId: req.correlationId,
            error: tokenError.message,
            errorType: tokenError.constructor.name,
          });
        }
      } else {
        req.user = null;
        logger.debug('No token provided', {
          correlationId: req.correlationId,
        });
      }
    } catch (error) {
      // Log unexpected errors but don't fail the request for optional auth
      logger.error('Optional auth middleware error:', {
        error: error.message,
        correlationId: req.correlationId,
      });
      req.user = null;
    }

    logger.debug('Optional auth result', {
      correlationId: req.correlationId,
      hasUser: !!req.user,
    });

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
export const authorizeSelf = async (req, res, next) =>
  (await getAuthMiddleware()).authorizeSelf(req, res, next);
export const authorize = (permissions) => async (req, res, next) =>
  (await getAuthMiddleware()).authorize(permissions)(req, res, next);
export const requireAdmin = async (req, res, next) =>
  (await getAuthMiddleware()).requireAdmin(req, res, next);
export const optionalAuth = async (req, res, next) =>
  (await getAuthMiddleware()).optionalAuth(req, res, next);
