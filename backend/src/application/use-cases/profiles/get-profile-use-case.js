/**
 * Get Profile Use Case
 * Handles retrieving user profile information
 */
export class GetProfileUseCase {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

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
          profile: {
            id: null,
            userId: userId,
            bio: null,
            emailVerified: false,
            lastLoginAt: null,
            lastActivityAt: null,
            createdAt: null,
            updatedAt: null
          }
        };
      }

      return {
        success: true,
        profile: profile.getProfile()
      };
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }
}
