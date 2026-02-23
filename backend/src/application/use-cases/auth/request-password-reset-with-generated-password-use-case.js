/**
 * Request Password Reset With Generated Password Use Case
 * Handles password reset request by generating a temporary password and sending it via email
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';
import { config } from '../../../infrastructure/config/config.js';

export class RequestPasswordResetWithGeneratedPasswordUseCase {
  constructor(userRepository, authService, emailService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  async execute({ email }) {
    try {
      // Validate input
      if (!email) {
        throw new ValidationException('Email is required');
      }

      // Find user by email (don't reveal if user exists)
      const user = await this.userRepository.findByEmail(email);

      // Always return success message for security (don't reveal if email exists)
      if (!user) {
        logger.info('Password reset with generated password requested for non-existent email', {
          email,
        });
        return {
          success: true,
          message: 'Password reset email sent if account exists',
        };
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Password reset with generated password requested for inactive user', {
          userId: user.id,
          email: user.email,
        });
        return {
          success: true,
          message: 'Password reset email sent if account exists',
        };
      }

      // Generate a temporary password
      const temporaryPassword = this.authService.generateTemporaryPassword();

      // Hash the temporary password
      const hashedPassword = await this.authService.hashPassword(temporaryPassword);

      // Update user password and set first login flag to force password change
      const updateData = {
        hashedPassword,
        isFirstLogin: true, // Force password change on next login
      };

      const updatedUser = await this.userRepository.update(user.id, updateData);

      if (!updatedUser) {
        throw new Error('Failed to update user password');
      }

      // Send email with generated password
      try {
        const loginUrl = `${config.CLIENT_URL}/login`;

        await this.emailService.sendPasswordResetWithGeneratedPassword(user.email, {
          displayName: user.displayName || user.email.split('@')[0],
          temporaryPassword,
          loginUrl,
        });

        logger.info('Password reset with generated password email sent successfully', {
          userId: user.id,
          email: user.email,
        });
      } catch (emailError) {
        logger.error('Failed to send password reset with generated password email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
          errorStack: emailError.stack,
        });
        // Still return success to avoid revealing email existence
      }

      return {
        success: true,
        message: 'Password reset email sent if account exists',
      };
    } catch (error) {
      // Re-throw domain exceptions
      if (error instanceof ValidationException) {
        throw error;
      }

      logger.error('Password reset with generated password request failed:', {
        error: error.message,
        stack: error.stack,
        email,
      });
      // Return generic success message for security
      return {
        success: true,
        message: 'Password reset email sent if account exists',
      };
    }
  }
}
