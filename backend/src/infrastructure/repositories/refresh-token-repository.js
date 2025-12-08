import { IRefreshTokenRepository } from '../../domain/repositories/interfaces/i-refresh-token-repository.js';
import logger from '../config/logger.js';

export class RefreshTokenRepository extends IRefreshTokenRepository {
  constructor(refreshTokenModel, correlationId = null) {
    super();
    this.RefreshTokenModel = refreshTokenModel;
    this.correlationId = correlationId;
  }

  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
  }

  async saveToken({ userId, tokenHash, expiresAt }) {
    if (!userId || !tokenHash || !expiresAt) {
      throw new Error('userId, tokenHash, and expiresAt are required to save refresh token');
    }

    const doc = new this.RefreshTokenModel({
      userId,
      tokenHash,
      expiresAt,
      revoked: false,
      revokedAt: null,
      replacedByHash: null,
      createdAt: new Date(),
    });

    const saved = await doc.save();
    return saved;
  }

  async findValidByHash(tokenHash) {
    if (!tokenHash) {
      return null;
    }

    const now = new Date();
    return this.RefreshTokenModel.findOne({
      tokenHash,
      revoked: false,
      expiresAt: { $gt: now },
    });
  }

  async revokeByHash(tokenHash, replacedByHash = null) {
    if (!tokenHash) return false;

    const result = await this.RefreshTokenModel.updateOne(
      { tokenHash },
      { revoked: true, revokedAt: new Date(), replacedByHash }
    );

    return result.modifiedCount > 0;
  }

  async revokeAllForUser(userId) {
    if (!userId) return false;

    try {
      const result = await this.RefreshTokenModel.updateMany(
        { userId },
        { revoked: true, revokedAt: new Date() }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Failed to revoke refresh tokens for user', {
        correlationId: this.correlationId,
        userId,
        error: error.message,
      });
      return false;
    }
  }
}
