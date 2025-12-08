import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { User } from '@/domain/entities/user-entity';
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
   * Note: Full permission validation is done on the backend.
   * Frontend only does basic validation to improve UX.
   */
  private async validateDeletePermissions(userId: string, correlationId: string): Promise<void> {
    let currentUser: User | null = null;
    let targetUser: User | null = null;

    try {
      [currentUser, targetUser] = await Promise.all([
        this.userRepository.getCurrentUser(),
        this.userRepository.getUserById(userId)
      ]);
    } catch (fetchError) {
      // If we can't fetch users, log but don't block - let backend handle auth
      this.logger.warn('Failed to fetch user data for permission validation', {
        correlationId,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
      });
      // Continue - backend will handle authentication and permissions
      return;
    }

    if (!currentUser) {
      throw new Error('Authentication required');
    }

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Basic account status check - be lenient if isActive is undefined
    if (currentUser.isActive === false) {
      throw new Error('Your account is deactivated. Please contact administrator.');
    }

    // Domain-level permission check
    if (!UserDomainService.canUserDeleteUser(currentUser, targetUser)) {
      throw new Error('Insufficient permissions to delete this user');
    }
  }
}
