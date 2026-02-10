/**
 * Mark Email Verified Use Case
 * Handles marking a user profile's email as verified (internal operation)
 * Note: This is distinct from auth/verify-email-use-case.js which handles JWT token verification
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import { ProfileDto } from '../../dto/profile/index.js';

export class MarkEmailVerifiedUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  /**
   * Mark user's email as verified in their profile
   * @param {string} userId - The user ID
   * @returns {Promise<{ success: boolean, message: string, profile: ProfileDto }>}
   */
  async execute(userId) {
    // Validate input
    if (!userId) {
      throw new ValidationException('User ID is required');
    }

    const updatedProfile = await this.userProfileRepository.verifyEmail(userId);

    return {
      success: true,
      message: 'Email marked as verified',
      profile: ProfileDto.fromEntity(updatedProfile),
    };
  }
}
