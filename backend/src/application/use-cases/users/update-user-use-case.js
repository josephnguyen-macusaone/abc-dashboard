/**
 * Update User Use Case
 * Handles user profile updates
 */
import logger from '../../../shared/utils/logger.js';
import { ROLES } from '../../../shared/constants/roles.js';
import { UserResponseDto } from '../../dto/user/index.js';
import {
  ValidationException,
  ResourceNotFoundException,
  InsufficientPermissionsException,
} from '../../../domain/exceptions/domain.exception.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */

export class UpdateUserUseCase {
  /**
   * @param {IUserRepository} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Check if a user can update another user based on permissions
   */
  canUserUpdateUser(updater, targetUser) {
    // Users can always update their own profile (except status - handled separately)
    if (updater.id === targetUser.id) {
      return { allowed: true };
    }

    // Admins can update anyone except other admins
    if (updater.role === ROLES.ADMIN) {
      if (targetUser.role === ROLES.ADMIN) {
        return {
          allowed: false,
          reason: 'Admins cannot update other admin accounts',
        };
      }
      return { allowed: true };
    }

    // Accountants can update non-admin users
    if (updater.role === ROLES.ACCOUNTANT) {
      if (targetUser.role === ROLES.ADMIN) {
        return {
          allowed: false,
          reason: 'Accountants cannot update admin accounts',
        };
      }
      return { allowed: true };
    }

    // Managers can update staff users but not admins, accountants, or other managers
    if (updater.role === ROLES.MANAGER) {
      if (targetUser.role === ROLES.ADMIN) {
        return {
          allowed: false,
          reason: 'Managers cannot update admin accounts',
        };
      }
      if (targetUser.role === ROLES.ACCOUNTANT || targetUser.role === ROLES.MANAGER) {
        return {
          allowed: false,
          reason: 'Managers cannot update peer or higher-privilege accounts',
        };
      }
      if (targetUser.role === ROLES.STAFF) {
        return { allowed: true };
      }
    }

    // Staff and other roles can only update themselves (already handled above)
    return {
      allowed: false,
      reason: 'Insufficient permissions to update users',
    };
  }

  /**
   * Check if a user can update the status (isActive) of another user
   * Status can only be edited by higher-level users:
   * - Admin can edit status of manager and staff
   * - Manager can edit status of staff only
   * - Staff cannot edit status of anyone (including themselves)
   * - No one can edit their own status
   */
  canUserUpdateStatus(updater, targetUser) {
    // No one can edit their own status
    if (updater.id === targetUser.id) {
      return {
        allowed: false,
        reason: 'You cannot change your own account status',
      };
    }

    // Admin can edit status of manager and staff (not other admins)
    if (updater.role === ROLES.ADMIN) {
      if (targetUser.role === ROLES.ADMIN) {
        return {
          allowed: false,
          reason: 'Admins cannot change status of other admin accounts',
        };
      }
      return { allowed: true };
    }

    // Accountant can edit status of any non-admin account
    if (updater.role === ROLES.ACCOUNTANT) {
      if (targetUser.role === ROLES.ADMIN) {
        return {
          allowed: false,
          reason: 'Accountants cannot change status of admin accounts',
        };
      }
      return { allowed: true };
    }

    // Manager can only edit status of staff
    if (updater.role === ROLES.MANAGER) {
      if (targetUser.role === ROLES.STAFF) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Managers can only change status of staff accounts',
      };
    }

    // Staff cannot edit status of anyone
    return {
      allowed: false,
      reason: 'You do not have permission to change account status',
    };
  }

  /**
   * Execute update user use case
   * @param {string} userId - User ID to update
   * @param {Object} updates - Update data
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<{ user: UserResponseDto, message: string }>}
   */
  async execute(userId, updates, currentUser) {
    try {
      this._validateInput(userId, updates, currentUser);
      const user = await this._getUser(userId);
      this._assertCanUpdate(currentUser, user);
      this._assertCanUpdateStatusIfRequested(updates, currentUser, user);
      await this._assertUsernameUniqueIfChanged(updates, user);

      const updatedUser = await this.userRepository.update(userId, updates);
      if (!updatedUser) {
        throw new ValidationException('Failed to update user');
      }

      logger.info('User profile updated', {
        userId,
        updatedBy: currentUser.id,
        updatedFields: Object.keys(updates),
      });

      return {
        user: UserResponseDto.fromEntity(updatedUser),
        message: 'User profile updated successfully',
      };
    } catch (error) {
      if (
        error instanceof ValidationException ||
        error instanceof ResourceNotFoundException ||
        error instanceof InsufficientPermissionsException
      ) {
        throw error;
      }
      throw new Error(`User update failed: ${error.message}`, { cause: error });
    }
  }

  _validateInput(userId, updates, currentUser) {
    if (!userId) {
      throw new ValidationException('User ID is required');
    }
    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationException('No updates provided');
    }
    if (!currentUser) {
      throw new ValidationException('Current user information is required');
    }
  }

  async _getUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User');
    }
    return user;
  }

  _assertCanUpdate(currentUser, user) {
    const canUpdate = this.canUserUpdateUser(currentUser, user);
    if (!canUpdate.allowed) {
      throw new InsufficientPermissionsException(canUpdate.reason || 'update this user');
    }
  }

  _assertCanUpdateStatusIfRequested(updates, currentUser, user) {
    if (updates.isActive === undefined) {
      return;
    }
    const canUpdateStatus = this.canUserUpdateStatus(currentUser, user);
    if (!canUpdateStatus.allowed) {
      throw new InsufficientPermissionsException(canUpdateStatus.reason || 'change account status');
    }
    logger.security('USER_STATUS_CHANGE', {
      action: updates.isActive ? 'activate' : 'deactivate',
      actorId: currentUser.id,
      actorRole: currentUser.role,
      targetId: user.id,
      targetRole: user.role,
      previousStatus: user.isActive,
      newStatus: updates.isActive,
    });
  }

  async _assertUsernameUniqueIfChanged(updates, user) {
    if (!updates.username || updates.username === user.username) {
      return;
    }
    const existing = await this.userRepository.findByUsername(updates.username);
    if (existing) {
      throw new ValidationException('Username already taken');
    }
  }
}
