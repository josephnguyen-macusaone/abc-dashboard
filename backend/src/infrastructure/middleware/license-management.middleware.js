/**
 * License Management Permission Middleware
 * Handles role-based access control for license management operations
 */

import { InsufficientPermissionsException } from '../../domain/exceptions/domain.exception.js';
import logger from '../config/logger.js';
import { ROLES } from '../../shared/constants/roles.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';

/**
 * Check if user can create licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether creation is allowed
 */
export function canCreateLicense(currentUser) {
  // Only admin can create licenses
  return currentUser.role === ROLES.ADMIN;
}

/**
 * Check if user can update licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether update is allowed
 */
export function canUpdateLicense(currentUser) {
  // Admin can update licenses
  return currentUser.role === ROLES.ADMIN;
}

/**
 * Check if user can delete licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether deletion is allowed
 */
export function canDeleteLicense(currentUser) {
  // Only admin can delete licenses
  return currentUser.role === ROLES.ADMIN;
}

/**
 * Check if user can view licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether viewing is allowed
 */
export function canViewLicense(currentUser) {
  // Admin and managers can view all licenses
  // Staff can view their assigned licenses
  return [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF].includes(currentUser.role);
}

/**
 * Check if user can assign licenses to users
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether assignment is allowed
 */
export function canAssignLicense(currentUser) {
  // Admin and managers can assign licenses
  return [ROLES.ADMIN, ROLES.MANAGER].includes(currentUser.role);
}

/**
 * Check if user can revoke license assignments
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether revocation is allowed
 */
export function canRevokeLicense(currentUser) {
  // Admin and managers can revoke assignments
  return [ROLES.ADMIN, ROLES.MANAGER].includes(currentUser.role);
}

/**
 * Middleware to check license creation permissions
 *
 * @return {Function} - The middleware function
 */
export function checkLicenseCreationPermission() {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        logger.warn('License creation attempted without authentication', {
          correlationId: req.correlationId,
          ip: req.ip,
        });
        throw new InsufficientPermissionsException('Authentication required');
      }

      if (!canCreateLicense(currentUser)) {
        logger.warn('Unauthorized license creation attempt', {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        throw new InsufficientPermissionsException('Only administrators can create licenses');
      }

      next();
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        return sendErrorResponse(
          res,
          'INSUFFICIENT_PERMISSIONS',
          {},
          { customMessage: error.message }
        );
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}

/**
 * Middleware to check license access permissions
 *
 * @param {string} operation - The operation to check permissions for
 * @return {Function} - The middleware function
 */
export function checkLicenseAccessPermission(operation) {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        logger.warn(`License ${operation} attempted without authentication`, {
          correlationId: req.correlationId,
          ip: req.ip,
        });
        throw new InsufficientPermissionsException('Authentication required');
      }

      let hasPermission = false;

      switch (operation) {
        case 'read':
        case 'list':
          hasPermission = canViewLicense(currentUser);
          break;
        case 'update':
          hasPermission = canUpdateLicense(currentUser);
          break;
        case 'delete':
          hasPermission = canDeleteLicense(currentUser);
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        logger.warn(`Unauthorized license ${operation} attempt`, {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
          operation,
        });
        throw new InsufficientPermissionsException(
          `You do not have permission to ${operation} licenses`
        );
      }

      next();
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        return sendErrorResponse(
          res,
          'INSUFFICIENT_PERMISSIONS',
          {},
          { customMessage: error.message }
        );
      }
      throw error;
    }
  };
}

/**
 * Middleware to check license assignment permissions
 *
 * @return {Function} - The middleware function
 */
export function checkLicenseAssignmentPermission() {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        logger.warn('License assignment attempted without authentication', {
          correlationId: req.correlationId,
          ip: req.ip,
        });
        throw new InsufficientPermissionsException('Authentication required');
      }

      if (!canAssignLicense(currentUser)) {
        logger.warn('Unauthorized license assignment attempt', {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        throw new InsufficientPermissionsException(
          'Only administrators and managers can assign licenses'
        );
      }

      next();
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        return sendErrorResponse(
          res,
          'INSUFFICIENT_PERMISSIONS',
          {},
          { customMessage: error.message }
        );
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}

/**
 * Middleware to check license revocation permissions
 *
 * @return {Function} - The middleware function
 */
export function checkLicenseRevocationPermission() {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        logger.warn('License revocation attempted without authentication', {
          correlationId: req.correlationId,
          ip: req.ip,
        });
        throw new InsufficientPermissionsException('Authentication required');
      }

      if (!canRevokeLicense(currentUser)) {
        logger.warn('Unauthorized license revocation attempt', {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        throw new InsufficientPermissionsException(
          'Only administrators and managers can revoke license assignments'
        );
      }

      next();
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        return sendErrorResponse(
          res,
          'INSUFFICIENT_PERMISSIONS',
          {},
          { customMessage: error.message }
        );
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}

/**
 * Middleware to check bulk operations permissions
 *
 * @return {Function} - The middleware function
 */
export function checkLicenseBulkOperationPermission() {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        logger.warn('License bulk operation attempted without authentication', {
          correlationId: req.correlationId,
          ip: req.ip,
        });
        throw new InsufficientPermissionsException('Authentication required');
      }

      // Only admin can perform bulk operations
      if (currentUser.role !== ROLES.ADMIN) {
        logger.warn('Unauthorized license bulk operation attempt', {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        throw new InsufficientPermissionsException(
          'Only administrators can perform bulk license operations'
        );
      }

      next();
    } catch (error) {
      if (error instanceof InsufficientPermissionsException) {
        return sendErrorResponse(
          res,
          'INSUFFICIENT_PERMISSIONS',
          {},
          { customMessage: error.message }
        );
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
