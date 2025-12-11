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
export interface UpdateProfileUseCaseContract {
  execute: (updates: UpdateProfileDTO) => Promise<User>;
}

export function createUpdateProfileUseCase(
  authRepository: IAuthRepository
): UpdateProfileUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'UpdateProfileUseCase',
  });

  return {
    async execute(updates: UpdateProfileDTO): Promise<User> {
      const correlationId = generateCorrelationId();
      try {
        return await authRepository.updateProfile(updates);
      } catch (error) {
        useCaseLogger.error(`Failed to update profile`, {
          correlationId,
          updates: Object.keys(updates),
          operation: 'update_profile_usecase_error',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}

/**
 * Backward-compatible class wrapper.
 */
export class UpdateProfileUseCase implements UpdateProfileUseCaseContract {
  private readonly useCase = createUpdateProfileUseCase(this.authRepository);

  constructor(private readonly authRepository: IAuthRepository) {}

  execute(updates: UpdateProfileDTO): Promise<User> {
    return this.useCase.execute(updates);
  }
}
