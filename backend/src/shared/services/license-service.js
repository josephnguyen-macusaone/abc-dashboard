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
import {
  ValidationException,
  ConcurrentModificationException,
} from '../../domain/exceptions/domain.exception.js';
import logger from '../utils/logger.js';

const LICENSE_BULK_UPDATE_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    return this.createLicenseUseCase.execute(licenseData, context);
  }

  /**
   * Update a license
   * @param {string} licenseId - License ID
   * @param {Object} updates - Update data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Updated license
   */
  async updateLicense(licenseId, updates, context) {
    return this.updateLicenseUseCase.execute(licenseId, updates, context);
  }

  /**
   * Delete a license
   * @param {string} licenseId - License ID
   * @param {Object} context - Request context
   * @returns {Promise<boolean>} Success status
   */
  async deleteLicense(licenseId, context) {
    return this.deleteLicenseUseCase.execute(licenseId, context);
  }

  /**
   * Assign license to a user
   * @param {Object} assignmentData - Assignment data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created assignment
   */
  async assignLicense(assignmentData, context) {
    return this.assignLicenseUseCase.execute(assignmentData, context);
  }

  /**
   * Revoke license assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Revoked assignment
   */
  async revokeAssignment(assignmentId, context) {
    return this.revokeLicenseAssignmentUseCase.execute(assignmentId, context);
  }

  /**
   * Get license statistics
   * @returns {Promise<Object>} License stats
   */
  async getLicenseStats() {
    return this.getLicenseStatsUseCase.execute();
  }

  /**
   * Get dashboard metrics with trends and comparisons
   * @param {Object} options - Filter options (date range, etc.)
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getDashboardMetrics(options = {}) {
    return this.getDashboardMetricsUseCase.execute(options);
  }

  /**
   * Bulk create licenses
   * @param {Array} licensesData - Array of license data
   * @param {Object} [context] - Request context (userId, userRole, ipAddress, userAgent). When set, used for audit and createdBy; else falls back to payload createdBy/updatedBy.
   * @returns {Promise<{ createdLicenses: Array, errors: Array }>}
   */
  async bulkCreateLicenses(licensesData, context = {}) {
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
        const actorFromRequest =
          context.userId && typeof context.userId === 'string' && context.userId.trim() !== ''
            ? context.userId
            : undefined;
        const fromPayload = licenseData.createdBy || licenseData.updatedBy;
        const validFromPayload =
          fromPayload && typeof fromPayload === 'string' && fromPayload.trim() !== ''
            ? fromPayload
            : undefined;
        const validUserId = actorFromRequest || validFromPayload;

        // Remove createdBy/updatedBy from licenseData to prevent FK violations
        // The use case will handle setting these based on context
        const { createdBy, updatedBy, ...cleanLicenseData } = licenseData;

        const createdLicense = await this.createLicenseUseCase.execute(cleanLicenseData, {
          userId: validUserId,
          userRole: context.userRole,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
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
   * Resolve license by UUID id or by license key (non-UUID string).
   * @param {string} id
   * @returns {Promise<object|undefined>}
   */
  async _findLicenseForBulkUpdate(id) {
    let existing = await this.licenseRepository.findById(id);
    if (!existing && typeof id === 'string' && !LICENSE_BULK_UPDATE_UUID_REGEX.test(id)) {
      existing = await this.licenseRepository.findByKey(id);
    }
    return existing;
  }

  /**
   * @param {Object} context
   * @returns {string|undefined}
   */
  _actorUserIdFromContext(context) {
    const { userId } = context;
    return userId && typeof userId === 'string' && userId.trim() !== '' ? userId : undefined;
  }

  /**
   * @returns {Promise<{ ok: true, license: object } | { notFound: true }>}
   */
  async _executeOneBulkLicenseUpdate(id, data, context) {
    const existing = await this._findLicenseForBulkUpdate(id);
    if (!existing) {
      return { notFound: true };
    }
    const license = await this.updateLicenseUseCase.execute(existing.id, data, {
      userId: this._actorUserIdFromContext(context),
      userRole: context.userRole,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expectedUpdatedAt: data?.expectedUpdatedAt || data?.updatedAt,
    });
    return { ok: true, license };
  }

  /**
   * Bulk update licenses
   * @param {Array} updates - Array of license updates
   * @param {Object} [context] - Authenticated request context (userId, userRole, ipAddress, userAgent) for updatedBy + audit
   * @returns {Promise<Array>} Updated licenses
   */
  async bulkUpdateLicenses(updates, context = {}) {
    const updatedLicenses = [];
    const errors = [];
    const conflicts = [];
    const startTime = Date.now();

    for (const [index, { id, updates: data }] of updates.entries()) {
      try {
        const result = await this._executeOneBulkLicenseUpdate(id, data, context);
        if (result.notFound) {
          errors.push({ index, key: id, error: 'License not found' });
          continue;
        }
        updatedLicenses.push(result.license);
      } catch (error) {
        if (error instanceof ConcurrentModificationException) {
          conflicts.push({
            index,
            key: id,
            ...(error.additionalData || {}),
          });
          continue;
        }
        logger.warn('Individual license update failed in bulk operation', {
          index,
          key: id,
          error: error.message,
        });
        errors.push({ index, key: id, error: error.message });
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

    if (conflicts.length > 0) {
      throw new ConcurrentModificationException('License', {
        conflicts,
        updatedCount: updatedLicenses.length,
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
    return this.licenseRepository.findAuditEvents(licenseId, options);
  }

  /**
   * Bulk delete licenses by IDs
   * @param {string[]} ids - License IDs to delete
   * @param {Object} [context] - Request context for bulk-delete audit rows
   * @returns {Promise<number>} Number of licenses deleted
   */
  async bulkDelete(ids, context = {}) {
    return this.licenseRepository.bulkDelete(ids, context);
  }

  /**
   * Get all unique agent names from licenses
   * @returns {Promise<string[]>} Array of unique agent names
   */
  async getAllAgentNames() {
    return this.licenseRepository.getAllAgentNames();
  }
}

export default LicenseService;
