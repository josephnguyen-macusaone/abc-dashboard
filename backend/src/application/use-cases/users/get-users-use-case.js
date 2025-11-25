/**
 * Get Users Use Case
 * Handles retrieving users with pagination and filtering
 */
export class GetUsersUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(options = {}) {
    try {
      const result = await this.userRepository.findUsers(options);

      return {
        users: result.users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          avatarId: user.avatarId,
          bio: user.bio,
          phone: user.phone,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          page: result.page,
          limit: result.limit || options.limit || 10,
          total: result.total,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }
}
