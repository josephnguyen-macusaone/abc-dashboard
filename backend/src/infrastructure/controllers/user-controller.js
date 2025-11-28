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

      const options = {
        ...sanitizedQuery,
        filters: {
          email: req.query.email,
          username: req.query.username,
          displayName: req.query.displayName,
          hasAvatar: req.query.hasAvatar ? req.query.hasAvatar === 'true' : undefined,
          hasBio: req.query.hasBio ? req.query.hasBio === 'true' : undefined,
        },
      };

      // Permission check: Only admins and managers can list users
      if (!hasPermission(currentUser.role, PERMISSIONS.READ_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to view users');
      }

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
      if (
        currentUser._id.toString() !== id &&
        !hasPermission(currentUser.role, PERMISSIONS.READ_USER)
      ) {
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

      // Permission check: Only admins and managers can create users
      if (!hasPermission(currentUser.role, PERMISSIONS.CREATE_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to create users');
      }

      const { username, email, displayName, role, avatarUrl, phone } = req.body;
      const createdBy = req.user._id.toString();

      // Create and validate request DTO
      const createUserRequest = CreateUserRequestDto.fromRequest({
        username,
        email,
        displayName,
        role,
        avatarUrl,
        phone,
      });
      createUserRequest.validate();

      const result = await this.createUserUseCase.execute(createUserRequest, createdBy);

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

      // Permission checks based on roles
      const isUpdatingSelf = currentUser._id.toString() === id;

      if (!isUpdatingSelf && !hasPermission(currentUser.role, PERMISSIONS.UPDATE_USER)) {
        throw new InsufficientPermissionsException(
          'You do not have permission to update other users'
        );
      }

      // Additional check: Managers cannot update admins or other managers
      if (!isUpdatingSelf && currentUser.role === 'manager') {
        // Get the target user to check their role
        const options = { page: 1, limit: 1, filters: { id } };
        const targetUserResult = await this.getUsersUseCase.execute(options);

        if (targetUserResult.users.length > 0) {
          const targetUser = targetUserResult.users[0];
          if (targetUser.role === 'admin' || targetUser.role === 'manager') {
            throw new InsufficientPermissionsException(
              'Managers cannot update admins or other managers'
            );
          }
        }
      }

      // Use comprehensive UserValidator for update validation
      UserValidator.validateUpdateUser(updates);

      const result = await this.updateUserUseCase.execute(id, updates, {
        id: currentUser._id.toString(),
        role: currentUser.role,
      });

      return res.success(result.user, result.message);
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

      // Permission checks based on roles
      const isDeletingSelf = currentUser._id.toString() === id;

      if (!isDeletingSelf && !hasPermission(currentUser.role, PERMISSIONS.DELETE_USER)) {
        throw new InsufficientPermissionsException('You do not have permission to delete users');
      }

      // Users cannot delete admin accounts
      if (!isDeletingSelf) {
        const options = { page: 1, limit: 1, filters: { id } };
        const targetUserResult = await this.getUsersUseCase.execute(options);

        if (targetUserResult.users.length > 0) {
          const targetUser = targetUserResult.users[0];
          if (targetUser.role === 'admin') {
            throw new InsufficientPermissionsException('Admin accounts cannot be deleted');
          }
        }
      }

      // Managers cannot delete other managers or admins
      if (!isDeletingSelf && currentUser.role === 'manager') {
        const options = { page: 1, limit: 1, filters: { id } };
        const targetUserResult = await this.getUsersUseCase.execute(options);

        if (targetUserResult.users.length > 0) {
          const targetUser = targetUserResult.users[0];
          if (targetUser.role === 'admin' || targetUser.role === 'manager') {
            throw new InsufficientPermissionsException(
              'Managers cannot delete admins or other managers'
            );
          }
        }
      }

      const result = await this.deleteUserUseCase.execute(id, {
        id: currentUser._id.toString(),
        role: currentUser.role,
      });

      return res.success(null, result.message);
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
}
