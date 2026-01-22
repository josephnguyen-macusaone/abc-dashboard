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

      // Allow operations without appid for sync purposes
      // if (!appid) {
      //   return res.badRequest('App ID is required');
      // }

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
      console.log('DEBUG: External licenses getLicenses called');

      // Direct approach - import and use repository directly
      console.log('DEBUG: Importing modules...');
      const { ExternalLicenseRepository } = await import('../repositories/external-license-repository.js');
      const knex = (await import('knex')).default;
      const { getKnexConfig } = await import('../config/database.js');

      console.log('DEBUG: Creating database connection...');
      const db = knex(getKnexConfig());
      const repo = new ExternalLicenseRepository(db);

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        filters: {},
        sortBy: 'updated_at',
        sortOrder: 'desc'
      };

      console.log('DEBUG: Calling repo.findLicenses...');
      const result = await repo.findLicenses(options);
      console.log('DEBUG: Repository call completed, result:', !!result);

      // Close the database connection
      await db.destroy();

      return res.json({
        success: true,
        message: 'External licenses retrieved successfully',
        data: result.licenses || [],
        meta: {
          pagination: {
            page: options.page,
            limit: options.limit,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / options.limit)
          }
        }
      });
    } catch (error) {
      // Make sure to close DB connection on error too
      try { await db.destroy(); } catch (e) {}

      logger.error('Failed to get external licenses via API', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.json({
        success: false,
        error: {
          code: 500,
          message: 'An unexpected error occurred. Please try again.',
          category: 'server'
        }
      });
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

  // ========================================================================
  // MISSING ENDPOINTS FROM EXTERNAL API
  // ========================================================================

  /**
   * Update license by email (PUT /api/v1/licenses/email/{email})
   */
  updateLicenseByEmail = async (req, res) => {
    try {
      const { email } = req.params;
      const updates = req.body;

      logger.info('Updating external license by email via API', {
        correlationId: req.correlationId,
        email,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.updateLicenseByEmail(email, updates);

      return res.success(result, 'License updated successfully');
    } catch (error) {
      logger.error('Update external license by email failed via API', {
        correlationId: req.correlationId,
        email: req.params.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Delete license by email (DELETE /api/v1/licenses/email/{email})
   */
  deleteLicenseByEmail = async (req, res) => {
    try {
      const { email } = req.params;

      logger.info('Deleting external license by email via API', {
        correlationId: req.correlationId,
        email,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.deleteLicenseByEmail(email);

      return res.success(result, 'License deleted successfully');
    } catch (error) {
      logger.error('Delete external license by email failed via API', {
        correlationId: req.correlationId,
        email: req.params.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Update license by countid (PUT /api/v1/licenses/countid/{countid})
   */
  updateLicenseByCountId = async (req, res) => {
    try {
      const { countid } = req.params;
      const updates = req.body;

      logger.info('Updating external license by countid via API', {
        correlationId: req.correlationId,
        countid,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.updateLicenseByCountId(parseInt(countid), updates);

      return res.success(result, 'License updated successfully');
    } catch (error) {
      logger.error('Update external license by countid failed via API', {
        correlationId: req.correlationId,
        countid: req.params.countid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Delete license by countid (DELETE /api/v1/licenses/countid/{countid})
   */
  deleteLicenseByCountId = async (req, res) => {
    try {
      const { countid } = req.params;

      logger.info('Deleting external license by countid via API', {
        correlationId: req.correlationId,
        countid,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.deleteLicenseByCountId(parseInt(countid));

      return res.success(result, 'License deleted successfully');
    } catch (error) {
      logger.error('Delete external license by countid failed via API', {
        correlationId: req.correlationId,
        countid: req.params.countid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Reset license ID (POST /api/v1/licenses/reset)
   */
  resetLicense = async (req, res) => {
    try {
      const { appid, email } = req.body;

      logger.info('Resetting external license ID via API', {
        correlationId: req.correlationId,
        appid,
        email,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.resetLicense({ appid, email });

      return res.success(result, 'License reset successfully');
    } catch (error) {
      logger.error('Reset external license failed via API', {
        correlationId: req.correlationId,
        appid: req.body.appid,
        email: req.body.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Bulk create licenses (POST /api/v1/licenses/bulk)
   */
  bulkCreateLicenses = async (req, res) => {
    try {
      const { licenses } = req.body;

      logger.info('Bulk creating external licenses via API', {
        correlationId: req.correlationId,
        count: licenses?.length || 0,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.bulkCreateLicenses(licenses);

      return res.success(result, 'Licenses bulk created successfully');
    } catch (error) {
      logger.error('Bulk create external licenses failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Add row license (POST /api/v1/licenses/row)
   */
  addRowLicense = async (req, res) => {
    try {
      const licenseData = req.body;

      logger.info('Adding row license via API', {
        correlationId: req.correlationId,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.addRowLicense(licenseData);

      return res.success(result, 'License row added successfully');
    } catch (error) {
      logger.error('Add row license failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Get SMS payments (GET /api/v1/sms-payments)
   */
  getSmsPayments = async (req, res) => {
    try {
      const options = {
        appid: req.query.appid,
        emailLicense: req.query.emailLicense,
        countid: req.query.countid ? parseInt(req.query.countid) : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      };

      logger.info('Getting SMS payments via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.getSmsPayments(options);

      return res.success(result, 'SMS payments retrieved successfully');
    } catch (error) {
      logger.error('Get SMS payments failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Add SMS payment (POST /api/v1/add-sms-payment)
   */
  addSmsPayment = async (req, res) => {
    try {
      const paymentData = req.body;

      logger.info('Adding SMS payment via API', {
        correlationId: req.correlationId,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.addSmsPayment(paymentData);

      return res.success(result, 'SMS payment added successfully');
    } catch (error) {
      logger.error('Add SMS payment failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Get license analytics (GET /api/v1/license-analytic)
   */
  getLicenseAnalytics = async (req, res) => {
    try {
      const options = {
        month: req.query.month ? parseInt(req.query.month) : undefined,
        year: req.query.year ? parseInt(req.query.year) : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status ? parseInt(req.query.status) : undefined,
        license_type: req.query.license_type,
      };

      logger.info('Getting license analytics via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.getLicenseAnalytics(options);

      return res.success(result, 'License analytics retrieved successfully');
    } catch (error) {
      logger.error('Get license analytics failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }
}
