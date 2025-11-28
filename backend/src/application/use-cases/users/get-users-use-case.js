/**
 * Get Users Use Case
 * Handles retrieving users with pagination and filtering
 */
import { UserListResponseDto, UserResponseDto } from '../../dto/user/index.js';
import { PaginationDto } from '../../dto/common/index.js';

export class GetUsersUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute get users use case
   * @param {Object} options - Query options (page, limit, filters)
   * @returns {Promise<UserListResponseDto>} Paginated list of users
   */
  async execute(options = {}) {
    try {
      const result = await this.userRepository.findUsers(options);

      return new UserListResponseDto({
        users: result.users.map((user) => UserResponseDto.fromEntity(user)),
        pagination: new PaginationDto({
          page: result.page,
          limit: result.limit || options.limit || 10,
          total: result.total,
          totalPages: result.totalPages,
        }),
      });
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }
}
