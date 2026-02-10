/**
 * Record Login Use Case
 * Handles recording user login activity
 */
import { ProfileDto } from '../../dto/profile/index.js';

export class RecordLoginUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  /**
   * Execute record login use case
   * @param {string} userId - User ID
   * @returns {Promise<{ success: boolean, message: string, profile: ProfileDto }>}
   */
  async execute(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const updatedProfile = await this.userProfileRepository.recordLogin(userId);

      return {
        success: true,
        message: 'Login recorded successfully',
        profile: ProfileDto.fromEntity(updatedProfile),
      };
    } catch (error) {
      throw new Error(`Failed to record login: ${error.message}`);
    }
  }
}
