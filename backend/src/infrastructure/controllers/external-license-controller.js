import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import logger from '../config/logger.js';

/**
 * External License Controller
 * Handles HTTP requests for external license management
 */
export class ExternalLicenseController {
  constructor(syncExternalLicensesUseCase, manageExternalLicensesUseCase) {
    this.syncExternalLicensesUseCase = syncExternalLicensesUseCase;
    this.manageExternalLicensesUseCase = manageExternalLicensesUseCase;
  }

  // ========================================================================
  // Sync Operations
  // ========================================================================

  /**
   * Sync all licenses from external API
   */
  syncLicenses = async (req, res) => {
    try {
      const options = {
        forceFullSync: req.query.force === 'true',
        batchSize: parseInt(req.query.batchSize) || 20,
        dryRun: req.query.dryRun === 'true',
        syncToInternalOnly: req.query.syncToInternalOnly === 'true',
        bidirectional: req.query.bidirectional === 'true',
        comprehensive: req.query.comprehensive !== 'false', // Default to true for comprehensive approach
      };

      logger.info('Starting external license sync via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.syncExternalLicensesUseCase.execute(options);

      return res.success(result, 'License sync completed successfully');
    } catch (error) {
      logger.error('External license sync failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Sync single license by appid
   */
  syncSingleLicense = async (req, res) => {
    try {
      const { appid } = req.params;

      if (!appid) {
        return res.badRequest('App ID is required');
      }

      logger.info('Syncing single external license via API', {
        correlationId: req.correlationId,
        appid,
        userId: req.user?.id,
      });

      const result = await this.syncExternalLicensesUseCase.syncSingleLicense(appid);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: `License with appid ${appid} not found or sync failed: ${result.error}`,
          timestamp: new Date().toISOString(),
        });
      }

      return res.success(result, 'License synced successfully');
    } catch (error) {
      logger.error('Single license sync failed via API', {
        correlationId: req.correlationId,
        appid: req.params.appid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Sync pending/failed licenses
   */
  syncPendingLicenses = async (req, res) => {
    try {
      const options = {
        limit: parseInt(req.query.limit) || 100,
        batchSize: parseInt(req.query.batchSize) || 25,
      };

      logger.info('Syncing pending external licenses via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.syncExternalLicensesUseCase.syncPendingLicenses(options);

      return res.success(result, 'Pending licenses sync completed');
    } catch (error) {
      logger.error('Pending licenses sync failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get sync status and statistics
   */
  getSyncStatus = async (req, res) => {
    try {
      const status = await this.syncExternalLicensesUseCase.getSyncStatus();

      return res.success(status, 'Sync status retrieved successfully');
    } catch (error) {
      logger.error('Failed to get sync status via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // License Management Operations
  // ========================================================================

  /**
   * Get licenses with pagination and filtering
   */
  getLicenses = async (req, res) => {
    try {
      const options = {
        // Handle multiple pagination parameter formats from frontend
        page: parseInt(req.query.page) ||
              (req.query.offset ? Math.floor(parseInt(req.query.offset) / (parseInt(req.query.limit) || parseInt(req.query.per_page) || parseInt(req.query.size) || 10)) + 1 : 1) ||
              1,
        limit: parseInt(req.query.limit) ||
               parseInt(req.query.per_page) ||
               parseInt(req.query.size) ||
               10,
        filters: {
          search: req.query.search,
          appid: req.query.appid,
          email: req.query.email,
          dba: req.query.dba,
          status: req.query.status ? parseInt(req.query.status) : undefined,
          license_type: req.query.license_type,
          syncStatus: req.query.syncStatus,
          createdAtFrom: req.query.createdAtFrom,
          createdAtTo: req.query.createdAtTo,
        },
        sortBy: req.query.sortBy || 'updated_at',
        sortOrder: req.query.sortOrder || 'desc',
      };

      const result = await this.manageExternalLicensesUseCase.getLicenses(options);

      return res.paginated(
        result.licenses,
        result.page,
        options.limit,
        result.total,
        'External licenses retrieved successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Failed to get external licenses via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get single license by ID
   */
  getLicenseById = async (req, res) => {
    try {
      const { id } = req.params;
      const license = await this.manageExternalLicensesUseCase.getLicenseById(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      logger.error('Failed to get license by ID via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license by appid
   */
  getLicenseByAppId = async (req, res) => {
    try {
      const { appid } = req.params;
      const license = await this.manageExternalLicensesUseCase.getLicenseByAppId(appid);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      logger.error('Failed to get license by appid via API', {
        correlationId: req.correlationId,
        appid: req.params.appid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license by email
   */
  getLicenseByEmail = async (req, res) => {
    try {
      const { email } = req.params;
      const license = await this.manageExternalLicensesUseCase.getLicenseByEmail(
        decodeURIComponent(email)
      );

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      logger.error('Failed to get license by email via API', {
        correlationId: req.correlationId,
        email: req.params.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license by countid
   */
  getLicenseByCountId = async (req, res) => {
    try {
      const countid = parseInt(req.params.countid);
      const license = await this.manageExternalLicensesUseCase.getLicenseByCountId(countid);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      logger.error('Failed to get license by countid via API', {
        correlationId: req.correlationId,
        countid: req.params.countid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Create new external license
   */
  createLicense = async (req, res) => {
    try {
      const license = await this.manageExternalLicensesUseCase.createLicense(req.body);

      logger.info('External license created via API', {
        correlationId: req.correlationId,
        licenseId: license.id,
        appid: license.appid,
        userId: req.user?.id,
      });

      return res.created({ license }, 'License created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Failed to create external license via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Update existing license
   */
  updateLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const license = await this.manageExternalLicensesUseCase.updateLicense(id, req.body);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('External license updated via API', {
        correlationId: req.correlationId,
        licenseId: id,
        appid: license.appid,
        updatedFields: Object.keys(req.body),
        userId: req.user?.id,
      });

      return res.success({ license }, 'License updated successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Failed to update external license via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Delete license
   */
  deleteLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await this.manageExternalLicensesUseCase.deleteLicense(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('External license deleted via API', {
        correlationId: req.correlationId,
        licenseId: id,
        userId: req.user?.id,
      });

      return res.success({ deleted: true }, 'License deleted successfully');
    } catch (error) {
      logger.error('Failed to delete external license via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // Analytics and Reporting
  // ========================================================================

  /**
   * Get license statistics
   */
  getLicenseStats = async (req, res) => {
    try {
      const stats = await this.manageExternalLicensesUseCase.getLicenseStats();

      return res.success({ stats }, 'License statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get license stats via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get expiring licenses
   */
  getExpiringLicenses = async (req, res) => {
    try {
      const daysThreshold = parseInt(req.query.days) || 30;
      const licenses = await this.manageExternalLicensesUseCase.getExpiringLicenses(daysThreshold);

      return res.success(
        { licenses, count: licenses.length },
        'Expiring licenses retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get expiring licenses via API', {
        correlationId: req.correlationId,
        daysThreshold: req.query.days,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get expired licenses
   */
  getExpiredLicenses = async (req, res) => {
    try {
      const licenses = await this.manageExternalLicensesUseCase.getExpiredLicenses();

      return res.success(
        { licenses, count: licenses.length },
        'Expired licenses retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get expired licenses via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get licenses by organization (DBA)
   */
  getLicensesByOrganization = async (req, res) => {
    try {
      const { dba } = req.params;
      const licenses = await this.manageExternalLicensesUseCase.getLicensesByOrganization(
        decodeURIComponent(dba)
      );

      return res.success(
        { licenses, count: licenses.length },
        'Organization licenses retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get licenses by organization via API', {
        correlationId: req.correlationId,
        dba: req.params.dba,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /**
   * Bulk update licenses
   */
  bulkUpdateLicenses = async (req, res) => {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.badRequest('Updates array is required');
      }

      logger.info('Starting bulk update of external licenses via API', {
        correlationId: req.correlationId,
        updateCount: updates.length,
        userId: req.user?.id,
      });

      const results = await this.manageExternalLicensesUseCase.bulkUpdateLicenses(updates);

      logger.info('Bulk update of external licenses completed via API', {
        correlationId: req.correlationId,
        requested: updates.length,
        successful: results.length,
        userId: req.user?.id,
      });

      return res.success(
        {
          results,
          count: results.length,
          requested: updates.length,
        },
        'Bulk update completed successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Bulk update of external licenses failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        updateCount: req.body.updates?.length,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Bulk delete licenses
   */
  bulkDeleteLicenses = async (req, res) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.badRequest('IDs array is required');
      }

      logger.info('Starting bulk delete of external licenses via API', {
        correlationId: req.correlationId,
        deleteCount: ids.length,
        userId: req.user?.id,
      });

      const deletedCount = await this.manageExternalLicensesUseCase.bulkDeleteLicenses(ids);

      logger.info('Bulk delete of external licenses completed via API', {
        correlationId: req.correlationId,
        requested: ids.length,
        deleted: deletedCount,
        userId: req.user?.id,
      });

      return res.success(
        {
          deleted: deletedCount,
          requested: ids.length,
        },
        'Bulk delete completed successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Bulk delete of external licenses failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        deleteCount: req.body.ids?.length,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
