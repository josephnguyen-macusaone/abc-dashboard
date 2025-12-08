import { User } from '@/domain/entities/user-entity';
import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * Application Use Case: Update Profile
 * Handles the business logic for updating user profile information
 */
export class UpdateProfileUseCase {
  private readonly logger = logger.createChild({
    component: 'UpdateProfileUseCase',
  });

  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Execute update profile use case
   */
  async execute(updates: UpdateProfileDTO): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      const updatedUser = await this.authRepository.updateProfile(updates);

      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update profile`, {
        correlationId,
        updates: Object.keys(updates),
        operation: 'update_profile_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
