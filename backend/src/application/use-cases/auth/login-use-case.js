/**
 * Login Use Case
 * Handles user authentication logic
 */
import {
  InvalidCredentialsException,
  AccountDeactivatedException,
  ValidationException,
} from '../../../domain/exceptions/domain.exception.js';
import { withTimeout, TimeoutPresets } from '../../../shared/utils/reliability/retry.js';
import { LoginResponseDto, UserAuthDto, TokensDto } from '../../dto/auth/index.js';

export class LoginUseCase {
  constructor(userRepository, authService, tokenService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
  }

  /**
   * Execute login use case
   * @param {{ email: string, password: string }} input - Login credentials
   * @returns {Promise<LoginResponseDto>} Login response with user and tokens
   */
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
        throw new ValidationException(
          'Please verify your email before logging in. Check your email for the verification link.'
        );
      }

      // Verify password with timeout
      const isPasswordValid = await withTimeout(
        () => this.authService.verifyPassword(password, user.hashedPassword),
        TimeoutPresets.QUICK, // Password verification should be fast
        'password_verification'
      );
      if (!isPasswordValid) {
        throw new InvalidCredentialsException();
      }

      // Check if password change is required (first login or password reset)
      const requiresPasswordChange =
        user.isFirstLogin === true || user.requiresPasswordChange === true;

      // Generate tokens
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        requiresPasswordChange,
      });

      const refreshToken = this.tokenService.generateRefreshToken({
        userId: user.id,
      });

      // Return structured DTO response
      return new LoginResponseDto({
        user: UserAuthDto.fromEntity(user),
        tokens: new TokensDto({ accessToken, refreshToken }),
        requiresPasswordChange,
      });
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (
        error instanceof ValidationException ||
        error instanceof InvalidCredentialsException ||
        error instanceof AccountDeactivatedException
      ) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Login failed: ${error.message}`);
    }
  }
}
