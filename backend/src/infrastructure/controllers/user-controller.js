/**
 * User Controller
 * Handles HTTP requests for user management
 */
import {
  ValidationException,
  InsufficientPermissionsException,
} from '../../domain/exceptions/domain.exception.js';
import logger from '../../infrastructure/config/logger.js';
import { PERMISSIONS, hasPermission } from '../../shared/constants/roles.js';
import { UserValidator } from '../../application/validators/index.js';
import { CreateUserRequestDto } from '../../application/dto/user/index.js';
import { getUserQueryFilters } from '../middleware/user-management.middleware.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';

export class UserController {
  constructor(
    getUsersUseCase,
    createUserUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    userRepository
  ) {
    this.getUsersUseCase = getUsersUseCase;
    this.createUserUseCase = createUserUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.userRepository = userRepository;
  }

  async getUsers(req, res) {
    try {
      const currentUser = req.user;

      // Use comprehensive UserValidator for query validation and sanitization
      const sanitizedQuery = UserValidator.validateListQuery(req.query);

      // Apply role-based permission filters
      const permissionFilters = getUserQueryFilters(currentUser, req.query);

      const options = {
        ...sanitizedQuery,
        filters: {
          // Start with sanitized filters (which include converted isActive/role)
          ...sanitizedQuery.filters,
          // Add permission-based filters (managedBy, etc.)
          ...permissionFilters,
          // Add remaining search filters that weren't handled by sanitizer
          search: req.query.search,
          email: req.query.email,
          username: req.query.username,
          displayName: req.query.displayName,
          hasAvatar: req.query.hasAvatar ? req.query.hasAvatar === 'true' : undefined,
          hasBio: req.query.hasBio ? req.query.hasBio === 'true' : undefined,
          // Date range filters
          createdAtFrom: req.query.createdAtFrom,
          createdAtTo: req.query.createdAtTo,
          updatedAtFrom: req.query.updatedAtFrom,
          updatedAtTo: req.query.updatedAtTo,
          lastLoginFrom: req.query.lastLoginFrom,
          lastLoginTo: req.query.lastLoginTo,
        },
      };

      const result = await this.getUsersUseCase.execute(options);

      // Use success with meta to include stats
      return res.success(result.getData(), 'Users retrieved successfully', result.getMeta());
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Get users error:', {
        message: error.message,
        stack: error.stack,
        error,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Permission check: Users can view their own profile, admins/managers can view any profile
      if (currentUser.id !== id && !hasPermission(currentUser.role, PERMISSIONS.READ_USER)) {
        return sendErrorResponse(res, 'INSUFFICIENT_PERMISSIONS');
      }

      // For now, reuse getUsers logic but filter for single user
      const options = {
        page: 1,
        limit: 1,
        filters: { id },
      };

      const result = await this.getUsersUseCase.execute(options);

      if (result.users.length === 0) {
        return sendErrorResponse(res, 'USER_NOT_FOUND');
      }

      return res.success({ user: result.users[0] }, 'User retrieved successfully');
    } catch (error) {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async createUser(req, res) {
    try {
      const currentUser = req.user;

      // Create and validate request DTO first
      const createUserRequest = CreateUserRequestDto.fromRequest(req.body);
      createUserRequest.validate();

      // Use middleware for permission checking (this will modify req.body with managedBy and createdBy)
      // The middleware will be applied at the route level, so permissions are already checked

      const result = await this.createUserUseCase.execute(createUserRequest, currentUser);

      // Return user data but don't expose temporary password in production
      const responseData = {
        user: result.user,
      };

      // Only include temporary password in development for testing
      if (process.env.NODE_ENV === 'development' && result.temporaryPassword) {
        responseData.temporaryPassword = result.temporaryPassword;
      }

      // Include warning if email wasn't sent
      if (result.warning) {
        responseData.warning = result.warning;
      }

      // Include email status for client-side handling
      if (result.emailSent !== undefined) {
        responseData.emailSent = result.emailSent;
      }

      return res.created(responseData, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Log the actual error for debugging
      logger.error('Create user error:', {
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
        fullError: error,
        correlationId: req.correlationId,
        // For ValidationException, show additional details
        ...(error.additionalData && { additionalData: error.additionalData }),
        ...(error.statusCode && { statusCode: error.statusCode }),
        ...(error.category && { category: error.category }),
      });

      return sendErrorResponse(res, 'VALIDATION_FAILED');
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = req.user;

      // Basic permission check - ensure user has update permission
      if (!hasPermission(currentUser.role, PERMISSIONS.UPDATE_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to update users');
      }

      // Use comprehensive UserValidator for update validation
      UserValidator.validateUpdateUser(updates);

      const result = await this.updateUserUseCase.execute(id, updates, currentUser);

      return res.success({ user: result.user, message: result.message });
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      return sendErrorResponse(res, 'VALIDATION_FAILED');
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Debug logging
      logger.info('Delete user request', {
        targetUserId: id,
        currentUser: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          displayName: currentUser.displayName,
        },
        correlationId: req.correlationId,
      });

      // Basic permission check - ensure user has delete permission
      if (!hasPermission(currentUser.role, PERMISSIONS.DELETE_USER)) {
        logger.warn('User lacks basic delete permission', {
          userId: currentUser.id,
          role: currentUser.role,
          correlationId: req.correlationId,
        });
        throw new InsufficientPermissionsException('You do not have permission to delete users');
      }

      const result = await this.deleteUserUseCase.execute(id, currentUser);

      return res.success({ message: result.message });
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      return sendErrorResponse(res, 'VALIDATION_FAILED');
    }
  }

  async reassignStaff(req, res) {
    try {
      const { id } = req.params;
      const { newManagerId } = req.reassignmentData;
      const currentUser = req.user;

      // Get the staff user to reassign
      const staffUser = await this.userRepository.findById(id);
      if (!staffUser) {
        return sendErrorResponse(res, 'USER_NOT_FOUND');
      }

      // Get the new manager
      const newManager = await this.userRepository.findById(newManagerId);
      if (!newManager) {
        return sendErrorResponse(res, 'USER_NOT_FOUND');
      }

      if (newManager.role !== 'manager') {
        return sendErrorResponse(res, 'VALIDATION_FAILED', {
          details: 'Target user is not a manager',
        });
      }

      // Update the staff member's manager
      const updateData = {
        managedBy: newManagerId,
        lastModifiedBy: currentUser.id,
      };

      const updatedUser = await this.userRepository.update(id, updateData);
      if (!updatedUser) {
        return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
      }

      // Log the reassignment
      logger.security('STAFF_REASSIGNED', {
        action: 'reassign_staff',
        actorId: currentUser.id,
        actorRole: currentUser.role,
        oldManagerId: staffUser.managedBy,
        newManagerId,
        staffId: id,
        staffEmail: staffUser.email,
        performedAt: new Date().toISOString(),
      });

      logger.info('Staff member reassigned', {
        staffId: id,
        oldManagerId: staffUser.managedBy,
        newManagerId,
        performedBy: currentUser.id,
      });

      return res.success(
        {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            displayName: updatedUser.displayName,
            managedBy: updatedUser.managedBy,
          },
        },
        'Staff member reassigned successfully'
      );
    } catch (error) {
      logger.error('Staff reassignment error:', {
        error: error.message,
        stack: error.stack,
        staffId: req.params.id,
        newManagerId: req.reassignmentData?.newManagerId,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Bulk activate users
   */
  async bulkActivate(req, res) {
    try {
      const { ids } = req.body;
      const currentUser = req.user;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ValidationException('ids must be a non-empty array');
      }

      // Check permission
      if (!hasPermission(currentUser.role, PERMISSIONS.UPDATE_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to activate users');
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const id of ids) {
        try {
          await this.updateUserUseCase.execute(id, { isActive: true }, currentUser);
          results.success.push(id);
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }

      logger.info('Bulk user activation', {
        successCount: results.success.length,
        failedCount: results.failed.length,
        performedBy: currentUser.id,
        correlationId: req.correlationId,
      });

      return res.success(
        {
          activated: results.success.length,
          failed: results.failed.length,
          details: results,
        },
        `Successfully activated ${results.success.length} of ${ids.length} users`
      );
    } catch (error) {
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Bulk activate error:', {
        error: error.message,
        stack: error.stack,
        correlationId: req.correlationId,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Bulk deactivate users
   */
  async bulkDeactivate(req, res) {
    try {
      const { ids } = req.body;
      const currentUser = req.user;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ValidationException('ids must be a non-empty array');
      }

      // Check permission
      if (!hasPermission(currentUser.role, PERMISSIONS.UPDATE_USER)) {
        throw new InsufficientPermissionsException(
          'You do not have permission to deactivate users'
        );
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const id of ids) {
        try {
          // Prevent deactivating self
          if (id === currentUser.id) {
            results.failed.push({ id, error: 'Cannot deactivate yourself' });
            continue;
          }

          await this.updateUserUseCase.execute(id, { isActive: false }, currentUser);
          results.success.push(id);
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }

      logger.info('Bulk user deactivation', {
        successCount: results.success.length,
        failedCount: results.failed.length,
        performedBy: currentUser.id,
        correlationId: req.correlationId,
      });

      return res.success(
        {
          deactivated: results.success.length,
          failed: results.failed.length,
          details: results,
        },
        `Successfully deactivated ${results.success.length} of ${ids.length} users`
      );
    } catch (error) {
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Bulk deactivate error:', {
        error: error.message,
        stack: error.stack,
        correlationId: req.correlationId,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Bulk delete users
   */
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const currentUser = req.user;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ValidationException('ids must be a non-empty array');
      }

      // Check permission
      if (!hasPermission(currentUser.role, PERMISSIONS.DELETE_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to delete users');
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const id of ids) {
        try {
          // Prevent deleting self
          if (id === currentUser.id) {
            results.failed.push({ id, error: 'Cannot delete yourself' });
            continue;
          }

          await this.deleteUserUseCase.execute(id, currentUser);
          results.success.push(id);
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }

      logger.info('Bulk user deletion', {
        successCount: results.success.length,
        failedCount: results.failed.length,
        performedBy: currentUser.id,
        correlationId: req.correlationId,
      });

      logger.security('BULK_USER_DELETE', {
        action: 'bulk_delete_users',
        actorId: currentUser.id,
        actorRole: currentUser.role,
        deletedCount: results.success.length,
        failedCount: results.failed.length,
        performedAt: new Date().toISOString(),
      });

      return res.success(
        {
          deleted: results.success.length,
          failed: results.failed.length,
          details: results,
        },
        `Successfully deleted ${results.success.length} of ${ids.length} users`
      );
    } catch (error) {
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Bulk delete error:', {
        error: error.message,
        stack: error.stack,
        correlationId: req.correlationId,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Export users to various formats
   */
  async exportUsers(req, res) {
    try {
      const currentUser = req.user;
      const { format = 'csv', columns = [], includeFilters = true } = req.body;

      validateExportFormat(format);
      if (!hasPermission(currentUser.role, PERMISSIONS.READ_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to export users');
      }

      const sanitizedQuery = UserValidator.validateListQuery(req.query);
      const permissionFilters = getUserQueryFilters(currentUser, req.query);
      const options = {
        ...sanitizedQuery,
        filters: includeFilters
          ? {
              ...permissionFilters,
              search: req.query.search,
              email: req.query.email,
              username: req.query.username,
              displayName: req.query.displayName,
            }
          : { ...permissionFilters },
        page: 1,
        limit: 10000,
      };

      const result = await this.getUsersUseCase.execute(options);
      const exportData = filterUsersByColumns(result.users, columns);

      logger.info('User export', {
        format,
        recordCount: result.users.length,
        includeFilters,
        columnsCount: columns.length,
        performedBy: currentUser.id,
        correlationId: req.correlationId,
      });

      return sendExportResponse(res, format, exportData);
    } catch (error) {
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Export users error:', {
        error: error.message,
        stack: error.stack,
        correlationId: req.correlationId,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }
}

const VALID_EXPORT_FORMATS = ['csv', 'excel', 'json', 'pdf'];

function validateExportFormat(format) {
  if (!VALID_EXPORT_FORMATS.includes(format)) {
    throw new ValidationException(
      `Invalid format. Must be one of: ${VALID_EXPORT_FORMATS.join(', ')}`
    );
  }
}

function filterUsersByColumns(users, columns) {
  if (!columns?.length) {
    return users;
  }
  return users.map((user) => {
    const filtered = {};
    columns.forEach((col) => {
      if (user[col] !== undefined) {
        filtered[col] = user[col];
      }
    });
    return filtered;
  });
}

function sendExportResponse(res, format, exportData) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `users-${dateStr}`;

  switch (format) {
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(exportData, null, 2));

    case 'csv': {
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    case 'excel':
    case 'pdf': {
      const placeholder = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(placeholder);
    }

    default:
      throw new ValidationException('Unsupported format');
  }
}

/**
 * Helper function to convert JSON to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  // Convert each object to CSV row
  const csvRows = data.map((obj) =>
    headers
      .map((header) => {
        const value = obj[header];
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        // Handle objects/arrays
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}
