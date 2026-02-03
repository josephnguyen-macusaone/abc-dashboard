/**
 * License Lifecycle Service
 * Handles automated lifecycle operations for licenses
 */
import logger from '../config/logger.js';

export class LicenseLifecycleService {
  constructor(licenseRepository, notificationService = null) {
    this.licenseRepository = licenseRepository;
    this.notificationService = notificationService;
  }

  /**
   * Check and process licenses that are expiring soon
   * Sends renewal reminders based on configured thresholds
   */
  async processExpiringLicenses() {
    try {
      logger.info('Starting license expiration check');

      // Check for licenses needing different types of reminders
      const reminderTypes = [
        { type: '30days', description: '30-day renewal reminder' },
        { type: '7days', description: '7-day renewal reminder' },
        { type: '1day', description: '1-day renewal reminder' },
      ];

      let totalProcessed = 0;

      for (const { type, description } of reminderTypes) {
        try {
          const licenses = await this.licenseRepository.findLicensesNeedingReminders(type);

          for (const license of licenses) {
            await this.sendRenewalReminder(license, type, description);
            totalProcessed++;
          }
        } catch (error) {
          logger.error(`Error processing ${type} reminders`, {
            error: error.message,
            stack: error.stack,
          });
        }
      }

      logger.info('License expiration check completed', { totalProcessed });
      return { success: true, processed: totalProcessed };
    } catch (error) {
      logger.error('Failed to process expiring licenses', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Send renewal reminder for a specific license
   */
  async sendRenewalReminder(license, reminderType, description) {
    try {
      logger.info(`Sending ${description} for license`, {
        licenseId: license.id,
        licenseKey: license.key,
        expiresAt: license.expiresAt,
        daysUntilExpiry: license.getDaysUntilExpiration(),
      });

      // Mark reminder as sent in the license
      license.markRenewalReminderSent(reminderType);
      await this.licenseRepository.updateRenewalReminders(
        license.id,
        license.renewalRemindersSent,
        license.lastRenewalReminder
      );

      // Add to renewal history
      await this.licenseRepository.addRenewalHistory(license.id, `reminder_sent_${reminderType}`, {
        reminderType,
        description,
        daysUntilExpiry: license.getDaysUntilExpiration(),
      });

      // Send notification if service is available
      if (this.notificationService) {
        await this.notificationService.sendRenewalReminder(license, reminderType, description);
      }

      logger.info(`${description} sent successfully`, {
        licenseId: license.id,
        licenseKey: license.key,
      });
    } catch (error) {
      logger.error(`Failed to send ${description}`, {
        licenseId: license.id,
        licenseKey: license.key,
        reminderType,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Process expired licenses for auto-suspension
   */
  async processExpiredLicenses() {
    try {
      logger.info('Starting expired license suspension check');

      const expiredLicenses = await this.licenseRepository.findExpiredLicensesForSuspension();

      if (expiredLicenses.length === 0) {
        logger.info('No licenses found for auto-suspension');
        return { success: true, suspended: 0 };
      }

      const licenseIds = expiredLicenses.map((license) => license.id);

      logger.info('Suspending expired licenses', {
        count: licenseIds.length,
        licenseIds,
      });

      const suspendedCount = await this.licenseRepository.suspendExpiredLicenses(
        licenseIds,
        'Auto-suspended due to expiration and grace period end'
      );

      // Add suspension history for each license
      for (const license of expiredLicenses) {
        await this.licenseRepository.addRenewalHistory(license.id, 'auto_suspended', {
          reason: 'Auto-suspended due to expiration and grace period end',
          previousStatus: license.status,
          newStatus: 'expired',
          gracePeriodDays: license.gracePeriodDays,
        });

        // Send notification if service is available
        if (this.notificationService) {
          await this.notificationService.sendLicenseSuspended(license, 'expiration');
        }
      }

      logger.info('Expired license suspension completed', {
        requested: licenseIds.length,
        suspended: suspendedCount,
      });

      return { success: true, suspended: suspendedCount };
    } catch (error) {
      logger.error('Failed to process expired licenses', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Extend license expiration date
   */
  async extendLicenseExpiration(licenseId, newExpirationDate, context) {
    try {
      logger.info('Extending license expiration', {
        licenseId,
        newExpirationDate,
        userId: context.userId,
      });

      const updatedLicense = await this.licenseRepository.extendLicenseExpiration(
        licenseId,
        newExpirationDate,
        context
      );

      // Add renewal history
      await this.licenseRepository.addRenewalHistory(licenseId, 'expiration_extended', {
        previousExpiration: updatedLicense.expiresAt,
        newExpiration: newExpirationDate,
        extendedBy: context.userId,
        reason: context.reason || 'Manual extension',
      });

      // Send notification if service is available
      if (this.notificationService) {
        await this.notificationService.sendLicenseExtended(updatedLicense, context);
      }

      logger.info('License expiration extended successfully', {
        licenseId,
        oldExpiration: updatedLicense.expiresAt,
        newExpiration: newExpirationDate,
      });

      return updatedLicense;
    } catch (error) {
      logger.error('Failed to extend license expiration', {
        licenseId,
        newExpirationDate,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Renew license with new term
   */
  async renewLicense(licenseId, renewalOptions, context) {
    try {
      logger.info('Renewing license', {
        licenseId,
        renewalOptions,
        userId: context.userId,
      });

      const license = await this.licenseRepository.findById(licenseId);
      if (!license) {
        throw new Error('License not found');
      }

      // Calculate new expiration date
      const currentExpiration = new Date(license.expiresAt || new Date());
      let newExpirationDate;

      if (renewalOptions.newExpirationDate) {
        newExpirationDate = new Date(renewalOptions.newExpirationDate);
      } else {
        // Extend by the license term period
        const extensionDays = license.term === 'yearly' ? 365 : 30;
        newExpirationDate = new Date(currentExpiration);
        newExpirationDate.setDate(currentExpiration.getDate() + extensionDays);
      }

      // Extend the license
      const updatedLicense = await this.extendLicenseExpiration(licenseId, newExpirationDate, {
        ...context,
        reason: 'License renewed',
      });

      // Reset renewal reminders if license was expired
      if (license.isExpired()) {
        await this.licenseRepository.updateRenewalReminders(
          licenseId,
          [], // Clear reminders
          null // Clear last reminder
        );
      }

      // Add detailed renewal history
      await this.licenseRepository.addRenewalHistory(licenseId, 'license_renewed', {
        previousExpiration: license.expiresAt,
        newExpiration: newExpirationDate,
        renewalTerm: license.term,
        renewedBy: context.userId,
        renewalOptions,
      });

      // Send notification if service is available
      if (this.notificationService) {
        await this.notificationService.sendLicenseRenewed(updatedLicense, context);
      }

      logger.info('License renewed successfully', {
        licenseId,
        oldExpiration: license.expiresAt,
        newExpiration: newExpirationDate,
        term: license.term,
      });

      return updatedLicense;
    } catch (error) {
      logger.error('Failed to renew license', {
        licenseId,
        renewalOptions,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Reactivate a suspended license
   */
  async reactivateLicense(licenseId, context) {
    try {
      logger.info('Reactivating suspended license', {
        licenseId,
        userId: context.userId,
      });

      const reactivatedLicense = await this.licenseRepository.reactivateLicense(licenseId, context);

      // Add reactivation history
      await this.licenseRepository.addRenewalHistory(licenseId, 'license_reactivated', {
        previousStatus: 'expired',
        newStatus: 'active',
        reactivatedBy: context.userId,
        reason: context.reason || 'Manual reactivation',
      });

      // Send notification if service is available
      if (this.notificationService) {
        await this.notificationService.sendLicenseReactivated(reactivatedLicense, context);
      }

      logger.info('License reactivated successfully', {
        licenseId,
        previousStatus: 'expired',
        newStatus: 'active',
      });

      return reactivatedLicense;
    } catch (error) {
      logger.error('Failed to reactivate license', {
        licenseId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get licenses requiring attention (expiring soon, expired, suspended)
   */
  async getLicensesRequiringAttention(options = {}) {
    try {
      const {
        includeExpiringSoon = true,
        includeExpired = true,
        includeSuspended = true,
        daysThreshold = 30,
      } = options;

      const results = {
        expiringSoon: [],
        expired: [],
        suspended: [],
        total: 0,
      };

      // Get licenses expiring soon
      if (includeExpiringSoon) {
        try {
          results.expiringSoon = await this.licenseRepository.findExpiringLicenses(daysThreshold);
          results.total += results.expiringSoon.length;
        } catch (error) {
          logger.warn('Failed to fetch expiring licenses, returning empty array', {
            error: error.message,
          });
          results.expiringSoon = [];
        }
      }

      // Get expired licenses (those past grace period)
      if (includeExpired) {
        try {
          results.expired = await this.licenseRepository.findExpiredLicensesForSuspension();
          results.total += results.expired.length;
        } catch (error) {
          logger.warn('Failed to fetch expired licenses for suspension, returning empty array', {
            error: error.message,
          });
          results.expired = [];
        }
      }

      // Get suspended licenses
      if (includeSuspended) {
        // This would need a new repository method - for now, we'll skip or implement later
        results.suspended = [];
      }

      logger.info('Retrieved licenses requiring attention', {
        expiringSoon: results.expiringSoon.length,
        expired: results.expired.length,
        suspended: results.suspended.length,
        total: results.total,
      });

      return results;
    } catch (error) {
      logger.error('Failed to get licenses requiring attention', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Calculate and update grace periods for licenses
   */
  async updateGracePeriods() {
    try {
      logger.info('Updating grace periods for licenses');

      // Find licenses with auto-suspend enabled that don't have grace periods set
      const licensesNeedingGracePeriod = await this.licenseRepository.findLicenses({
        filters: {
          autoSuspendEnabled: true,
          expiresAt: { $exists: true },
        },
        // This would need to be implemented in the repository
      });

      let updated = 0;
      for (const license of licensesNeedingGracePeriod) {
        if (!license.gracePeriodEnd && license.expiresAt) {
          const graceEnd = license.calculateGracePeriodEnd();

          // Update the license with calculated grace period
          await this.licenseRepository.update(license.id, {
            gracePeriodEnd: graceEnd,
          });

          updated++;
        }
      }

      logger.info('Grace period updates completed', { updated });
      return { success: true, updated };
    } catch (error) {
      logger.error('Failed to update grace periods', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default LicenseLifecycleService;
