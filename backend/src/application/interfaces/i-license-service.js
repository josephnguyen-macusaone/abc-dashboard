/**
 * License Service Interface
 * Defines the contract for license business operations
 */
export class ILicenseService {
  /**
   * Get paginated list of licenses with filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated license list
   */
  async getLicenses(options = {}) {
    throw new Error('getLicenses not implemented');
  }

  /**
   * Get license by ID
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} License details
   */
  async getLicenseById(licenseId) {
    throw new Error('getLicenseById not implemented');
  }

  /**
   * Create a new license
   * @param {Object} licenseData - License creation data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created license
   */
  async createLicense(licenseData, context) {
    throw new Error('createLicense not implemented');
  }

  /**
   * Update a license
   * @param {string} licenseId - License ID
   * @param {Object} updates - Update data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Updated license
   */
  async updateLicense(licenseId, updates, context) {
    throw new Error('updateLicense not implemented');
  }

  /**
   * Delete a license
   * @param {string} licenseId - License ID
   * @param {Object} context - Request context
   * @returns {Promise<boolean>} Success status
   */
  async deleteLicense(licenseId, context) {
    throw new Error('deleteLicense not implemented');
  }

  /**
   * Assign license to a user
   * @param {Object} assignmentData - Assignment data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created assignment
   */
  async assignLicense(assignmentData, context) {
    throw new Error('assignLicense not implemented');
  }

  /**
   * Revoke license assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Revoked assignment
   */
  async revokeAssignment(assignmentId, context) {
    throw new Error('revokeAssignment not implemented');
  }

  /**
   * Get license statistics
   * @returns {Promise<Object>} License stats
   */
  async getLicenseStats() {
    throw new Error('getLicenseStats not implemented');
  }

  /**
   * Get audit events for a license
   * @param {string} licenseId - License ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Audit events
   */
  async getAuditEvents(licenseId, options) {
    throw new Error('getAuditEvents not implemented');
  }
}

export default ILicenseService;
