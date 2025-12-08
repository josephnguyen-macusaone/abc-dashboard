import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { UserListParams, PaginatedUserList } from '@/application/dto/user-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Get Users
 * Handles the business logic for retrieving paginated user lists
 */
export class GetUsersUseCase {
  private readonly logger = logger.createChild({
    component: 'GetUsersUseCase',
  });

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute get users use case
   */
  async execute(params: UserListParams = {}): Promise<PaginatedUserList> {
    const correlationId = generateCorrelationId();

    try {
      // Apply default pagination values
      const defaultedParams = this.applyDefaultPagination(params);

      // Execute query through repository
      const result = await this.userRepository.getUsers(defaultedParams);

      return result;
    } catch (error) {
      this.logger.error(`Get users use case failed`, {
        correlationId,
        page: params.page,
        operation: 'get_users_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Apply default pagination values
   */
  private applyDefaultPagination(params: UserListParams): UserListParams {
    return {
      page: params.page || 1,
      limit: Math.min(params.limit || 10, 100), // Max 100 items per page
      ...params,
    };
  }
}
