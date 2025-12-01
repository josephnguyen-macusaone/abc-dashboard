/**
 * Request Password Reset Use Case
 * Handles password reset request logic - generates temporary password and sends via email
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';
import { generateTemporaryPassword } from '../../../shared/utils/crypto.js';

export class RequestPasswordResetUseCase {
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

      // Generate secure temporary password
      const temporaryPassword = generateTemporaryPassword(12);

      // Hash the temporary password
      const hashedPassword = await this.authService.hashPassword(temporaryPassword);

      // Update user with temporary password and force password change
      const updateData = {
        hashedPassword,
        requiresPasswordChange: true,
      };

      const updatedUser = await this.userRepository.update(user.id, updateData);
      if (!updatedUser) {
        throw new Error('Failed to update user password');
      }

      // Send email with temporary password
      try {
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';

        await this.emailService.sendEmail(
          user.email,
          'Password Reset - ABC Dashboard',
          `Hi {{displayName}}!

You requested a password reset for your ABC Dashboard account.

Here is your temporary password: <strong>{{temporaryPassword}}</strong>

Please use this password to log in to your account immediately. You will be required to change your password after logging in.

<strong>⚠️ Security Notice:</strong> This is a temporary password that will expire once you change it. Keep this email secure and change your password as soon as possible.

Login URL: <a href="{{loginUrl}}" style="color: #007bff;">{{loginUrl}}</a>

<strong>Steps to complete your password reset:</strong>
1. Click the login URL above or go to your ABC Dashboard login page
2. Enter your email address and the temporary password shown above
3. You will be automatically redirected to change your password
4. Choose a strong, memorable password
5. Click "Change Password" to complete the process

If you didn't request this password reset, please contact support immediately.

Best regards,
ABC Dashboard Team`,
          {
            displayName: user.displayName,
            temporaryPassword,
            loginUrl,
          }
        );

        logger.info('Password reset email sent with temporary password', {
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
