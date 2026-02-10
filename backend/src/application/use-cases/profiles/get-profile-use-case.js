/**
 * Get Profile Use Case
 * Handles retrieving user profile information
 */
import { ProfileDto } from '../../dto/profile/index.js';

export class GetProfileUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  /**
   * Execute get profile use case
   * @param {string} userId - User ID
   * @returns {Promise<{ success: boolean, profile: ProfileDto }>}
   */
  async execute(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await this.userProfileRepository.findByUserId(userId);

      if (!profile) {
        // Return default profile if none exists
        return {
          success: true,
          profile: new ProfileDto({
            id: null,
            userId,
            bio: null,
            emailVerified: false,
            lastLoginAt: null,
            lastActivityAt: null,
            createdAt: null,
            updatedAt: null,
          }),
        };
      }

      return {
        success: true,
        profile: ProfileDto.fromEntity(profile),
      };
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }
}
