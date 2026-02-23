/**
 * Manage External Licenses Use Case
 * Handles CRUD operations for external licenses stored internally
 */
import { withTimeout, TimeoutPresets } from '../../../shared/utils/reliability/retry.js';
import logger from '../../../infrastructure/config/logger.js';

export class ManageExternalLicensesUseCase {
  constructor(externalLicenseRepository) {
    this.externalLicenseRepository = externalLicenseRepository;
  }

  /**
   * Get licenses with pagination and filtering
   */
  async getLicenses(options = {}) {
    return withTimeout(
      async () => await this.externalLicenseRepository.findLicenses(options),
      TimeoutPresets.DATABASE,
      'get_external_licenses',
      {
        onTimeout: () => {
          logger.error('Get external licenses timed out', {
            options,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Get single license by ID
   */
  async getLicenseById(id) {
    return await this.externalLicenseRepository.findById(id);
  }

  /**
   * Get license by appid
   */
  async getLicenseByAppId(appid) {
    return await this.externalLicenseRepository.findByAppId(appid);
  }

  /**
   * Get license by email
   */
  async getLicenseByEmail(email) {
    return await this.externalLicenseRepository.findByEmail(email);
  }

  /**
   * Get license by countid
   */
  async getLicenseByCountId(countid) {
    return await this.externalLicenseRepository.findByCountId(countid);
  }

  /**
   * Create new external license
   */
  async createLicense(licenseData) {
    return withTimeout(
      async () => {
        const license = await this.externalLicenseRepository.save(licenseData);

        logger.info('External license created', {
          id: license.id,
          appid: license.appid,
          email: license.Email_license,
        });

        return license;
      },
      TimeoutPresets.DATABASE,
      'create_external_license',
      {
        onTimeout: () => {
          logger.error('Create external license timed out', {
            appid: licenseData.appid,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Update existing license
   */
  async updateLicense(id, updates) {
    return withTimeout(
      async () => {
        const updatedLicense = await this.externalLicenseRepository.update(id, updates);

        if (updatedLicense) {
          logger.info('External license updated', {
            id,
            appid: updatedLicense.appid,
            updatedFields: Object.keys(updates),
          });
        }

        return updatedLicense;
      },
      TimeoutPresets.DATABASE,
      'update_external_license',
      {
        onTimeout: () => {
          logger.error('Update external license timed out', {
            id,
            updateFields: Object.keys(updates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Delete license
   */
  async deleteLicense(id) {
    return withTimeout(
      async () => {
        // Get license info before deletion for logging
        const license = await this.externalLicenseRepository.findById(id);

        const deleted = await this.externalLicenseRepository.delete(id);

        if (deleted && license) {
          logger.info('External license deleted', {
            id,
            appid: license.appid,
            email: license.Email_license,
          });
        }

        return deleted;
      },
      TimeoutPresets.DATABASE,
      'delete_external_license',
      {
        onTimeout: () => {
          logger.error('Delete external license timed out', {
            id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Get license statistics
   */
  async getLicenseStats() {
    return await this.externalLicenseRepository.getLicenseStats();
  }

  /**
   * Get expiring licenses
   */
  async getExpiringLicenses(daysThreshold = 30) {
    return await this.externalLicenseRepository.findExpiringSoonLicenses(daysThreshold);
  }

  /**
   * Get expired licenses
   */
  async getExpiredLicenses() {
    return await this.externalLicenseRepository.findExpiredLicenses();
  }

  /**
   * Get licenses by organization (DBA)
   */
  async getLicensesByOrganization(dba) {
    return await this.externalLicenseRepository.findLicensesByOrganization(dba);
  }

  /**
   * Bulk update licenses
   */
  async bulkUpdateLicenses(updates) {
    return withTimeout(
      async () => {
        const results = await this.externalLicenseRepository.bulkUpdate(updates);

        logger.info('Bulk update external licenses completed', {
          requested: updates.length,
          successful: results.length,
        });

        return results;
      },
      TimeoutPresets.DATABASE,
      'bulk_update_external_licenses',
      {
        onTimeout: () => {
          logger.error('Bulk update external licenses timed out', {
            requested: updates.length,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Bulk delete licenses
   */
  async bulkDeleteLicenses(ids) {
    return withTimeout(
      async () => {
        const deletedCount = await this.externalLicenseRepository.bulkDelete(ids);

        logger.info('Bulk delete external licenses completed', {
          requested: ids.length,
          deleted: deletedCount,
        });

        return deletedCount;
      },
      TimeoutPresets.DATABASE,
      'bulk_delete_external_licenses',
      {
        onTimeout: () => {
          logger.error('Bulk delete external licenses timed out', {
            requested: ids.length,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  // ========================================================================
  // MISSING METHODS FOR EXTERNAL API ENDPOINTS
  // ========================================================================

  /**
   * Update license by email
   */
  async updateLicenseByEmail(email, updates) {
    return withTimeout(
      async () => {
        const existingLicense = await this.externalLicenseRepository.findByEmail(email);
        if (!existingLicense) {
          throw new Error('License not found');
        }

        return await this.externalLicenseRepository.update(existingLicense.id, updates);
      },
      TimeoutPresets.DATABASE,
      'update_external_license_by_email',
      {
        onTimeout: () => {
          logger.error('Update external license by email timed out', {
            email,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Delete license by email
   */
  async deleteLicenseByEmail(email) {
    return withTimeout(
      async () => {
        const existingLicense = await this.externalLicenseRepository.findByEmail(email);
        if (!existingLicense) {
          throw new Error('License not found');
        }

        return await this.externalLicenseRepository.delete(existingLicense.id);
      },
      TimeoutPresets.DATABASE,
      'delete_external_license_by_email',
      {
        onTimeout: () => {
          logger.error('Delete external license by email timed out', {
            email,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Update license by countid
   */
  async updateLicenseByCountId(countid, updates) {
    return withTimeout(
      async () => {
        const existingLicense = await this.externalLicenseRepository.findByCountId(countid);
        if (!existingLicense) {
          throw new Error('License not found');
        }

        return await this.externalLicenseRepository.update(existingLicense.id, updates);
      },
      TimeoutPresets.DATABASE,
      'update_external_license_by_countid',
      {
        onTimeout: () => {
          logger.error('Update external license by countid timed out', {
            countid,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Delete license by countid
   */
  async deleteLicenseByCountId(countid) {
    return withTimeout(
      async () => {
        const existingLicense = await this.externalLicenseRepository.findByCountId(countid);
        if (!existingLicense) {
          throw new Error('License not found');
        }

        return await this.externalLicenseRepository.delete(existingLicense.id);
      },
      TimeoutPresets.DATABASE,
      'delete_external_license_by_countid',
      {
        onTimeout: () => {
          logger.error('Delete external license by countid timed out', {
            countid,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Reset license ID
   */
  async resetLicense({ appid, email }) {
    return withTimeout(
      async () => {
        let license = null;

        if (appid) {
          license = await this.externalLicenseRepository.findByAppId(appid);
        } else if (email) {
          license = await this.externalLicenseRepository.findByEmail(email);
        }

        if (!license) {
          throw new Error('License not found');
        }

        // Reset the ID to null (this would typically be a special operation)
        // Note: This might need to be implemented differently based on business requirements
        const updates = { id: null };
        return await this.externalLicenseRepository.update(license.id, updates);
      },
      TimeoutPresets.DATABASE,
      'reset_external_license',
      {
        onTimeout: () => {
          logger.error('Reset external license timed out', {
            appid,
            email,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Bulk create licenses
   */
  async bulkCreateLicenses(licenses) {
    return withTimeout(
      async () => {
        // This would typically call the external API to create licenses
        // For now, we'll store them locally
        const results = [];
        for (const licenseData of licenses) {
          try {
            const result = await this.createLicense(licenseData);
            results.push(result);
          } catch (error) {
            logger.error('Failed to create license in bulk operation', {
              error: error.message,
              licenseData,
            });
            // Continue with other licenses
          }
        }

        return {
          created: results.length,
          totalRequested: licenses.length,
          results,
        };
      },
      TimeoutPresets.DATABASE * 5, // Longer timeout for bulk operations
      'bulk_create_external_licenses',
      {
        onTimeout: () => {
          logger.error('Bulk create external licenses timed out', {
            requested: licenses.length,
            timeout: TimeoutPresets.DATABASE * 5,
          });
        },
      }
    );
  }

  /**
   * Add row license (create single license for DataGrid)
   */
  async addRowLicense(licenseData) {
    return await this.createLicense(licenseData);
  }

  /**
   * Get SMS payments
   */
  async getSmsPayments(options = {}) {
    return withTimeout(
      async () => {
        // This would typically call the external API
        // For now, return mock data or call external API service
        const { externalLicenseApiService } =
          await import('../../../shared/services/external-license-api-service.js');

        return await externalLicenseApiService.getSmsPayments(options);
      },
      TimeoutPresets.SLOW,
      'get_sms_payments',
      {
        onTimeout: () => {
          logger.error('Get SMS payments timed out', {
            options,
            timeout: TimeoutPresets.SLOW,
          });
        },
      }
    );
  }

  /**
   * Add SMS payment
   */
  async addSmsPayment(paymentData) {
    return withTimeout(
      async () => {
        // This would typically call the external API
        const { externalLicenseApiService } =
          await import('../../../shared/services/external-license-api-service.js');

        return await externalLicenseApiService.addSmsPayment(paymentData);
      },
      TimeoutPresets.SLOW,
      'add_sms_payment',
      {
        onTimeout: () => {
          logger.error('Add SMS payment timed out', {
            paymentData,
            timeout: TimeoutPresets.SLOW,
          });
        },
      }
    );
  }

  /**
   * Get license analytics
   */
  async getLicenseAnalytics(options = {}) {
    return withTimeout(
      async () => {
        // This would typically call the external API
        const { externalLicenseApiService } =
          await import('../../../shared/services/external-license-api-service.js');

        return await externalLicenseApiService.getLicenseAnalytics(options);
      },
      TimeoutPresets.SLOW,
      'get_license_analytics',
      {
        onTimeout: () => {
          logger.error('Get license analytics timed out', {
            options,
            timeout: TimeoutPresets.SLOW,
          });
        },
      }
    );
  }
}
