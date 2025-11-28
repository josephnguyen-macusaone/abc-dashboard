/**
 * Email Service Interface
 * Defines the contract for email operations
 */

/**
 * @interface IEmailService
 */
export class IEmailService {
  /**
   * Send verification email
   * @param {string} email - Recipient email address
   * @param {string} username - User's username
   * @param {string} token - Verification token
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendVerificationEmail(email, username, token) {
    throw new Error('Method not implemented: sendVerificationEmail');
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email address
   * @param {string} username - User's username
   * @param {string} token - Reset token
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendPasswordResetEmail(email, username, token) {
    throw new Error('Method not implemented: sendPasswordResetEmail');
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email address
   * @param {string} username - User's username
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendWelcomeEmail(email, username) {
    throw new Error('Method not implemented: sendWelcomeEmail');
  }

  /**
   * Send temporary password email
   * @param {string} email - Recipient email address
   * @param {string} username - User's username
   * @param {string} temporaryPassword - Temporary password
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendTemporaryPasswordEmail(email, username, temporaryPassword) {
    throw new Error('Method not implemented: sendTemporaryPasswordEmail');
  }

  /**
   * Send generic email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendEmail(options) {
    throw new Error('Method not implemented: sendEmail');
  }
}

export default IEmailService;
