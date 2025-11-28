/**
 * Update User Use Case
 * Handles user profile updates
 */
import logger from '../../../infrastructure/config/logger.js';
import { UserResponseDto } from '../../dto/user/index.js';

export class UpdateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
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
        throw new Error('User ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }

      // Find the user to update
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check permissions - users can only update their own profile
      if (currentUser.id !== userId) {
        throw new Error('Users can only update their own profile');
      }

      // Validate username uniqueness if being updated
      if (updates.username && updates.username !== user.username) {
        const existingUsername = await this.userRepository.findByUsername(updates.username);
        if (existingUsername) {
          throw new Error('Username already taken');
        }
      }

      // Update the user
      const updatedUser = await this.userRepository.update(userId, updates);

      if (!updatedUser) {
        throw new Error('Failed to update user');
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
      throw new Error(`User update failed: ${error.message}`);
    }
  }
}
