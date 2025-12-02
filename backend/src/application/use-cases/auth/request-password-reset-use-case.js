/**
 * Request Password Reset Use Case
 * Handles password reset request logic - generates reset token and sends via email
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class RequestPasswordResetUseCase {
  constructor(userRepository, tokenService, emailService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
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
        logger.info('Password reset requested for non-existent email', { email });
        return {
          success: true,
          message: 'Password reset email sent if account exists',
        };
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Password reset requested for inactive user', {
          userId: user.id,
          email: user.email,
        });
        return {
          success: true,
          message: 'Password reset email sent if account exists',
        };
      }

      // Generate password reset token
      const resetToken = this.tokenService.generatePasswordResetToken(user.id, user.email);

      // Send email with reset link
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        await this.emailService.sendPasswordResetEmail(user.email, {
          displayName: user.displayName || user.email.split('@')[0],
          resetUrl,
        });

        logger.info('Password reset email sent successfully', {
          userId: user.id,
          email: user.email,
        });
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
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

      logger.error('Password reset request failed:', {
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
