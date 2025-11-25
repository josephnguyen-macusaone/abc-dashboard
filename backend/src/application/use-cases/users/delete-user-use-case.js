/**
 * Delete User Use Case
 * Handles user deletion (soft delete by deactivating)
 */
import logger from '../../../infrastructure/config/logger.js';

export class DeleteUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId, currentUser) {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Find the user to delete
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check permissions - users can only delete their own account
      if (currentUser.id !== userId) {
        throw new Error('Users can only delete their own account');
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
        username: user.username
      });

      return {
        message: 'User account deleted successfully',
        userId: userId
      };
    } catch (error) {
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }
}
