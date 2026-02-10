/**
 * Update User Use Case
 * Handles user profile updates
 */
import logger from '../../../infrastructure/config/logger.js';
import { UserResponseDto } from '../../dto/user/index.js';
import {
  ValidationException,
  ResourceNotFoundException,
  InsufficientPermissionsException,
} from '../../../domain/exceptions/domain.exception.js';

export class UpdateUserUseCase {
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
    if (updater.role === 'admin') {
      if (targetUser.role === 'admin') {
        return {
          allowed: false,
          reason: 'Admins cannot update other admin accounts'
        };
      }
      return { allowed: true };
    }

    // Managers can update staff users but not admins or other managers
    if (updater.role === 'manager') {
      if (targetUser.role === 'admin') {
        return {
          allowed: false,
          reason: 'Managers cannot update admin accounts'
        };
      }
      if (targetUser.role === 'manager') {
        return {
          allowed: false,
          reason: 'Managers cannot update other managers'
        };
      }
      if (targetUser.role === 'staff') {
        return { allowed: true };
      }
    }

    // Staff and other roles can only update themselves (already handled above)
    return {
      allowed: false,
      reason: 'Insufficient permissions to update users'
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
        reason: 'You cannot change your own account status'
      };
    }

    // Admin can edit status of manager and staff (not other admins)
    if (updater.role === 'admin') {
      if (targetUser.role === 'admin') {
        return {
          allowed: false,
          reason: 'Admins cannot change status of other admin accounts'
        };
      }
      return { allowed: true };
    }

    // Manager can only edit status of staff
    if (updater.role === 'manager') {
      if (targetUser.role === 'staff') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Managers can only change status of staff accounts'
      };
    }

    // Staff cannot edit status of anyone
    return {
      allowed: false,
      reason: 'You do not have permission to change account status'
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
      // Validate input
      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationException('No updates provided');
      }

      if (!currentUser) {
        throw new ValidationException('Current user information is required');
      }

      // Find the user to update
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Check permissions based on user roles
      const canUpdate = this.canUserUpdateUser(currentUser, user);

      if (!canUpdate.allowed) {
        throw new InsufficientPermissionsException(canUpdate.reason || 'update this user');
      }

      // Check special permission for status (isActive) update
      if (updates.isActive !== undefined) {
        const canUpdateStatus = this.canUserUpdateStatus(currentUser, user);
        if (!canUpdateStatus.allowed) {
          throw new InsufficientPermissionsException(canUpdateStatus.reason || 'change account status');
        }
        
        // Log status change for audit
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

      // Validate username uniqueness if being updated
      if (updates.username && updates.username !== user.username) {
        const existingUsername = await this.userRepository.findByUsername(updates.username);
        if (existingUsername) {
          throw new ValidationException('Username already taken');
        }
      }

      // Update the user
      const updatedUser = await this.userRepository.update(userId, updates);

      if (!updatedUser) {
        throw new ValidationException('Failed to update user');
      }

      // Log the update
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
      // Re-throw domain exceptions as-is for proper error handling
      if (error instanceof ValidationException ||
          error instanceof ResourceNotFoundException ||
          error instanceof InsufficientPermissionsException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`User update failed: ${error.message}`);
    }
  }
}
