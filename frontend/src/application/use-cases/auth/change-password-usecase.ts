import { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

/**
 * Application Use Case: Change Password
 * Handles the business logic for changing user passwords with validation
 */
export interface ChangePasswordUseCaseContract {
  execute: (data: ChangePasswordDTO) => Promise<void>;
}

export function createChangePasswordUseCase(
  authRepository: IAuthRepository
): ChangePasswordUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'ChangePasswordUseCase',
  });

  function validateInput(data: ChangePasswordDTO): void {
    if (!data.currentPassword || !data.currentPassword.trim()) {
      throw new Error('Current password is required');
    }
    if (!data.newPassword || !data.newPassword.trim()) {
      throw new Error('New password is required');
    }
    if (data.currentPassword === data.newPassword) {
      throw new Error('New password must be different from current password');
    }

    // Validate new password strength
    const passwordValidation = AuthDomainService.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }
  }

  /*
    Application Use Case: Change Password
    Handles the business logic for changing a user's password
  */
  return {
    async execute(data: ChangePasswordDTO): Promise<void> {
      const correlationId = generateCorrelationId();

      try {
        // Validate input
        validateInput(data);

        // Change password
        await authRepository.changePassword(data.currentPassword, data.newPassword);
      } catch (error) {
        // Log error
        useCaseLogger.error(`Failed to change password`, {
          correlationId,
          operation: 'change_password_usecase_error',
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
export class ChangePasswordUseCase implements ChangePasswordUseCaseContract {
  private readonly useCase = createChangePasswordUseCase(this.authRepository);

  constructor(private readonly authRepository: IAuthRepository) {}

  execute(data: ChangePasswordDTO): Promise<void> {
    return this.useCase.execute(data);
  }
}