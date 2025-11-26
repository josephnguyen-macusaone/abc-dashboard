/**
 * Login Use Case
 * Handles user authentication logic
 */
import {
  InvalidCredentialsException,
  AccountDeactivatedException,
  ValidationException
} from '../../../domain/exceptions/domain.exception.js';

export class LoginUseCase {
  constructor(userRepository, authService, tokenService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
  }

  async execute({ email, password }) {
    try {
      // Validate input
      if (!email || !password) {
        throw new ValidationException('Email and password are required');
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new InvalidCredentialsException();
      }

      // Check if account is active
      if (!user.isActive) {
        throw new ValidationException('Please verify your email before logging in. Check your email for the verification link.');
      }

      // Verify password
      const isPasswordValid = await this.authService.verifyPassword(password, user.hashedPassword);
      if (!isPasswordValid) {
        throw new InvalidCredentialsException();
      }

      // Generate tokens
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email
      });

      const refreshToken = this.tokenService.generateRefreshToken({
        userId: user.id
      });

      // Return user data and tokens
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          phone: user.phone,
          createdAt: user.createdAt
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException ||
          error instanceof InvalidCredentialsException ||
          error instanceof AccountDeactivatedException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Login failed: ${error.message}`);
    }
  }
}
