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
          usersWithAvatars: stats.usersWithAvatars,
          usersWithBio: stats.usersWithBio,
          usersWithPhone: stats.usersWithPhone,
          recentRegistrations: stats.recentRegistrations,
          profileCompletionRate:
            stats.totalUsers > 0
              ? Math.round(
                  ((stats.usersWithAvatars + stats.usersWithBio + stats.usersWithPhone) /
                    (stats.totalUsers * 3)) *
                    100
                )
              : 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }
}
