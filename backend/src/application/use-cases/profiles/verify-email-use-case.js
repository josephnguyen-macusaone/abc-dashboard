/**
 * Verify Email Use Case
 * Handles email verification for user profiles
 */
export class VerifyEmailUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  async execute(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const updatedProfile = await this.userProfileRepository.verifyEmail(userId);

      return {
        success: true,
        message: 'Email verified successfully',
        profile: updatedProfile.getProfile()
      };
    } catch (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }
}
