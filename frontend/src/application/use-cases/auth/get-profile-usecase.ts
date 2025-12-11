import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { User } from '@/domain/entities/user-entity';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

export interface GetProfileUseCaseContract {
  execute: () => Promise<User>;
}

export function createGetProfileUseCase(
  authRepository: IAuthRepository
): GetProfileUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'GetProfileUseCase',
  });

  return {
  async execute(): Promise<User> {
    const correlationId = generateCorrelationId();
    try {
        return await authRepository.getProfile();
    } catch (error) {
        useCaseLogger.error(`Get profile error`, {
        correlationId,
        operation: 'get_profile_usecase_error',
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
export class GetProfileUseCase implements GetProfileUseCaseContract {
  private readonly useCase = createGetProfileUseCase(this.authRepository);

  constructor(private readonly authRepository: IAuthRepository) {}

  execute(): Promise<User> {
    return this.useCase.execute();
  }
}
