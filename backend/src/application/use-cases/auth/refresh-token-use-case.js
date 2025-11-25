/**
 * Refresh Token Use Case
 * Handles refresh token validation and new access token generation
 */
import {
  ValidationException,
  InvalidCredentialsException
} from '../../../domain/exceptions/domain.exception.js';

export class RefreshTokenUseCase {
  constructor(userRepository, tokenService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async execute({ refreshToken }) {
    try {
      // Validate input
      if (!refreshToken) {
        throw new ValidationException('Refresh token is required');
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = this.tokenService.verifyToken(refreshToken, 'your-app-refresh');
      } catch (error) {
        throw new InvalidCredentialsException('Invalid or expired refresh token');
      }

      // Find user by ID from token
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new InvalidCredentialsException('User not found');
      }

      // Generate new access token
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email
      });

      // Optionally generate a new refresh token (rotate refresh tokens)
      const newRefreshToken = this.tokenService.generateRefreshToken({
        userId: user.id
      });

      // Return new tokens
      return {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException ||
          error instanceof InvalidCredentialsException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Refresh token failed: ${error.message}`);
    }
  }
}

