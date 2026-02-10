/**
 * Update Profile Use Case
 * Handles updating user profile information (bio)
 */
import { ProfileDto, UpdateProfileRequestDto } from '../../dto/profile/index.js';

export class UpdateProfileUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  /**
   * Execute update profile use case
   * @param {string} userId - User ID
   * @param {UpdateProfileRequestDto} updateRequest - Validated profile update data
   * @returns {Promise<{ success: boolean, message: string, profile: ProfileDto }>}
   */
  async execute(userId, updateRequest) {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check if there are any updates
      if (!updateRequest.hasUpdates()) {
        throw new Error('No updates provided');
      }

      // Update profile using repository
      const updatedProfile = await this.userProfileRepository.updateByUserId(
        userId,
        updateRequest.getUpdates()
      );

      return {
        success: true,
        message: 'Profile updated successfully',
        profile: ProfileDto.fromEntity(updatedProfile),
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }
}
