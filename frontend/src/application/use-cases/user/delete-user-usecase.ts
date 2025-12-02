import { IUserRepository } from '@/domain/repositories/i-user-repository';
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
   * Note: Full permission validation is done on the backend.
   * Frontend only does basic validation to improve UX.
   */
  private async validateDeletePermissions(userId: string, correlationId: string): Promise<void> {
    // Get current user to check permissions
    const currentUser = await this.userRepository.getCurrentUser();

    if (!currentUser) {
      throw new Error('Authentication required');
    }

    // Basic account status check
    if (!currentUser.isActive) {
      throw new Error('Your account is deactivated. Please contact administrator.');
    }

    // Cannot delete yourself
    if (currentUser.id === userId) {
      throw new Error('You cannot delete your own account');
    }

    // Basic role check - only admins and managers can delete users
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      throw new Error('Insufficient permissions to delete users');
    }

    // Note: Detailed permission checks (role hierarchy, etc.) 
    // are delegated to the backend which has full context
  }
}
