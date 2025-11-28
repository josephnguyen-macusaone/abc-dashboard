/**
 * Token Service Interface
 * Defines the contract for JWT token operations
 */

/**
 * @interface ITokenService
 */
export class ITokenService {
  /**
   * Generate access token
   * @param {Object} payload - Token payload (userId, email, etc.)
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    throw new Error('Method not implemented: generateAccessToken');
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload (userId)
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    throw new Error('Method not implemented: generateRefreshToken');
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} payload - Token payload
   * @returns {{ accessToken: string, refreshToken: string }} Token pair
   */
  generateTokens(payload) {
    throw new Error('Method not implemented: generateTokens');
  }

  /**
   * Verify access token
   * @param {string} token - JWT access token
   * @returns {Object} Decoded payload
   * @throws {InvalidTokenException} If token is invalid
   * @throws {TokenExpiredException} If token is expired
   */
  verifyAccessToken(token) {
    throw new Error('Method not implemented: verifyAccessToken');
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} Decoded payload
   * @throws {InvalidTokenException} If token is invalid
   * @throws {TokenExpiredException} If token is expired
   */
  verifyRefreshToken(token) {
    throw new Error('Method not implemented: verifyRefreshToken');
  }

  /**
   * Generate email verification token
   * @param {Object} payload - Token payload (userId, email)
   * @returns {string} JWT verification token
   */
  generateEmailVerificationToken(payload) {
    throw new Error('Method not implemented: generateEmailVerificationToken');
  }

  /**
   * Verify email verification token
   * @param {string} token - JWT verification token
   * @returns {Object} Decoded payload
   */
  verifyEmailVerificationToken(token) {
    throw new Error('Method not implemented: verifyEmailVerificationToken');
  }

  /**
   * Generate password reset token
   * @param {Object} payload - Token payload (userId, email)
   * @returns {string} JWT reset token
   */
  generatePasswordResetToken(payload) {
    throw new Error('Method not implemented: generatePasswordResetToken');
  }

  /**
   * Verify password reset token
   * @param {string} token - JWT reset token
   * @returns {Object} Decoded payload
   */
  verifyPasswordResetToken(token) {
    throw new Error('Method not implemented: verifyPasswordResetToken');
  }
}

export default ITokenService;
