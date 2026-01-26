import logger from '../config/logger.js';
import { licenseSyncMonitor } from '../monitoring/license-sync-monitor.js';

/**
 * License Access Control Middleware
 * Implements role-based access control for license operations
 * Supports granular permissions for different license operations
 */

// Permission definitions
export const LICENSE_PERMISSIONS = {
  // Basic read permissions
  LICENSE_READ: 'license:read',
  LICENSE_READ_OWN: 'license:read:own',

  // Write permissions
  LICENSE_CREATE: 'license:create',
  LICENSE_UPDATE: 'license:update',
  LICENSE_UPDATE_OWN: 'license:update:own',
  LICENSE_DELETE: 'license:delete',

  // Sync permissions
  LICENSE_SYNC: 'license:sync',
  LICENSE_SYNC_EXTERNAL: 'license:sync:external',
  LICENSE_SYNC_COMPREHENSIVE: 'license:sync:comprehensive',

  // Admin permissions
  LICENSE_ADMIN: 'license:admin',
  LICENSE_MONITOR: 'license:monitor',
};

// Role definitions with permissions
export const LICENSE_ROLES = {
  ADMIN: {
    name: 'Admin',
    permissions: Object.values(LICENSE_PERMISSIONS),
  },

  MANAGER: {
    name: 'Manager',
    permissions: [
      LICENSE_PERMISSIONS.LICENSE_READ,
      LICENSE_PERMISSIONS.LICENSE_UPDATE,
      LICENSE_PERMISSIONS.LICENSE_UPDATE_OWN,
      LICENSE_PERMISSIONS.LICENSE_SYNC,
      LICENSE_PERMISSIONS.LICENSE_MONITOR,
    ],
  },

  USER: {
    name: 'User',
    permissions: [
      LICENSE_PERMISSIONS.LICENSE_READ_OWN,
      LICENSE_PERMISSIONS.LICENSE_UPDATE_OWN,
    ],
  },

  VIEWER: {
    name: 'Viewer',
    permissions: [
      LICENSE_PERMISSIONS.LICENSE_READ,
    ],
  },
};

/**
 * Check if user has required permission
 * @param {Object} user - User object with role and permissions
 * @param {string} permission - Required permission
 * @returns {boolean} Whether user has permission
 */
export function hasPermission(user, permission) {
  if (!user || !permission) return false;

  // Check direct permissions first
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }

  // Check role-based permissions
  if (user.role) {
    const roleConfig = LICENSE_ROLES[user.role.toUpperCase()];
    if (roleConfig && roleConfig.permissions.includes(permission)) {
      return true;
    }
  }

  // Check admin override
  if (user.role === 'ADMIN' || user.isAdmin) {
    return true;
  }

  return false;
}

/**
 * Check if user owns the resource (for own-resource permissions)
 * @param {Object} user - User object
 * @param {Object} resource - Resource object with owner info
 * @returns {boolean} Whether user owns the resource
 */
export function ownsResource(user, resource) {
  if (!user || !resource) return false;

  // Check various ownership fields
  return (
    resource.createdBy === user.id ||
    resource.userId === user.id ||
    resource.ownerId === user.id ||
    resource.assignedTo === user.id
  );
}

/**
 * Create access control middleware for license operations
 * @param {string|string[]} requiredPermissions - Required permissions
 * @param {Object} options - Additional options
 */
