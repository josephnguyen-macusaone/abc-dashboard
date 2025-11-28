/**
 * Change Password Use Case
 * Handles password changes for authenticated users
 */
import {
  ValidationException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class ChangePasswordUseCase {
  constructor(userRepository, authService, emailService = null) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  async execute(userId, { currentPassword, newPassword, isFirstLoginChange = false }) {
    try {
      // Validate input
      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      if (!newPassword) {
        throw new ValidationException('New password is required');
      }

      // For first login changes, currentPassword is not required
      if (!isFirstLoginChange && !currentPassword) {
        throw new ValidationException('Current password is required');
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

      // Verify current password (skip for first login changes)
      if (!isFirstLoginChange) {
        const isCurrentPasswordValid = await this.authService.verifyPassword(
          currentPassword,
          user.hashedPassword
        );
        if (!isCurrentPasswordValid) {
          throw new ValidationException('Current password is incorrect');
        }
      }

      // Hash new password
      const newHashedPassword = await this.authService.hashPassword(newPassword);

      // Prepare update data
      const updateData = {
        hashedPassword: newHashedPassword,
      };

      // Mark first login as completed if this is a first login change
      if (isFirstLoginChange && user.isFirstLogin) {
        updateData.isFirstLogin = false;
      }

      // Update user password and first login status
      const updatedUser = await this.userRepository.update(userId, updateData);

      if (!updatedUser) {
        throw new Error('Failed to update password');
      }

      // Send appropriate notification email
      try {
        if (this.emailService) {
          const emailSubject = isFirstLoginChange
            ? 'Welcome - Password Set Successfully'
            : 'Password Changed Successfully';

          const emailTemplate = isFirstLoginChange
            ? 'Hi {{displayName}}! Welcome to ABC Dashboard. Your password has been successfully set. You can now access all features.'
            : 'Hi {{displayName}}! Your password has been successfully changed. If you did not make this change, please contact support immediately.';

          await this.emailService.sendEmail(user.email, emailSubject, emailTemplate, {
            displayName: user.displayName,
          });
        }

        // Log security event
        const eventType = isFirstLoginChange ? 'First login password set' : 'Password changed';
        logger.security(eventType, {
          userId,
          email: user.email,
          changedAt: new Date().toISOString(),
          isFirstLoginChange,
        });

        logger.info(`${eventType} successfully`, {
          userId,
          email: user.email,
          isFirstLoginChange,
        });
      } catch (error) {
        logger.error('Failed to send password change notification:', error);
        // Don't fail the password change if email fails
      }

      const message = isFirstLoginChange
        ? 'Welcome! Your password has been set successfully.'
        : 'Password changed successfully';

      return {
        message,
        isFirstLoginChange,
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
