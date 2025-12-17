import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { UserStats } from '@/application/dto/user-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Get User Statistics
 * Handles the business logic for retrieving user statistics
 */
export class GetUserStatsUseCase {
  private readonly logger = logger.createChild({
    component: 'GetUserStatsUseCase',
  });

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute get user stats use case
   */
  async execute(): Promise<UserStats> {
    const correlationId = generateCorrelationId();

    try {
      // Execute stats retrieval through repository
      const stats = await this.userRepository.getUsers({});
      return {
        totalUsers: stats.stats?.total || 0,
        admin: stats.stats?.admin || 0,
        manager: stats.stats?.manager || 0,
        staff: stats.stats?.staff || 0,
      };
    } catch (error) {
      this.logger.error(`Get user stats use case failed`, {
        correlationId,
        operation: 'get_user_stats_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
