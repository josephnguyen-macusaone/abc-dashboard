/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */
export class AuthMiddleware {
  constructor(tokenService, userRepository) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
  }

  /**
   * Authenticate user using JWT token
   */
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      // Verify token
      const decoded = this.tokenService.verifyToken(token);

      // Find user
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
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
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }
    next();
  };

  /**
   * Authorize based on user roles and permissions
   * @param {string[]} requiredPermissions - Array of required permissions
   */
  authorize = (requiredPermissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Import here to avoid circular dependencies
      const { hasPermission } = require('../../shared/constants/roles.js');

      // Check if user has any of the required permissions
      const hasRequiredPermission = requiredPermissions.some(permission =>
        hasPermission(req.user.role, permission)
      );

      if (!hasRequiredPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  };

  /**
   * Authorize admin only access
   */
  requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { ROLES } = require('../../shared/constants/roles.js');

    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  };

  /**
   * Optional authentication - doesn't fail if no token
   */
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

      if (token) {
        try {
          // Verify token
          const decoded = this.tokenService.verifyToken(token);

          // Find user
          if (decoded && decoded.userId) {
        const user = await this.userRepository.findById(decoded.userId);

        if (user) {
          req.user = user;
            } else {
              req.user = null;
            }
          } else {
            req.user = null;
          }
        } catch (tokenError) {
          // Token is invalid or expired, but don't fail the request
          // Just continue without user attached
          req.user = null;
        }
      } else {
        req.user = null;
      }
    } catch (error) {
      // Silently ignore auth errors for optional auth
      req.user = null;
    }

    next();
  };
}

// Export middleware functions from container
import { container } from '../../shared/kernel/container.js';

const authMiddleware = new AuthMiddleware(
  container.getTokenService(),
  container.getUserRepository()
);

export const authenticate = authMiddleware.authenticate;
export const authorizeSelf = authMiddleware.authorizeSelf;
export const authorize = authMiddleware.authorize;
export const requireAdmin = authMiddleware.requireAdmin;
export const optionalAuth = authMiddleware.optionalAuth;
