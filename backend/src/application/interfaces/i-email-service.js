/**
 * Email Service Interface
 * Defines the contract for outbound email operations used by auth/user flows.
 */
export class IEmailService {
  /**
   * Send generic email.
   * @param {string} to
   * @param {string} subject
   * @param {string} template
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async sendEmail(to, subject, template, data) {
    throw new Error('sendEmail not implemented');
  }

  /**
   * Send password reset email.
   * @param {string} email
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async sendPasswordResetEmail(email, payload) {
    throw new Error('sendPasswordResetEmail not implemented');
  }

  /**
   * Send password reset email with generated temporary password.
   * @param {string} email
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async sendPasswordResetWithGeneratedPassword(email, payload) {
    throw new Error('sendPasswordResetWithGeneratedPassword not implemented');
  }

  /**
   * Send password reset confirmation email.
   * @param {string} email
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async sendPasswordResetConfirmationEmail(email, payload) {
    throw new Error('sendPasswordResetConfirmationEmail not implemented');
  }
}

export default IEmailService;
