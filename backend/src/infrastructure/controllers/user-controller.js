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
import {
  checkUserCreationPermission,
  checkUserAccessPermission,
  getUserQueryFilters,
} from '../middleware/user-management.middleware.js';

export class UserController {
  constructor(
    getUsersUseCase,
    createUserUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    getUserStatsUseCase
  ) {
    this.getUsersUseCase = getUsersUseCase;
    this.createUserUseCase = createUserUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.getUserStatsUseCase = getUserStatsUseCase;
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
          ...permissionFilters,
          email: req.query.email,
          username: req.query.username,
          displayName: req.query.displayName,
          hasAvatar: req.query.hasAvatar ? req.query.hasAvatar === 'true' : undefined,
          hasBio: req.query.hasBio ? req.query.hasBio === 'true' : undefined,
        },
      };

      const result = await this.getUsersUseCase.execute(options);

      return res.paginated(
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Users retrieved successfully'
      );
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
      return res.error(
        'Failed to retrieve users',
        500,
        process.env.NODE_ENV === 'development' ? { details: error.message } : {}
      );
    }
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Permission check: Users can view their own profile, admins/managers can view any profile
      if (currentUser.id !== id && !hasPermission(currentUser.role, PERMISSIONS.READ_USER)) {
        return res.error('Access denied', 403);
      }

      // For now, reuse getUsers logic but filter for single user
      const options = {
        page: 1,
        limit: 1,
        filters: { id },
      };

      const result = await this.getUsersUseCase.execute(options);

      if (result.users.length === 0) {
        return res.error('User not found', 404);
      }

      return res.success({ user: result.users[0] }, 'User retrieved successfully');
    } catch (error) {
      return res.error(error.message, 500);
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

      return res.created(responseData, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof ValidationException ||
        error instanceof InsufficientPermissionsException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      return res.error(error.message, 400);
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

      return res.error(error.message, 400);
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Basic permission check - ensure user has delete permission
      if (!hasPermission(currentUser.role, PERMISSIONS.DELETE_USER)) {
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

      return res.error(error.message, 400);
    }
  }

  async getUserStats(req, res) {
    try {
      const result = await this.getUserStatsUseCase.execute();

      return res.success(result.stats, 'User statistics retrieved successfully');
    } catch (error) {
      return res.error(error.message, 500);
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
        return res.error('Staff member not found', 404);
      }

      // Get the new manager
      const newManager = await this.userRepository.findById(newManagerId);
      if (!newManager) {
        return res.error('New manager not found', 404);
      }

      if (newManager.role !== 'manager') {
        return res.error('Target user is not a manager', 400);
      }

      // Update the staff member's manager
      const updateData = {
        managedBy: newManagerId,
        lastModifiedBy: currentUser.id,
      };

      const updatedUser = await this.userRepository.update(id, updateData);
      if (!updatedUser) {
        return res.error('Failed to reassign staff member', 500);
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

      return res.error('Failed to reassign staff member', 500);
    }
  }
}
