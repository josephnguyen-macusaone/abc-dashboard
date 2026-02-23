/**
 * Expire License Use Case
 * Handles license expiration operations and status transitions
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class ExpireLicenseUseCase {
  constructor(licenseRepository, licenseLifecycleService) {
    this.licenseRepository = licenseRepository;
    this.licenseLifecycleService = licenseLifecycleService;
  }

  /**
   * Execute license expiration processing
   * @param {string} licenseId - License ID to expire
   * @param {Object} expirationOptions - Expiration configuration
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Expired license
   */
  async execute(licenseId, expirationOptions = {}, context = {}) {
    try {
      logger.info('Executing license expiration use case', {
        licenseId,
        expirationOptions,
        userId: context.userId,
      });

      // Find and validate license
      const license = await this.licenseRepository.findById(licenseId);
      if (!license) {
        throw new ValidationException('License not found');
      }

      // Validate expiration eligibility
      await this.validateExpirationEligibility(license, context);

      // Determine expiration action based on license settings
      const action = await this.determineExpirationAction(license, expirationOptions);

      let expiredLicense;

      switch (action) {
        case 'suspend':
          expiredLicense = await this.suspendLicense(license, expirationOptions, context);
          break;
        case 'grace_period':
          expiredLicense = await this.applyGracePeriod(license, expirationOptions, context);
          break;
        case 'mark_expired':
          expiredLicense = await this.markAsExpired(license, expirationOptions, context);
          break;
        default:
          throw new ValidationException(`Unsupported expiration action: ${action}`);
      }

      logger.info('License expiration processing completed', {
        licenseId,
        licenseKey: license.key,
        action,
        newStatus: expiredLicense.status,
        userId: context.userId,
      });

      return expiredLicense;
    } catch (error) {
      logger.error('License expiration use case failed', {
        licenseId,
        expirationOptions,
        userId: context.userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validate if license can be expired
   */
  async validateExpirationEligibility(license, context) {
    const errors = [];

    // Check if license is already expired
    if (license.status === 'expired') {
      errors.push('License is already expired');
    }

    // Check if license is in a state that can be expired
    if (['revoked', 'cancel'].includes(license.status)) {
      errors.push(`Cannot expire license with status: ${license.status}`);
    }

    // Check user permissions
    if (!context.userId) {
      errors.push('User authentication required for license expiration');
    }

    // Business rule: Must have an expiration date to expire
    if (!license.expiresAt) {
      errors.push('License must have an expiration date to be expired');
    }

    // Business rule: Cannot expire future-dated licenses (unless forced)
    if (license.expiresAt && new Date(license.expiresAt) > new Date() && !context.force) {
      errors.push('Cannot expire license that has not reached its expiration date');
    }

    if (errors.length > 0) {
      throw new ValidationException(`License expiration not allowed: ${errors.join(', ')}`);
    }
  }

  /**
   * Determine what action to take when expiring a license
   */
  async determineExpirationAction(license, expirationOptions) {
    // If explicitly specified in options, use that
    if (expirationOptions.action) {
      return expirationOptions.action;
    }

    // If license has auto-suspend enabled and is past grace period, suspend
    if (license.autoSuspendEnabled && license.shouldBeSuspended()) {
      return 'suspend';
    }

    // If license is expired but within grace period, apply grace period
    if (license.isExpired() && license.isInGracePeriod()) {
      return 'grace_period';
    }

    // If license is expired and no grace period applies, mark as expired
    if (license.isExpired()) {
      return 'mark_expired';
    }

    // Default action for licenses being manually expired
    return 'mark_expired';
  }

  /**
   * Suspend a license due to expiration
   */
  async suspendLicense(license, expirationOptions, context) {
    const suspensionReason =
      expirationOptions.reason || 'Suspended due to expiration and grace period end';

    // Update license status
    const updatedLicense = await this.licenseRepository.update(license.id, {
      status: 'expired',
      suspensionReason,
      suspendedAt: new Date(),
      updatedBy: context.userId,
    });

    // Add to renewal history
    await this.licenseRepository.addRenewalHistory(license.id, 'suspended', {
      reason: suspensionReason,
      previousStatus: license.status,
      newStatus: 'expired',
      suspendedBy: context.userId,
      autoSuspended: true,
    });

    return updatedLicense;
  }

  /**
   * Apply grace period to expired license
   */
  async applyGracePeriod(license, expirationOptions, context) {
    // Ensure grace period is calculated
    if (!license.gracePeriodEnd) {
      const graceEnd = license.calculateGracePeriodEnd();
      await this.licenseRepository.update(license.id, {
        gracePeriodEnd: graceEnd,
        updatedBy: context.userId,
      });
      license.gracePeriodEnd = graceEnd;
    }

    // Add to renewal history
    await this.licenseRepository.addRenewalHistory(license.id, 'grace_period_applied', {
      gracePeriodDays: license.gracePeriodDays,
      gracePeriodEnd: license.gracePeriodEnd,
      appliedBy: context.userId,
    });

    // Return the license (status remains active during grace period)
    return license;
  }

  /**
   * Mark license as expired without suspension
   */
  async markAsExpired(license, expirationOptions, context) {
    const expirationReason = expirationOptions.reason || 'License expired';

    // Update license status
    const updatedLicense = await this.licenseRepository.update(license.id, {
      status: 'expired',
      updatedBy: context.userId,
    });

    // Add to renewal history
    await this.licenseRepository.addRenewalHistory(license.id, 'marked_expired', {
      reason: expirationReason,
      previousStatus: license.status,
      newStatus: 'expired',
      expiredBy: context.userId,
    });

    return updatedLicense;
  }

  /**
   * Bulk expire multiple licenses
   */
  async bulkExpireLicenses(licenseIds, expirationOptions = {}, context = {}) {
    try {
      logger.info('Bulk expiring licenses', {
        count: licenseIds.length,
        licenseIds,
        expirationOptions,
        userId: context.userId,
      });

      const results = {
        successful: [],
        failed: [],
        total: licenseIds.length,
      };

      for (const licenseId of licenseIds) {
        try {
          const expiredLicense = await this.execute(licenseId, expirationOptions, context);
          results.successful.push({
            id: licenseId,
            status: expiredLicense.status,
            key: expiredLicense.key,
          });
        } catch (error) {
          logger.warn('Failed to expire license in bulk operation', {
            licenseId,
            error: error.message,
          });
          results.failed.push({
            id: licenseId,
            error: error.message,
          });
        }
      }

      logger.info('Bulk license expiration completed', {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      logger.error('Bulk license expiration failed', {
        licenseIds,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get licenses that should be expired (for automated processing)
   */
  async getLicensesToExpire(options = {}) {
    try {
      const {
        includePastDue = true,
        includeGracePeriodExpired = true,
        daysPastExpiration = 0,
      } = options;

      const now = new Date();
      let expiredLicenses = [];

      // Find licenses past their expiration date
      if (includePastDue) {
        const pastDueLicenses = await this.licenseRepository.findLicenses({
          filters: {
            status: ['active', 'expiring'],
            expiresAt: { $lt: now },
          },
        });
        expiredLicenses = [...expiredLicenses, ...pastDueLicenses];
      }

      // Find licenses past their grace period
      if (includeGracePeriodExpired) {
        const graceExpiredLicenses = await this.licenseRepository.findLicenses({
          filters: {
            status: ['active', 'expiring'],
            gracePeriodEnd: { $lt: now },
            expiresAt: { $lt: now },
          },
        });

        // Filter out duplicates
        const existingIds = new Set(expiredLicenses.map((l) => l.id));
        expiredLicenses = [
          ...expiredLicenses,
          ...graceExpiredLicenses.filter((l) => !existingIds.has(l.id)),
        ];
      }

      // Filter by additional criteria if specified
      if (daysPastExpiration > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysPastExpiration);

        expiredLicenses = expiredLicenses.filter((license) => {
          const expiryDate = new Date(license.expiresAt);
          return expiryDate < cutoffDate;
        });
      }

      logger.info('Retrieved licenses to expire', {
        count: expiredLicenses.length,
        includePastDue,
        includeGracePeriodExpired,
        daysPastExpiration,
      });

      return expiredLicenses;
    } catch (error) {
      logger.error('Failed to get licenses to expire', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Preview expiration without actually expiring
   */
  async previewExpiration(licenseId, expirationOptions = {}) {
    try {
      const license = await this.licenseRepository.findById(licenseId);
      if (!license) {
        throw new ValidationException('License not found');
      }

      const action = await this.determineExpirationAction(license, expirationOptions);

      return {
        licenseId,
        licenseKey: license.key,
        currentStatus: license.status,
        expiresAt: license.expiresAt,
        isExpired: license.isExpired(),
        isInGracePeriod: license.isInGracePeriod(),
        daysUntilGracePeriodEnd: license.getDaysUntilGracePeriodEnd(),
        autoSuspendEnabled: license.autoSuspendEnabled,
        gracePeriodDays: license.gracePeriodDays,
        proposedAction: action,
        willChangeStatus: action === 'suspend' || action === 'mark_expired',
        newStatus: action === 'suspend' ? 'expired' : license.status,
      };
    } catch (error) {
      logger.error('Failed to preview license expiration', {
        licenseId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default ExpireLicenseUseCase;
