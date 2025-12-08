import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UpdateUserDTO } from '@/application/dto/user-dto';
import { UserDomainService } from '@/domain/services/user-domain-service';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
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
    let currentUser: User | null = null;
    let targetUser: User | null = null;

    try {
      [currentUser, targetUser] = await Promise.all([
        this.userRepository.getCurrentUser(),
        this.userRepository.getUserById(userId)
      ]);

      // Debug: Log fetched user data
      this.logger.info('Fetched users for permission validation', {
        correlationId,
        targetUserId: userId,
        currentUser: currentUser ? {
          id: currentUser.id,
          role: currentUser.role,
          email: currentUser.email,
        } : null,
        targetUser: targetUser ? {
          id: targetUser.id,
          role: targetUser.role,
          email: targetUser.email,
        } : null,
      });
    } catch (fetchError) {
      // If we can't fetch users, log but don't block - let backend handle auth
      this.logger.warn('Failed to fetch user data for permission validation', {
        correlationId,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
      });
      // Continue with null values - backend will handle authentication
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

    // Ownership/admin/manager gating
    if (currentUser.id !== userId) {
      const canManage =
        currentUser.role === UserRole.ADMIN ||
        (currentUser.role === UserRole.MANAGER && targetUser.role === UserRole.STAFF);

      if (!canManage) {
        throw new Error('Insufficient permissions to update this user');
      }
    }

    // Role change validation (admin only)
    // Note: Full validation is done on the backend - frontend only does basic admin check
    if (updates.role && updates.role !== targetUser.role) {
      // Normalize the new role for comparison
      const normalizedNewRole = AuthDomainService.getDefaultRole(updates.role);

      // Check role hierarchy - allow if current user is admin (even if isActive is undefined)
      this.logger.info('Role change attempt', {
        correlationId,
        currentUserRole: currentUser.role,
        targetUserRole: targetUser.role,
        newRole: updates.role,
        normalizedNewRole,
        canPerformAdminActions: AuthDomainService.canPerformAdminActions(currentUser),
      });

      // Only admins can change roles - basic check
      if (currentUser.role !== UserRole.ADMIN) {
        throw new Error('Only admins can change user roles');
      }

      // Skip detailed role change validation - let backend handle it
      // The backend has accurate data and will enforce proper permissions

      // Update the role to the normalized version
      updates.role = normalizedNewRole;
    }

    // Activation toggle validation
    if (typeof updates.isActive === 'boolean' && updates.isActive !== targetUser.isActive) {
      const canToggle = UserDomainService.canUserToggleActivation(currentUser, targetUser, updates.isActive);
      if (!canToggle) {
        throw new Error('Insufficient permissions to change activation status');
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
