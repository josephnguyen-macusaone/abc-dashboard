/**
 * Verify Email Use Case
 * Handles email verification with OTP
 */
import {
  ValidationException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';
import { UserAuthDto } from '../../dto/auth/index.js';

export class VerifyEmailUseCase {
  constructor(userRepository, tokenService, emailService = null) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.emailService = emailService;
  }

  /**
   * Execute verify email use case
   * @param {{ token: string }} input - Verification token
   * @returns {Promise<{ user: UserAuthDto, message: string }>}
   */
  async execute({ token }) {
    try {
      // Validate input
      if (!token) {
        throw new ValidationException('Verification token is required');
      }

      // Verify JWT token
      const decoded = this.tokenService.verifyEmailVerificationToken(token);

      // Find user by ID from token
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Check if user is already active
      if (user.isActive) {
        throw new ValidationException('Account already activated');
      }

      // Activate the user
      user.activate();

      // Update user in repository
      const updatedUser = await this.userRepository.updateUserStatus(user.id, {
        isActive: true,
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
          email: user.email,
        });
      } catch (error) {
        logger.error('Failed to send verification confirmation email:', error);
        // Don't fail the verification if email fails
      }

      return {
        user: UserAuthDto.fromEntity(updatedUser),
        message: 'Email verified successfully. Your account is now active.',
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }
}
