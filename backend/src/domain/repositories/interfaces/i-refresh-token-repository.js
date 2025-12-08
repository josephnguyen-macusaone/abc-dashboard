/**
 * Refresh Token Repository Interface
 * Defines storage/rotation for refresh tokens
 */
export class IRefreshTokenRepository {
  async saveToken(token) {
    throw new Error('Method not implemented');
  }

  async findValidByHash(tokenHash) {
    throw new Error('Method not implemented');
  }

  async revokeByHash(tokenHash, replacedByHash = null) {
    throw new Error('Method not implemented');
  }

  async revokeAllForUser(userId) {
    throw new Error('Method not implemented');
  }
}
