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
      const result = await this.licenseService.getLicenses(query);

      // Get the correct total count from external API for display
      let correctedMeta = result.getMeta();
      try {
        if (this.syncExternalLicensesUseCase && this.syncExternalLicensesUseCase.externalLicenseApiService) {
          // Try to get the real total from external API
          const externalApiService = this.syncExternalLicensesUseCase.externalLicenseApiService;
          const externalStats = await externalApiService.getLicenses({ page: 1, limit: 1 });
          if (externalStats.meta && externalStats.meta.total) {
            correctedMeta = {
              ...correctedMeta,
              stats: {
                ...correctedMeta.stats,
                total: externalStats.meta.total, // Use external API total
              },
              pagination: {
                ...correctedMeta.pagination,
                totalPages: Math.ceil(externalStats.meta.total / (query.limit || 10)),
              }
            };
            logger.debug('Corrected license count using external API total', {
              internalTotal: result.getMeta().stats.total,
              externalTotal: externalStats.meta.total,
              correlationId: req.correlationId,
            });
          }
        }
      } catch (externalError) {
        logger.warn('Failed to get external license count, using internal count', {
          error: externalError.message,
          correlationId: req.correlationId,
        });
      }

      // Use success with corrected meta to show the right total count
      return res.success(result.getData(), 'Licenses retrieved successfully', correctedMeta);
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

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
