/**
 * Auth Service Interface
 * Defines the contract for authentication operations
 */

/**
 * @interface IAuthService
 */
export class IAuthService {
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    throw new Error('Method not implemented: hashPassword');
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password to compare
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hashedPassword) {
    throw new Error('Method not implemented: verifyPassword');
  }

  /**
   * Generate a random OTP (One-Time Password)
   * @param {number} length - Length of OTP (default: 6)
   * @returns {string} Random OTP
   */
  generateOtp(length = 6) {
    throw new Error('Method not implemented: generateOtp');
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {{ isValid: boolean, errors: string[] }} Validation result
   */
  validatePasswordStrength(password) {
    throw new Error('Method not implemented: validatePasswordStrength');
  }
}

export default IAuthService;
