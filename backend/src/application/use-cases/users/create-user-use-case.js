/**
 * Create User Use Case
 * Handles user creation by administrators with automatic password generation and email sending
 */
import logger from '../../../infrastructure/config/logger.js';
import { generateTemporaryPassword } from '../../../shared/utils/crypto.js';
import { CreateUserRequestDto } from '../../dto/user/index.js';
import { UserResponseDto } from '../../dto/user/index.js';

export class CreateUserUseCase {
  constructor(userRepository, authService, emailService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  /**
   * Execute create user use case
   * @param {CreateUserRequestDto} createUserRequest - Validated request data
   * @param {string} createdBy - User ID who created this user
   * @returns {Promise<Object>} Created user data
   */
  async execute(createUserRequest, createdBy) {
    try {
      // Request DTO is already validated by controller
      const { username, email, displayName, role, avatarUrl, phone } = createUserRequest;

      // Additional validation
      if (!username || !email || !displayName) {
        throw new Error('Missing required fields in create user request');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword(12);
      const hashedPassword = await this.authService.hashPassword(temporaryPassword);

      // Create user entity
      const user = await this.userRepository.save({
        username,
        hashedPassword,
        email,
        displayName,
        role: role || 'staff',
        avatarUrl,
        phone,
        isFirstLogin: true,
        langKey: 'en',
        createdBy,
      });

      // Send welcome email with temporary password
      try {
        await this.emailService.sendWelcomeWithPassword(user.email, {
          displayName: user.displayName,
          username: user.username,
          password: temporaryPassword,
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login',
        });

        logger.info('Welcome email sent', {
          userId: user.id,
          email: user.email,
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

      // Log the creation
      logger.info('User created', {
        userId: user.id,
        createdBy,
        email: user.email,
        username: user.username,
        temporaryPasswordSent: true,
      });

      // Return user data as DTO (without sensitive information)
      return {
        user: UserResponseDto.fromEntity(user),
        message: 'User created successfully. Welcome email sent with temporary password.',
        temporaryPassword: process.env.NODE_ENV === 'development' ? temporaryPassword : undefined, // Only expose in dev
      };
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }
}
