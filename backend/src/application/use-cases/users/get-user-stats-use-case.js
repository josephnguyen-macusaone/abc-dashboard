/**
 * Get User Stats Use Case
 * Handles retrieving user statistics
 */
export class GetUserStatsUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute() {
    try {
      const stats = await this.userRepository.getUserStats();

      return {
        stats: {
          totalUsers: stats.totalUsers,
          admin: stats.admin,
          manager: stats.manager,
          staff: stats.staff,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }
}
