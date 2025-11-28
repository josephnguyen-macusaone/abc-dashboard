/**
 * Register Use Case
 * Handles user registration logic
 */
import {
  ValidationException,
  EmailAlreadyExistsException,
} from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';
import { RegisterResponseDto, UserAuthDto } from '../../dto/auth/index.js';

export class RegisterUseCase {
  constructor(userRepository, authService, tokenService, emailService = null) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
    this.emailService = emailService;
  }

  async execute({ username, email, password, firstName, lastName, avatarUrl, bio, phone }) {
    try {
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        throw new ValidationException('Email, password, firstName, and lastName are required');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new EmailAlreadyExistsException();
      }

      // Auto-generate username if not provided
      let finalUsername = username;
      if (!finalUsername) {
        // Generate username from first name + last name, or use email prefix
        const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(
          /[^a-z0-9_]/g,
          ''
        );
        finalUsername =
          baseUsername ||
          email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');

        // Ensure uniqueness by appending numbers if needed
        let counter = 0;
        let candidateUsername = finalUsername;
        while (await this.userRepository.findByUsername(candidateUsername)) {
          counter++;
          candidateUsername = `${finalUsername}${counter}`;
        }
        finalUsername = candidateUsername;
      } else {
        // Check if provided username already exists
        const existingUsername = await this.userRepository.findByUsername(finalUsername);
        if (existingUsername) {
          throw new ValidationException('Username already taken');
        }
      }

      // Hash password
      const hashedPassword = await this.authService.hashPassword(password);

      // Combine firstName and lastName into displayName
      const displayName = `${firstName} ${lastName}`.trim();

      // Create user entity (inactive by default)
      const user = await this.userRepository.save({
        username: finalUsername,
        hashedPassword,
        email,
        displayName,
        avatarUrl,
        phone,
      });

      // Create user profile if bio is provided
      if (bio) {
        const { container } = await import('../../../shared/kernel/container.js');
        const userProfileRepository = container.getUserProfileRepository();

        await userProfileRepository.save({
          userId: user.id,
          bio,
          emailVerified: false,
        });
      }

      // Generate email verification JWT token
      const verificationToken = this.tokenService.generateEmailVerificationToken(
        user.id,
        user.email
      );

      // Send email verification link
      try {
        if (this.emailService) {
          const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
          await this.emailService.sendEmail(
            user.email,
            'Verify Your Email - ABC Dashboard',
            'Hi {{displayName}}! Welcome to ABC Dashboard. Please click the link below to verify your email address:<br><br><a href="{{verificationUrl}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a><br><br>This link will expire in 10 minutes.<br><br>If the button doesn\'t work, copy and paste this URL into your browser:<br>{{verificationUrl}}',
            { displayName: user.displayName, verificationUrl }
          );
        }

        // Log user registration for analytics
        logger.info('New user registered - verification email sent', {
          userId: user.id,
          email: user.email,
          username: finalUsername,
        });
      } catch (error) {
        logger.error('Failed to send verification email:', error);
        // Don't fail registration if email fails
      }

      // Return user data as DTO (no tokens until email is verified)
      return new RegisterResponseDto({
        user: UserAuthDto.fromEntity({ ...user, isActive: false }),
        message: 'Registration successful. Please check your email for verification link.',
        requiresVerification: true,
      });
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof EmailAlreadyExistsException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
}
