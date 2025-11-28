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
      // Validate input using domain service
      this.validateInput(userData, correlationId);

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

    // Validate role
    if (userData.role && !Object.values(UserRole).includes(userData.role)) {
      throw new Error('Invalid user role');
    }

    // Validate required fields
    if (!userData.username?.trim()) {
      throw new Error('Username is required');
    }

    if (!userData.email?.trim()) {
      throw new Error('Email is required');
    }

    if (!userData.displayName?.trim()) {
      throw new Error('Display name is required');
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
    };
  }
}
