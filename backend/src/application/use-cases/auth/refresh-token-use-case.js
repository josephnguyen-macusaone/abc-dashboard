/**
 * Refresh Token Use Case
 * Handles refresh token validation and new access token generation
 */
import {
  ValidationException,
  InvalidCredentialsException,
} from '../../../domain/exceptions/domain.exception.js';
import { TokensDto } from '../../dto/auth/index.js';

export class RefreshTokenUseCase {
  constructor(userRepository, tokenService, refreshTokenRepository) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.refreshTokenRepository = refreshTokenRepository;
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
        throw new InvalidCredentialsException('Invalid or expired refresh token');
      }

      // Ensure token exists in storage and is not revoked/expired
      const tokenHash = this.tokenService.hashToken(refreshToken);
      const storedToken = await this.refreshTokenRepository.findValidByHash(tokenHash);
      if (!storedToken) {
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
        email: user.email,
      });

      // Optionally generate a new refresh token (rotate refresh tokens)
      const newRefreshToken = this.tokenService.generateRefreshToken({ userId: user.id });

      // Persist rotated refresh token and revoke the old one
      try {
        const decodedNewRefresh = this.tokenService.verifyToken(newRefreshToken);
        const newRefreshHash = this.tokenService.hashToken(newRefreshToken);
        const newExpiresAt = decodedNewRefresh?.exp
          ? new Date(decodedNewRefresh.exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await this.refreshTokenRepository.saveToken({
          userId: user.id,
          tokenHash: newRefreshHash,
          expiresAt: newExpiresAt,
        });

        await this.refreshTokenRepository.revokeByHash(tokenHash, newRefreshHash);
      } catch (persistError) {
        throw new Error(`Refresh token rotation failed: ${persistError.message}`);
      }

      // Return new tokens as DTO
      return {
        tokens: new TokensDto({ accessToken, refreshToken: newRefreshToken }),
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof InvalidCredentialsException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Refresh token failed: ${error.message}`);
    }
  }
}
