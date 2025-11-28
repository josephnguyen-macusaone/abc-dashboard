import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { UserDomainService } from '@/domain/services/user-domain-service';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Delete User
 * Handles the business logic for deleting a user
 */
export class DeleteUserUseCase {
  private readonly logger = logger.createChild({
    component: 'DeleteUserUseCase',
  });

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute delete user use case
   */
  async execute(id: string): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      // Validate delete permissions
      await this.validateDeletePermissions(id, correlationId);

      // Execute deletion through repository
      await this.userRepository.deleteUser(id);
    } catch (error) {
      this.logger.error(`Delete user use case failed`, {
        correlationId,
        userId: id,
        operation: 'delete_user_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate delete permissions
   */
  private async validateDeletePermissions(userId: string, correlationId: string): Promise<void> {
    // Get current user to check permissions
    const currentUser = await this.userRepository.getCurrentUser();

    if (!currentUser) {
      throw new Error('Authentication required');
    }

    // Validate account status
    const accountValidation = AuthDomainService.validateUserAccountStatus(currentUser);
    if (!accountValidation.isValid) {
      throw new Error(accountValidation.reason || 'Account validation failed');
    }

    // Get target user for permission validation
    const targetUser = await this.userRepository.getUserById(userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check delete permissions using domain service
    if (!UserDomainService.canUserDeleteUser(currentUser, targetUser)) {
      throw new Error('Insufficient permissions to delete this user');
    }
  }
}
