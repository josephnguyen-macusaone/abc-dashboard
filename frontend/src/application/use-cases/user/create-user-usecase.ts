import { IUserRepository } from '@/domain/repositories/i-user-repository';
import { User, UserRole } from '@/domain/entities/user-entity';
import { CreateUserDTO } from '@/application/dto/user-dto';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { UserDomainService } from '@/domain/services/user-domain-service';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Create User
 * Handles the business logic for creating a new user
 */
export class CreateUserUseCase {
  private readonly logger = logger.createChild({
    component: 'CreateUserUseCase',
  });

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute create user use case
   */
  async execute(userData: CreateUserDTO): Promise<User> {
    const correlationId = generateCorrelationId();

    try {
      let operator: User | null = null;

      try {
        operator = await this.userRepository.getCurrentUser();
      } catch (fetchError) {
        // If we can't fetch current user, log but continue - let backend handle auth
        this.logger.warn('Failed to fetch current user for permission validation', {
          correlationId,
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        });
      }

      if (operator) {
        // Only check status if we have the user data
        if (operator.isActive === false) {
          throw new Error('Your account is deactivated. Please contact administrator.');
        }

      // Validate input using domain service
      this.validateInput(userData, correlationId);

        // Get the target role for permission checking
        const targetRole = AuthDomainService.getDefaultRole(userData.role);

        // Permission check: Admin can create manager/staff, Manager only staff
        if (operator.role === UserRole.ADMIN) {
          if (targetRole === UserRole.ADMIN) {
            throw new Error('Admins can create managers or staff, not new admins');
          }
        } else if (operator.role === UserRole.MANAGER) {
          if (targetRole !== UserRole.STAFF) {
            throw new Error('Managers can only create staff accounts');
          }
        } else {
          throw new Error('Insufficient permissions to create users');
        }
      }

      // Apply application rules
      const defaultedUserData = this.applyDefaults(userData);

      // Execute creation through repository
      const user = await this.userRepository.createUser(defaultedUserData);

      return user;
    } catch (error) {
      this.logger.error(`Create user use case failed`, {
        correlationId,
        email: userData.email,
        operation: 'create_user_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate create user input
   */
  private validateInput(userData: CreateUserDTO, correlationId: string): void {
    // Validate email format using domain service
    if (!AuthDomainService.validateEmailFormat(userData.email)) {
      this.logger.warn(`Invalid email format`, {
        correlationId,
        email: userData.email,
        operation: 'validation_error',
      });
      throw new Error('Invalid email format');
    }

    const requestedRole = AuthDomainService.getDefaultRole(userData.role);
    if (!Object.values(UserRole).includes(requestedRole)) {
      throw new Error('Invalid user role');
    }

    // Validate required fields
    if (!userData.email?.trim()) {
      throw new Error('Email is required');
    }

    if (!userData.firstName?.trim()) {
      throw new Error('First name is required');
    }

    if (!userData.lastName?.trim()) {
      throw new Error('Last name is required');
    }

    // Username is optional - will be auto-generated from email if not provided
    if (userData.username && userData.username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters if provided');
    }

    // Validate data consistency using domain service
    const consistencyCheck = UserDomainService.validateUserDataConsistency(userData);
    if (!consistencyCheck.isValid) {
      throw new Error(`Validation failed: ${consistencyCheck.errors.join(', ')}`);
    }
  }

  /**
   * Apply default values
   */
  private applyDefaults(userData: CreateUserDTO): CreateUserDTO {
    return {
      ...userData,
      role: AuthDomainService.getDefaultRole(userData.role),
    };
  }
}
