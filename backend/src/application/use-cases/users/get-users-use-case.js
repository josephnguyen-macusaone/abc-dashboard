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
          role: user.role,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          isActive: user.isActive,
          isFirstLogin: user.isFirstLogin,
          langKey: user.langKey,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          createdBy: user.createdBy,
          lastModifiedBy: user.lastModifiedBy
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
