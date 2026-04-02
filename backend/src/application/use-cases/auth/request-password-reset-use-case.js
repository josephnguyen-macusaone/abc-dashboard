/**
 * Request Password Reset Use Case
 * Handles password reset request logic - generates reset token and sends via email
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../shared/utils/logger.js';
import { config } from '../../../infrastructure/config/config.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-token-service.js').ITokenService} ITokenService */
/** @typedef {import('../../interfaces/i-email-service.js').IEmailService} IEmailService */

export class RequestPasswordResetUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {ITokenService} tokenService
   * @param {IEmailService} emailService
   */
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

      // Inactive + unverified: self-signup pending — send verification link (same generic response).
      if (!user.isActive && !user.emailVerified) {
        try {
          const verifyToken = this.tokenService.generateEmailVerificationToken(user.id, user.email);
          await this.emailService.sendEmailVerification(
            user.email,
            user.displayName || user.email.split('@')[0],
            verifyToken
          );
          logger.info('Sent verification email from forgot-password flow', {
            userId: user.id,
            email: user.email,
          });
        } catch (emailError) {
          logger.error('Failed to send verification from forgot-password', {
            userId: user.id,
            error: emailError.message,
          });
        }
        return {
          success: true,
          message: 'Password reset email sent if account exists',
        };
      }

      // Inactive but already verified (e.g. admin deactivated)
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

      // Send email with reset link - use CLIENT_URL from config
      try {
        const baseUrl = config.CLIENT_URL || 'https://portal.abcsalon.us';
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        await this.emailService.sendPasswordResetEmail(user.email, {
          displayName: user.displayName || user.email.split('@')[0],
          resetUrl,
          email: user.email,
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