export const createLicenseAccessMiddleware = (requiredPermissions, options = {}) => {
  const {
    allowOwn = false, // Allow if user owns the resource
    resourceLoader = null, // Function to load resource for ownership check
    logUnauthorized = true,
  } = options;

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource',
        });
      }

      // Normalize permissions to array
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check each required permission
      for (const permission of permissions) {
        let hasAccess = hasPermission(user, permission);

        // If not allowed by direct permission, check ownership if allowOwn is enabled
        if (!hasAccess && allowOwn && permission.endsWith(':own')) {
          const ownPermission = permission.replace(':own', '');
          hasAccess = hasPermission(user, ownPermission);

          // If user has the base permission, check ownership
          if (hasAccess && resourceLoader) {
            try {
              const resource = await resourceLoader(req);
              hasAccess = ownsResource(user, resource);
            } catch (error) {
              logger.warn('Failed to load resource for ownership check', {
                error: error.message,
                permission,
                userId: user.id,
              });
              hasAccess = false;
            }
          }
        }

        if (!hasAccess) {
          if (logUnauthorized) {
            licenseSyncMonitor.createAlert('warning', 'UNAUTHORIZED_ACCESS_ATTEMPT', {
              userId: user.id,
              userRole: user.role,
              requiredPermission: permission,
              endpoint: `${req.method} ${req.path}`,
              ip: req.ip,
            });

            logger.warn('Unauthorized access attempt', {
              userId: user.id,
              userRole: user.role,
              requiredPermission: permission,
              endpoint: `${req.method} ${req.path}`,
              ip: req.ip,
            });
          }

          return res.status(403).json({
            error: 'Insufficient permissions',
            message: `You don't have permission to perform this action: ${permission}`,
            requiredPermission: permission,
            userRole: user.role,
          });
        }
      }

      // Access granted
      logger.debug('Access control passed', {
        userId: user.id,
        permissions: permissions,
        endpoint: `${req.method} ${req.path}`,
      });

      next();

    } catch (error) {
      logger.error('Access control middleware error', {
        error: error.message,
        userId: req.user?.id,
        endpoint: `${req.method} ${req.path}`,
      });

      res.status(500).json({
        error: 'Access control error',
        message: 'An error occurred while checking permissions',
      });
    }
  };
};

/**
 * Pre-configured access control middleware for common license operations
 */

// Admin-only operations
export const requireLicenseAdmin = createLicenseAccessMiddleware(LICENSE_PERMISSIONS.LICENSE_ADMIN);

// Sync operations (require sync permission)
export const requireLicenseSync = createLicenseAccessMiddleware(LICENSE_PERMISSIONS.LICENSE_SYNC);

// External sync operations
export const requireExternalLicenseSync = createLicenseAccessMiddleware(LICENSE_PERMISSIONS.LICENSE_SYNC_EXTERNAL);

// Comprehensive sync (more restrictive)
export const requireComprehensiveSync = createLicenseAccessMiddleware(LICENSE_PERMISSIONS.LICENSE_SYNC_COMPREHENSIVE);

// Monitoring access
export const requireLicenseMonitor = createLicenseAccessMiddleware(LICENSE_PERMISSIONS.LICENSE_MONITOR);

// Basic license read (allows own licenses if configured)
export const requireLicenseRead = createLicenseAccessMiddleware(
  [LICENSE_PERMISSIONS.LICENSE_READ, LICENSE_PERMISSIONS.LICENSE_READ_OWN],
  {
    allowOwn: true,
    resourceLoader: async (req) => {
      // Load license resource for ownership check
      const licenseId = req.params.id;
      if (!licenseId) return null;

      // This would typically call a service/repository to load the license
      // For now, return a mock - in real implementation, inject the service
      return { id: licenseId, createdBy: req.user?.id };
    },
  }
);

// License write operations
export const requireLicenseWrite = createLicenseAccessMiddleware(
  [LICENSE_PERMISSIONS.LICENSE_UPDATE, LICENSE_PERMISSIONS.LICENSE_UPDATE_OWN],
  {
    allowOwn: true,
    resourceLoader: async (req) => {
      const licenseId = req.params.id;
      return { id: licenseId, createdBy: req.user?.id };
    },
  }
);

/**
 * Middleware to check rate limits and create alerts for suspicious activity
 */
export const suspiciousActivityMonitor = (req, res, next) => {
  const user = req.user;
  const clientIp = req.ip;

  // Track rapid successive requests (potential abuse)
  const now = Date.now();
  const recentRequests = req.user?.recentRequests || [];

  // Filter requests in last 10 seconds
  const recentWindow = recentRequests.filter(timestamp => now - timestamp < 10000);

  if (recentWindow.length > 10) { // More than 10 requests in 10 seconds
    licenseSyncMonitor.createAlert('error', 'SUSPICIOUS_ACTIVITY_DETECTED', {
      userId: user?.id,
      clientIp,
      requestCount: recentWindow.length,
      timeWindow: '10 seconds',
      endpoint: `${req.method} ${req.path}`,
    });

    logger.warn('Suspicious activity detected', {
      userId: user?.id,
      clientIp,
      requestCount: recentWindow.length,
      endpoint: `${req.method} ${req.path}`,
    });
  }

  // Add current request timestamp
  if (user) {
    recentRequests.push(now);
    // Keep only last 100 timestamps
    if (recentRequests.length > 100) {
      recentRequests.splice(0, recentRequests.length - 100);
    }
    user.recentRequests = recentRequests;
  }

  next();
};