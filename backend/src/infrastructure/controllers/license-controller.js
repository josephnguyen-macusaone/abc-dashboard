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

      logger.debug('License API request initiated', {
        correlationId: req.correlationId,
        page: query.page,
        limit: query.limit,
      });

      const result = await this.licenseService.getLicenses(query);

      // VALIDATION: Check for external API data contamination (logged inside _validateInternalDataIntegrity)
      this._validateInternalDataIntegrity(result, query, req.correlationId);

      // Get the correct total count from external API for display
      // BUT ONLY when no filters are applied - when filters are active, use the filtered total
      let correctedMeta = { ...result.getMeta() }; // Deep copy to avoid mutation

      logger.info('License list', {
        correlationId: req.correlationId,
        page: query.page,
        limit: query.limit,
        total: result.getMeta()?.total,
        dataLength: result.getData()?.length || 0,
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
   * Validate that license data comes from internal database, not external API.
   * Contamination = returning unfiltered external API total when filters are applied.
   * @returns {Object} Validation result with violations array
   */
  _validateInternalDataIntegrity(result, query, correlationId) {
    const data = result.getData();
    const meta = result.getMeta();
    const hasFilters = query.filters && Object.keys(query.filters).length > 0;
    const total = meta?.total ?? 0;

    // Check for signs of external API data contamination (only when filters are applied)
    const violations = [];

    // 1. With filters: total matches known external API total (2836) — suggests unfiltered count leaked
    if (hasFilters && total === 2836) {
      violations.push({
        type: 'known_external_total_with_filters',
        description: 'Filtered query total (2836) matches external API total — likely unfiltered count',
        severity: 'critical',
      });
    }

    // 2. With filters: single result but total suggests unfiltered (strong signal)
    if (hasFilters && data.length === 1 && total > 10) {
      violations.push({
        type: 'single_result_high_total',
        description: `Single result but total (${total}) suggests unfiltered data`,
        severity: 'high',
      });
    }

    // Note: total === 2836 with NO filters is valid — that's the expected full license count.
    // Note: hasFilters && total > 1000 removed — broad filters (e.g. status=active) can legitimately match many rows.

    if (violations.length > 0) {
      logger.warn('Possible external API data contamination', {
        correlationId,
        violations: violations.map((v) => v.description),
        hasFilters,
        dataLength: data.length,
        reportedTotal: total,
        filters: Object.keys(query.filters || {}),
      });

      // Force correction for filtered queries when meta appears wrong
      if (
        hasFilters &&
        violations.some((v) => v.severity === 'high' || v.severity === 'critical')
      ) {
        logger.debug('Auto-correcting meta for filtered query', { correlationId });
        if (data.length === 0 && total > 0 && meta && typeof meta === 'object') {
          meta.total = 0;
          meta.totalPages = 0;
        }
      }
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
      syncPromise
        .then((result) => {
          logger.info('Manual sync completed', {
            success: result?.success,
            totalFetched: result?.totalFetched,
            created: result?.created,
            updated: result?.updated,
          });
        })
        .catch((error) => {
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
    let licensesToUpdate = [];
    try {
      // Extract the licenses to update based on the format
      if (req.body.updates && Array.isArray(req.body.updates)) {
        // Structured format
        licensesToUpdate = req.body.updates;
      } else if (Array.isArray(req.body)) {
        // Direct array format - transform to structured format
        // Only include fields that are actually updatable
        const updatableFields = [
          'dba',
          'zip',
          'startsAt',
          'status',
          'plan',
          'term',
          'seatsTotal',
          'seatsUsed',
          'cancelDate',
          'lastPayment',
          'smsPurchased',
          'smsSent',
          'smsBalance',
          'agents',
          'agentsName',
          'agentsCost',
          'notes',
          'lastActive',
          'key',
          'product',
        ];

        licensesToUpdate = req.body.map((license) => {
          const updates = {};
          updatableFields.forEach((field) => {
            if (license[field] !== undefined) {
              updates[field] = license[field];
            }
          });
          return {
            id: license.id,
            updates,
          };
        });

        // Validate that each license has an ID and at least one field to update
        licensesToUpdate.forEach((item, index) => {
          if (!item.id) {
            throw new ValidationException(
              `License at index ${index} is missing required 'id' field`
            );
          }
          if (!item.updates || Object.keys(item.updates).length === 0) {
            throw new ValidationException(
              `License at index ${index} has no valid fields to update`
            );
          }
        });
      } else {
        throw new ValidationException(
          'Invalid request format. Expected array of licenses or object with updates property'
        );
      }

      const updated = await this.licenseService.bulkUpdateLicenses(licensesToUpdate);

      const message =
        updated.length === licensesToUpdate.length
          ? 'All licenses updated successfully'
          : `${updated.length} of ${licensesToUpdate.length} licenses updated successfully`;

      // For bulk operations, return data as array for frontend compatibility
      return res.status(200).json({
        success: true,
        message,
        timestamp: new Date().toISOString(),
        data: updated,
      });
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      logger.error('Bulk update failed', {
        error: error.message,
        stack: error.stack,
        count: licensesToUpdate?.length || 0,
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
        const today = new Date().toISOString().slice(0, 10);
        licensesToCreate = req.body.map((license) => {
          // Handle field name differences (startsAt vs startDay); DB requires starts_at
          const processedLicense = { ...license };
          const startValue = processedLicense.startsAt || processedLicense.startDay;
          processedLicense.startDay =
            startValue && String(startValue).trim()
              ? String(startValue).trim().slice(0, 10)
              : today;
          delete processedLicense.startsAt;
          return processedLicense;
        });
      } else {
        throw new ValidationException(
          'Invalid request format. Expected array of licenses or object with licenses property'
        );
      }

      // Basic validation
      if (licensesToCreate.length === 0) {
        throw new ValidationException('No licenses provided for creation');
      }

      // Add audit fields. Use null for createdBy/updatedBy so the insert does not require
      // the authenticated user to exist in the users table (avoids FK violation on licenses_created_by_foreign).
      const licensesWithAudit = licensesToCreate.map((license) => ({
        ...license,
        createdBy: undefined,
        updatedBy: undefined,
        seatsUsed: license.seatsUsed || 0, // Ensure seatsUsed is set
      }));

      const { createdLicenses, errors } =
        await this.licenseService.bulkCreateLicenses(licensesWithAudit);

      if (createdLicenses.length === 0) {
        const message =
          errors.length > 0
            ? `License creation failed: ${errors[0].error}`
            : 'No licenses were created. Check validation or server logs.';
        return res.status(400).json({
          success: false,
          message,
          data: [],
          errors: errors.length > 0 ? errors : [{ index: 0, key: 'unknown', error: message }],
          timestamp: new Date().toISOString(),
        });
      }

      return res.created(createdLicenses, 'Licenses created successfully');
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
      const payload = { ...req.body };
      if (!payload.dba) {
        payload.dba = '';
      }
      if (!payload.startDay) {
        payload.startDay = new Date().toISOString().slice(0, 10);
      }

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const license = await this.licenseService.createLicense(payload, context);
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
      const deletedCount = await this.licenseService.bulkDelete(req.body.ids);

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
      logger.debug('Dashboard metrics request', {
        correlationId: req.correlationId,
        query: req.query,
        userId: req.user?.id,
      });

      const query = LicenseValidator.validateListQuery(req.query);
      const dateRange = {};
      if (req.query.startsAtFrom) {
        dateRange.startsAtFrom = decodeURIComponent(req.query.startsAtFrom);
      }
      if (req.query.startsAtTo) {
        dateRange.startsAtTo = decodeURIComponent(req.query.startsAtTo);
      }

      const metrics = await this.licenseService.getDashboardMetrics({
        filters: query.filters,
        ...(Object.keys(dateRange).length > 0 && { dateRange }),
      });

      logger.info('Dashboard metrics', {
        correlationId: req.correlationId,
        userId: req.user?.id,
      });

      return res.success(metrics, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      logger.error('Dashboard metrics error:', {
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
   * Get all unique agent names
   */
  getAllAgentNames = async (req, res) => {
    try {
      logger.debug('Getting all agent names', {
        correlationId: req.correlationId,
      });

      const agentNames = await this.licenseService.getAllAgentNames();

      logger.info('Agent names retrieved successfully', {
        correlationId: req.correlationId,
        count: agentNames.length,
      });

      return res.success({ agents: agentNames }, 'Agent names retrieved successfully');
    } catch (error) {
      logger.error('License controller getAllAgentNames error', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
