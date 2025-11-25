import bcrypt from 'bcryptjs';

/**
 * Authentication Service
 * Handles password hashing and verification
 */
export class AuthService {
  constructor() {
    this.saltRounds = 12;
  }

  /**
   * Hash a plain password
   * @param {string} password - Plain password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  /**
   * Verify a password against its hash
   * @param {string} plainPassword - Plain password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }
}
