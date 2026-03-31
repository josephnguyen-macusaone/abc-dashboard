/**
 * Token Service Interface
 * Defines the contract for JWT and token utility operations.
 */
export class ITokenService {
  /**
   * Generate access token.
   * @param {Object} payload
   * @returns {string}
   */
  generateAccessToken(payload) {
    throw new Error('generateAccessToken not implemented');
  }

  /**
   * Generate refresh token.
   * @param {Object} payload
   * @returns {string}
   */
  generateRefreshToken(payload) {
    throw new Error('generateRefreshToken not implemented');
  }

  /**
   * Hash token value.
   * @param {string} token
   * @returns {string}
   */
  hashToken(token) {
    throw new Error('hashToken not implemented');
  }

  /**
   * Verify refresh/access token.
   * @param {string} token
   * @returns {Object}
   */
  verifyToken(token) {
    throw new Error('verifyToken not implemented');
  }

  /**
   * Generate password reset token.
   * @param {string} userId
   * @param {string} email
   * @returns {string}
   */
  generatePasswordResetToken(userId, email) {
    throw new Error('generatePasswordResetToken not implemented');
  }

  /**
   * Verify password reset token.
   * @param {string} token
   * @returns {Object}
   */
  verifyPasswordResetToken(token) {
    throw new Error('verifyPasswordResetToken not implemented');
  }
}

export default ITokenService;
