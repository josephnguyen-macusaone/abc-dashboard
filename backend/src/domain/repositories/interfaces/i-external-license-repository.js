/**
 * External License Repository Interface
 * Defines the contract for external license data operations
 * This repository manages licenses synced from the external API
 */
export class IExternalLicenseRepository {
  // ========================================================================
  // License CRUD Operations
  // ========================================================================

  /**
   * Find external license by ID
   * @param {string} id - License ID
   * @returns {Promise<ExternalLicense|null>}
   */
  async findById(id) {
    throw new Error('findById not implemented');
  }

  /**
   * Find external license by appid
   * @param {string} appid - App ID
   * @returns {Promise<ExternalLicense|null>}
   */
  async findByAppId(appid) {
    throw new Error('findByAppId not implemented');
  }

  /**
   * Find external license by email
   * @param {string} email - Email license
   * @returns {Promise<ExternalLicense|null>}
   */
  async findByEmail(email) {
    throw new Error('findByEmail not implemented');
  }

  /**
   * Find external license by countid
   * @param {number} countid - Count ID
   * @returns {Promise<ExternalLicense|null>}
   */
  async findByCountId(countid) {
    throw new Error('findByCountId not implemented');
  }

  /**
   * Find external licenses with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {Object} options.filters - Filter criteria
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort direction (asc/desc)
   * @returns {Promise<{licenses: ExternalLicense[], total: number, page: number, totalPages: number}>}
   */
  async findLicenses(options = {}) {
    throw new Error('findLicenses not implemented');
  }

  /**
   * Create or update external license (upsert)
   * @param {Object} licenseData - License data
   * @returns {Promise<ExternalLicense>}
   */
  async upsert(licenseData) {
    throw new Error('upsert not implemented');
  }

  /**
   * Update an existing external license
   * @param {string} id - License ID
   * @param {Object} updates - Update data
   * @returns {Promise<ExternalLicense|null>}
   */
  async update(id, updates) {
    throw new Error('update not implemented');
  }

  /**
   * Delete an external license
   * @param {string} id - License ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('delete not implemented');
  }

  /**
   * Check if license exists by appid
   * @param {string} appid - App ID
   * @param {string} excludeId - Optional ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async existsByAppId(appid, excludeId = null) {
    throw new Error('existsByAppId not implemented');
  }

  // ========================================================================
  // Sync Operations
  // ========================================================================

  /**
   * Mark license as synced
   * @param {string} id - License ID
   * @param {Date} syncedAt - Sync timestamp
   * @returns {Promise<boolean>}
   */
  async markSynced(id, syncedAt) {
    throw new Error('markSynced not implemented');
  }

  /**
   * Mark license sync as failed
   * @param {string} id - License ID
   * @param {string} error - Error message
   * @returns {Promise<boolean>}
   */
  async markSyncFailed(id, error) {
    throw new Error('markSyncFailed not implemented');
  }

  /**
   * Get licenses that need sync (pending or failed)
   * @param {Object} options - Query options
   * @returns {Promise<ExternalLicense[]>}
   */
  async findLicensesNeedingSync(options = {}) {
    throw new Error('findLicensesNeedingSync not implemented');
  }

  /**
   * Get sync statistics
   * @returns {Promise<Object>}
   */
  async getSyncStats() {
    throw new Error('getSyncStats not implemented');
  }

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /**
   * Bulk upsert licenses
   * @param {Object[]} licensesData - Array of license data
   * @returns {Promise<{created: number, updated: number, errors: Object[]}>}
   */
  async bulkUpsert(licensesData) {
    throw new Error('bulkUpsert not implemented');
  }

  /**
   * Bulk update licenses
   * @param {Object[]} updates - Array of {id, updates} objects
   * @returns {Promise<ExternalLicense[]>}
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

  /**
   * Bulk mark licenses as synced
   * @param {string[]} ids - Array of license IDs
   * @param {Date} syncedAt - Sync timestamp
   * @returns {Promise<number>} Number of licenses marked as synced
   */
  async bulkMarkSynced(ids, syncedAt) {
    throw new Error('bulkMarkSynced not implemented');
  }

  // ========================================================================
  // Advanced Query Operations
  // ========================================================================

  /**
   * Find expired external licenses
   * @returns {Promise<ExternalLicense[]>}
   */
  async findExpiredLicenses() {
    throw new Error('findExpiredLicenses not implemented');
  }

  /**
   * Find licenses expiring soon
   * @param {number} daysThreshold - Days until expiry
   * @returns {Promise<ExternalLicense[]>}
   */
  async findExpiringSoonLicenses(daysThreshold = 30) {
    throw new Error('findExpiringSoonLicenses not implemented');
  }

  /**
   * Find licenses by organization (DBA)
   * @param {string} dba - Organization name
   * @returns {Promise<ExternalLicense[]>}
   */
  async findLicensesByOrganization(dba) {
    throw new Error('findLicensesByOrganization not implemented');
  }

  /**
   * Get license statistics
   * @returns {Promise<Object>}
   */
  async getLicenseStats() {
    throw new Error('getLicenseStats not implemented');
  }
}