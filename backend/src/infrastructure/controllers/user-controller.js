/**
 * User Controller
 * Handles HTTP requests for user management
 */
import {
  ValidationException,
  ResourceNotFoundException,
  InsufficientPermissionsException
} from '../../domain/exceptions/domain.exception.js';
import logger from '../../infrastructure/config/logger.js';
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
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        filters: {
          email: req.query.email,
          username: req.query.username,
          displayName: req.query.displayName,
          hasAvatar: req.query.hasAvatar ? req.query.hasAvatar === 'true' : undefined,
          hasBio: req.query.hasBio ? req.query.hasBio === 'true' : undefined
        },
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.getUsersUseCase.execute(options);

      res.paginated(
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Users retrieved successfully'
      );
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException ||
          error instanceof InsufficientPermissionsException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Get users error:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Users can only access their own profile
      if (currentUser._id.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // For now, reuse getUsers logic but filter for single user
      const options = {
        page: 1,
        limit: 1,
        filters: { id }
      };

      const result = await this.getUsersUseCase.execute(options);

      if (result.users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user: result.users[0] }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createUser(req, res) {
    try {
      const { username, hashedPassword, email, displayName, avatarUrl, avatarId, bio, phone } = req.body;
      const createdBy = req.user._id.toString();

      const result = await this.createUserUseCase.execute({
        username,
        hashedPassword,
        email,
        displayName,
        avatarUrl,
        avatarId,
        bio,
        phone
      }, createdBy);

      res.created(result.user, result.message);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = req.user;

      // Users can only update their own profile
      if (currentUser._id.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Users can only update their own profile'
        });
      }

      const result = await this.updateUserUseCase.execute(id, updates, {
        id: currentUser._id.toString()
      });

      res.json({
        success: true,
        message: result.message,
        data: result.user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Users can only delete their own account
      if (currentUser._id.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: 'Users can only delete their own account'
        });
      }

      const result = await this.deleteUserUseCase.execute(id, {
        id: currentUser._id.toString()
      });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const result = await this.getUserStatsUseCase.execute();

      res.json({
        success: true,
        data: result.stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
