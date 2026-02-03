/**
 * License Notification Service
 * Handles notifications for license lifecycle events
 */
import logger from '../config/logger.js';

export class LicenseNotificationService {
  constructor(notificationProvider = null, config = {}) {
    this.notificationProvider = notificationProvider;
    this.config = {
      enabled: true,
      defaultRecipient: config.defaultRecipient || 'admin@example.com',
      ...config,
    };
  }

  /**
   * Send renewal reminder notification
   */
  async sendRenewalReminder(license, reminderType, description) {
    try {
      if (!this.config.enabled) {
        logger.info('Notifications disabled, skipping renewal reminder', {
          licenseId: license.id,
          reminderType,
        });
        return { success: true, skipped: true };
      }

      const notification = {
        type: 'license_renewal_reminder',
        priority: this.getReminderPriority(reminderType),
        recipient: this.getLicenseContact(license),
        subject: `License Renewal Reminder: ${license.key}`,
        template: 'license-renewal-reminder',
        data: {
          licenseId: license.id,
          licenseKey: license.key,
          dba: license.dba,
          expiresAt: license.expiresAt,
          daysUntilExpiry: license.getDaysUntilExpiration(),
          reminderType,
          description,
          renewalDueDate: license.renewalDueDate,
          plan: license.plan,
          product: license.product,
        },
      };

      const result = await this.sendNotification(notification);

      logger.info('Renewal reminder sent', {
        licenseId: license.id,
        licenseKey: license.key,
        reminderType,
        recipient: notification.recipient,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send renewal reminder', {
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
   * Send license expired notification
   */
  async sendLicenseExpired(license, context = {}) {
    try {
      if (!this.config.enabled) {
        logger.info('Notifications disabled, skipping expiration notification', {
          licenseId: license.id,
        });
        return { success: true, skipped: true };
      }

      const notification = {
        type: 'license_expired',
        priority: 'high',
        recipient: this.getLicenseContact(license),
        subject: `License Expired: ${license.key}`,
        template: 'license-expired',
        data: {
          licenseId: license.id,
          licenseKey: license.key,
          dba: license.dba,
          expiredAt: license.expiresAt,
          gracePeriodEnd: license.gracePeriodEnd,
          daysInGracePeriod: license.getDaysUntilGracePeriodEnd(),
          autoSuspendEnabled: license.autoSuspendEnabled,
          context,
        },
      };

      const result = await this.sendNotification(notification);

      logger.info('License expired notification sent', {
        licenseId: license.id,
        licenseKey: license.key,
        recipient: notification.recipient,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send license expired notification', {
        licenseId: license.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Send license suspended notification
   */
  async sendLicenseSuspended(license, reason = 'expiration') {
    try {
      if (!this.config.enabled) {
        logger.info('Notifications disabled, skipping suspension notification', {
          licenseId: license.id,
        });
        return { success: true, skipped: true };
      }

      const notification = {
        type: 'license_suspended',
        priority: 'high',
        recipient: this.getLicenseContact(license),
        subject: `License Suspended: ${license.key}`,
        template: 'license-suspended',
        data: {
          licenseId: license.id,
          licenseKey: license.key,
          dba: license.dba,
          suspensionReason: license.suspensionReason,
          suspendedAt: license.suspendedAt,
          reason,
          gracePeriodDays: license.gracePeriodDays,
        },
      };

      const result = await this.sendNotification(notification);

      logger.info('License suspended notification sent', {
        licenseId: license.id,
        licenseKey: license.key,
        recipient: notification.recipient,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send license suspended notification', {
        licenseId: license.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Send license renewed notification
   */
  async sendLicenseRenewed(license, context = {}) {
    try {
      if (!this.config.enabled) {
        logger.info('Notifications disabled, skipping renewal notification', {
          licenseId: license.id,
        });
        return { success: true, skipped: true };
      }

      // Get the latest renewal from history
      const latestRenewal = license.renewalHistory
        ?.filter((entry) => entry.action === 'license_renewed')
        ?.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      const notification = {
        type: 'license_renewed',
        priority: 'normal',
        recipient: this.getLicenseContact(license),
        subject: `License Renewed: ${license.key}`,
        template: 'license-renewed',
        data: {
          licenseId: license.id,
          licenseKey: license.key,
          dba: license.dba,
          newExpiration: license.expiresAt,
          renewedBy: context.userId,
          renewalDetails: latestRenewal,
          plan: license.plan,
          product: license.product,
        },
      };

      const result = await this.sendNotification(notification);

      logger.info('License renewed notification sent', {
        licenseId: license.id,
        licenseKey: license.key,
        recipient: notification.recipient,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send license renewed notification', {
        licenseId: license.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Send license extended notification
   */
  async sendLicenseExtended(license, context = {}) {
    try {
      if (!this.config.enabled) {
        logger.info('Notifications disabled, skipping extension notification', {
          licenseId: license.id,
        });
        return { success: true, skipped: true };
      }

      const notification = {
        type: 'license_extended',
        priority: 'normal',
        recipient: this.getLicenseContact(license),
        subject: `License Extended: ${license.key}`,
        template: 'license-extended',
        data: {
          licenseId: license.id,
          licenseKey: license.key,
          dba: license.dba,
          newExpiration: license.expiresAt,
          extendedBy: context.userId,
          reason: context.reason,
          plan: license.plan,
          product: license.product,
        },
      };

      const result = await this.sendNotification(notification);

      logger.info('License extended notification sent', {
        licenseId: license.id,
        licenseKey: license.key,
        recipient: notification.recipient,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send license extended notification', {
        licenseId: license.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Send license reactivated notification
   */
  async sendLicenseReactivated(license, context = {}) {
    try {
      if (!this.config.enabled) {
        logger.info('Notifications disabled, skipping reactivation notification', {
          licenseId: license.id,
        });
        return { success: true, skipped: true };
      }

      const notification = {
        type: 'license_reactivated',
        priority: 'normal',
        recipient: this.getLicenseContact(license),
        subject: `License Reactivated: ${license.key}`,
        template: 'license-reactivated',
        data: {
          licenseId: license.id,
          licenseKey: license.key,
          dba: license.dba,
          reactivatedAt: license.reactivatedAt,
          reactivatedBy: context.userId,
          reason: context.reason,
          plan: license.plan,
          product: license.product,
        },
      };

      const result = await this.sendNotification(notification);

      logger.info('License reactivated notification sent', {
        licenseId: license.id,
        licenseKey: license.key,
        recipient: notification.recipient,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send license reactivated notification', {
        licenseId: license.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get priority level for reminder type
   */
  getReminderPriority(reminderType) {
    switch (reminderType) {
      case '1day':
        return 'urgent';
      case '7days':
        return 'high';
      case '30days':
        return 'normal';
      default:
        return 'normal';
    }
  }

  /**
   * Get contact information for license notifications
   * This is a placeholder - in real implementation, this would
   * look up contact info from users or license metadata
   */
  getLicenseContact(license) {
    // Try to get contact from license data
    // This is a simplified implementation

    // In a real system, this might:
    // 1. Look up the user who owns the license
    // 2. Get their email from user profile
    // 3. Fall back to license contact info
    // 4. Fall back to default admin contact

    return this.config.defaultRecipient;
  }

  /**
   * Send notification using the configured provider
   * This is a placeholder for actual notification sending
   */
  async sendNotification(notification) {
    try {
      if (!this.notificationProvider) {
        // Log notification for development/testing
        logger.info('Notification would be sent (no provider configured)', {
          type: notification.type,
          recipient: notification.recipient,
          subject: notification.subject,
          priority: notification.priority,
          data: notification.data,
        });

        return {
          success: true,
          provider: 'console',
          messageId: `console-${Date.now()}`,
          recipient: notification.recipient,
        };
      }

      // Use the actual notification provider
      return await this.notificationProvider.send(notification);
    } catch (error) {
      logger.error('Failed to send notification', {
        type: notification.type,
        recipient: notification.recipient,
        error: error.message,
        stack: error.stack,
      });

      // Don't throw - we don't want notification failures to break business logic
      return {
        success: false,
        error: error.message,
        recipient: notification.recipient,
      };
    }
  }

  /**
   * Bulk send notifications for multiple licenses
   */
  async sendBulkNotifications(licenses, notificationType, options = {}) {
    try {
      const results = {
        successful: [],
        failed: [],
        total: licenses.length,
      };

      for (const license of licenses) {
        try {
          let result;

          switch (notificationType) {
            case 'renewal_reminder':
              result = await this.sendRenewalReminder(
                license,
                options.reminderType,
                options.description
              );
              break;
            case 'expired':
              result = await this.sendLicenseExpired(license, options.context);
              break;
            case 'suspended':
              result = await this.sendLicenseSuspended(license, options.reason);
              break;
            default:
              throw new Error(`Unsupported notification type: ${notificationType}`);
          }

          if (result.success) {
            results.successful.push({
              licenseId: license.id,
              licenseKey: license.key,
              result,
            });
          } else {
            results.failed.push({
              licenseId: license.id,
              licenseKey: license.key,
              error: result.error,
            });
          }
        } catch (error) {
          logger.warn('Failed to send notification in bulk operation', {
            licenseId: license.id,
            notificationType,
            error: error.message,
          });
          results.failed.push({
            licenseId: license.id,
            licenseKey: license.key,
            error: error.message,
          });
        }
      }

      logger.info('Bulk notifications completed', {
        notificationType,
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      logger.error('Bulk notification sending failed', {
        notificationType,
        licenseCount: licenses.length,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default LicenseNotificationService;
