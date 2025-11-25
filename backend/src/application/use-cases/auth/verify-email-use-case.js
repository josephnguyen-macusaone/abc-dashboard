/**
 * Verify Email Use Case
 * Handles email verification with OTP
 */
import {
  ValidationException,
  ResourceNotFoundException
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class VerifyEmailUseCase {
  constructor(userRepository, emailService = null) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }

  async execute({ email, token }) {
    try {
      // Validate input
      if (!email || !token) {
        throw new ValidationException('Email and verification token are required');
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Verify the token
      user.verifyEmail(token);

      // Update user in repository
      const updatedUser = await this.userRepository.updateEmailVerification(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });

      // Send confirmation email
      try {
        if (this.emailService) {
          await this.emailService.sendEmail(
            user.email,
            'Email Verified Successfully!',
            'Hi {{displayName}}! Your email has been successfully verified. You can now access all features of your account.',
            { displayName: user.displayName }
          );
        }

        logger.info('Email verification successful', {
          userId: user.id,
          email: user.email
        });
      } catch (error) {
        logger.error('Failed to send verification confirmation email:', error);
        // Don't fail the verification if email fails
      }

      return {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          isEmailVerified: updatedUser.isEmailVerified,
          createdAt: updatedUser.createdAt
        },
        message: 'Email verified successfully.'
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof NotFoundException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }
}
