/**
 * License Management Permission Middleware
 * Handles role-based access control for license management operations
 */

import { InsufficientPermissionsException } from '../../domain/exceptions/domain.exception.js';
import logger from '../../shared/utils/logger.js';
import { getLicenseCapabilitiesForRole } from '../../shared/constants/license-capabilities.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import { isRoleModuleEnabled } from '../config/role-module-flags.js';

/**
 * Check if user can create licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether creation is allowed
 */
function canCreateLicense(currentUser) {
  return getLicenseCapabilitiesForRole(currentUser.role).canCreateLicense;
}

/**
 * Check if user can update licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether update is allowed
 */
function canUpdateLicense(currentUser) {
  return getLicenseCapabilitiesForRole(currentUser.role).canUpdateLicense;
}

/**
 * Check if user can delete licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether deletion is allowed
 */
function canDeleteLicense(currentUser) {
  return getLicenseCapabilitiesForRole(currentUser.role).canDeleteLicense;
}

function canAddSmsPayment(currentUser) {
  return getLicenseCapabilitiesForRole(currentUser.role).canAddSmsPayment;
}

function canViewSmsPayments(currentUser) {
  return getLicenseCapabilitiesForRole(currentUser.role).canViewSmsPayments;
}

/**
 * Check if user can view licenses
 *
 * @param {Object} currentUser - The authenticated user
 * @return {boolean} - Whether viewing is allowed
 */
function canViewLicense(currentUser) {
  return getLicenseCapabilitiesForRole(currentUser.role).canViewLicenses;
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
        throw new InsufficientPermissionsException('You do not have permission to create licenses');
      }

      if (!isRoleModuleEnabled(currentUser.role)) {
        throw new InsufficientPermissionsException(
          `The ${currentUser.role} module is temporarily disabled`
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
        case 'sms_payment':
          hasPermission = canAddSmsPayment(currentUser);
          break;
        case 'sms_history':
          hasPermission = canViewSmsPayments(currentUser);
          break;
        case 'reset_license_id':
          hasPermission = getLicenseCapabilitiesForRole(currentUser.role).canResetLicenseId;
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

      if (!isRoleModuleEnabled(currentUser.role)) {
        throw new InsufficientPermissionsException(
          `The ${currentUser.role} module is temporarily disabled`
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

      if (!getLicenseCapabilitiesForRole(currentUser.role).canBulkOperate) {
        logger.warn('Unauthorized license bulk operation attempt', {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        throw new InsufficientPermissionsException(
          'You do not have permission to perform bulk license operations'
        );
      }

      if (!isRoleModuleEnabled(currentUser.role)) {
        throw new InsufficientPermissionsException(
          `The ${currentUser.role} module is temporarily disabled`
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
 * PATCH /licenses/bulk — full bulk for admin, or manager-only agent-assignment patches.
 */
export function checkLicenseBulkPatchPermission() {
  return (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        logger.warn('License bulk patch attempted without authentication', {
          correlationId: req.correlationId,
          ip: req.ip,
        });
        throw new InsufficientPermissionsException('Authentication required');
      }

      const caps = getLicenseCapabilitiesForRole(currentUser.role);
      if (!caps.canBulkOperate && !caps.canBulkPatchLicenses) {
        logger.warn('Unauthorized license bulk patch attempt', {
          correlationId: req.correlationId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        throw new InsufficientPermissionsException(
          'You do not have permission to perform bulk license updates'
        );
      }

      if (!isRoleModuleEnabled(currentUser.role)) {
        throw new InsufficientPermissionsException(
          `The ${currentUser.role} module is temporarily disabled`
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
