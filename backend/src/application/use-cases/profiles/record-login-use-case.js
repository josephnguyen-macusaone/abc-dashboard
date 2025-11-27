/**
 * Record Login Use Case
 * Handles recording user login activity
 */
export class RecordLoginUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  async execute(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const updatedProfile = await this.userProfileRepository.recordLogin(userId);

      return {
        success: true,
        message: 'Login recorded successfully',
        profile: updatedProfile.getProfile()
      };
    } catch (error) {
      throw new Error(`Failed to record login: ${error.message}`);
    }
  }
}
