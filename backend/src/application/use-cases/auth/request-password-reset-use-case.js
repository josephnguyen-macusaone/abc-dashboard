/**
 * Request Password Reset Use Case
 * Handles password reset request logic
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

      // Send password reset email
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        await this.emailService.sendEmail(
          user.email,
          'Password Reset - ABC Dashboard',
          `Hi {{displayName}}!

You requested a password reset for your ABC Dashboard account.

Click the link below to reset your password:
<a href="{{resetUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Reset Password</a>

If the button doesn't work, copy and paste this link into your browser:
{{resetUrl}}

This link will expire in 10 minutes for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
ABC Dashboard Team`,
          {
            displayName: user.displayName,
            resetUrl,
          }
        );

        logger.info('Password reset email sent', {
          userId: user.id,
          email: user.email,
        });
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
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

      logger.error('Password reset request failed:', error);
      // Return generic success message for security
      return {
        success: true,
        message: 'Password reset email sent if account exists',
      };
    }
  }
}
