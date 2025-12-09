/**
 * Refresh Token Use Case
 * Handles refresh token validation and new access token generation
 */
import {
  ValidationException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../../../domain/exceptions/domain.exception.js';
import { TokensDto } from '../../dto/auth/index.js';

export class RefreshTokenUseCase {
  constructor(userRepository, tokenService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  /**
   * Execute refresh token use case
   * @param {{ refreshToken: string }} input - Refresh token
   * @returns {Promise<{ tokens: TokensDto }>} New tokens
   */
  async execute({ refreshToken }) {
    try {
      // Validate input
      if (!refreshToken) {
        throw new ValidationException('Refresh token is required');
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = this.tokenService.verifyToken(refreshToken);
      } catch (_error) {
        throw new InvalidRefreshTokenException();
      }

      // Validate token type - ensure it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new InvalidRefreshTokenException();
      }

      // Find user by ID from token
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new InvalidCredentialsException();
      }

      // Check if account is still active
      if (!user.isActive) {
        throw new InvalidCredentialsException();
      }

      // Generate new access token
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        requiresPasswordChange: user.requiresPasswordChange,
      });

      // Generate new refresh token (token rotation for security)
      const newRefreshToken = this.tokenService.generateRefreshToken({ userId: user.id });

      // Return new tokens as DTO
      return {
        tokens: new TokensDto({ accessToken, refreshToken: newRefreshToken }),
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (
        error instanceof ValidationException ||
        error instanceof InvalidCredentialsException ||
        error instanceof InvalidRefreshTokenException
      ) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Refresh token failed: ${error.message}`);
    }
  }
}
