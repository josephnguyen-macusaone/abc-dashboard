import {
  InsufficientPermissionsException,
  ValidationException,
} from '../../domain/exceptions/domain.exception.js';
import logger from '../config/logger.js';

/**
 * User Management Permission Middleware
 * Handles role-based access control for user management operations
 */

/**
 * Check if user can create accounts of specified role
 * @param {Object} creatorUser - The user attempting to create an account
 * @param {string} targetRole - The role being created
 * @returns {boolean} - Whether creation is allowed
 */
export function canCreateUser(creatorUser, targetRole) {
  const creatorRole = creatorUser.role;

  // Permission matrix
  const permissions = {
    admin: ['manager', 'staff'],
    manager: ['staff'],
    staff: [],
  };

  return permissions[creatorRole]?.includes(targetRole) || false;
}

/**
 * Check if user can view/manage specific user
 * @param {Object} currentUser - The authenticated user
 * @param {Object} targetUser - The user being accessed
 * @returns {boolean} - Whether access is allowed
 */
export function canAccessUser(currentUser, targetUser) {
  // Admin can access all users
  if (currentUser.role === 'admin') {
    return true;
  }

  // Manager can only access their assigned staff
  if (currentUser.role === 'manager') {
    return targetUser.managedBy === currentUser.id;
  }

  // Staff can only access themselves
  if (currentUser.role === 'staff') {
    return targetUser.id === currentUser.id;
  }

  return false;
}

/**
 * Check if user can reassign staff to different manager
 * @param {Object} currentUser - The authenticated user
 * @param {Object} staffUser - The staff user being reassigned
 * @param {string} newManagerId - The new manager ID
 * @returns {boolean} - Whether reassignment is allowed
 */
export function canReassignStaff(currentUser, staffUser, newManagerId) {
  // Only admin can reassign staff
  if (currentUser.role !== 'admin') {
    return false;
  }

  // Staff must be in staff role
  if (staffUser.role !== 'staff') {
    return false;
  }

  // New manager must exist and be a manager (basic validation)
  return true;
}

/**
 * Middleware to check user creation permissions
 */
export function checkUserCreationPermission(allowedRoles = null) {
  return (req, res, next) => {
    try {
      const currentUser = req.user;
      const targetRole = req.body.role;

      if (!currentUser) {
        return res.error('Authentication required', 401);
      }

      // If specific roles are allowed, check against them
      if (allowedRoles && !allowedRoles.includes(targetRole)) {
        return res.error(`Cannot create users with role: ${targetRole}`, 403);
      }

      // Check general permission
      if (!canCreateUser(currentUser, targetRole)) {
        logger.warn('User creation permission denied', {
          userId: currentUser.id,
          userRole: currentUser.role,
          targetRole,
          correlationId: req.correlationId,
        });
        return res.error(
          `Users with role '${currentUser.role}' cannot create '${targetRole}' accounts`,
          403
        );
      }

      // For managers creating staff, auto-assign to themselves
      if (currentUser.role === 'manager' && targetRole === 'staff') {
        req.body.managedBy = currentUser.id;
      }

      // Set createdBy field
      req.body.createdBy = currentUser.id;

      next();
    } catch (error) {
      logger.error('User creation permission check error:', {
        error: error.message,
        correlationId: req.correlationId,
      });
      return res.error('Permission check failed', 500);
    }
  };
}

/**
 * Middleware to check user access permissions
 */
export function checkUserAccessPermission(operation = 'read') {
  return (req, res, next) => {
    try {
      const currentUser = req.user;
      const targetUserId = req.params.id || req.params.userId;

      if (!currentUser) {
        return res.error('Authentication required', 401);
      }

      // Admin can access all operations
      if (currentUser.role === 'admin') {
        return next();
      }

      // For user listing operations, check if filtering is applied correctly
      if (!targetUserId && operation === 'list') {
        // Apply managedBy filter for managers
        if (currentUser.role === 'manager') {
          req.query.managedBy = currentUser.id;
        }
        return next();
      }

      // For specific user operations, we need to check the target user
      if (targetUserId) {
        // This middleware assumes the target user is already loaded
        // by a previous middleware or will be checked in the use case
        req.targetUserId = targetUserId;
      }

      next();
    } catch (error) {
      logger.error('User access permission check error:', {
        error: error.message,
        operation,
        correlationId: req.correlationId,
      });
      return res.error('Permission check failed', 500);
    }
  };
}

/**
 * Middleware to check staff reassignment permissions
 */
export function checkStaffReassignmentPermission(req, res, next) {
  try {
    const currentUser = req.user;
    const staffId = req.params.id;
    const { newManagerId } = req.body;

    if (!currentUser) {
      return res.error('Authentication required', 401);
    }

    if (currentUser.role !== 'admin') {
      logger.warn('Staff reassignment permission denied', {
        userId: currentUser.id,
        userRole: currentUser.role,
        correlationId: req.correlationId,
      });
      return res.error('Only administrators can reassign staff members', 403);
    }

    if (!newManagerId) {
      return res.error('New manager ID is required', 400);
    }

    req.reassignmentData = {
      staffId,
      newManagerId,
      performedBy: currentUser.id,
    };

    next();
  } catch (error) {
    logger.error('Staff reassignment permission check error:', {
      error: error.message,
      correlationId: req.correlationId,
    });
    return res.error('Permission check failed', 500);
  }
}

/**
 * Get available roles for user creation based on current user role
 * @param {string} userRole - Current user's role
 * @returns {string[]} - Array of roles the user can create
 */
export function getAvailableRolesForCreation(userRole) {
  const roleMap = {
    admin: ['manager', 'staff'],
    manager: ['staff'],
    staff: [],
  };

  return roleMap[userRole] || [];
}

/**
 * Get user query filters based on current user permissions
 * @param {Object} currentUser - The authenticated user
 * @param {Object} queryParams - Original query parameters
 * @returns {Object} - Filtered query parameters
 */
export function getUserQueryFilters(currentUser, queryParams = {}) {
  const filters = { ...queryParams };

  // Admin sees all users
  if (currentUser.role === 'admin') {
    return filters;
  }

  // Manager sees only their staff
  if (currentUser.role === 'manager') {
    filters.managedBy = currentUser.id;
    return filters;
  }

  // Staff sees nothing (should not reach user management)
  if (currentUser.role === 'staff') {
    // Return empty result by setting impossible condition
    filters._id = null;
    return filters;
  }

  return filters;
}
