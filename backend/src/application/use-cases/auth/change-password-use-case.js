/**
 * Change Password Use Case
 * Handles password changes for authenticated users
 */
import {
  ValidationException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../shared/utils/logger.js';

export class ChangePasswordUseCase {
  constructor(userRepository, authService, emailService = null) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  async execute(
    userId,
    { currentPassword, newPassword, isFirstLoginChange = false, skipCurrentPasswordCheck = false }
  ) {
    try {
      const requiresCurrentPassword = !isFirstLoginChange && !skipCurrentPasswordCheck;
      this._validateInput(userId, newPassword, currentPassword, requiresCurrentPassword);

      const user = await this._getUser(userId);
      await this._verifyCurrentPasswordIfRequired(user, currentPassword, requiresCurrentPassword);

      const updatedUser = await this._updatePassword(userId, newPassword, user, isFirstLoginChange);
      if (!updatedUser) {
        throw new Error('Failed to update password');
      }

      await this._sendNotificationAndLog(
        userId,
        user,
        isFirstLoginChange,
        skipCurrentPasswordCheck
      );

      const message = this._getSuccessMessage(skipCurrentPasswordCheck, user, isFirstLoginChange);
      return { message, isFirstLoginChange };
    } catch (error) {
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      throw new Error(`Password change failed: ${error.message}`, { cause: error });
    }
  }

  _validateInput(userId, newPassword, currentPassword, requiresCurrentPassword) {
    if (!userId) {
      throw new ValidationException('User ID is required');
    }
    if (!newPassword) {
      throw new ValidationException('New password is required');
    }
    if (requiresCurrentPassword && !currentPassword) {
      throw new ValidationException('Current password is required');
    }
    if (newPassword.length < 8) {
      throw new ValidationException('New password must be at least 8 characters long');
    }
  }

  async _getUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User');
    }
    return user;
  }

  async _verifyCurrentPasswordIfRequired(user, currentPassword, requiresCurrentPassword) {
    if (!requiresCurrentPassword) {
      return;
    }
    const valid = await this.authService.verifyPassword(currentPassword, user.hashedPassword);
    if (!valid) {
      throw new ValidationException('Current password is incorrect');
    }
  }

  async _updatePassword(userId, newPassword, user, isFirstLoginChange) {
    const newHashedPassword = await this.authService.hashPassword(newPassword);
    const updateData = { hashedPassword: newHashedPassword };
    if (isFirstLoginChange && user.isFirstLogin) {
      updateData.isFirstLogin = false;
    }
    if (user.requiresPasswordChange) {
      updateData.requiresPasswordChange = false;
    }
    return this.userRepository.update(userId, updateData);
  }

  async _sendNotificationAndLog(userId, user, isFirstLoginChange, skipCurrentPasswordCheck) {
    try {
      if (this.emailService) {
        const { subject, template } = this._getEmailContent(
          skipCurrentPasswordCheck,
          user,
          isFirstLoginChange
        );
        await this.emailService.sendEmail(user.email, subject, template, {
          displayName: user.displayName,
        });
      }
      const eventType = this._getEventType(skipCurrentPasswordCheck, user, isFirstLoginChange);
      logger.security(eventType, {
        userId,
        email: user.email,
        changedAt: new Date().toISOString(),
        isFirstLoginChange,
        wasForcedChange: skipCurrentPasswordCheck && user.requiresPasswordChange,
      });
      logger.info(`${eventType} successfully`, {
        userId,
        email: user.email,
        isFirstLoginChange,
        wasForcedChange: skipCurrentPasswordCheck && user.requiresPasswordChange,
      });
    } catch (error) {
      logger.error('Failed to send password change notification:', error);
    }
  }

  _getEmailContent(skipCurrentPasswordCheck, user, isFirstLoginChange) {
    if (skipCurrentPasswordCheck && user.requiresPasswordChange) {
      return {
        subject: 'Password Reset Completed - ABC Dashboard',
        template: `Hi {{displayName}}!

Your password has been successfully reset and changed. You can now access your ABC Dashboard account with your new password.

If you did not request this password reset, please contact support immediately.

Best regards,
ABC Dashboard Team`,
      };
    }
    if (isFirstLoginChange) {
      return {
        subject: 'Welcome - Password Set Successfully',
        template: `Hi {{displayName}}!

Welcome to ABC Dashboard. Your password has been successfully set. You can now access all features.

Best regards,
ABC Dashboard Team`,
      };
    }
    return {
      subject: 'Password Changed Successfully',
      template: `Hi {{displayName}}!

Your password has been successfully changed. If you did not make this change, please contact support immediately.

Best regards,
ABC Dashboard Team`,
    };
  }

  _getEventType(skipCurrentPasswordCheck, user, isFirstLoginChange) {
    if (skipCurrentPasswordCheck && user.requiresPasswordChange) {
      return 'Forced password change completed';
    }
    if (isFirstLoginChange) {
      return 'First login password set';
    }
    return 'Password changed';
  }

  _getSuccessMessage(skipCurrentPasswordCheck, user, isFirstLoginChange) {
    if (skipCurrentPasswordCheck && user.requiresPasswordChange) {
      return 'Password reset completed successfully. You can now access your account.';
    }
    if (isFirstLoginChange) {
      return 'Welcome! Your password has been set successfully.';
    }
    return 'Password changed successfully';
  }
}
