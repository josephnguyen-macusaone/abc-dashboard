import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { User } from '@/domain/entities/user-entity';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Get Profile
 * Handles the business logic for retrieving complete user profile data
 */
export class GetProfileUseCase {
  private readonly logger = logger.createChild({
    component: 'GetProfileUseCase',
  });

  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Execute get profile use case
   */
  async execute(): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      const profileData = await this.authRepository.getProfile();
      return profileData;
    } catch (error) {
      this.logger.error(`Get profile error`, {
        correlationId,
        operation: 'get_profile_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
