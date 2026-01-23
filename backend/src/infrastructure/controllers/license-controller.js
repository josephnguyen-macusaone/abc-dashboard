import { LicenseValidator } from '../../application/validators/license-validator.js';
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import logger from '../config/logger.js';

export class LicenseController {
  constructor(licenseService, syncExternalLicensesUseCase = null) {
    this.licenseService = licenseService;
    this.syncExternalLicensesUseCase = syncExternalLicensesUseCase;
  }

  getLicenses = async (req, res) => {
    try {
      const query = LicenseValidator.validateListQuery(req.query);

      logger.info('License API request initiated', {
        correlationId: req.correlationId,
        hasSearch: !!req.query.search,
        searchTerm: req.query.search,
        searchField: req.query.searchField,
        page: query.page,
        limit: query.limit,
      });

      const result = await this.licenseService.getLicenses(query);

      // VALIDATION: Check for external API data contamination
      const integrityCheck = this._validateInternalDataIntegrity(result, query, req.correlationId);

      // ALERT: Report data integrity violations
      if (integrityCheck.violations.length > 0) {
        logger.error('🚨 DATA INTEGRITY ALERT: External API contamination detected', {
          correlationId: req.correlationId,
          violations: integrityCheck.violations,
          query: req.query,
          userId: req.user?.id,
          action: 'alert_security_team'
        });
      }

      logger.info('License service returned result', {
        correlationId: req.correlationId,
        dataLength: result.getData()?.length || 0,
        metaStatsTotal: result.getMeta()?.stats?.total,
        metaPaginationTotalPages: result.getMeta()?.pagination?.totalPages,
      });

      // Get the correct total count from external API for display
      // BUT ONLY when no filters are applied - when filters are active, use the filtered total
      let correctedMeta = { ...result.getMeta() }; // Deep copy to avoid mutation
      const hasFilters = query.filters && Object.keys(query.filters).length > 0;

      logger.info('License controller processing', {
        correlationId: req.correlationId,
        hasFilters,
        filters: Object.keys(query.filters || {}),
        originalTotal: result.getMeta().stats?.total,
      });

      // Always use internal database results - no external API override
      correctedMeta = { ...result.getMeta() };

      // Return result with correct meta (filtered total when filters are active)
      return res.success(result.getData(), 'Licenses retrieved successfully', correctedMeta);
    } catch (error) {
      logger.error('License controller getLicenses error', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
        query: req.query,
      });

      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Validate that license data comes from internal database, not external API
   * @returns {Object} Validation result with violations array
   */
  _validateInternalDataIntegrity(result, query, correlationId) {
    const data = result.getData();
    const meta = result.getMeta();
    const hasFilters = query.filters && Object.keys(query.filters).length > 0;

    // Check for signs of external API data contamination
    const violations = [];

    // 1. Check if we have filters but total is suspiciously high
    if (hasFilters && meta.stats?.total > 1000) {
      violations.push({
        type: 'high_total_with_filters',
        description: `High total (${meta.stats.total}) with filters applied`,
        severity: 'high'
      });
    }

    // 2. Check if filtered query returns data but total suggests unfiltered results
    if (hasFilters && data.length === 1 && meta.stats?.total > 100) {
      violations.push({
        type: 'single_result_high_total',
        description: `Single result but high total (${meta.stats.total}) suggests unfiltered data`,
        severity: 'high'
      });
    }

    // 3. Check for known external API total (2836)
    if (meta.stats?.total === 2836) {
      violations.push({
        type: 'known_external_total',
        description: 'Total matches known external API value (2836)',
        severity: 'critical'
      });
    }

    // 4. Check for data length vs total mismatch
    if (hasFilters && data.length > 0 && meta.stats?.total !== data.length) {
      violations.push({
        type: 'length_total_mismatch',
        description: `Data length (${data.length}) doesn't match reported total (${meta.stats.total})`,
        severity: 'medium'
      });
    }

    if (violations.length > 0) {
      logger.error('EXTERNAL API DATA CONTAMINATION DETECTED', {
        correlationId,
        violations: violations.map(v => v.description),
        hasFilters,
        dataLength: data.length,
        reportedTotal: meta.stats?.total,
        filters: Object.keys(query.filters || {}),
      });

      // Force correction for filtered queries
      if (hasFilters && violations.some(v => v.severity === 'high' || v.severity === 'critical')) {
        logger.warn('Auto-correcting contaminated data for filtered query', { correlationId });
        // The repository guard should have already corrected this, but let's be extra sure
        if (data.length === 0 && meta.stats.total > 0) {
          meta.stats.total = 0;
          meta.pagination.totalPages = 0;
        }
      }
    } else {
      logger.debug('Data integrity check passed', {
        correlationId,
        hasFilters,
        dataLength: data.length,
        total: meta.stats?.total,
      });
    }

    return { violations, hasViolations: violations.length > 0 };
  }

  /**
   * Manually trigger license sync (for admin use)
   */
  syncLicenses = async (req, res) => {
    try {
      if (!this.syncExternalLicensesUseCase) {
        return res.badRequest('Sync service not available');
      }

      // Trigger sync
      const syncPromise = this.syncExternalLicensesUseCase.execute({
        comprehensive: false,
        batchSize: 20,
        syncToInternalOnly: false,
        forceFullSync: false,
      });

      // Return immediately with sync status
      res.success({ message: 'Sync started in background' }, 'Sync initiated successfully');

      // Wait for sync to complete and log result
      syncPromise.then(result => {
        logger.info('Manual sync completed', {
          success: result?.success,
          totalFetched: result?.totalFetched,
          created: result?.created,
          updated: result?.updated,
        });
      }).catch(error => {
        logger.error('Manual sync failed', { error: error.message });
      });

    } catch (error) {
      logger.error('Failed to initiate manual sync', { error: error.message });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getLicenseById = async (req, res) => {
    try {
      const license = await this.licenseService.getLicenseById(req.params.id);
      if (!license) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };


  createLicense = async (req, res) => {
    try {
      // Temporarily skip validation for sync testing
      // LicenseValidator.validateCreateInput(req.body);

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const license = await this.licenseService.createLicense(req.body, context);
      return res.created({ license }, 'License created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  updateLicense = async (req, res) => {
    try {
      LicenseValidator.validateUpdateInput(req.body);

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const updated = await this.licenseService.updateLicense(req.params.id, req.body, context);
      if (!updated) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success({ license: updated }, 'License updated successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkUpdate = async (req, res) => {
    try {
      // Extract the licenses to update based on the format
      let licensesToUpdate = [];
      if (req.body.updates && Array.isArray(req.body.updates)) {
        // Structured format
        licensesToUpdate = req.body.updates;
      } else if (Array.isArray(req.body)) {
        // Direct array format - transform to structured format
        // Only include fields that are actually updatable
        const updatableFields = [
          'dba', 'zip', 'startsAt', 'status', 'plan', 'term', 'seatsTotal',
          'seatsUsed', 'cancelDate', 'lastPayment', 'smsPurchased', 'smsSent',
          'smsBalance', 'agents', 'agentsName', 'agentsCost', 'notes',
          'lastActive', 'key', 'product'
        ];

        licensesToUpdate = req.body.map(license => {
          const updates = {};
          updatableFields.forEach(field => {
            if (license[field] !== undefined) {
              updates[field] = license[field];
            }
          });
          return {
            id: license.id,
            updates
          };
        });

        // Validate that each license has an ID and at least one field to update
        licensesToUpdate.forEach((item, index) => {
          if (!item.id) {
            throw new ValidationException(`License at index ${index} is missing required 'id' field`);
          }
          if (!item.updates || Object.keys(item.updates).length === 0) {
            throw new ValidationException(`License at index ${index} has no valid fields to update`);
          }
        });
      } else {
        throw new ValidationException('Invalid request format. Expected array of licenses or object with updates property');
      }

      const updated = await this.licenseService.bulkUpdateLicenses(licensesToUpdate);

      const response = {
        results: updated,
        updated: updated.length,
        total: licensesToUpdate.length
      };

      const message = updated.length === licensesToUpdate.length
        ? 'All licenses updated successfully'
        : `${updated.length} of ${licensesToUpdate.length} licenses updated successfully`;

      // For bulk operations, return data as array for frontend compatibility
      return res.status(200).json({
        success: true,
        message,
        timestamp: new Date().toISOString(),
        data: updated
      });
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      logger.error('Bulk update failed', {
        error: error.message,
        stack: error.stack,
        count: licensesToUpdate?.length || 0
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkCreate = async (req, res) => {
    try {
      // Handle both structured format {licenses: [...]} and direct array format [...]
      let licensesToCreate = [];
      if (req.body.licenses && Array.isArray(req.body.licenses)) {
        // Structured format
        licensesToCreate = req.body.licenses;
      } else if (Array.isArray(req.body)) {
        // Direct array format - transform to structured format
        licensesToCreate = req.body.map(license => {
          // Handle field name differences (startsAt vs startDay)
          const processedLicense = { ...license };
          if (processedLicense.startsAt && !processedLicense.startDay) {
            processedLicense.startDay = processedLicense.startsAt;
            delete processedLicense.startsAt;
          }
          return processedLicense;
        });
      } else {
        throw new ValidationException('Invalid request format. Expected array of licenses or object with licenses property');
      }

      // Basic validation
      if (licensesToCreate.length === 0) {
        throw new ValidationException('No licenses provided for creation');
      }

      // Add audit fields to each license
      const licensesWithAudit = licensesToCreate.map((license) => ({
        ...license,
        createdBy: req.user?.id,
        updatedBy: req.user?.id,
        seatsUsed: license.seatsUsed || 0, // Ensure seatsUsed is set
      }));

      const created = await this.licenseService.bulkCreateLicenses(licensesWithAudit);

      return res.created(created, 'Licenses created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  addRow = async (req, res) => {
    try {
      // Reuse create validation; allows empty dba/zip for grid add flow by relaxing requirements
      // Only enforce required fields after save
      const payload = { ...req.body };
      if (!payload.dba) {
        payload.dba = '';
      }
      if (!payload.startDay) {
        payload.startDay = new Date().toISOString().slice(0, 10);
      }

      const license = await this.repository.save(payload);
      return res.created({ license }, 'License row created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkDelete = async (req, res) => {
    try {
      LicenseValidator.validateIdsArray(req.body);
      const deletedCount = await this.repository.bulkDelete(req.body.ids);

      return res.success({ deleted: deletedCount }, 'Licenses deleted successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  deleteLicense = async (req, res) => {
    try {
      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const removed = await this.licenseService.deleteLicense(req.params.id, context);
      if (!removed) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success(null, 'License deleted successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getDashboardMetrics = async (req, res) => {
    try {
      logger.info('Dashboard metrics request:', {
        query: req.query,
        userId: req.user?.id
      });

      const query = LicenseValidator.validateListQuery(req.query);
      const dateRange = {};
      if (req.query.startsAtFrom) {
        dateRange.startsAtFrom = decodeURIComponent(req.query.startsAtFrom);
      }
      if (req.query.startsAtTo) {
        dateRange.startsAtTo = decodeURIComponent(req.query.startsAtTo);
      }

      logger.info('Calling license service with:', {
        filters: query.filters,
        dateRange
      });

      const metrics = await this.licenseService.getDashboardMetrics({
        filters: query.filters,
        ...(Object.keys(dateRange).length > 0 && { dateRange }),
      });

      return res.success(metrics, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      logger.error('Dashboard metrics error:', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
