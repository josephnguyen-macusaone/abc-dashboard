import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { UserListParams, PaginatedUserList } from '@/application/dto/user-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

export interface GetUsersUseCaseContract {
  execute: (params?: UserListParams) => Promise<PaginatedUserList>;
}

function applyDefaultPagination(params: UserListParams): UserListParams {
  return {
    page: params.page || 1,
    limit: Math.min(params.limit || 10, 100), // Max 100 items per page
    ...params,
  };
}

export function createGetUsersUseCase(
  userRepository: IUserRepository
): GetUsersUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'GetUsersUseCase',
  });

  return {
  async execute(params: UserListParams = {}): Promise<PaginatedUserList> {
    const correlationId = generateCorrelationId();

    try {
        const defaultedParams = applyDefaultPagination(params);
        const result = await userRepository.getUsers(defaultedParams);
      return result;
    } catch (error) {
        useCaseLogger.error(`Get users use case failed`, {
        correlationId,
        page: params.page,
        operation: 'get_users_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    },
  };
  }

  /**
 * Backward-compatible class wrapper.
 * Keeps existing imports working while we migrate to the factory.
 */
export class GetUsersUseCase implements GetUsersUseCaseContract {
  private readonly useCase = createGetUsersUseCase(this.userRepository);

  constructor(private readonly userRepository: IUserRepository) {}

  execute(params?: UserListParams): Promise<PaginatedUserList> {
    return this.useCase.execute(params);
  }
}
