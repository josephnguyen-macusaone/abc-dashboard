/**
 * Delete User Use Case
 * Handles user deletion (soft delete by deactivating)
 */
import logger from '../../../infrastructure/config/logger.js';

export class DeleteUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Check if a user can delete another user based on permissions
   */
  canUserDeleteUser(deleter, targetUser) {
    // Cannot delete yourself
    if (deleter.id === targetUser.id) {
      return {
        allowed: false,
        reason: 'Users cannot delete their own account'
      };
    }

    // Admins can delete anyone except other admins
    if (deleter.role === 'admin') {
      if (targetUser.role === 'admin') {
        return {
          allowed: false,
          reason: 'Admin accounts cannot be deleted'
        };
      }
      return { allowed: true };
    }

    // Managers can delete staff users but not admins or other managers
    if (deleter.role === 'manager') {
      if (targetUser.role === 'admin') {
        return {
          allowed: false,
          reason: 'Managers cannot delete admin accounts'
        };
      }
      if (targetUser.role === 'manager') {
        return {
          allowed: false,
          reason: 'Managers cannot delete other managers'
        };
      }
      if (targetUser.role === 'staff') {
        return { allowed: true };
      }
    }

    // Staff and other roles cannot delete anyone
    return {
      allowed: false,
      reason: 'Insufficient permissions to delete users'
    };
  }

  async execute(userId, currentUser) {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!currentUser) {
        throw new Error('Current user information is required');
      }

      // Find the user to delete
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check permissions based on user roles
      const canDelete = this.canUserDeleteUser(currentUser, user);

      if (!canDelete.allowed) {
        throw new Error(canDelete.reason || 'Insufficient permissions to delete this user');
      }

      // Delete the user (hard delete)
      const deleted = await this.userRepository.delete(userId);

      if (!deleted) {
        throw new Error('Failed to delete user');
      }

      // Log the deletion
      logger.info('User account deleted', {
        userId,
        deletedBy: currentUser.id,
        email: user.email,
        username: user.username,
      });

      return {
        message: 'User account deleted successfully',
        userId,
      };
    } catch (error) {
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }
}
