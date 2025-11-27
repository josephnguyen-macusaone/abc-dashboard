/**
 * Update Profile Use Case
 * Handles updating user profile information (bio)
 */
export class UpdateProfileUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  async execute(userId, profileData) {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Update profile using repository
      const updatedProfile = await this.userProfileRepository.updateByUserId(userId, profileData);

      return {
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile.getProfile()
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }
}
