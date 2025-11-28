import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UpdateUserDTO } from '@/application/dto/user-dto';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
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
   */
  private async validateUpdatePermissions(userId: string, updates: UpdateUserDTO, correlationId: string): Promise<void> {
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

    // Check role change permissions
    if (updates.role) {
      const targetUser = await this.userRepository.getUserById(userId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      if (!UserDomainService.canUserChangeRole(currentUser, targetUser.role, updates.role as UserRole)) {
        throw new Error('Insufficient permissions to change user role');
      }
    }

    // Check activation/deactivation permissions
    if (updates.isActive !== undefined) {
      const targetUser = await this.userRepository.getUserById(userId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      if (!UserDomainService.canUserToggleActivation(currentUser, targetUser, updates.isActive)) {
        throw new Error(`Insufficient permissions to ${updates.isActive ? 'activate' : 'deactivate'} user`);
      }
    }

    // Validate data consistency
    const consistencyCheck = UserDomainService.validateUserDataConsistency(updates);
    if (!consistencyCheck.isValid) {
      throw new Error(`Validation failed: ${consistencyCheck.errors.join(', ')}`);
    }
  }
}
