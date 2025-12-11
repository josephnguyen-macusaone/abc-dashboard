import { User } from '@/domain/entities/user-entity';
import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { UserSearchQuery } from '@/application/dto/user-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

export interface SearchUsersUseCaseContract {
  execute: (searchQuery: UserSearchQuery) => Promise<User[]>;
}

export function createSearchUsersUseCase(
  userRepository: IUserRepository
): SearchUsersUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'SearchUsersUseCase',
  });

  return {
  async execute(searchQuery: UserSearchQuery): Promise<User[]> {
    const correlationId = generateCorrelationId();

    try {
        const users = await userRepository.searchUsers(searchQuery.query);
      const limitedUsers = searchQuery.limit
        ? users.slice(0, searchQuery.limit)
        : users;
      return limitedUsers;
    } catch (error) {
        useCaseLogger.error(`Search users use case failed`, {
        correlationId,
        query: searchQuery.query,
        operation: 'search_users_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    },
  };
}

/**
 * Backward-compatible class wrapper to avoid breaking existing imports.
 */
export class SearchUsersUseCase implements SearchUsersUseCaseContract {
  private readonly useCase = createSearchUsersUseCase(this.userRepository);

  constructor(private readonly userRepository: IUserRepository) {}

  execute(searchQuery: UserSearchQuery): Promise<User[]> {
    return this.useCase.execute(searchQuery);
  }
}
