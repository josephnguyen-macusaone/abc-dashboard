/**
 * Update Profile Use Case
 * Handles user self-profile updates
 */
import {
  ValidationException,
  ResourceNotFoundException
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class UpdateProfileUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId, updates) {
    try {
      // Validate input
      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationException('No updates provided');
      }

      // Find the user to update
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Define allowed fields for profile updates (exclude sensitive fields)
      const allowedFields = ['displayName', 'avatarUrl', 'avatarId', 'bio', 'phone'];
      const filteredUpdates = {};

      // Filter updates to only allowed fields
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new ValidationException('No valid fields provided for update');
      }

      // Update the user
      const updatedUser = await this.userRepository.update(userId, filteredUpdates);

      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }

      // Log the update
      logger.info('User profile updated', {
        userId,
        updatedFields: Object.keys(filteredUpdates)
      });

      return {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          avatarUrl: updatedUser.avatarUrl,
          avatarId: updatedUser.avatarId,
          bio: updatedUser.bio,
          phone: updatedUser.phone,
          isEmailVerified: updatedUser.isEmailVerified,
          updatedAt: updatedUser.updatedAt
        },
        message: 'Profile updated successfully'
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }
}
