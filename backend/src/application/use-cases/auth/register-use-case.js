/**
 * Register Use Case
 * Handles user registration logic
 */
import {
  ValidationException,
  EmailAlreadyExistsException
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class RegisterUseCase {
  constructor(userRepository, authService, tokenService, emailService = null) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
    this.emailService = emailService;
  }

  async execute({ username, email, password, firstName, lastName, avatarUrl, avatarId, bio, phone }) {
    try {
      // Validate input
      if (!username || !email || !password || !firstName || !lastName) {
        throw new ValidationException('Username, email, password, firstName, and lastName are required');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new EmailAlreadyExistsException();
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(username);
      if (existingUsername) {
        throw new ValidationException('Username already taken');
      }

      // Hash password
      const hashedPassword = await this.authService.hashPassword(password);

      // Combine firstName and lastName into displayName
      const displayName = `${firstName} ${lastName}`.trim();

      // Create user entity (without verification fields initially)
      const user = await this.userRepository.save({
        username,
        hashedPassword,
        email,
        displayName,
        avatarUrl,
        avatarId,
        bio,
        phone
      });

      // Generate email verification OTP
      const otp = user.generateEmailVerificationToken();

      // Update user with verification token
      await this.userRepository.updateEmailVerification(user.id, {
        emailVerificationToken: otp,
        emailVerificationExpires: user.emailVerificationExpires
      });

      // Send email verification OTP
      try {
        if (this.emailService) {
          await this.emailService.sendEmail(
            user.email,
            'Verify Your Email - ABC Dashboard',
            'Hi {{displayName}}! Welcome to ABC Dashboard. Your verification code is: <strong>{{otp}}</strong><br><br>This code will expire in 10 minutes.',
            { displayName: user.displayName, otp: otp }
          );
        }

        // Log user registration for analytics
        logger.info('New user registered - verification email sent', {
          userId: user.id,
          email: user.email,
          username: user.username
        });
      } catch (error) {
        logger.error('Failed to send verification email:', error);
        // Don't fail registration if email fails
      }

      // Return user data (no tokens until email is verified)
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          avatarId: user.avatarId,
          bio: user.bio,
          phone: user.phone,
          isEmailVerified: false,
          createdAt: user.createdAt
        },
        message: 'Registration successful. Please check your email for verification code.'
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException ||
          error instanceof EmailAlreadyExistsException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
}
