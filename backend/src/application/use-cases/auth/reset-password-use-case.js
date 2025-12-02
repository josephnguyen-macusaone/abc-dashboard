/**
 * Reset Password Use Case
 * Handles password reset with token verification
 */
import {
  ValidationException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class ResetPasswordUseCase {
  constructor(userRepository, tokenService, authService, emailService = null) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.authService = authService;
    this.emailService = emailService;
  }

  async execute({ token, newPassword }) {
    try {
      // Validate input
      if (!token || !newPassword) {
        throw new ValidationException('Token and new password are required');
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        throw new ValidationException('New password must be at least 8 characters long');
      }

      // Verify token
      let decoded;
      try {
        decoded = this.tokenService.verifyPasswordResetToken(token);
      } catch (tokenError) {
        throw new ValidationException('Invalid or expired reset token');
      }

      const { userId, email } = decoded;

      // Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Verify email matches
      if (user.email !== email) {
        throw new ValidationException('Token email mismatch');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ValidationException('Account is not active');
      }

      // Hash new password
      const hashedPassword = await this.authService.hashPassword(newPassword);

      // Update user password and clear first login flag if set
      const updateData = {
        hashedPassword,
      };

      // If this was a first login scenario, mark as completed
      if (user.isFirstLogin) {
        updateData.isFirstLogin = false;
      }

      const updatedUser = await this.userRepository.update(userId, updateData);

      if (!updatedUser) {
        throw new Error('Failed to update password');
      }

      // Send confirmation email
      try {
        if (this.emailService) {
          await this.emailService.sendPasswordResetConfirmationEmail(
            user.email,
            {
              displayName: user.displayName,
              loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
            }
          );
        }

        logger.info('Password reset successful', {
          userId: user.id,
          email: user.email,
        });
      } catch (emailError) {
        logger.error('Failed to send password reset confirmation email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
        // Don't fail the password reset if email fails
      }

      return {
        success: true,
        message: 'Password reset successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
        },
      };
    } catch (error) {
      // Re-throw domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }

      logger.error('Password reset failed:', error);
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }
}
