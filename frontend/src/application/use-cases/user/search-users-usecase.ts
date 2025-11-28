import { User } from '@/domain/entities/user-entity';
import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { UserSearchQuery } from '@/application/dto/user-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Search Users
 * Handles the business logic for searching users
 */
export class SearchUsersUseCase {
  private readonly logger = logger.createChild({
    component: 'SearchUsersUseCase',
  });

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute search users use case
   */
  async execute(searchQuery: UserSearchQuery): Promise<User[]> {
    const correlationId = generateCorrelationId();

    try {
      // Execute search through repository
      const users = await this.userRepository.searchUsers(searchQuery.query);

      // Apply limit if specified
      const limitedUsers = searchQuery.limit
        ? users.slice(0, searchQuery.limit)
        : users;

      return limitedUsers;
    } catch (error) {
      this.logger.error(`Search users use case failed`, {
        correlationId,
        query: searchQuery.query,
        operation: 'search_users_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
