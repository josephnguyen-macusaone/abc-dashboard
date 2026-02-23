/**
 * License Service Implementation
 * Orchestrates license business operations using use cases
 */
import { ILicenseService } from '../../application/interfaces/i-license-service.js';
import { GetLicensesUseCase } from '../../application/use-cases/licenses/get-licenses-use-case.js';
import { CreateLicenseUseCase } from '../../application/use-cases/licenses/create-license-use-case.js';
import { UpdateLicenseUseCase } from '../../application/use-cases/licenses/update-license-use-case.js';
import { DeleteLicenseUseCase } from '../../application/use-cases/licenses/delete-license-use-case.js';
import { AssignLicenseUseCase } from '../../application/use-cases/licenses/assign-license-use-case.js';
import { RevokeLicenseAssignmentUseCase } from '../../application/use-cases/licenses/revoke-license-assignment-use-case.js';
import { GetLicenseStatsUseCase } from '../../application/use-cases/licenses/get-license-stats-use-case.js';
import { GetLicenseDashboardMetricsUseCase } from '../../application/use-cases/licenses/get-license-dashboard-metrics-use-case.js';
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import logger from '../../infrastructure/config/logger.js';

export class LicenseService extends ILicenseService {
  constructor(licenseRepository, userRepository, externalLicenseRepository = null) {
    super();
    this.licenseRepository = licenseRepository;
    this.userRepository = userRepository;
    this.externalLicenseRepository = externalLicenseRepository;

    // Initialize use cases (inject external repo for enrichment merge)
    this.getLicensesUseCase = new GetLicensesUseCase(licenseRepository, externalLicenseRepository);
    this.createLicenseUseCase = new CreateLicenseUseCase(licenseRepository);
    this.updateLicenseUseCase = new UpdateLicenseUseCase(licenseRepository);
    this.deleteLicenseUseCase = new DeleteLicenseUseCase(licenseRepository);
    this.assignLicenseUseCase = new AssignLicenseUseCase(licenseRepository, userRepository);
    this.revokeLicenseAssignmentUseCase = new RevokeLicenseAssignmentUseCase(licenseRepository);
    this.getLicenseStatsUseCase = new GetLicenseStatsUseCase(licenseRepository);
    this.getDashboardMetricsUseCase = new GetLicenseDashboardMetricsUseCase(licenseRepository);
  }

  /**
   * Get paginated list of licenses with filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated license list
   */
  async getLicenses(options = {}) {
    logger.debug('LicenseService.getLicenses called', {
      hasFilters: !!(options.filters && Object.keys(options.filters).length > 0),
      filters: Object.keys(options.filters || {}),
      page: options.page,
      limit: options.limit,
    });

    const result = await this.getLicensesUseCase.execute(options);

    logger.debug('LicenseService.getLicenses returning', {
      dataLength: result?.licenses?.length || 0,
      total: result?.total,
      totalPages: result?.pagination?.totalPages,
    });

    return result;
  }

  /**
   * Get license by ID
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} License details
   */
  async getLicenseById(licenseId) {
    const license = await this.licenseRepository.findById(licenseId);
    if (!license) {
      throw new Error('License not found');
    }
    return license.toJSON();
  }

  /**
   * Create a new license
   * @param {Object} licenseData - License creation data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created license
   */
  async createLicense(licenseData, context) {
    return await this.createLicenseUseCase.execute(licenseData, context);
  }

  /**
   * Update a license
   * @param {string} licenseId - License ID
   * @param {Object} updates - Update data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Updated license
   */
  async updateLicense(licenseId, updates, context) {
    return await this.updateLicenseUseCase.execute(licenseId, updates, context);
  }

  /**
   * Delete a license
   * @param {string} licenseId - License ID
   * @param {Object} context - Request context
   * @returns {Promise<boolean>} Success status
   */
  async deleteLicense(licenseId, context) {
    return await this.deleteLicenseUseCase.execute(licenseId, context);
  }

  /**
   * Assign license to a user
   * @param {Object} assignmentData - Assignment data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created assignment
   */
  async assignLicense(assignmentData, context) {
    return await this.assignLicenseUseCase.execute(assignmentData, context);
  }

  /**
   * Revoke license assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Revoked assignment
   */
  async revokeAssignment(assignmentId, context) {
    return await this.revokeLicenseAssignmentUseCase.execute(assignmentId, context);
  }

  /**
   * Get license statistics
   * @returns {Promise<Object>} License stats
   */
  async getLicenseStats() {
    return await this.getLicenseStatsUseCase.execute();
  }

