/**
 * User Management Permission Middleware
 * Handles role-based access control for user management operations
 */

import logger from '../../shared/utils/logger.js';
import {
  ROLES,
  ROLE_CREATION_PERMISSIONS,
  isManagerRole,
  isDirectReportOfLineManager,
  MANAGER_ROLE_FOR_STAFF_ROLE,
} from '../../shared/constants/roles.js';

function normalizeRoleString(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : role;
}

export function canCreateUser(creatorUser, targetRole) {
  const creatorRole = normalizeRoleString(creatorUser?.role);
  const normalizedTarget = normalizeRoleString(targetRole);
  return ROLE_CREATION_PERMISSIONS[creatorRole]?.includes(normalizedTarget) || false;
}

export function canAccessUser(currentUser, targetUser) {
  if (currentUser.role === ROLES.ADMIN) {
    return true;
  }

  if (currentUser.role === ROLES.ACCOUNTANT) {
    return true;
  }

  if (isManagerRole(currentUser.role)) {
    return isDirectReportOfLineManager(currentUser, targetUser);
  }

  return false;
}

export function canReassignStaff(currentUser, staffUser, newManagerId) {
  if (currentUser.role !== ROLES.ADMIN) {
    return false;
  }

  const requiredManagerRole = MANAGER_ROLE_FOR_STAFF_ROLE[staffUser.role];
  if (!requiredManagerRole) {
    return false;
  }

  return Boolean(newManagerId);
}

export function checkUserCreationPermission(allowedRoles = null) {
  return (req, res, next) => {
    try {
      const currentUser = req.user;
      const targetRole = normalizeRoleString(req.body?.role);
      if (targetRole !== undefined && req.body) {
        req.body.role = targetRole;
      }

      if (!currentUser) {
        return res.error('Authentication required', 401);
      }

      if (allowedRoles && !allowedRoles.includes(targetRole)) {
        return res.error(`Cannot create users with role: ${targetRole}`, 403);
      }

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

      if (isManagerRole(currentUser.role)) {
        req.body.managedBy = currentUser.id;
      }

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

export function checkUserAccessPermission(operation = 'read') {
  return (req, res, next) => {
    try {
      const currentUser = req.user;
      const targetUserId = req.params.id || req.params.userId;

      if (!currentUser) {
        return res.error('Authentication required', 401);
      }

      if (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.ACCOUNTANT) {
        return next();
      }

      if (!targetUserId && operation === 'list') {
        // Managers see a scoped directory (no admin accounts); mutations scoped in use cases.
        return next();
      }

      if (targetUserId) {
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

export function checkStaffReassignmentPermission(req, res, next) {
  try {
    const currentUser = req.user;
    const staffId = req.params.id;
    const { newManagerId } = req.body;

    if (!currentUser) {
      return res.error('Authentication required', 401);
    }

    if (currentUser.role !== ROLES.ADMIN) {
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

export function getAvailableRolesForCreation(userRole) {
  return ROLE_CREATION_PERMISSIONS[userRole] || [];
}

export function getUserQueryFilters(currentUser, _queryParams = {}) {
  const filters = {};

  if (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.ACCOUNTANT) {
    return filters;
  }

  if (isManagerRole(currentUser.role)) {
    return { excludeRoles: [ROLES.ADMIN] };
  }

  if ([ROLES.TECH, ROLES.AGENT].includes(currentUser.role)) {
    filters.__emptyUserList = true;
    return filters;
  }

  return filters;
}
