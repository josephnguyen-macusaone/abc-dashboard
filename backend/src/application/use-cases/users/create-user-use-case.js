/**
 * Create User Use Case
 * Handles user creation by administrators with automatic password generation and email sending
 */
import logger from '../../../infrastructure/config/logger.js';
import { generateTemporaryPassword } from '../../../shared/utils/security/crypto.js';
import { CreateUserRequestDto } from '../../dto/user/index.js';
import { UserResponseDto } from '../../dto/user/index.js';
import {
  ValidationException,
  EmailAlreadyExistsException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';

export class CreateUserUseCase {
  constructor(userRepository, authService, emailService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  /**
   * Execute create user use case
   * @param {CreateUserRequestDto} createUserRequest - Validated request data
   * @param {Object} creatorUser - User who is creating this account
   * @returns {Promise<Object>} Created user data
   */
  async execute(createUserRequest, creatorUser) {
    try {
      // Request DTO is already validated by controller
      const { username, email, displayName, role, avatarUrl, phone, managedBy, createdBy } =
        createUserRequest;

      // Additional validation
      if (!username || !email || !displayName) {
        logger.error('Missing required fields', { username, email, displayName });
        throw new ValidationException('Username, email, and display name are required');
      }

      logger.info('Checking uniqueness for user creation', { username, email });

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        logger.warn('Email already exists', { email, existingUserId: existingUser.id });
        throw new EmailAlreadyExistsException();
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(username);
      if (existingUsername) {
        logger.warn('Username already exists', { username, existingUserId: existingUsername.id });
        throw new ValidationException('Username already taken');
      }

      logger.info('Uniqueness checks passed', { username, email });

      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword(12);
      const hashedPassword = await this.authService.hashPassword(temporaryPassword);

      // Validate and set role (default to staff if not provided, but log warning)
      const validRoles = ['admin', 'manager', 'staff'];
      let userRole = role;

      if (!userRole) {
        userRole = 'staff'; // Default role for backward compatibility
        logger.warn('No role provided in user creation, defaulting to staff', {
          username,
          email,
          creatorUserId: creatorUser.id,
          creatorUserRole: creatorUser.role,
        });
      } else if (!validRoles.includes(userRole)) {
        throw new ValidationException(`Invalid role '${userRole}'. Must be one of: ${validRoles.join(', ')}`);
      }

      // Create user entity
      const user = await this.userRepository.save({
        username,
        hashedPassword,
        email,
        displayName,
        role: userRole,
        avatarUrl,
        phone,
        isFirstLogin: true,
        requiresPasswordChange: true,
        langKey: 'en',
        managedBy,
        createdBy: createdBy || creatorUser.id,
      });

      // Get manager information for email
      let managerName = null;
      if (managedBy) {
        try {
          const manager = await this.userRepository.findById(managedBy);
          if (manager) {
            managerName = manager.displayName;
          }
        } catch (error) {
          logger.warn('Could not fetch manager information for email', {
            userId: user.id,
            managedBy,
            error: error.message,
          });
        }
      }

      // Send welcome email with temporary password
      try {
        await this.emailService.sendWelcomeWithPassword(user.email, {
          displayName: user.displayName,
          username: user.username,
          password: temporaryPassword,
          role: user.role,
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login',
          managerName,
        });

        logger.info('Welcome email sent', {
          userId: user.id,
          email: user.email,
          role: user.role,
          managedBy,
        });
      } catch (emailError) {
        logger.error('Failed to send welcome email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
        // Don't fail the user creation if email fails
        // Admin can manually resend or user can request password reset
      }

      // Log the creation with audit information
      logger.security('USER_CREATED', {
        action: 'create_user',
        actorId: creatorUser.id,
        actorRole: creatorUser.role,
        targetId: user.id,
        targetRole: user.role,
        targetEmail: user.email,
        managedBy,
        createdAt: new Date().toISOString(),
      });

      logger.info('User created', {
        userId: user.id,
        createdBy: creatorUser.id,
        creatorRole: creatorUser.role,
        email: user.email,
        username: user.username,
        role: user.role,
        managedBy,
        temporaryPasswordSent: true,
      });

      // Return user data as DTO (without sensitive information)
      return {
        user: UserResponseDto.fromEntity(user),
        message: 'User created successfully. Welcome email sent with temporary password.',
        temporaryPassword: process.env.NODE_ENV === 'development' ? temporaryPassword : undefined, // Only expose in dev
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException ||
          error instanceof EmailAlreadyExistsException ||
          error instanceof ResourceNotFoundException) {
        throw error;
      }

      // Log infrastructure errors and throw validation exception
      logger.error('User creation infrastructure error:', {
        error: error.message,
        stack: error.stack,
        correlationId: this.correlationId,
      });

      throw new ValidationException(`User creation failed: ${error.message}`);
    }
  }
}