  /**
   * Get dashboard metrics with trends and comparisons
   * @param {Object} options - Filter options (date range, etc.)
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getDashboardMetrics(options = {}) {
    return await this.getDashboardMetricsUseCase.execute(options);
  }

  /**
   * Bulk create licenses
   * @param {Array} licensesData - Array of license data
   * @returns {Promise<Array>} Created licenses
   */
  async bulkCreateLicenses(licensesData) {
    const createdLicenses = [];
    const errors = [];
    const startTime = Date.now();

    // Validate batch size (prevent excessive memory usage)
    const MAX_BATCH_SIZE = 1000;
    if (licensesData.length > MAX_BATCH_SIZE) {
      throw new ValidationException(
        `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE} licenses`
      );
    }

    // Process each license using the proper create use case for validation and audit
    for (const [index, licenseData] of licensesData.entries()) {
      try {
        // Extract userId - only use if it's a valid string
        // For bulk operations from frontend/sync, this is typically undefined
        const userId = licenseData.createdBy || licenseData.updatedBy;
        const validUserId =
          userId && typeof userId === 'string' && userId.trim() !== '' ? userId : undefined;

        // Remove createdBy/updatedBy from licenseData to prevent FK violations
        // The use case will handle setting these based on context
        const { createdBy, updatedBy, ...cleanLicenseData } = licenseData;

        const createdLicense = await this.createLicenseUseCase.execute(cleanLicenseData, {
          userId: validUserId,
        });

        createdLicenses.push(createdLicense);
      } catch (error) {
        logger.warn('Individual license creation failed in bulk operation', {
          index,
          key: licenseData.key,
          error: error.message,
        });

        errors.push({
          index,
          key: licenseData.key,
          error: error.message,
        });

        // Continue with other licenses instead of failing the whole batch
      }
    }

    const duration = Date.now() - startTime;

    // Log performance metrics
    logger.info('Bulk create completed via use cases', {
      total: licensesData.length,
      successful: createdLicenses.length,
      failed: errors.length,
      duration: `${duration}ms`,
      avgTimePerLicense:
        licensesData.length > 0 ? `${(duration / licensesData.length).toFixed(2)}ms` : 'N/A',
    });

    if (errors.length > 0) {
      logger.warn('Some licenses failed to create in bulk operation', {
        failedCount: errors.length,
        errorSample: errors.slice(0, 3).map((e) => ({ key: e.key, error: e.error })),
      });
    }

    return { createdLicenses, errors };
  }

  /**
   * Bulk update licenses
   * @param {Array} updates - Array of license updates
   * @returns {Promise<Array>} Updated licenses
   */
  async bulkUpdateLicenses(updates) {
    const updatedLicenses = [];
    const errors = [];
    const startTime = Date.now();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Process each update using the proper update use case for validation and audit
    for (const [index, { id, updates: data }] of updates.entries()) {
      try {
        // Resolve id to license: accept UUID or license key (e.g. from external API)
        let existingLicense = await this.licenseRepository.findById(id);
        if (!existingLicense && typeof id === 'string' && !uuidRegex.test(id)) {
          existingLicense = await this.licenseRepository.findByKey(id);
        }
        if (!existingLicense) {
          errors.push({
            index,
            key: id,
            error: 'License not found',
          });
          continue;
        }

        // Merge existing data with updates
        const licenseData = { ...existingLicense, ...data };

        // Use the update use case for proper validation and audit logging
        const userId = licenseData.updatedBy;
        const updatedLicense = await this.updateLicenseUseCase.execute(existingLicense.id, data, {
          userId,
        });

        updatedLicenses.push(updatedLicense);
      } catch (error) {
        logger.warn('Individual license update failed in bulk operation', {
          index,
          key: id,
          error: error.message,
        });

        errors.push({
          index,
          key: id,
          error: error.message,
        });

        // Continue with other updates instead of failing the whole batch
      }
    }

    const duration = Date.now() - startTime;

    // Log performance metrics
    logger.info('Bulk update completed via use cases', {
      total: updates.length,
      successful: updatedLicenses.length,
      failed: errors.length,
      duration: `${duration}ms`,
      avgTimePerLicense: updates.length > 0 ? `${(duration / updates.length).toFixed(2)}ms` : 'N/A',
    });

    if (errors.length > 0) {
      logger.warn('Some licenses failed to update in bulk operation', {
        failedCount: errors.length,
        errorSample: errors.slice(0, 3).map((e) => ({ key: e.key, error: e.error })),
      });
    }

    return updatedLicenses;
  }

  /**
   * Get audit events for a license
   * @param {string} licenseId - License ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Audit events
   */
  async getAuditEvents(licenseId, options) {
    return await this.licenseRepository.findAuditEvents(licenseId, options);
  }

  /**
   * Bulk delete licenses by IDs
   * @param {string[]} ids - License IDs to delete
   * @returns {Promise<number>} Number of licenses deleted
   */
  async bulkDelete(ids) {
    return this.licenseRepository.bulkDelete(ids);
  }

  /**
   * Get all unique agent names from licenses
   * @returns {Promise<string[]>} Array of unique agent names
   */
  async getAllAgentNames() {
    return await this.licenseRepository.getAllAgentNames();
  }
}

export default LicenseService;
