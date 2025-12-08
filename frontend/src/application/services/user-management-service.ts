import { User } from '@/domain/entities/user-entity';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserListParams,
  UserSearchQuery,
  UserStats,
  PaginatedUserList
} from '@/application/dto/user-dto';
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  GetUsersUseCase,
  SearchUsersUseCase,
  GetUserStatsUseCase
} from '@/application/use-cases';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Service: User Management
 * Coordinates multiple use cases and provides high-level user management operations
 */
export class UserManagementService {
  private readonly logger = logger.createChild({
    component: 'UserManagementService',
  });

  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly getUserStatsUseCase: GetUserStatsUseCase
  ) {}

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDTO): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      const user = await this.createUserUseCase.execute(userData);
      return user;
    } catch (error) {
      this.logger.error(`Create user error`, {
        correlationId,
        email: userData.email,
        operation: 'create_user_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(id: string, updates: UpdateUserDTO): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      const updatedUser = await this.updateUserUseCase.execute(id, updates);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Update user error`, {
        correlationId,
        userId: id,
        updates: Object.keys(updates),
        operation: 'update_user_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      await this.deleteUserUseCase.execute(id);
    } catch (error) {
      this.logger.error(`Delete user error`, {
        correlationId,
        userId: id,
        operation: 'delete_user_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get paginated list of users
   */
  async getUsers(params: UserListParams = {}): Promise<PaginatedUserList> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.getUsersUseCase.execute(params);
      return result;
    } catch (error) {
      this.logger.error(`Get users list error`, {
        correlationId,
        page: params.page,
        operation: 'get_users_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchQuery: UserSearchQuery): Promise<User[]> {
    const correlationId = generateCorrelationId();

    try {
      const users = await this.searchUsersUseCase.execute(searchQuery);
      return users;
    } catch (error) {
      this.logger.error(`Search users error`, {
        correlationId,
        query: searchQuery.query,
        operation: 'search_users_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const correlationId = generateCorrelationId();

    try {
      const stats = await this.getUserStatsUseCase.execute();
      return stats;
    } catch (error) {
      this.logger.error(`Failed to fetch user statistics`, {
        correlationId,
        operation: 'get_user_stats_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
