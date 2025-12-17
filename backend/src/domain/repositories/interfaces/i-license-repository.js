/**
 * License Repository Interface
 * Defines the contract for license data operations
 */
export class ILicenseRepository {
  // ========================================================================
  // License CRUD Operations
  // ========================================================================

  /**
   * Find license by ID
   * @param {string} id - License ID
   * @returns {Promise<License|null>}
   */
  async findById(id) {
    throw new Error('findById not implemented');
  }

  /**
   * Find license by key
   * @param {string} key - License key
   * @returns {Promise<License|null>}
   */
  async findByKey(key) {
    throw new Error('findByKey not implemented');
  }

  /**
   * Find licenses with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {Object} options.filters - Filter criteria
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort direction (asc/desc)
   * @returns {Promise<{licenses: License[], total: number, page: number, totalPages: number}>}
   */
  async findLicenses(options = {}) {
    throw new Error('findLicenses not implemented');
  }

  /**
   * Create a new license
   * @param {Object} licenseData - License data
   * @returns {Promise<License>}
   */
  async save(licenseData) {
    throw new Error('save not implemented');
  }

  /**
   * Update an existing license
   * @param {string} id - License ID
   * @param {Object} updates - Update data
   * @returns {Promise<License|null>}
   */
  async update(id, updates) {
    throw new Error('update not implemented');
  }

  /**
   * Delete a license
   * @param {string} id - License ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('delete not implemented');
  }

  /**
   * Check if license key exists
   * @param {string} key - License key
   * @param {string} excludeId - Optional ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async keyExists(key, excludeId = null) {
    throw new Error('keyExists not implemented');
  }

  /**
   * Get license statistics
   * @returns {Promise<Object>}
   */
  async getLicenseStats() {
    throw new Error('getLicenseStats not implemented');
  }

  // ========================================================================
  // License Assignment Operations
  // ========================================================================

  /**
   * Assign license to a user
   * @param {Object} assignmentData - Assignment data
   * @param {string} assignmentData.licenseId - License ID
   * @param {string} assignmentData.userId - User ID
   * @param {string} assignmentData.assignedBy - Assigner user ID
   * @returns {Promise<LicenseAssignment>}
   */
  async assignLicense(assignmentData) {
    throw new Error('assignLicense not implemented');
  }

  /**
   * Revoke license assignment
   * @param {string} assignmentId - Assignment ID
   * @param {string} revokedBy - Revoker user ID
   * @returns {Promise<LicenseAssignment|null>}
   */
  async revokeAssignment(assignmentId, revokedBy) {
    throw new Error('revokeAssignment not implemented');
  }

  /**
   * Find license assignment by ID
   * @param {string} id - Assignment ID
   * @returns {Promise<LicenseAssignment|null>}
   */
  async findAssignmentById(id) {
    throw new Error('findAssignmentById not implemented');
  }

  /**
   * Find all assignments for a license
   * @param {string} licenseId - License ID
   * @param {Object} options - Query options
   * @returns {Promise<LicenseAssignment[]>}
   */
  async findAssignmentsByLicense(licenseId, options = {}) {
    throw new Error('findAssignmentsByLicense not implemented');
  }

  /**
   * Find all assignments for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<LicenseAssignment[]>}
   */
  async findAssignmentsByUser(userId, options = {}) {
    throw new Error('findAssignmentsByUser not implemented');
  }

  /**
   * Check if user already has this license assigned
   * @param {string} licenseId - License ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async hasUserAssignment(licenseId, userId) {
    throw new Error('hasUserAssignment not implemented');
  }

  // ========================================================================
  // Audit Event Operations
  // ========================================================================

  /**
   * Create audit event
   * @param {Object} eventData - Event data
   * @param {string} eventData.type - Event type (e.g., 'license.created')
   * @param {string} eventData.actorId - User who performed the action
   * @param {string} eventData.entityId - License or assignment ID
   * @param {string} eventData.entityType - 'license' or 'assignment'
   * @param {Object} eventData.metadata - Additional event data
   * @param {string} eventData.ipAddress - IP address
   * @param {string} eventData.userAgent - User agent
   * @returns {Promise<LicenseAuditEvent>}
   */
  async createAuditEvent(eventData) {
    throw new Error('createAuditEvent not implemented');
  }

  /**
   * Find audit events for a license
   * @param {string} licenseId - License ID
   * @param {Object} options - Query options
   * @returns {Promise<{events: LicenseAuditEvent[], total: number}>}
   */
  async findAuditEvents(licenseId, options = {}) {
    throw new Error('findAuditEvents not implemented');
  }

  /**
   * Find all audit events with filtering
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {Object} options.filters - Filter criteria
   * @returns {Promise<{events: LicenseAuditEvent[], total: number, page: number, totalPages: number}>}
   */
  async findAllAuditEvents(options = {}) {
    throw new Error('findAllAuditEvents not implemented');
  }

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /**
   * Bulk create licenses
   * @param {Object[]} licensesData - Array of license data
   * @returns {Promise<License[]>}
   */
  async bulkCreate(licensesData) {
    throw new Error('bulkCreate not implemented');
  }

  /**
   * Bulk update licenses
   * @param {Object[]} updates - Array of {id, updates} objects
   * @returns {Promise<License[]>}
   */
  async bulkUpdate(updates) {
    throw new Error('bulkUpdate not implemented');
  }

  /**
   * Bulk delete licenses
   * @param {string[]} ids - Array of license IDs
   * @returns {Promise<number>} Number of deleted licenses
   */
  async bulkDelete(ids) {
    throw new Error('bulkDelete not implemented');
  }

  // ========================================================================
  // Advanced Query Operations
  // ========================================================================

  /**
   * Find expiring licenses
   * @param {number} daysThreshold - Number of days until expiry
   * @returns {Promise<License[]>}
   */
  async findExpiringLicenses(daysThreshold = 30) {
    throw new Error('findExpiringLicenses not implemented');
  }

  /**
   * Find expired licenses
   * @returns {Promise<License[]>}
   */
  async findExpiredLicenses() {
    throw new Error('findExpiredLicenses not implemented');
  }

  /**
   * Find licenses by organization (DBA)
   * @param {string} dba - Organization name
   * @returns {Promise<License[]>}
   */
  async findLicensesByOrganization(dba) {
    throw new Error('findLicensesByOrganization not implemented');
  }

  /**
   * Get licenses with low seat availability
   * @param {number} threshold - Utilization percentage threshold (e.g., 80)
   * @returns {Promise<License[]>}
   */
  async findLicensesWithLowSeats(threshold = 80) {
    throw new Error('findLicensesWithLowSeats not implemented');
  }
}


