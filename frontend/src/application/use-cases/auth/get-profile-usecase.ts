import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { User } from '@/domain/entities/user-entity';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

export interface GetProfileUseCaseContract {
  execute: () => Promise<User>;
}

/**
 * Application Use Case: Get Profile
 * Handles the business logic for getting a user's profile
 */
export function createGetProfileUseCase(
  authRepository: IAuthRepository
): GetProfileUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'GetProfileUseCase',
  });

  /**
  * Executes the get profile use case
  */
  return {
    async execute(): Promise<User> {
      // Generate correlation ID
    const correlationId = generateCorrelationId();

    // Try to get profile
    try {
      // Get profile
      const profile = await authRepository.getProfile();

      // Return profile
      return profile;
    } catch (error) {
      // Log error
      useCaseLogger.error(`Failed to get profile`, {
        correlationId,
        operation: 'get_profile_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });

      // Throw error
      throw error;
    }
    },
  };
}

/**
 * Backward-compatible class wrapper.
 */
export class GetProfileUseCase implements GetProfileUseCaseContract {
  private readonly useCase = createGetProfileUseCase(this.authRepository);

  constructor(private readonly authRepository: IAuthRepository) {}

  execute(): Promise<User> {
    return this.useCase.execute();
  }
}
