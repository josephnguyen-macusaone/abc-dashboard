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

      if (decoded.type !== 'refresh') {
        throw new InvalidRefreshTokenException();
      }

      // Verify the token exists in our store (SEC-4: revocation check)
      const tokenHash = this.tokenService.hashToken(refreshToken);
      const stored = await this.userRepository.findRefreshToken(tokenHash);
      if (!stored) {
        throw new InvalidRefreshTokenException();
      }

      const user = await this.userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new InvalidCredentialsException();
      }

      // Rotate: revoke the old token, issue a new one (token rotation)
      await this.userRepository.revokeRefreshToken(tokenHash);

      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        requiresPasswordChange: user.requiresPasswordChange,
      });

      const newRefreshToken = this.tokenService.generateRefreshToken({ userId: user.id });
      const newHash = this.tokenService.hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.userRepository.storeRefreshToken(user.id, newHash, expiresAt);

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
      throw new Error(`Refresh token failed: ${error.message}`, { cause: error });
    }
  }
}
