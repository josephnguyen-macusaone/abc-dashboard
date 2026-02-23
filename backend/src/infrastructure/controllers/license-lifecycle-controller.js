/**
 * License Lifecycle Controller
 * Handles HTTP requests for license lifecycle management operations
 */
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import logger from '../config/logger.js';

export class LicenseLifecycleController {
  constructor(
    licenseLifecycleService,
    renewLicenseUseCase,
    expireLicenseUseCase,
    licenseRepository
  ) {
    this.licenseLifecycleService = licenseLifecycleService;
    this.renewLicenseUseCase = renewLicenseUseCase;
    this.expireLicenseUseCase = expireLicenseUseCase;
    this.licenseRepository = licenseRepository;
  }

  // ========================================================================
  // RENEWAL OPERATIONS
  // ========================================================================

  /**
   * Renew a license
   */
  renewLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const renewalOptions = req.body;

      logger.info('License renewal request via API', {
        correlationId: req.correlationId,
        licenseId: id,
        renewalOptions,
        userId: req.user?.id,
      });

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        reason: renewalOptions.reason || 'Manual renewal via API',
      };

      const renewedLicense = await this.renewLicenseUseCase.execute(id, renewalOptions, context);

      return res.success({ license: renewedLicense }, 'License renewed successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('License renewal failed via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get renewal preview
   */
  getRenewalPreview = async (req, res) => {
    try {
      const { id } = req.params;
      const renewalOptions = req.query;

      logger.info('License renewal preview request', {
        correlationId: req.correlationId,
        licenseId: id,
        renewalOptions,
        userId: req.user?.id,
      });

      const preview = await this.renewLicenseUseCase.getRenewalPreview(id, renewalOptions);

      return res.success(preview, 'Renewal preview retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('License renewal preview failed', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Extend license expiration date
   */
  extendLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const { newExpirationDate, reason } = req.body;

      if (!newExpirationDate) {
        return res.badRequest('New expiration date is required');
      }

      logger.info('License extension request via API', {
        correlationId: req.correlationId,
        licenseId: id,
        newExpirationDate,
        reason,
        userId: req.user?.id,
      });

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        reason: reason || 'Manual extension via API',
      };

      const extendedLicense = await this.licenseLifecycleService.extendLicenseExpiration(
        id,
        new Date(newExpirationDate),
        context
      );

      return res.success({ license: extendedLicense }, 'License expiration extended successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('License extension failed via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // EXPIRATION OPERATIONS
  // ========================================================================

  /**
   * Expire a license
   */
  expireLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const expirationOptions = req.body;

      logger.info('License expiration request via API', {
        correlationId: req.correlationId,
        licenseId: id,
        expirationOptions,
        userId: req.user?.id,
      });

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        reason: expirationOptions.reason || 'Manual expiration via API',
        force: expirationOptions.force === true,
      };

      const expiredLicense = await this.expireLicenseUseCase.execute(
        id,
        expirationOptions,
        context
      );

      return res.success({ license: expiredLicense }, 'License expired successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('License expiration failed via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get expiration preview
   */
  getExpirationPreview = async (req, res) => {
    try {
      const { id } = req.params;
      const expirationOptions = req.query;

      logger.info('License expiration preview request', {
        correlationId: req.correlationId,
        licenseId: id,
        expirationOptions,
        userId: req.user?.id,
      });

      const preview = await this.expireLicenseUseCase.previewExpiration(id, expirationOptions);

      return res.success(preview, 'Expiration preview retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('License expiration preview failed', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Reactivate an expired/suspended license
   */
  reactivateLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      logger.info('License reactivation request via API', {
        correlationId: req.correlationId,
        licenseId: id,
        reason,
        userId: req.user?.id,
      });

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        reason: reason || 'Manual reactivation via API',
      };

      const reactivatedLicense = await this.licenseLifecycleService.reactivateLicense(id, context);

      return res.success({ license: reactivatedLicense }, 'License reactivated successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('License reactivation failed via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  /**
   * Bulk renew licenses
   */
  bulkRenewLicenses = async (req, res) => {
    try {
      const { licenseIds, renewalOptions } = req.body;

      if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
        return res.badRequest('License IDs array is required');
      }

      logger.info('Bulk license renewal request via API', {
        correlationId: req.correlationId,
        licenseCount: licenseIds.length,
        renewalOptions,
        userId: req.user?.id,
      });

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        reason: renewalOptions?.reason || 'Bulk renewal via API',
      };

      const results = [];
      const errors = [];

      for (const licenseId of licenseIds) {
        try {
          const renewedLicense = await this.renewLicenseUseCase.execute(
            licenseId,
            renewalOptions || {},
            context
          );
          results.push(renewedLicense);
        } catch (error) {
          logger.warn('Failed to renew license in bulk operation', {
            licenseId,
            error: error.message,
          });
          errors.push({
            licenseId,
            error: error.message,
          });
        }
      }

      return res.success(
        {
          renewed: results.length,
          failed: errors.length,
          results,
          errors,
        },
        'Bulk renewal completed'
      );
    } catch (error) {
      logger.error('Bulk license renewal failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Bulk expire licenses
   */
  bulkExpireLicenses = async (req, res) => {
    try {
      const { licenseIds, expirationOptions } = req.body;

      if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
        return res.badRequest('License IDs array is required');
      }

      logger.info('Bulk license expiration request via API', {
        correlationId: req.correlationId,
        licenseCount: licenseIds.length,
        expirationOptions,
        userId: req.user?.id,
      });

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        reason: expirationOptions?.reason || 'Bulk expiration via API',
        force: expirationOptions?.force === true,
      };

      const bulkResults = await this.expireLicenseUseCase.bulkExpireLicenses(
        licenseIds,
        expirationOptions || {},
        context
      );

      return res.success(bulkResults, 'Bulk expiration completed');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Bulk license expiration failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // MONITORING & STATUS
  // ========================================================================

  /**
   * Get licenses requiring attention
   */
  getLicensesRequiringAttention = async (req, res) => {
    try {
      const includeExpiringSoon = req.query.includeExpiringSoon !== 'false';
      const includeExpired = req.query.includeExpired !== 'false';
      const includeSuspended = req.query.includeSuspended === 'true';
      const daysThreshold = parseInt(req.query.daysThreshold, 10) || 30;

      const data = await this.licenseLifecycleService.getLicensesRequiringAttention({
        includeExpiringSoon,
        includeExpired,
        includeSuspended,
        daysThreshold,
      });

      return res.success(data, 'Licenses requiring attention retrieved successfully');
    } catch (error) {
      logger.error('Get licenses requiring attention failed', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license lifecycle status
   */
  getLifecycleStatus = async (req, res) => {
    try {
      const { id } = req.params;

      logger.info('Get license lifecycle status request', {
        correlationId: req.correlationId,
        licenseId: id,
        userId: req.user?.id,
      });

      const license = await this.licenseRepository.findById(id);
      if (!license) {
        return sendErrorResponse(res, 'RESOURCE_NOT_FOUND');
      }

      const status = {
        licenseId: license.id,
        licenseKey: license.key,
        currentStatus: license.status,
        isExpired: license.isExpired(),
        isExpiringSoon: license.isExpiringSoon(),
        isInGracePeriod: license.isInGracePeriod(),
        daysUntilExpiration: license.getDaysUntilExpiration(),
        daysUntilGracePeriodEnd: license.getDaysUntilGracePeriodEnd(),
        autoSuspendEnabled: license.autoSuspendEnabled,
        gracePeriodDays: license.gracePeriodDays,
        renewalRemindersSent: license.renewalRemindersSent,
        lastRenewalReminder: license.lastRenewalReminder,
        renewalDueDate: license.renewalDueDate,
        availableTransitions: license.getAvailableTransitions(),
        canBeModified: license.canBeModified(),
        isTerminalState: license.isTerminalState(),
        renewalHistory: license.renewalHistory?.slice(-5) || [], // Last 5 entries
      };

      return res.success(status, 'License lifecycle status retrieved successfully');
    } catch (error) {
      logger.error('Get license lifecycle status failed', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Trigger manual lifecycle processing
   */
  processLifecycle = async (req, res) => {
    try {
      const { operation } = req.body;

      logger.info('Manual lifecycle processing request', {
        correlationId: req.correlationId,
        operation,
        userId: req.user?.id,
      });

      let results;

      switch (operation) {
        case 'expiring_reminders':
          results = await this.licenseLifecycleService.processExpiringLicenses();
          break;
        case 'expire_licenses':
          results = await this.licenseLifecycleService.processExpiredLicenses();
          break;
        case 'update_grace_periods':
          results = await this.licenseLifecycleService.updateGracePeriods();
          break;
        default:
          return res.badRequest(
            'Invalid operation. Supported: expiring_reminders, expire_licenses, update_grace_periods'
          );
      }

      return res.success(results, `Lifecycle operation '${operation}' completed successfully`);
    } catch (error) {
      logger.error('Manual lifecycle processing failed', {
        correlationId: req.correlationId,
        operation: req.body.operation,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}

export default LicenseLifecycleController;
