/**
 * Change Password Use Case
 * Handles password changes for authenticated users
 */
import {
  ValidationException,
  ResourceNotFoundException
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class ChangePasswordUseCase {
  constructor(userRepository, authService, emailService = null) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  async execute(userId, { currentPassword, newPassword }) {
    try {
      // Validate input
      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      if (!currentPassword || !newPassword) {
        throw new ValidationException('Current password and new password are required');
      }

      if (currentPassword === newPassword) {
        throw new ValidationException('New password must be different from current password');
      }

      // Validate new password strength (basic check)
      if (newPassword.length < 8) {
        throw new ValidationException('New password must be at least 8 characters long');
      }

      // Find the user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.authService.verifyPassword(currentPassword, user.hashedPassword);
      if (!isCurrentPasswordValid) {
        throw new ValidationException('Current password is incorrect');
      }

      // Hash new password
      const newHashedPassword = await this.authService.hashPassword(newPassword);

      // Update user password
      const updatedUser = await this.userRepository.update(userId, {
        hashedPassword: newHashedPassword
      });

      if (!updatedUser) {
        throw new Error('Failed to update password');
      }

      // Send password change notification email
      try {
        if (this.emailService) {
          await this.emailService.sendEmail(
            user.email,
            'Password Changed Successfully',
            'Hi {{displayName}}! Your password has been successfully changed. If you did not make this change, please contact support immediately.',
            { displayName: user.displayName }
          );
        }

        // Log security event
        logger.security('Password changed', {
          userId,
          email: user.email,
          changedAt: new Date().toISOString()
        });

        logger.info('Password changed successfully', {
          userId,
          email: user.email
        });
      } catch (error) {
        logger.error('Failed to send password change notification:', error);
        // Don't fail the password change if email fails
      }

      return {
        message: 'Password changed successfully'
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Password change failed: ${error.message}`);
    }
  }
}
