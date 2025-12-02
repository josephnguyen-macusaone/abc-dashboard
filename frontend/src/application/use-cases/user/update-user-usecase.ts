import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UpdateUserDTO } from '@/application/dto/user-dto';
import { UserDomainService } from '@/domain/services/user-domain-service';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Update User
 * Handles the business logic for updating an existing user
 */
export class UpdateUserUseCase {
  private readonly logger = logger.createChild({
    component: 'UpdateUserUseCase',
  });

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute update user use case
   */
  async execute(id: string, updates: UpdateUserDTO): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      // Validate update permissions and data
      await this.validateUpdatePermissions(id, updates, correlationId);

      // Execute update through repository
      const updatedUser = await this.userRepository.updateUser(id, updates);

      return updatedUser;
    } catch (error) {
      this.logger.error(`Update user use case failed`, {
        correlationId,
        userId: id,
        updates: Object.keys(updates),
        operation: 'update_user_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate update permissions
   * Note: Full permission validation is done on the backend.
   * Frontend only does basic validation to improve UX.
   */
  private async validateUpdatePermissions(userId: string, updates: UpdateUserDTO, correlationId: string): Promise<void> {
    // Get current user to check permissions
    const currentUser = await this.userRepository.getCurrentUser();

    if (!currentUser) {
      throw new Error('Authentication required');
    }

    // Basic account status check
    if (!currentUser.isActive) {
      throw new Error('Your account is deactivated. Please contact administrator.');
    }

    // Basic role check - only admins and managers can update other users
    if (currentUser.id !== userId) {
      if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
        throw new Error('Insufficient permissions to update other users');
      }
    }

    // Validate data consistency (format validation only)
    const consistencyCheck = UserDomainService.validateUserDataConsistency(updates);
    if (!consistencyCheck.isValid) {
      throw new Error(`Validation failed: ${consistencyCheck.errors.join(', ')}`);
    }

    // Note: Detailed permission checks (role changes, activation/deactivation) 
    // are delegated to the backend which has full context
  }
}
