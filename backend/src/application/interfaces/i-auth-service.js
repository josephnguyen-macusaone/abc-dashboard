/**
 * Auth Service Interface
 * Defines the contract for password and auth helper operations.
 */
export class IAuthService {
  /**
   * Hash a plain-text password.
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashPassword(password) {
    throw new Error('hashPassword not implemented');
  }

  /**
   * Verify plain-text password against hashed password.
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword, hashedPassword) {
    throw new Error('verifyPassword not implemented');
  }

  /**
   * Generate a temporary password.
   * @returns {string}
   */
  generateTemporaryPassword() {
    throw new Error('generateTemporaryPassword not implemented');
  }
}

export default IAuthService;
